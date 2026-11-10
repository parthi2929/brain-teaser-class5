/* Test 26: division, money and fractions. 10 questions in book order. */
(() => {
  const E = globalThis.Engine, S = globalThis.Steps;
  const { int, pick, money, euro, frac, generator, question } = E;

  /* Lowest-terms fractions with denominator 3 to 9 and numerator above 1. */
  const FRACTIONS = [];
  for (let d = 3; d <= 9; d++) {
    for (let n = 2; n < d; n++) if (E.gcd(n, d) === 1) FRACTIONS.push([n, d]);
  }
  const ONE_PART_LEFT = FRACTIONS.filter(([n, d]) => d - n === 1);
  const SOME_PARTS_LEFT = FRACTIONS.filter(([n, d]) => d - n >= 2);

  const PEOPLE = [
    ["Aoife", "She", "she", "her"], ["Niamh", "She", "she", "her"],
    ["Emma", "She", "she", "her"], ["Orla", "She", "she", "her"],
    ["Sara", "She", "she", "her"], ["Grace", "She", "she", "her"],
    ["Cian", "He", "he", "his"], ["Liam", "He", "he", "his"],
    ["Conor", "He", "he", "his"], ["Sean", "He", "he", "his"],
    ["Adam", "He", "he", "his"], ["Jack", "He", "he", "his"],
  ];
  /* [one, many, picture] */
  const SHOP = [
    ["pencil", "pencils", "✏️"], ["rubber", "rubbers", "🧽"], ["sticker", "stickers", "⭐"],
    ["balloon", "balloons", "🎈"], ["sweet", "sweets", "🍬"], ["stamp", "stamps", "📮"],
    ["ruler", "rulers", "📏"], ["pen", "pens", "🖊️"],
  ];
  const TREATS = [
    ["bun", "buns", "🧁"], ["cake", "cakes", "🍰"], ["apple", "apples", "🍎"], ["bar", "bars", "🍫"],
    ["lollipop", "lollipops", "🍭"], ["biscuit", "biscuits", "🍪"], ["pear", "pears", "🍐"],
  ];
  const FRUIT = ["oranges", "apples", "plums", "pears", "lemons", "peaches"];
  const FRUIT_PIC = { oranges: "🍊", apples: "🍎", plums: "🟣", pears: "🍐", lemons: "🍋", peaches: "🍑" };
  const PACKS = [
    ["boxes", "eggs"], ["packets", "biscuits"], ["trays", "buns"],
    ["bags", "sweets"], ["boxes", "crayons"], ["packets", "stickers"],
  ];
  const BAGS = ["bags", "boxes", "nets", "trays"];
  const ONE = { boxes: "box", packets: "packet", trays: "tray", bags: "bag", nets: "net" };
  const HALF_PAIRS = [[12, 6], [8, 4], [30, 15], [10, 5], [40, 20], [6, 3], [16, 8], [24, 12]];
  const pile = (n, pic, name) => Array.from({ length: n }, () => ({ face: pic, name }));

  const GENERATORS = [
    generator("cost-of-one", () => {
      const n = int(3, 9);
      const each = int(11, Math.floor(99 / n));
      const total = n * each;
      if (n === 6 && total === 84) return null;
      const [one, many, pic] = pick(SHOP);
      return question([`${n} ${many} cost ${total}c. How much is one ${one}?`], "cents", each,
        { meta: { n, total }, vis: () => S.shareCoins(total, n, [10, 1], pile(n, pic, "1 " + one),
          { startEq: `${total}c → ${n} ${many}`, startHint: `Share the coins equally: 1 share for each ${one}.` }) });
    }),

    generator("how-many-for-money", () => {
      const price = 5 * int(2, 10);
      const count = int(4, 25);
      const total = price * count;
      if (total < 100 || total > 500) return null;
      if (price === 20 && total === 240) return null;
      const [one, many, pic] = pick(TREATS);
      const name = many[0].toUpperCase() + many.slice(1);
      return question([`${name} cost ${price}c each. How many can I buy for ${money(total)}?`], "count", count,
        { meta: { price, total }, vis: () => S.groupCoins(total, price, { one, pic }) });
    }),

    generator("how-many-boxes", () => {
      const d = int(3, 9);
      const count = int(Math.ceil(100 / d), Math.floor(999 / d));
      const total = d * count;
      if (d === 6 && total === 240) return null;
      const [box, item] = pick(PACKS);
      return question([`${total} ${item} are packed in ${box} of ${d}. How many ${box} are filled?`], "count", count,
        { meta: { d, total }, vis: () => S.bags(total, d, item, "bags", ONE[box], box) });
    }),

    generator("halve-money", () => {
      const half = 5 * int(21, 199);
      if (half % 100 === 0) return null;
      const total = 2 * half;
      if (total === 680) return null;
      const [many, few] = pick(HALF_PAIRS);
      const item = pick(FRUIT);
      return question([`${many} ${item} cost ${money(total)}. How much do ${few} ${item} cost?`], "euro", half,
        { meta: { many, few, total }, vis: () => S.shareCoins(total, 2, [100, 10, 5], pile(2, FRUIT_PIC[item], few + " " + item),
          { startEq: `${money(total)} → 2 halves`, startHint: `${few} is half of ${many}, so share the money into 2.`,
            endHint: `Half the ${item} cost half the money.` }) });
    }),

    generator("fraction-spent", () => {
      const [n, d] = pick(FRACTIONS);
      const part = int(4, 12);
      const total = d * part;
      if (total === 72 && n === 5 && d === 8) return null;
      const [name, , she] = pick(PEOPLE);
      return question([`${name} had ${euro(total)} and spent `, frac(n, d), ` of it. How much did ${she} spend?`],
        "euro", n * part * 100, { meta: { n, d, total }, vis: () => S.fractionOf(total, n, d, name) });
    }),

    generator("remainder", () => {
      const total = int(100, 999);
      const d = int(3, 9);
      const left = total % d;
      if (left === 0) return null;
      if (total === 150 && d === 9) return null;
      const item = pick(FRUIT);
      const bags = pick(BAGS);
      return question([`${total} ${item} are packed into ${bags} of ${d}. How many ${item} are left over?`], "count", left,
        { meta: { d, total }, vis: () => S.bags(total, d, item, "left", ONE[bags], bags) });
    }),

    generator("spent-from-left", () => {
      const [n, d] = pick(ONE_PART_LEFT);
      const left = int(5, 30);
      if (n * left > 160) return null;
      if (n === 3 && d === 4 && left === 24) return null;
      const [name, She, she, her] = pick(PEOPLE);
      return question([`${name} spent `, frac(n, d), ` of ${her} money. ${She} had ${euro(left)} left. How much did ${she} spend?`],
        "euro", n * left * 100, { meta: { n, d, left }, vis: () => S.spentFromLeft(n, d, left) });
    }),

    generator("bags-of-tens", () => {
      const d = 10 * int(2, 9);
      const count = int(3, 19);
      const total = d * count;
      if (total > 999) return null;
      if (d === 20 && total === 180) return null;
      const item = pick(FRUIT);
      const bags = pick(BAGS.slice(0, 2));
      return question([`A box holds ${total} ${item}. How many ${bags} of ${d} can be filled?`], "count", count,
        { meta: { d, total }, vis: () => S.bags(total, d, item, "bags", ONE[bags], bags) });
    }),

    generator("start-from-left", () => {
      const [n, d] = pick(SOME_PARTS_LEFT);
      const part = int(2, 12);
      const left = (d - n) * part;
      if (n === 5 && d === 8 && left === 15) return null;
      const [name, She, she, her] = pick(PEOPLE);
      return question([`${name} spent `, frac(n, d), ` of ${her} money. ${She} had ${euro(left)} left. How much had ${she} at the start?`],
        "euro", d * part * 100, { meta: { n, d, left }, vis: () => S.startFromLeft(n, d, left) });
    }),

    generator("change-then-divide", () => {
      const n = int(2, 9);
      const each = 5 * int(3, 19);
      const spent = n * each;
      if (n === 5 && each === 30) return null;
      const paid = pick([200, 500, 1000].filter((p) => p > spent));
      const change = paid - spent;
      const [one, many, pic] = pick(TREATS);
      return question([`I paid with ${money(paid)} for ${n} ${many} and got ${money(change)} change. How much was one ${one}?`],
        "cents", each, { meta: { n, paid, change },
          vis: () => S.shareCoins(spent, n, [100, 10, 5], pile(n, pic, "1 " + one),
            { startEq: `${money(paid)} − ${money(change)} = ${S.B(money(spent))}`,
              startHint: `Take away the change. The rest paid for ${n} ${many}.` }) });
    }),
  ];

  E.register({ id: "test-26", title: "Test 26", topic: "division", generators: GENERATORS });
})();
