// Loads the same scripts as index.html (engine, steps and every test file listed there) and checks every generator.
// Run: node tests/check-generators.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..", "public");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const files = [...html.matchAll(/<script src="((?:js\/(?:engine|steps|work)|topics\/[^"]+|tests\/[^"]+)\.js)"><\/script>/g)].map((m) => m[1]);
const ctx = {};
vm.createContext(ctx);
files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f }));
const E = ctx.Engine;

const RUNS = 10000;
const failures = [];
const fail = (type, msg, q) => {
  if (failures.length < 30) failures.push(`${type}: ${msg} | ${q ? q.text + " => " + q.answer : ""}`);
  failures.count = (failures.count || 0) + 1;
};
const assert = (cond, type, msg, q) => { if (!cond) fail(type, msg, q); };
const isInt = Number.isInteger;
const sum = (l) => l.reduce((s, x) => s + x, 0);

// Each check reads the numbers back from q.meta and confirms the stored answer.
const CHECKS = {
  // Test 17
  "average-of-2": (q) => q.meta.l.length === 2 && sum(q.meta.l) / 2 === q.answer,
  stamps: (q) => sum(q.meta.l) / 3 === q.answer,
  frogs: (q) => sum(q.meta.l) / 3 === q.answer && q.post === "cm",
  "average-of-4": (q) => sum(q.meta.l) / 4 === q.answer,
  "total-cost": (q) => q.kind === "euro" && q.answer === q.meta.n * q.meta.avg * 100,
  "table-max": (q) => q.answer === Math.max(...q.meta.tb.home, ...q.meta.tb.away),
  "table-min": (q) => q.answer === Math.min(...q.meta.tb.home, ...q.meta.tb.away),
  "table-home": (q) => q.answer === sum(q.meta.tb.home) / 4,
  "table-away": (q) => q.answer === sum(q.meta.tb.away) / 4,
  // Test 18
  flowers: (q) => q.meta.total / q.meta.n === q.answer && q.post === "cm",
  "missing-number": (q) => q.meta.a + q.meta.b + q.answer === 3 * q.meta.avg,
  "average-of-5": (q) => q.meta.l.length === 5 && sum(q.meta.l) / 5 === q.answer,
  "total-weight": (q) => q.meta.n * q.meta.avg === q.answer && q.post === "kg",
  // Test 26
  "cost-of-one": (q) => q.kind === "cents" && q.answer * q.meta.n === q.meta.total && q.meta.total < 100,
  "how-many-for-money": (q) => q.kind === "count" && q.answer * q.meta.price === q.meta.total && q.meta.total >= 100 && q.meta.total <= 500,
  "how-many-boxes": (q) => q.kind === "count" && q.answer * q.meta.d === q.meta.total && q.meta.total >= 100 && q.meta.total <= 999,
  "halve-money": (q) => q.kind === "euro" && q.answer * 2 === q.meta.total && q.answer % 100 !== 0 && q.meta.many === 2 * q.meta.few,
  "fraction-spent": (q) => q.kind === "euro" && q.meta.total % q.meta.d === 0 && q.answer === (q.meta.total / q.meta.d) * q.meta.n * 100,
  remainder: (q) => q.kind === "count" && q.answer === q.meta.total % q.meta.d && q.answer > 0,
  "spent-from-left": (q) => q.kind === "euro" && q.meta.d - q.meta.n === 1 && q.answer === q.meta.n * q.meta.left * 100,
  "bags-of-tens": (q) => q.kind === "count" && q.meta.d % 10 === 0 && q.answer * q.meta.d === q.meta.total,
  "start-from-left": (q) => q.kind === "euro" && q.meta.left % (q.meta.d - q.meta.n) === 0 &&
    q.answer === (q.meta.left / (q.meta.d - q.meta.n)) * q.meta.d * 100,
  "change-then-divide": (q) => q.kind === "cents" && q.meta.paid - q.meta.change === q.answer * q.meta.n && q.meta.change > 0,
};

// The working must end with a final line equal to the answer, every blank must take its own value,
// and every picture index must exist.
const fmt = (kind, v) => (kind === "euro" ? (v / 100).toFixed(2) : String(v));
const checkWork = (q, type) => {
  const w = q.work();
  assert(w && Array.isArray(w.steps) && w.steps.length > 0 && Array.isArray(w.lines), type, "no working", q);
  const last = w.lines[w.lines.length - 1];
  assert(last.final === q.answer, type, `final ${last.final} != answer ${q.answer}`, q);
  assert(/\?$/.test(last.parts.join("")), type, "final line must end with ?", q);
  w.lines.forEach((l, i) => {
    if (i < w.lines.length - 1) assert(l.final === undefined, type, "final before the end", q);
    [l.pic, l.picDone].forEach((k) => assert(k === undefined || (k >= 0 && k < w.steps.length), type, `pic ${k} missing`, q));
    (l.parts || []).forEach((p) => {
      if (typeof p !== "object") return;
      assert(isInt(p.ask) && p.ask >= 0, type, `blank not whole: ${p.ask}`, q);
      assert(E.check({ kind: p.kind, answer: p.ask }, fmt(p.kind, p.ask)) === "right", type, `blank ${p.ask} not readable`, q);
    });
  });
  w.steps.forEach((s) => assert(typeof s.mode === "string", type, "step without mode", q));
  const lastPic = w.steps[w.steps.length - 1];
  if (lastPic.mode === "coins") assert(lastPic.hideValues, type, "coin values shown on the last picture", q);
};

const report = [];
E.TESTS.forEach((test) => {
  report.push(`\n${test.title} (${test.generators.length} questions)`);
  test.generators.forEach((gen, i) => {
    const check = CHECKS[gen.type];
    assert(!!check, gen.type, "no check for this type");
    let min = Infinity, max = -Infinity, replacedSame = 0;
    const seen = new Set();
    let prev = E.nextQuestion(gen);
    for (let r = 0; r < RUNS; r++) {
      const q = gen.make();
      assert(check && check(q), gen.type, "constraint", q);
      assert(isInt(q.answer) && q.answer >= 0, gen.type, "not whole", q);
      assert(!/\.\d/.test(q.text), gen.type, "dot in text", q);
      checkWork(q, gen.type);
      seen.add(q.text);
      min = Math.min(min, q.answer);
      max = Math.max(max, q.answer);

      const next = E.nextQuestion(gen, prev);
      if (next.text === prev.text || next.answer === prev.answer) replacedSame++;
      assert(next.kind === prev.kind, gen.type, "replacement kind", next);
      prev = next;

      // The right answer passes and a nearby value fails, in the form the child types.
      const typed = q.kind === "euro" ? (q.answer / 100).toFixed(2) : String(q.answer) + (q.post || "");
      assert(E.check(q, typed) === "right", gen.type, `right value rejected: ${typed}`, q);
      const off = q.kind === "euro" ? ((q.answer + 5) / 100).toFixed(2) : String(q.answer + 1);
      assert(E.check(q, off) === "wrong", gen.type, `wrong value accepted: ${off}`, q);
    }
    assert(replacedSame === 0, gen.type, `replacement repeated ${replacedSame} times`);
    report.push(`${String(i + 1).padStart(2)} ${gen.type.padEnd(20)} ${prev.kind.padEnd(5)} distinct=${String(seen.size).padStart(5)} answer ${min}..${max}  e.g. ${gen.make().text}`);
  });
});

// Answer forms.
const money = { kind: "euro", answer: 340 };
const cents = { kind: "cents", answer: 30 };
const count = { kind: "count", answer: 12 };
const FORMS = [
  [money, "3.40", "right"], [money, "3·40", "right"], [money, "€3.40", "right"], [money, "3,40", "right"],
  [money, "340c", "right"], [money, "340", "wrong"], [money, "3.41", "wrong"], [money, "abc", "unclear"],
  [cents, "30", "right"], [cents, "30c", "right"], [cents, "0.30", "right"], [cents, "€30", "wrong"],
  [count, "12", "right"], [count, "12cm", "right"], [count, "12 kg", "right"], [count, "12.5", "wrong"],
  [count, "13", "wrong"], [count, "€12", "unclear"],
];
FORMS.forEach(([q, raw, want]) => {
  const got = E.check(q, raw);
  assert(got === want, "forms", `"${raw}" kind=${q.kind} expected ${want}, got ${got}`);
});

console.log(`files: ${files.join(", ")}`);
console.log(report.join("\n"));
console.log(`\nruns per generator: ${RUNS}, answer forms: ${FORMS.length}`);
if (failures.count) {
  console.log(`\nFAILED ${failures.count}\n` + failures.join("\n"));
  process.exit(1);
}
console.log("ALL PASSED");
