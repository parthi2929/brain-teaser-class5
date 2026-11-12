// Quick practice check: every sum keeps its type's rules, the no-repeat window holds,
// and wrong sums come back as the rules say. Run: node tests/check-practice.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..", "public");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const files = [...html.matchAll(/<script src="((?:js\/(?:engine|scheduler)|practice\/[^"]+)\.js)"><\/script>/g)].map((m) => m[1]);
const ctx = {};
vm.createContext(ctx);
files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f }));
const E = ctx.Engine, S = ctx.Scheduler;

let failures = 0;
const fail = (msg) => { if (failures++ < 30) console.log("FAIL " + msg); };
const digits = (x) => String(x).length;

// 1. Pools: every sum keeps its type's rules; no duplicates.
const RULES = {
  "div-2d-1d": { n: 2, d: 1, r: false }, "div-2d-1d-r": { n: 2, d: 1, r: true },
  "div-3d-1d": { n: 3, d: 1, r: false }, "div-3d-1d-r": { n: 3, d: 1, r: true },
  "div-3d-2d": { n: 3, d: 2, r: false }, "div-3d-2d-r": { n: 3, d: 2, r: true },
};
const types = E.PRACTICE.flatMap((p) => p.types);
const report = [];
types.forEach((t) => {
  const rule = RULES[t.id];
  if (!rule) return fail(`${t.id}: no rule in this check`);
  const pool = t.pool();
  const keys = new Set(pool.map(([n, d]) => n + "/" + d));
  if (keys.size !== pool.length) fail(`${t.id}: duplicate sums`);
  pool.forEach(([n, d]) => {
    if (digits(n) !== rule.n || digits(d) !== rule.d || d < 2) fail(`${t.id}: ${n} ÷ ${d} breaks the digit rule`);
    if ((n % d !== 0) !== rule.r) fail(`${t.id}: ${n} ÷ ${d} breaks the remainder rule`);
    if (Math.floor(n / d) < 2) fail(`${t.id}: ${n} ÷ ${d} has quotient below 2`);
    const right = Math.floor(n / d) + (n % d ? " r " + (n % d) : "");
    if (E.checkDivision(n, d, right) !== "right") fail(`${t.id}: right answer "${right}" rejected`);
    if (E.checkDivision(n, d, String(Math.floor(n / d) + 1)) !== "wrong") fail(`${t.id}: wrong answer accepted`);
  });
  report.push(`${t.id.padEnd(12)} ${t.title.padEnd(32)} pool=${String(pool.length).padStart(6)}  e.g. ${t.example}`);
});

// 2. Answer forms.
// 348 ÷ 16 = 21 r 12
[["21 r 12", "right"], ["21r12", "right"], ["21 R 12", "right"], ["21 rem 12", "right"], ["21 remainder 12", "right"],
 [" 21  r  12 ", "right"], ["21", "wrong"], ["21 r 11", "wrong"], ["21.12", "unclear"], ["abc", "unclear"]]
  .forEach(([raw, want]) => { const got = E.checkDivision(348, 16, raw); if (got !== want) fail(`348 ÷ 16 "${raw}": ${got}, expected ${want}`); });
if (E.checkDivision(84, 6, "14 r 0") !== "right") fail('84 ÷ 6 "14 r 0" rejected');

// 3. The no-repeat window: answering right every time, a sum never comes back within N questions.
const seeded = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const windowCheck = (t, N, questions) => {
  const keys = t.pool().map(([n, d]) => n + "/" + d);
  const st = S.fresh(), rules = { noRepeat: N, gapMin: 5, gapMax: 10, rightTimes: 2 }, rng = seeded(7);
  const last = {};
  let worst = Infinity;
  for (let i = 0; i < questions; i++) {
    const { key } = S.next(st, keys, rules, rng);
    if (last[key] !== undefined) worst = Math.min(worst, i - last[key] - 1);
    last[key] = i;
    S.answered(st, key, true, rules, rng);
  }
  const want = Math.min(N, keys.length - 1);
  if (worst < want) fail(`${t.id}: a sum came back after ${worst} others (window ${want})`);
  return worst;
};
types.forEach((t) => {
  const w = windowCheck(t, 100, 3000);
  report.push(`${t.id.padEnd(12)} no-repeat 100: closest repeat after ${w === Infinity ? "none" : w} other questions`);
});
windowCheck(types[0], 30, 2000);

// 4. Wrong sums come back after gapMin..gapMax questions, until right rightTimes times in a row.
const wrongCheck = (gapMin, gapMax, rightTimes) => {
  const t = types[2];
  const keys = t.pool().map(([n, d]) => n + "/" + d);
  const st = S.fresh(), rules = { noRepeat: 100, gapMin, gapMax, rightTimes }, rng = seeded(11);
  const target = keys[5];
  // first question: force the target, answer wrong
  S.answered(st, target, false, rules, rng);
  let lastAt = 0, rightSoFar = 0, comebacks = 0;
  for (let i = 1; i < 400; i++) {
    const { key, repeat } = S.next(st, keys, rules, rng);
    if (key === target) {
      const gap = i - lastAt - 1;
      if (!repeat) fail("target came back as a random question");
      if (gap < gapMin - 1 || gap > gapMax) fail(`target came back after ${gap} others (rule ${gapMin}..${gapMax})`);
      comebacks++;
      lastAt = i;
      // answer: wrong once on the first comeback, then right
      const ok = comebacks !== 1;
      rightSoFar = ok ? rightSoFar + 1 : 0;
      S.answered(st, key, ok, rules, rng);
    } else S.answered(st, key, true, rules, rng);
  }
  const want = rightTimes === 0 ? 0 : 1 + rightTimes; // 1 wrong comeback, then rightTimes right ones
  if (comebacks !== want) fail(`gap ${gapMin}..${gapMax}, until right ${rightTimes}: came back ${comebacks} times, expected ${want}`);
  if (st.wrong[target]) fail("target still waiting after enough right answers");
  report.push(`wrong sum, rule ${gapMin}..${gapMax} until right ${rightTimes}: came back ${comebacks} times`);
};
wrongCheck(5, 10, 2);
wrongCheck(3, 3, 1);
wrongCheck(8, 20, 3);
wrongCheck(5, 10, 0);

console.log(report.join("\n"));
if (failures) { console.log(`\nFAILED ${failures}`); process.exit(1); }
console.log("\nALL PASSED");
