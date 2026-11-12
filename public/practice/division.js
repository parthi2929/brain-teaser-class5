/* Quick practice for Division. One entry per question type.
   pool()  every valid sum of the type, as [N, D] (built once, then kept)
   An answer with a remainder uses her copybook form: 28 r 12. */
(() => {
  const E = globalThis.Engine;
  /* All [N, D] with N from nMin to nMax and D from dMin to dMax, quotient at least 2, remainder rule. */
  const build = (nMin, nMax, dMin, dMax, withRemainder) => {
    const out = [];
    for (let n = nMin; n <= nMax; n++) {
      for (let d = dMin; d <= dMax; d++) {
        const q = Math.floor(n / d), r = n % d;
        if (q < 2) continue;
        if (withRemainder ? r === 0 : r !== 0) continue;
        out.push([n, d]);
      }
    }
    return out;
  };
  const type = (id, title, example, rule) => ({
    id, title, example, rule, remainder: rule[4],
    pool: () => build(...rule),
  });
  E.registerPractice({
    topic: "division",
    title: "Quick practice",
    types: [
      type("div-2d-1d", "2-digit ÷ 1-digit", "84 ÷ 6", [10, 99, 2, 9, false]),
      type("div-2d-1d-r", "2-digit ÷ 1-digit, remainder", "59 ÷ 4", [10, 99, 2, 9, true]),
      type("div-3d-1d", "3-digit ÷ 1-digit", "171 ÷ 9", [100, 999, 2, 9, false]),
      type("div-3d-1d-r", "3-digit ÷ 1-digit, remainder", "467 ÷ 8", [100, 999, 2, 9, true]),
      type("div-3d-2d", "3-digit ÷ 2-digit", "432 ÷ 18", [100, 999, 10, 99, false]),
      type("div-3d-2d-r", "3-digit ÷ 2-digit, remainder", "348 ÷ 15", [100, 999, 10, 99, true]),
    ],
  });
})();
