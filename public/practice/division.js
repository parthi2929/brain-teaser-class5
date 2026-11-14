/* Quick practice for Division: one type. Each sum is a 3-digit number ÷ a 1-digit number (171 ÷ 9).
   About half the sums have a remainder; she answers in her copybook form, 52 r 3.
   groups(rules) returns lists of [N, D]; the scheduler picks a list at random (equal chance), then a sum in it.
   Admin only: rules.divisorDigits = 2 also adds 2-digit divisors (10 to 99). */
(() => {
  const E = globalThis.Engine;
  /* Every [N, D] with a 3-digit N, D from dMin to dMax, quotient at least 2, with or without a remainder. */
  const build = (dMin, dMax, withRemainder) => {
    const out = [];
    for (let n = 100; n <= 999; n++) {
      for (let d = dMin; d <= dMax; d++) {
        if (Math.floor(n / d) < 2) continue;
        if ((n % d !== 0) !== withRemainder) continue;
        out.push([n, d]);
      }
    }
    return out;
  };
  const cache = {};
  const list = (dMin, dMax, r) => (cache[`${dMin}-${dMax}-${r}`] ||= build(dMin, dMax, r));
  E.registerPractice({
    topic: "division",
    title: "Quick practice",
    types: [{
      id: "div",
      title: "Division",
      example: "171 ÷ 9",
      remainder: true,
      /* Equal chance for each list: half the sums have a remainder, whatever the divisor digits. */
      groups: (rules = {}) => (rules.divisorDigits === 2
        ? [list(2, 9, false), list(10, 99, false), list(2, 9, true), list(10, 99, true)]
        : [list(2, 9, false), list(2, 9, true)]),
    }],
  });
})();
