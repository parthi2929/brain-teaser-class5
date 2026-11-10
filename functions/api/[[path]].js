/* Brain Teaser API (Cloudflare Pages Function). One file handles every /api/* route.
   Bindings: DB (D1). Vars: GOOGLE_CLIENT_ID. Secrets: ADMIN_EMAIL, SESSION_SECRET.
   DEV_LOGIN = "1" (only in .dev.vars, for local tests) allows sign-in without Google. */

const COOKIE = "bt_session";
const SESSION_DAYS = 30;
const GOOGLE_CERTS = "https://www.googleapis.com/oauth2/v3/certs";
const DEFAULT_SETTINGS = { maxTries: 0, helper: "wrong", hiddenTests: [] };

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
const fail = (status, error) => json({ error }, status);
const nowIso = () => new Date().toISOString();

/* ---------- base64url and HMAC ---------- */
const enc = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const hmac = async (secret, data) => {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
};
const sameText = (a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

/* ---------- session cookie: payload.signature ---------- */
const makeSession = async (env, user) => {
  const payload = b64url(enc.encode(JSON.stringify({ sub: user.id, email: user.email, name: user.name, exp: Date.now() + SESSION_DAYS * 864e5 })));
  return payload + "." + (await hmac(env.SESSION_SECRET, payload));
};
const readSession = async (request, env) => {
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`));
  if (!m || !env.SESSION_SECRET) return null;
  const [payload, sig] = m[1].split(".");
  if (!payload || !sig || !sameText(sig, await hmac(env.SESSION_SECRET, payload))) return null;
  const s = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
  return s.exp > Date.now() ? s : null;
};
const cookieHeader = (value, maxAge, request) => {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
};
const isAdmin = (env, email) => !!email && !!env.ADMIN_EMAIL && email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();

/* ---------- Google ID token check ---------- */
const googleKeys = async () => {
  const cache = caches.default;
  const req = new Request(GOOGLE_CERTS);
  let res = await cache.match(req);
  if (!res) {
    const live = await fetch(GOOGLE_CERTS);
    res = new Response(live.body, live);
    res.headers.set("cache-control", "max-age=3600");
    await cache.put(req, res.clone());
  }
  return (await res.json()).keys;
};
const verifyGoogle = async (token, env) => {
  const [h, p, s] = String(token).split(".");
  if (!h || !p || !s) throw new Error("bad token");
  const header = JSON.parse(new TextDecoder().decode(fromB64url(h)));
  const claims = JSON.parse(new TextDecoder().decode(fromB64url(p)));
  const jwk = (await googleKeys()).find((k) => k.kid === header.kid);
  if (!jwk || header.alg !== "RS256") throw new Error("unknown key");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, fromB64url(s), enc.encode(h + "." + p));
  if (!ok) throw new Error("bad signature");
  if (!["accounts.google.com", "https://accounts.google.com"].includes(claims.iss)) throw new Error("bad issuer");
  if (claims.aud !== env.GOOGLE_CLIENT_ID) throw new Error("bad audience");
  if (claims.exp * 1000 < Date.now()) throw new Error("expired");
  if (!claims.email_verified) throw new Error("email not verified");
  return { id: claims.sub, email: claims.email, name: claims.name || claims.email };
};

/* ---------- data ---------- */
const getSettings = async (env) => {
  const rows = (await env.DB.prepare("SELECT key, value FROM settings").all()).results;
  const out = { ...DEFAULT_SETTINGS };
  rows.forEach((r) => { try { out[r.key] = JSON.parse(r.value); } catch { /* keep default */ } });
  return out;
};
const saveUser = (env, u) =>
  env.DB.prepare(`INSERT INTO users (id, email, name, created_at, last_seen) VALUES (?1, ?2, ?3, ?4, ?4)
    ON CONFLICT(id) DO UPDATE SET email = ?2, name = ?3, last_seen = ?4`).bind(u.id, u.email, u.name, nowIso()).run();
const signIn = async (request, env, user) => {
  await saveUser(env, user);
  return json({ user: { name: user.name, email: user.email }, admin: isAdmin(env, user.email) }, 200,
    { "set-cookie": cookieHeader(await makeSession(env, user), SESSION_DAYS * 86400, request) });
};

/* Runs with their score so far: answered = questions finished (right, or closed with no tries left);
   firstRight = questions right on the first try. */
const RUNS_SQL = `
  SELECT r.id, r.user_id, r.test_id, r.total, r.started_at, r.finished_at,
    (SELECT COUNT(DISTINCT a.slot) FROM attempts a WHERE a.run_id = r.id AND (a.ok = 1 OR a.closed = 1)) AS answered,
    (SELECT COUNT(*) FROM attempts a WHERE a.run_id = r.id AND a.ok = 1 AND NOT EXISTS
      (SELECT 1 FROM attempts b WHERE b.run_id = a.run_id AND b.slot = a.slot AND b.at < a.at)) AS firstRight
  FROM runs r`;

const ownRun = async (env, runId, userId) =>
  env.DB.prepare("SELECT id, test_id FROM runs WHERE id = ?1 AND user_id = ?2").bind(runId, userId).first();

/* ---------- routes ---------- */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\//, "").replace(/\/$/, "");
  const method = request.method;
  const body = method === "POST" || method === "PUT" ? await request.json().catch(() => ({})) : {};

  try {
    if (path === "config" && method === "GET") {
      return json({ googleClientId: env.GOOGLE_CLIENT_ID || "", devLogin: env.DEV_LOGIN === "1" });
    }
    if (path === "session" && method === "POST") {
      let user;
      try { user = await verifyGoogle(body.credential, env); } catch (e) { return fail(401, "sign-in failed: " + e.message); }
      return signIn(request, env, user);
    }
    if (path === "dev-login" && method === "POST") {
      if (env.DEV_LOGIN !== "1") return fail(404, "not found");
      const email = String(body.email || "").trim();
      if (!email) return fail(400, "email needed");
      return signIn(request, env, { id: "dev:" + email, email, name: body.name || email });
    }
    if (path === "logout" && method === "POST") {
      return json({ ok: true }, 200, { "set-cookie": cookieHeader("", 0, request) });
    }

    const s = await readSession(request, env);
    const admin = s ? isAdmin(env, s.email) : false;

    if (path === "me" && method === "GET") {
      return json({ user: s ? { name: s.name, email: s.email } : null, admin, settings: await getSettings(env) });
    }
    if (!s) return fail(401, "sign in first");

    if (path === "runs" && method === "POST") {
      const qs = Array.isArray(body.questions) ? body.questions.slice(0, 30) : [];
      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO runs (id, user_id, test_id, topic, total, started_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
          .bind(id, s.sub, String(body.testId), String(body.topic || ""), qs.length, nowIso()),
        ...qs.map((q) => env.DB.prepare("INSERT INTO questions (run_id, slot, type, numbers, kind, answer) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
          .bind(id, q.slot, String(q.type), JSON.stringify(q.numbers ?? null).slice(0, 400), String(q.kind || ""), Number(q.answer))),
      ]);
      return json({ runId: id });
    }
    const att = path.match(/^runs\/([\w-]+)\/attempts$/);
    if (att && method === "POST") {
      const run = await ownRun(env, att[1], s.sub);
      if (!run) return fail(404, "run not found");
      const at = nowIso(), ok = body.ok ? 1 : 0;
      await env.DB.batch([
        env.DB.prepare("INSERT INTO attempts (run_id, slot, given, ok, closed, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
          .bind(run.id, Number(body.slot), String(body.given).slice(0, 40), ok, body.closed ? 1 : 0, at),
        env.DB.prepare(`INSERT INTO type_stats (user_id, test_id, type, month, tries, wrong) VALUES (?1, ?2, ?3, ?4, 1, ?5)
          ON CONFLICT DO UPDATE SET tries = tries + 1, wrong = wrong + ?5`)
          .bind(s.sub, run.test_id, String(body.type), at.slice(0, 7), 1 - ok),
      ]);
      return json({ ok: true });
    }
    const fin = path.match(/^runs\/([\w-]+)\/finish$/);
    if (fin && method === "POST") {
      const r = await env.DB.prepare("UPDATE runs SET finished_at = ?1, score = ?2 WHERE id = ?3 AND user_id = ?4")
        .bind(nowIso(), Number(body.score), fin[1], s.sub).run();
      return r.meta.changes ? json({ ok: true }) : fail(404, "run not found");
    }
    if (path === "progress" && method === "GET") {
      const runs = (await env.DB.prepare(RUNS_SQL + " WHERE r.user_id = ?1 ORDER BY r.started_at DESC LIMIT 30").bind(s.sub).all()).results;
      const weak = (await env.DB.prepare(`SELECT test_id, type, SUM(tries) AS tries, SUM(wrong) AS wrong FROM type_stats
        WHERE user_id = ?1 GROUP BY test_id, type HAVING wrong > 0 ORDER BY wrong * 1.0 / tries DESC, wrong DESC LIMIT 10`).bind(s.sub).all()).results;
      return json({ runs, weak });
    }

    if (!admin) return fail(403, "admin only");

    if (path === "admin/overview" && method === "GET") {
      const [users, runs, months] = await env.DB.batch([
        env.DB.prepare(`SELECT u.id, u.name, u.email, u.last_seen, (SELECT COUNT(*) FROM runs r WHERE r.user_id = u.id) AS runs
          FROM users u ORDER BY u.last_seen DESC LIMIT 50`),
        env.DB.prepare(RUNS_SQL + " ORDER BY r.started_at DESC LIMIT 50"),
        env.DB.prepare(`SELECT month, user_id, test_id, type, tries, wrong FROM type_stats
          WHERE wrong > 0 ORDER BY month DESC, wrong DESC LIMIT 200`),
      ]);
      return json({ users: users.results, runs: runs.results, months: months.results, settings: await getSettings(env) });
    }
    if (path === "admin/settings" && method === "PUT") {
      const next = {
        maxTries: Math.max(0, Math.min(10, Math.floor(Number(body.maxTries) || 0))),
        helper: body.helper === "always" ? "always" : "wrong",
        hiddenTests: Array.isArray(body.hiddenTests) ? body.hiddenTests.map(String).slice(0, 50) : [],
      };
      await env.DB.batch(Object.entries(next).map(([k, v]) =>
        env.DB.prepare("INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2").bind(k, JSON.stringify(v))));
      return json({ settings: next });
    }
    return fail(404, "not found");
  } catch (e) {
    return fail(500, "server error");
  }
}
