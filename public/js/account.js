/* Sign-in, the user button, My progress and the admin page.
   The Worker decides who is admin (ADMIN_EMAIL secret); this page only shows what /api/me allows. */
globalThis.Account = (() => {
  const E = globalThis.Engine;
  const $ = (id) => document.getElementById(id);
  const make = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const state = { user: null, admin: false, online: false, config: {}, settings: { maxTries: 0, helper: "wrong", hiddenTests: [] } };
  const listeners = [];
  const onChange = (f) => listeners.push(f);

  const api = async (path, opts = {}) => {
    const res = await fetch("/api/" + path, {
      method: opts.method || "GET",
      headers: opts.body ? { "content-type": "application/json" } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
    return data;
  };

  /* Dates as 10th Nov 2026. */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ord = (d) => d + (d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th");
  const day = (iso) => { const t = new Date(iso); return `${ord(t.getDate())} ${MONTHS[t.getMonth()]} ${t.getFullYear()}`; };
  const month = (ym) => { const [y, m] = ym.split("-"); return `${MONTHS[Number(m) - 1]} ${y}`; };
  const testTitle = (id) => (E.TESTS.find((t) => t.id === id) || { title: id }).title;
  const typeName = (type) => type.replace(/-/g, " ");
  const scoreText = (r) => (r.finished_at ? `${r.firstRight}/${r.total}` : `${r.firstRight}/${r.answered} answered, not completed`);

  /* ---------- load ---------- */
  const load = async () => {
    try {
      const [me, config] = await Promise.all([api("me"), state.online ? Promise.resolve(state.config) : api("config")]);
      Object.assign(state, { user: me.user, admin: me.admin, settings: { ...state.settings, ...me.settings }, config, online: true });
    } catch {
      state.online = false; /* static preview without the Worker: practice only */
    }
    renderButton();
    listeners.forEach((f) => f(state));
  };

  /* ---------- the user button (top right) ---------- */
  const menu = () => $("user-menu");
  const renderButton = () => {
    const btn = $("user-btn");
    btn.hidden = !state.online;
    btn.textContent = state.user ? "👤 " + (state.user.name || "").split(" ")[0] : "Sign in";
    menu().hidden = true;
  };
  const openMenu = () => {
    const m = menu();
    m.replaceChildren();
    if (state.user) {
      m.append(make("div", "who-line", esc(state.user.name)));
      const item = (label, go) => {
        const b = make("button", "", label);
        b.type = "button";
        b.addEventListener("click", () => { m.hidden = true; go(); });
        m.append(b);
      };
      item("My progress", showProgress);
      if (state.admin) item("Admin", showAdmin);
      item("Sign out", signOut);
    } else {
      const slot = make("div", "gbtn");
      m.append(slot);
      if (state.config.googleClientId) googleButton(slot);
      if (state.config.devLogin) devForm(m);
      if (!state.config.googleClientId && !state.config.devLogin) m.append(make("p", "", "Sign-in is not set up yet."));
    }
    m.hidden = false;
  };

  /* Google Identity Services: the button gives an ID token; the Worker checks it. */
  let gisLoading = null;
  const loadGis = () => gisLoading || (gisLoading = new Promise((ok, no) => {
    const s = make("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = ok;
    s.onerror = no;
    document.head.append(s);
  }));
  const googleButton = async (slot) => {
    await loadGis();
    google.accounts.id.initialize({
      client_id: state.config.googleClientId,
      callback: async ({ credential }) => {
        try { await api("session", { method: "POST", body: { credential } }); } catch (e) { alert(e.message); }
        await load();
      },
    });
    google.accounts.id.renderButton(slot, { theme: "outline", size: "large", text: "signin_with" });
  };
  /* Local test only: the Worker accepts this when DEV_LOGIN=1 in .dev.vars. */
  const devForm = (m) => {
    const f = make("form", "devform", '<small>Local test sign-in</small><input name="email" placeholder="email"><button>Go</button>');
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      await api("dev-login", { method: "POST", body: { email: f.email.value } });
      await load();
    });
    m.append(f);
  };
  const signOut = async () => {
    await api("logout", { method: "POST" }).catch(() => {});
    if (globalThis.google) google.accounts.id.disableAutoSelect();
    await load();
    globalThis.App.go("home");
  };

  /* ---------- My progress ---------- */
  const show = (title) => {
    globalThis.App.go("account");
    $("home-link").textContent = title;
    return $("account");
  };
  const table = (head, rows) =>
    `<table class="book wide"><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;
  const showProgress = async () => {
    const box = show("My progress");
    box.innerHTML = "<p>Loading…</p>";
    const { runs, weak } = await api("progress");
    box.innerHTML =
      `<h2>My tests</h2>` +
      (runs.length ? table(["Day", "Test", "Score"], runs.map((r) => [day(r.started_at), testTitle(r.test_id), scoreText(r)])) : "<p>No tests yet.</p>") +
      `<h2>Practise these</h2>` +
      (weak.length ? table(["Test", "Question type", "Wrong"], weak.map((w) => [testTitle(w.test_id), typeName(w.type), `${w.wrong} of ${w.tries}`])) : "<p>Nothing wrong yet.</p>");
  };

  /* ---------- Admin ---------- */
  const showAdmin = async () => {
    const box = show("Admin");
    box.innerHTML = "<p>Loading…</p>";
    const d = await api("admin/overview");
    const names = Object.fromEntries(d.users.map((u) => [u.id, u.name || u.email]));
    const st = d.settings;
    box.innerHTML = `
      <h2>Settings</h2>
      <form id="settings-form" class="settings">
        <label>Tries per question
          <select name="maxTries">${[0, 1, 2, 3, 5].map((v) => `<option value="${v}"${v === st.maxTries ? " selected" : ""}>${v || "Unlimited"}</option>`).join("")}</select></label>
        <label>👀 helper appears
          <select name="helper"><option value="wrong"${st.helper === "wrong" ? " selected" : ""}>after a wrong answer</option>
          <option value="always"${st.helper === "always" ? " selected" : ""}>from the start</option></select></label>
        <fieldset><legend>Tests she can see</legend>
          ${E.TESTS.map((t) => `<label><input type="checkbox" name="show" value="${t.id}"${st.hiddenTests.includes(t.id) ? "" : " checked"}> ${t.title}</label>`).join("")}
        </fieldset>
        <button class="check" type="submit">Save</button> <span id="settings-saved"></span>
      </form>
      <h2>Users</h2>
      ${table(["Name", "Email", "Tests", "Last seen"], d.users.map((u) => [esc(u.name), esc(u.email), u.runs, day(u.last_seen)]))}
      <h2>Recent tests</h2>
      ${table(["Day", "User", "Test", "Score"], d.runs.map((r) => [day(r.started_at), esc(names[r.user_id] || "?"), testTitle(r.test_id), scoreText(r)]))}
      <h2>Most wrong, by month</h2>
      ${table(["Month", "User", "Test", "Question type", "Wrong"], d.months.map((m) => [month(m.month), esc(names[m.user_id] || "?"), testTitle(m.test_id), typeName(m.type), `${m.wrong} of ${m.tries}`]))}`;
    const f = $("settings-form");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const shown = [...f.querySelectorAll('input[name="show"]:checked')].map((x) => x.value);
      const body = { maxTries: Number(f.maxTries.value), helper: f.helper.value, hiddenTests: E.TESTS.map((t) => t.id).filter((id) => !shown.includes(id)) };
      const r = await api("admin/settings", { method: "PUT", body });
      state.settings = r.settings;
      $("settings-saved").textContent = "Saved ✓";
      listeners.forEach((fn) => fn(state));
    });
  };

  document.addEventListener("click", (e) => {
    if (e.target.closest("#user-btn")) { menu().hidden ? openMenu() : (menu().hidden = true); return; }
    if (!e.target.closest("#user-menu")) menu().hidden = true;
  });

  return { state, api, load, onChange, day };
})();
