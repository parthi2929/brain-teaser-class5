/* Long division, copybook style (divisor ) dividend, quotient on top, bring down one digit at a time).
   No DOM code here, so the Node check builds every sum.

   build(n, d) returns { cols, rows, base, steps, q, r }:
     base   marks drawn from the start: divisor, ")" and the dividend
     steps  in order; each step is one of
       { kind: "ask", q: "How many 3s in 3?", cells: [{ r, c }], answer: "1", color, extra }
       { kind: "say", q: "9 does not go into 1. Use 17." }
     A mark is { r, c, x, color }. Row 0 = quotient, row 1 = dividend. extra = lines, signs and arrows that appear
     with the step's answer. Example 339 ÷ 3: 1 (3s in 3), 3 (1 × 3), 0 (3 − 3), bring down 3, 1, 3, 0, bring down 9, 3, 9, 0. */
globalThis.LongDiv = (() => {
  /* one colour per quotient digit, one per brought-down digit (as in her copybook picture) */
  const PLACE = ["#e3a92b", "#2ea7df", "#3fb97a", "#d6336c", "#8a5bd1"];
  const DOWN = ["#e8731a", "#8a5bd1", "#d6336c", "#2ea7df"];

  const build = (n, d) => {
    const digits = String(n).split("").map(Number);
    const ds = String(d);
    const c0 = ds.length + 1; /* first dividend column */
    const base = [];
    ds.split("").forEach((x, i) => base.push({ r: 1, c: i, x, color: "ink" }));
    base.push({ r: 1, c: ds.length, x: ")", color: "ink", bracket: true });
    digits.forEach((x, i) => base.push({ r: 1, c: c0 + i, x: String(x), color: "ink" }));
    const right = (num, r, cEnd, color) => String(num).split("").reverse().map((x, k) => ({ r, c: cEnd - k, x, color })).reverse();

    const steps = [];
    let cur = 0, started = false, row = 1, k = 0, rem = 0, qDigits = "";
    for (let i = 0; i < digits.length; i++) {
      const col = c0 + i;
      cur = i === 0 ? digits[0] : cur;
      const q = Math.floor(cur / d);
      if (!started && q === 0 && i < digits.length - 1) {
        steps.push({ kind: "say", q: `${d} does not go into ${cur}. Use ${cur}${digits[i + 1]}.` });
        cur = cur * 10 + digits[i + 1];
        continue;
      }
      started = true;
      const color = PLACE[k % PLACE.length];
      qDigits += q;
      steps.push({ kind: "ask", q: `How many ${d}s in ${cur}?`, cells: [{ r: 0, c: col }], answer: String(q), color });
      const prod = q * d, pr = row + 1;
      const width = Math.max(String(cur).length, String(prod).length);
      steps.push({
        kind: "ask", q: `${q} × ${d} = ?`, cells: right(prod, pr, col, color).map(({ r, c }) => ({ r, c })), answer: String(prod), color,
        extra: [{ r: pr, c: col - String(prod).length, x: "−", color: "ink" }, { line: true, r: pr, c0: col - width + 1, c1: col }],
      });
      rem = cur - prod;
      const rr = pr + 1;
      steps.push({ kind: "ask", q: `${cur} − ${prod} = ?`, cells: right(rem, rr, col, color).map(({ r, c }) => ({ r, c })), answer: String(rem), color });
      if (i < digits.length - 1) {
        const down = DOWN[k % DOWN.length];
        steps.push({
          kind: "ask", q: "Bring down the next digit.", cells: [{ r: rr, c: col + 1 }], answer: String(digits[i + 1]), color: down,
          extra: [{ arrow: true, c: col + 1, r0: 1, r1: rr, color: down }],
        });
        cur = rem * 10 + digits[i + 1];
      }
      row = rr;
      k++;
    }
    return { cols: c0 + digits.length + 1, rows: row + 1, base, steps, q: Number(qDigits), r: rem };
  };
  return { build };
})();
