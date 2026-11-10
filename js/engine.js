/* Shared question engine. It has no DOM code, so the Node check runs the same file.

   A test file calls Engine.register({ id, title, generators }).
   A generator is Engine.generator(type, make). make() returns a question, or null to try again.
   A question is Engine.question(parts, kind, answer, extra):
     parts   question text: strings and {n, d} fractions
     kind    "cents": a bare number means cents, the box shows c
             "euro":  a bare number means euro, the box shows €; answer is in cents
             "count": a whole number; extra.post is a unit shown after the box (cm, kg)
     answer  whole cents for "cents" and "euro", whole number for "count"
     extra   meta (numbers for the Node check), post, table, vis (a function that returns visual steps) */
globalThis.Engine = (() => {
  const int = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const shuffle = (list) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const sum = (l) => l.reduce((s, x) => s + x, 0);
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);

  /* Book-style money: 84c below one euro, otherwise €6·80. */
  const money = (cents) => {
    if (cents < 100) return cents + "c";
    return "€" + Math.floor(cents / 100) + "·" + String(cents % 100).padStart(2, "0");
  };
  const euro = (whole) => "€" + whole;
  const frac = (n, d) => ({ n, d });

  const question = (parts, kind, answer, extra = {}) => ({
    parts,
    text: parts.map((p) => (typeof p === "string" ? p : p.n + "/" + p.d)).join(""),
    kind,
    answer,
    meta: {},
    post: "",
    ...extra,
  });

  /* Wraps a maker: it tries again until the numbers are valid. */
  const generator = (type, make) => ({
    type,
    make() {
      for (;;) {
        const q = make();
        if (q) return q;
      }
    },
  });

  const TESTS = [];
  const register = (test) => TESTS.push(test);

  /* A new question for a slot. With prev, the words and the answer both change. */
  const nextQuestion = (gen, prev) => {
    let q = gen.make();
    if (!prev) return q;
    for (let i = 0; i < 200 && (q.text === prev.text || q.answer === prev.answer); i++) q = gen.make();
    return q;
  };

  const tidy = (raw) =>
    String(raw).trim().toLowerCase().replace(/[·•∙⋅,]/g, ".").replace(/\s+/g, "");

  /* Reads money as whole cents, with no floating-point step.
     Returns null when no amount can be read, NaN when it is not a whole number of cents. */
  const readCents = (raw, kind) => {
    const m = tidy(raw).match(/^(€|euros?|eur)?(\d*)(?:\.(\d*))?(€|euros?|eur|cents?|c)?$/);
    if (!m) return null;
    const [, before, whole, part, after] = m;
    if (!whole && !part) return null;
    if (whole.length > 7) return NaN;
    const isCentMark = !!after && after[0] === "c";
    const isEuroMark = !!before || (!!after && !isCentMark);
    if (isCentMark && before) return null;
    const hasPoint = part !== undefined;
    if (isCentMark || (!isEuroMark && !hasPoint && kind === "cents")) {
      if (hasPoint && /[1-9]/.test(part)) return NaN;
      return Number(whole || "0");
    }
    const places = part || "";
    if (/[1-9]/.test(places.slice(2))) return NaN;
    return Number(whole || "0") * 100 + Number(places.slice(0, 2).padEnd(2, "0"));
  };

  /* Reads a count. Words after the number are allowed: 12 buns, 31cm. */
  const readCount = (raw) => {
    const m = tidy(raw).match(/^(\d+)(?:\.(\d*))?[a-z]*$/);
    if (!m) return null;
    if (m[1].length > 7) return NaN;
    if (m[2] && /[1-9]/.test(m[2])) return NaN;
    return Number(m[1]);
  };

  /* Returns "right", "wrong", or "unclear" when the box holds no number. */
  const check = (q, raw) => {
    const value = q.kind === "count" ? readCount(raw) : readCents(raw, q.kind);
    if (value === null) return "unclear";
    return value === q.answer ? "right" : "wrong";
  };

  return {
    TESTS, register, generator, question, nextQuestion, check, readCents, readCount,
    int, pick, shuffle, sum, gcd, money, euro, frac,
  };
})();
