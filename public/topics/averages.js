/* Topic: Averages. Learn = blocks levelled step by step, with the book's own stories. */
(() => {
  const S = globalThis.Steps;
  const { STAMP, FROGS, cds, BOOK_TABLE } = S.pics;
  globalThis.Engine.registerTopic({
    id: "averages",
    title: "Averages",
    learn: {
      hint: "What is an average?",
      steps: () => [
        ...S.level([7, 11, 6], { ...STAMP, who: S.people(["Joan", "Artil", "Sandi"]) }),
        ...S.level([9, 5, 7], FROGS),
        ...cds(5, 6, "CDs"),
        ...S.missing(9, 8, 12),
        ...S.fromTotal(93, 3, "cm", "flowers", { rider: "🌷" }),
        ...S.table(BOOK_TABLE, ["max", "min"], true),
      ],
    },
  });
})();
