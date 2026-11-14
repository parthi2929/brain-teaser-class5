// Quick practice check: every sum keeps its rules (3-digit ÷ 1-digit by default), about half have a remainder,
// the no-repeat window holds, and wrong sums come back as the rules say. Run: node tests/check-practice.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..", "public");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const files = [...html.matchAll(/<script src="((?:js\/(?:engine|scheduler)|practice\/[^"?]+)\.js)(?:\?[^"\s]*)?"><\/script>/g)].map((m) => m[1]);
const ctx = {};
vm.createContext(ctx);
files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f }));
const E = ctx.Engine, S = ctx.Scheduler;

let failures = 0;
const fail = (msg) => { if (failures++ < 30) console.log("FAIL " + msg); };
const report = [];
const seeded = (seed) => () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
const digits = (x) => String(x).length;

const types = E.PRACTICE.flatMap((p) => p.types);
if (types.length !== 1 || types[0].id !== "div") fail(`expected one type "div", found ${types.map((t) => t.id)}`);
const div = types[0];
const keysOf = (rules) => div.groups({ ...S.DEFAULTS, ...rules }).map((g) => g.map(([n, d]) => n + "/" + d));

// 1. Every sum: 3-digit dividend, divisor digits as set, quotient at least 2, the right answer passes.
[1, 2].forEach((dd) => {
  const groups = div.groups({ ...S.DEFAULTS, divisorDigits: dd });
  const all = groups.flat();
  if (new Set(all.map(([n, d]) => n + "/" + d)).size !== all.length) fail(`divisor digits ${dd}: duplicate sums`);
  all.forEach(([n, d]) => {
    if (digits(n) !== 3) fail(`${n} ÷ ${d}: dividend is not 3-digit`);
    if (d < 2 || digits(d) > dd || (dd === 1 && digits(d) !== 1)) fail(`${n} ÷ ${d}: divisor breaks divisorDigits ${dd}`);
    if (Math.floor(n / d) < 2) fail(`${n} ÷ ${d}: quotient below 2`);
    const right = Math.floor(n / d) + (n % d ? " r " + (n % d) : "");
    if (E.checkDivision(n, d, right) !== "right") fail(`${n} ÷ ${d}: right answer "${right}" rejected`);
    if (E.checkDivision(n, d, String(Math.floor(n / d) + 1)) !== "wrong") fail(`${n} ÷ ${d}: wrong answer accepted`);
  });
  report.push(`divisor digits ${dd}: ${all.length} sums in ${groups.length} lists (${groups.map((g) => g.length).join(" + ")})`);
});

// 2. The sums she gets (default rules): all 3-digit ÷ 1-digit, about half with a remainder.
{
  const groups = keysOf({}), st = S.fresh(), rng = seeded(3);
  let withR = 0, twoDigitDivisor = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const { key } = S.next(st, groups, {}, rng);
    const [n, d] = key.split("/").map(Number);
    if (digits(n) !== 3 || digits(d) !== 1) fail(`asked ${n} ÷ ${d}`);
    if (n % d) withR++;
    if (d >= 10) twoDigitDivisor++;
    S.answered(st, key, true, {}, rng);
  }
  const share = withR / N;
  if (share < 0.45 || share > 0.55) fail(`remainder share ${share.toFixed(2)}, expected about 0.5`);
  report.push(`${N} sums asked: ${(share * 100).toFixed(1)}% with a remainder, ${twoDigitDivisor} with a 2-digit divisor`);
}

// 3. Answer forms (348 ÷ 16 = 21 r 12; 84 ÷ 6 = 14).
[["21 r 12", "right"], ["21r12", "right"], ["21 R 12", "right"], ["21 rem 12", "right"], ["21 remainder 12", "right"],
 [" 21  r  12 ", "right"], ["21", "wrong"], ["21 r 11", "wrong"], ["21.12", "unclear"], ["abc", "unclear"]]
  .forEach(([raw, want]) => { const got = E.checkDivision(348, 16, raw); if (got !== want) fail(`348 ÷ 16 "${raw}": ${got}, expected ${want}`); });
if (E.checkDivision(84, 6, "14 r 0") !== "right") fail('84 ÷ 6 "14 r 0" rejected');
if (E.checkDivision(84, 6, "14") !== "right") fail('84 ÷ 6 "14" rejected');

// 4. The no-repeat window: answering right every time, a sum never comes back within N questions.
const windowCheck = (N, questions, rules = {}) => {
  const groups = keysOf(rules), st = S.fresh(), r = { ...rules, noRepeat: N }, rng = seeded(7);
  const last = {};
  let closest = Infinity;
  for (let i = 0; i < questions; i++) {
    const { key } = S.next(st, groups, r, rng);
    if (last[key] !== undefined) closest = Math.min(closest, i - last[key] - 1);
    last[key] = i;
    S.answered(st, key, true, r, rng);
  }
  if (closest < N) fail(`no-repeat ${N}: a sum came back after ${closest} others`);
  report.push(`no-repeat ${N} over ${questions} questions: closest repeat after ${closest === Infinity ? "none" : closest} others`);
};
windowCheck(100, 3000);
windowCheck(300, 4000);
windowCheck(100, 2000, { divisorDigits: 2 });

// 5. Wrong sums come back after gapMin..gapMax other questions, until right rightTimes times.
const wrongCheck = (gapMin, gapMax, rightTimes) => {
  const groups = keysOf({}), rules = { noRepeat: 100, gapMin, gapMax, rightTimes }, st = S.fresh(), rng = seeded(11);
  const target = groups[1][5];
  S.answered(st, target, false, rules, rng);
  let lastAt = 0, comebacks = 0;
  for (let i = 1; i < 400; i++) {
    const { key, repeat } = S.next(st, groups, rules, rng);
    if (key === target) {
      const gap = i - lastAt - 1;
      if (!repeat) fail("target came back as a random question");
      if (gap < gapMin - 1 || gap > gapMax) fail(`target came back after ${gap} others (rule ${gapMin}..${gapMax})`);
      comebacks++;
      lastAt = i;
      S.answered(st, key, comebacks !== 1, rules, rng); /* wrong again on the first comeback, then right */
    } else S.answered(st, key, true, rules, rng);
  }
  const want = rightTimes === 0 ? 0 : 1 + rightTimes;
  if (comebacks !== want) fail(`rule ${gapMin}..${gapMax} until right ${rightTimes}: came back ${comebacks} times, expected ${want}`);
  if (st.wrong[target]) fail("target still waiting after enough right answers");
  report.push(`wrong sum, rule ${gapMin}..${gapMax} until right ${rightTimes}: came back ${comebacks} times`);
};
wrongCheck(5, 10, 2);
wrongCheck(3, 3, 1);
wrongCheck(8, 20, 3);
wrongCheck(5, 10, 0);

// 6. The long division helper (public/js/longdiv.js): for every sum, the steps end with the right quotient and
//    remainder, each "?" cell count matches its answer, every cell is inside the grid, and × and − steps are right.
vm.runInContext(fs.readFileSync(path.join(root, "js/longdiv.js"), "utf8"), ctx, { filename: "js/longdiv.js" });
[1, 2].forEach((dd) => {
  let sums = 0;
  div.groups({ ...S.DEFAULTS, divisorDigits: dd }).flat().forEach(([n, d]) => {
    const L = ctx.LongDiv.build(n, d);
    sums++;
    if (L.q !== Math.floor(n / d) || L.r !== n % d) fail(`longdiv ${n} ÷ ${d}: ${L.q} r ${L.r}`);
    L.steps.forEach((s) => {
      if (s.kind !== "ask") { fail(`longdiv ${n} ÷ ${d}: unsolicited hint step`); return; }
      if (/does not go into|Use \d|How many \d+s in/.test(s.q)) fail(`longdiv ${n} ÷ ${d}: starting-number hint exposed`);
      if (!/^\d+$/.test(s.answer) || s.cells.length !== s.answer.length) fail(`longdiv ${n} ÷ ${d}: step "${s.q}" answer ${s.answer} in ${s.cells.length} cells`);
      s.cells.forEach(({ r, c }) => { if (r < 0 || r >= L.rows || c < 0 || c >= L.cols) fail(`longdiv ${n} ÷ ${d}: cell ${r},${c} outside the grid`); });
      const m = s.q.match(/^(\d+) × (\d+) = \?$/) || s.q.match(/^(\d+) − (\d+) = \?$/);
      if (m && String(s.q.includes("×") ? m[1] * m[2] : m[1] - m[2]) !== s.answer) fail(`longdiv ${n} ÷ ${d}: "${s.q}" answer ${s.answer}`);
    });
  });
  report.push(`long division helper, divisor digits ${dd}: ${sums} sums built and checked`);
});

console.log(report.join("\n"));
if (failures) { console.log(`\nFAILED ${failures}`); process.exit(1); }
console.log("\nALL PASSED");
