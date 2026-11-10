/* Test 17, Data 1 (averages). 10 questions in book order. Also holds the Learn lesson and her answers. */
(() => {
  const E = globalThis.Engine, S = globalThis.Steps;
  const { int, pick, sum, generator, question } = E;

  const NAMES = ["Joan", "Artil", "Sandi", "Aoife", "Cian", "Niamh", "Liam", "Orla", "Sean", "Emma", "Conor", "Grace"];
  const andList = (l) => l.slice(0, -1).join(", ") + " and " + l[l.length - 1];
  const STAMP = {
    skin: "stamp",
    moveHint: "Average = share the stamps fairly until all have the same.",
    doneHint: "Everyone has the same now. That is the average.",
  };
  const FROGS = {
    horiz: true, rider: "🐸", skin: "cm", unit: "cm",
    who: ["A", "B", "C"].map((x) => ({ name: "Frog " + x })),
    moveHint: "Average jump = if all the frogs jumped the same.",
    doneHint: "All jumps are the same now. That is the average jump.",
  };
  const THINGS = { CDs: "💿", books: "📕", games: "🎮", tickets: "🎟️" };
  const cdsVis = (n, avg, thing) => S.total(n, avg, "€", "", thing, {
    skin: "coin", who: Array.from({ length: n }, (_, k) => ({ face: THINGS[thing], name: thing.replace(/s$/, "") + " " + (k + 1) })),
  });

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
      { text: `${TABLE_TEXT[ask]} [${tb.home} | ${tb.away}]`, table: tb, meta: { tb, ask }, vis: () => S.table(tb, [ask]) });
  });

  const avg2 = generator("average-of-2", () => {
    const avg = int(4, 15), d = int(1, 4), l = [avg + d, avg - d];
    if (Math.random() < 0.5) l.reverse();
    return question([`What is the average of ${l[0]} and ${l[1]}?`], "count", avg, { meta: { l }, vis: () => S.level(l) });
  });

  const GENERATORS = [
    avg2,
    avg2,
    generator("stamps", () => {
      const l = nums(3, int(5, 12));
      const p = E.shuffle(NAMES).slice(0, 3);
      return question([`${p[0]} has ${l[0]} stamps, ${p[1]} has ${l[1]} and ${p[2]} has ${l[2]}. What is the average number of stamps?`],
        "count", sum(l) / 3, { meta: { l }, vis: () => S.level(l, { ...STAMP, who: S.people(p) }) });
    }),
    generator("frogs", () => {
      const l = nums(3, int(4, 12));
      return question([`Frog A jumped ${l[0]}cm, Frog B jumped ${l[1]}cm and Frog C jumped ${l[2]}cm. What was the average distance jumped?`],
        "count", sum(l) / 3, { post: "cm", meta: { l }, vis: () => S.level(l, FROGS) });
    }),
    generator("average-of-4", () => {
      const l = nums(4, int(4, 12)).sort((a, b) => a - b);
      return question([`Find the average of ${andList(l)}.`], "count", sum(l) / 4, { meta: { l }, vis: () => S.level(l) });
    }),
    generator("total-cost", () => {
      const n = int(3, 8), avg = int(4, 12), thing = pick(Object.keys(THINGS));
      if (n === 5 && avg === 6) return null;
      return question([`The average cost of ${n} ${thing} is €${avg}. Find the total cost.`], "euro", n * avg * 100,
        { meta: { n, avg }, vis: () => cdsVis(n, avg, thing) });
    }),
    tableGen("max"),
    tableGen("min"),
    tableGen("home"),
    tableGen("away"),
  ];

  /* The Learn lesson and her Test 17 answers use the book's own numbers. */
  const BOOK = { home: [5, 3, 2, 6], away: [4, 5, 1, 2] };
  const stampsBook = () => S.level([7, 11, 6], { ...STAMP, who: S.people(["Joan", "Artil", "Sandi"]) });
  const learn = () => [
    ...stampsBook(),
    ...S.level([9, 5, 7], FROGS),
    ...cdsVis(5, 6, "CDs"),
    ...S.missing(9, 8, 12),
    ...S.fromTotal(93, 3, "cm", "flowers", { rider: "🌷" }),
    ...S.table(BOOK, ["max", "min"], true),
  ];
  const her = [
    { q: "8 and 6", her: "7", ok: true, vis: () => S.level([8, 6]) },
    { q: "9 and 7", her: "8", ok: true, vis: () => S.level([9, 7]) },
    { q: "stamps 7, 11, 6", her: "24 ÷ 3 = 8", ok: true, vis: stampsBook },
    { q: "frogs 9, 5, 7", her: "21 ÷ 3 = 7", ok: true, vis: () => S.level([9, 5, 7], FROGS) },
    { q: "5, 6, 8, 9", her: "28", ok: false, right: "7", vis: () => S.level([5, 6, 8, 9], { her: 28 }) },
    { q: "5 CDs, average €6", her: "30", ok: true, vis: () => cdsVis(5, 6, "CDs") },
    { q: "greatest in a game", her: "9", ok: false, right: "6", vis: () => S.table(BOOK, ["max"], true) },
    { q: "least in a game", her: "3", ok: false, right: "1", vis: () => S.table(BOOK, ["min"], true) },
    { q: "home average", her: "4", ok: true, vis: () => S.table(BOOK, ["home"]) },
    { q: "away average", her: "3", ok: true, vis: () => S.table(BOOK, ["away"]) },
  ];

  E.register({ id: "test-17", title: "Test 17", topic: "Averages", generators: GENERATORS, learn, her });
})();
