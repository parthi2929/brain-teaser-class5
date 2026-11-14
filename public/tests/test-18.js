/* Test 18, Data 1 (averages). Questions 1 to 4 from the book photo; the rest of the page is not yet known. */
(() => {
  const E = globalThis.Engine, W = globalThis.Work;
  const { int, sum, generator, question } = E;
  const andList = (l) => l.slice(0, -1).join(", ") + " and " + l[l.length - 1];

  const GENERATORS = [
    generator("flowers", () => {
      const n = 3, avg = int(12, 40), total = n * avg;
      if (total === 93) return null;
      return question([`The total height of ${n} flowers is ${total}cm. Find the average height of a flower.`], "count", avg,
        { post: "cm", meta: { n, total }, work: () => W.fromTotal(total, n, "cm", "flowers", { rider: "🌷" }) });
    }),
    generator("missing-number", () => {
      const avg = int(5, 15), a = int(2, 2 * avg - 2), b = int(2, 2 * avg - 2), c = 3 * avg - a - b;
      if (c < 1 || (a === avg && b === avg) || (avg === 9 && a === 8 && b === 12)) return null;
      return question([`The average of three numbers is ${avg}. Two of the numbers are ${a} and ${b}. What is the third number?`],
        "count", c, { meta: { avg, a, b }, work: () => W.missing(avg, a, b) });
    }),
    generator("average-of-5", () => {
      const avg = int(4, 12);
      for (;;) {
        const l = Array.from({ length: 4 }, () => int(Math.max(1, avg - 6), avg + 6));
        const last = 5 * avg - sum(l);
        if (last < 1 || last > avg + 8) continue;
        l.push(last);
        if (new Set(l).size === 1) continue;
        l.sort((x, y) => x - y);
        if (l.join() === "4,6,8,10,12") return null;
        return question([`What is the average of ${andList(l)}?`], "count", avg, { meta: { l }, work: () => W.average(l) });
      }
    }),
    generator("total-weight", () => {
      const n = 4, avg = int(20, 40);
      if (avg === 25) return null;
      return question([`The average weight of ${n} girls is ${avg}kg. Find the total weight.`], "count", n * avg,
        { post: "kg", meta: { n, avg },
          work: () => W.total(n, avg, "", "kg", "girls", { who: Array.from({ length: n }, (_, k) => ({ face: "👧", name: "girl " + (k + 1) })) }) });
    }),
  ];

  E.register({ id: "test-18", title: "Test 18", topic: "averages", generators: GENERATORS });
})();
