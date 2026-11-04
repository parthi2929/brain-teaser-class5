// Runs the engine script from the page itself, so the check covers the published code.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const source = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const ctx = {};
vm.createContext(ctx);
vm.runInContext(source, ctx);
const E = ctx.PracticeEngine;

const RUNS = 20000;
const failures = [];
const fail = (type, msg, q) => {
  if (failures.length < 30) failures.push(`${type}: ${msg} | ${q ? q.text + " => " + q.answer : ""}`);
  failures.count = (failures.count || 0) + 1;
};
const assert = (cond, type, msg, q) => { if (!cond) fail(type, msg, q); };
const isInt = Number.isInteger;

// Reads the numbers from the words, so the words are checked against the stored answer.
const nums = (q) => (q.text.match(/\d+(?:·\d\d)?c?/g) || []).map((s) => {
  if (s.includes("·")) return Math.round(Number(s.replace("·", ".")) * 100);
  return Number(s.replace("c", ""));
});

const CHECKS = {
  "cost-of-one": (q) => {
    const [n, total] = nums(q);
    return q.kind === "cents" && n >= 3 && n <= 9 && total < 100 && isInt(q.answer) &&
      q.answer * n === total && !(n === 6 && total === 84);
  },
  "how-many-for-money": (q) => {
    const [price, total] = nums(q);
    return q.kind === "count" && price % 5 === 0 && total >= 100 && total <= 500 &&
      isInt(q.answer) && q.answer * price === total && !(price === 20 && total === 240);
  },
  "how-many-boxes": (q) => {
    const [total, d] = nums(q);
    return q.kind === "count" && d >= 3 && d <= 9 && total >= 100 && total <= 999 &&
      isInt(q.answer) && q.answer * d === total && !(d === 6 && total === 240);
  },
  "halve-money": (q) => {
    const [many, total, few] = nums(q);
    return q.kind === "euro" && many === 2 * few && total % 2 === 0 && q.answer * 2 === total &&
      q.answer % 100 !== 0 && q.answer >= 100 && isInt(q.answer) && total !== 680 && many !== 20;
  },
  "fraction-spent": (q) => {
    const [total, n, d] = nums(q);
    return q.kind === "euro" && d >= 3 && d <= 9 && n > 1 && n < d && total % d === 0 &&
      q.answer === (total / d) * n * 100 && q.answer % 100 === 0 &&
      !(total === 72 && n === 5 && d === 8);
  },
  remainder: (q) => {
    const [total, d] = nums(q);
    return q.kind === "count" && d >= 3 && d <= 9 && total >= 100 && total <= 999 &&
      q.answer === total % d && q.answer > 0 && !(total === 150 && d === 9);
  },
  "spent-from-left": (q) => {
    const [n, d, left] = nums(q);
    return q.kind === "euro" && d >= 3 && d <= 9 && n > 1 && n < d && left % (d - n) === 0 &&
      q.answer === (left / (d - n)) * n * 100 && q.answer % 100 === 0 &&
      !(n === 3 && d === 4 && left === 24);
  },
  "bags-of-tens": (q) => {
    const [total, d] = nums(q);
    return q.kind === "count" && d % 10 === 0 && total % d === 0 && q.answer * d === total &&
      q.answer < 20 && q.answer >= 1 && !(d === 20 && total === 180);
  },
  "start-from-left": (q) => {
    const [n, d, left] = nums(q);
    return q.kind === "euro" && d >= 3 && d <= 9 && n > 1 && n < d && left % (d - n) === 0 &&
      q.answer === (left / (d - n)) * d * 100 && q.answer % 100 === 0 &&
      !(n === 5 && d === 8 && left === 15);
  },
  "change-then-divide": (q) => {
    const [paid, n, change] = nums(q);
    const spent = paid - change;
    return q.kind === "cents" && n >= 2 && n <= 9 && change > 0 && spent % n === 0 &&
      q.answer === spent / n && isInt(q.answer) && q.answer < 100 && !(n === 5 && q.answer === 30);
  },
};

const test = E.TESTS[0];
assert(E.TESTS.length === 1 && test.id === "test-26" && test.generators.length === 10, "registry", "shape");

const order = Object.keys(CHECKS);
const report = [];
test.generators.forEach((gen, i) => {
  assert(gen.type === order[i], gen.type, `order: expected ${order[i]}`);
  const check = CHECKS[gen.type];
  let min = Infinity, max = -Infinity, replacedSame = 0;
  const seen = new Set();
  let prev = E.nextQuestion(gen);
  for (let r = 0; r < RUNS; r++) {
    const q = gen.make();
    assert(check(q), gen.type, "constraint", q);
    assert(q.kind === "count" ? isInt(q.answer) : isInt(q.answer) && q.answer > 0, gen.type, "not whole", q);
    assert(!/\.\d/.test(q.text), gen.type, "dot in money", q);
    seen.add(q.text);
    min = Math.min(min, q.answer);
    max = Math.max(max, q.answer);

    const next = E.nextQuestion(gen, prev);
    if (next.text === prev.text || next.answer === prev.answer) replacedSame++;
    assert(check(next), gen.type, "replacement constraint", next);
    assert(next.kind === prev.kind, gen.type, "replacement kind", next);
    prev = next;

    // The right answer must pass and a nearby value must fail, in the exact form the child types.
    const typed = q.kind === "euro" ? (q.answer / 100).toFixed(2) : String(q.answer);
    assert(E.check(q, typed) === "right", gen.type, `right value rejected: ${typed}`, q);
    const off = q.kind === "euro" ? ((q.answer + 5) / 100).toFixed(2) : String(q.answer + 1);
    assert(E.check(q, off) === "wrong", gen.type, `wrong value accepted: ${off}`, q);
  }
  assert(replacedSame === 0, gen.type, `replacement repeated ${replacedSame} times`);
  report.push(`${String(i + 1).padStart(2)} ${gen.type.padEnd(20)} kind=${prev.kind.padEnd(5)} distinct=${String(seen.size).padStart(5)} answer ${min}..${max}  e.g. ${gen.make().text}`);
});

// Answer forms.
const money = { kind: "euro", answer: 340 };
const cents = { kind: "cents", answer: 30 };
const whole = { kind: "euro", answer: 4500 };
const count = { kind: "count", answer: 12 };
const FORMS = [
  [money, "3.40", "right"], [money, "3·40", "right"], [money, "€3.40", "right"], [money, "3,40", "right"],
  [money, "€3·40", "right"], [money, " 3.4 ", "right"], [money, "340c", "right"], [money, "3.40 euro", "right"],
  [money, "340", "wrong"], [money, "3", "wrong"], [money, "3.41", "wrong"], [money, "3.405", "wrong"],
  [money, "3.400", "right"], [money, "abc", "unclear"], [money, "3..40", "unclear"], [money, "€", "unclear"],
  [cents, "30", "right"], [cents, "30c", "right"], [cents, "0.30", "right"], [cents, "€0.30", "right"],
  [cents, "0,30", "right"], [cents, "0·30", "right"], [cents, ".30", "right"], [cents, "0.3", "right"],
  [cents, "30 cents", "right"], [cents, "€30", "wrong"], [cents, "30.00", "wrong"], [cents, "31", "wrong"],
  [cents, "30.5c", "wrong"], [cents, "€30c", "unclear"],
  [whole, "45", "right"], [whole, "€45", "right"], [whole, "45.00", "right"], [whole, "45,00", "right"],
  [whole, "45·00", "right"], [whole, "4500c", "right"], [whole, "45 euro", "right"], [whole, "44", "wrong"],
  [count, "12", "right"], [count, "12 buns", "right"], [count, "12.0", "right"], [count, "12.5", "wrong"],
  [count, "13", "wrong"], [count, "€12", "unclear"], [count, "twelve", "unclear"],
];
FORMS.forEach(([q, raw, want]) => {
  const got = E.check(q, raw);
  assert(got === want, "forms", `"${raw}" kind=${q.kind} expected ${want}, got ${got}`);
});

// Whole-cent reading has no floating-point step: every amount up to €20 reads back exactly.
for (let c = 1; c <= 2000; c++) {
  const raw = (c / 100).toFixed(2);
  assert(E.readCents(raw, "euro") === c, "cents", `${raw} read as ${E.readCents(raw, "euro")}`);
}

console.log(report.join("\n"));
console.log(`\nruns per generator: ${RUNS}, answer forms: ${FORMS.length}`);
if (failures.count) {
  console.log(`\nFAILED ${failures.count}\n` + failures.join("\n"));
  process.exit(1);
}
console.log("ALL PASSED");
