/* Test 17, Data 1 (averages). 10 questions in book order. */
(() => {
  const E = globalThis.Engine, S = globalThis.Steps, W = globalThis.Work;
  const { int, pick, sum, generator, question } = E;

  const NAMES = ["Joan", "Artil", "Sandi", "Aoife", "Cian", "Niamh", "Liam", "Orla", "Sean", "Emma", "Conor", "Grace"];
  const andList = (l) => l.slice(0, -1).join(", ") + " and " + l[l.length - 1];
  const { STAMP, FROGS, THINGS } = S.pics;

  /* n whole numbers with the given average, not all the same. */
  const nums = (n, avg) => {
    for (;;) {
      const l = Array.from({ length: n - 1 }, () => int(Math.max(1, avg - 6), avg + 6));
      const last = n * avg - sum(l);
      if (last < 1 || last > avg + 8) continue;
      l.push(last);
      if (new Set(l).size > 1) return l;
    }
  };
  /* 8 games, each row has a whole-number average, one greatest and one least cell. */
  const makeTable = () => {
    /* One cell holds the least (lo), one cell the greatest (hi); the others sit between.
       lo and hi change from table to table, so a new question has a new answer.
       Then one middle cell per row is set so the row total divides by 4. */
    for (;;) {
      const lo = int(0, 3), hi = lo + int(5, 6);
      const cells = Array.from({ length: 8 }, () => int(lo + 1, hi - 1));
      const [a, b] = E.shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
      cells[a] = lo;
      cells[b] = hi;
      let ok = true;
      [0, 4].forEach((start) => {
        const row = cells.slice(start, start + 4);
        const free = [0, 1, 2, 3].find((k) => start + k !== a && start + k !== b);
        const rest = sum(row) - row[free];
        const choices = [];
        for (let v = lo + 1; v <= hi - 1; v++) if ((rest + v) % 4 === 0) choices.push(v);
        if (!choices.length) ok = false;
        else cells[start + free] = pick(choices);
      });
      if (ok) return { home: cells.slice(0, 4), away: cells.slice(4) };
    }
  };
  const TABLE_TEXT = {
    max: "What was the greatest number of goals scored in a game?",
    min: "What was the least number of goals scored in a game?",
    home: "What was the average of goals scored in home games?",
    away: "What was the average of goals scored in away games?",
  };
  const tableGen = (ask) => generator("table-" + ask, () => {
    const tb = makeTable(), all = [...tb.home, ...tb.away];
    const answer = { max: Math.max(...all), min: Math.min(...all), home: sum(tb.home) / 4, away: sum(tb.away) / 4 }[ask];
    /* text includes the table, so a new table counts as a new question. */
    return question([TABLE_TEXT[ask]], "count", answer,
      { text: `${TABLE_TEXT[ask]} [${tb.home} | ${tb.away}]`, table: tb, meta: { tb, ask },
        work: () => W.table(tb, ask, { skin: "ball", who: tb[ask === "away" ? "away" : "home"].map((_, c) => ({ face: "🥅", name: "game " + ((ask === "away" ? 5 : 1) + c) })) }) });
  });

  const avg2 = generator("average-of-2", () => {
    const avg = int(4, 15), d = int(1, 4), l = [avg + d, avg - d];
    if (Math.random() < 0.5) l.reverse();
    return question([`What is the average of ${l[0]} and ${l[1]}?`], "count", avg, { meta: { l }, work: () => W.average(l) });
  });

  const GENERATORS = [
    avg2,
    avg2,
    generator("stamps", () => {
      const l = nums(3, int(5, 12));
      if (Math.min(...l) < 2) return null;
      const p = E.shuffle(NAMES).slice(0, 3);
      return question([`${p[0]} has ${l[0]} stamps, ${p[1]} has ${l[1]} and ${p[2]} has ${l[2]}. What is the average number of stamps?`],
        "count", sum(l) / 3, { meta: { l }, work: () => W.average(l, { ...STAMP, who: S.people(p) }, { many: "children" }) });
    }),
    generator("frogs", () => {
      const l = nums(3, int(4, 12));
      return question([`Frog A jumped ${l[0]}cm, Frog B jumped ${l[1]}cm and Frog C jumped ${l[2]}cm. What was the average distance jumped?`],
        "count", sum(l) / 3, { post: "cm", meta: { l }, work: () => W.average(l, FROGS, { many: "frogs", unit: "cm" }) });
    }),
    generator("average-of-4", () => {
      const l = nums(4, int(4, 12)).sort((a, b) => a - b);
      return question([`Find the average of ${andList(l)}.`], "count", sum(l) / 4, { meta: { l }, work: () => W.average(l) });
    }),
    generator("total-cost", () => {
      const n = int(3, 8), avg = int(4, 12), thing = pick(Object.keys(THINGS));
      if (n === 5 && avg === 6) return null;
      return question([`The average cost of ${n} ${thing} is €${avg}. Find the total cost.`], "euro", n * avg * 100,
        { meta: { n, avg }, work: () => W.total(n, avg, "€", "", thing, { skin: "coin",
          who: Array.from({ length: n }, (_, k) => ({ face: THINGS[thing], name: thing.replace(/s$/, "") + " " + (k + 1) })) }) });
    }),
    tableGen("max"),
    tableGen("min"),
    tableGen("home"),
    tableGen("away"),
  ];

  E.register({ id: "test-17", title: "Test 17", topic: "averages", generators: GENERATORS });
})();
