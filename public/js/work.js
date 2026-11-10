/* Copybook working for the 👀 helper. No DOM code here, so the Node check builds every working.
   A working is { steps, lines }:
     steps  pictures from js/steps.js (shown beside the working, never with the final answer)
     lines  the working, top to bottom:
       { say: "average = total ÷ how many" }            the rule in words
       { parts: ["total = 7 + 11 + 6 = ", ask(24)] }      she fills each blank, then Check
       { parts: ["average = 24 ÷ 3 = ?"], final: 8 }      the last step: she types it in the answer box
     Each line can name a picture: pic (while she works on it) and picDone (after it is right). */
globalThis.Work = (() => {
  const S = globalThis.Steps;
  const sum = (l) => l.reduce((s, x) => s + x, 0);
  const ask = (value, kind = "count") => ({ ask: value, kind });
  const euroAsk = (cents) => ask(cents, "euro");
  const money = S.money;
  const hide = (step, extra = {}) => ({ ...step, interactive: false, ...extra });

  /* Division in copybook form, tens first: 84 ÷ 6 → 60 ÷ 6, 24 ÷ 6, 10 + 4.
     Returns working lines; the last one is final. unit is "", "c" or "cm". */
  const divide = (T, n, unit = "", pics = {}) => {
    const q1 = Math.floor(T / (10 * n)), A = 10 * n * q1, r = T - A;
    if (q1 === 0) return [{ parts: [`${T}${unit} ÷ ${n} = ?`], final: T / n, pic: pics.final }];
    if (r === 0) {
      return [
        { parts: [`${T / 10} tens ÷ ${n} = `, ask(q1), " tens"], pic: pics.tens },
        { parts: [`${T}${unit} ÷ ${n} = ?`], final: T / n, pic: pics.final },
      ];
    }
    return [
      { say: `${T} = ${A} + ${r}` },
      { parts: [`${A}${unit} ÷ ${n} = `, ask(10 * q1), unit], pic: pics.tens },
      { parts: [`${r}${unit} ÷ ${n} = `, ask(r / n), unit], pic: pics.ones },
      { parts: [`${10 * q1}${unit} + ${r / n}${unit} = ?`], final: T / n, pic: pics.final },
    ];
  };

  /* Multiplication in copybook form, tens first: 38 × 4 → 30 × 4, 8 × 4, 120 + 32. */
  const multiply = (a, b, pre = "", post = "", pic, scale = 1) => {
    const t = a - (a % 10), o = a % 10;
    const m = (v) => pre + v + post;
    if (a < 10 || o === 0) return [{ parts: [`${m(a)} × ${b} = ?`], final: a * b * scale, pic }];
    return [
      { parts: [`${m(t)} × ${b} = ${pre}`, ask(t * b), post], pic },
      { parts: [`${m(o)} × ${b} = ${pre}`, ask(o * b), post], pic },
      { parts: [`${m(t * b)} + ${m(o * b)} = ?`], final: a * b * scale, pic },
    ];
  };

  /* ---------- averages ---------- */
  /* nums: the numbers to average; o: picture options for S.level; words: what is averaged. */
  const average = (nums, o = {}, words = {}) => {
    const lv = S.level(nums, o);
    const k = o.horiz ? 1 : 0;
    const steps = [hide(lv[k]), lv[k + 1], hide(lv[k + 2], { hideLabels: true })];
    const n = nums.length, tot = sum(nums);
    const blanks = [];
    nums.forEach((v, i) => blanks.push(...(i ? [" + "] : []), ask(v)));
    return {
      steps,
      lines: [
        { say: `average = total ÷ how many ${words.many || "numbers"}`, pic: 0 },
        { parts: ["average = (", ...blanks, ") ÷ ", ask(n)], pic: 0 },
        { parts: [`total = ${nums.join(" + ")} = `, ask(tot)], pic: 0, picDone: 1 },
        ...divide(tot, n, words.unit || "", { tens: 1, ones: 1, final: 2 }),
      ],
    };
  };

  const total = (n, avg, pre, post, thing, o) => {
    const t = S.total(n, avg, pre, post, thing, o);
    const steps = [t[0], hide(t[1], { hideLabels: true })];
    return {
      steps,
      lines: [
        { say: `total = average × how many ${thing}`, pic: 0 },
        { parts: ["total = ", pre, ask(avg), post, " × ", ask(n)], pic: 0 },
        ...multiply(avg, n, pre, post, 1, pre === "€" ? 100 : 1),
      ],
    };
  };

  const fromTotal = (tot, n, unit, thing, o) => {
    const t = S.fromTotal(tot, n, unit, thing, o);
    const steps = [t[0], hide(t[1], { hideLabels: true })];
    return {
      steps,
      lines: [
        { say: `average = total ÷ how many ${thing}`, pic: 0 },
        { parts: ["average = ", ask(tot), unit, " ÷ ", ask(n)], pic: 0 },
        ...divide(tot, n, unit, { tens: 1, ones: 1, final: 1 }),
      ],
    };
  };

  const missing = (avg, a, b) => {
    const m = S.missing(avg, a, b);
    const steps = [m[0], m[1], m[2]];
    return {
      steps,
      lines: [
        { say: "3 numbers with average " + avg + " → total = average × 3", pic: 0 },
        { parts: ["total = ", ask(avg), " × 3 = ", ask(3 * avg)], pic: 0, picDone: 1 },
        { parts: ["the 2 numbers we know = ", ask(a), " + ", ask(b), " = ", ask(a + b)], pic: 1, picDone: 2 },
        { parts: [`third = ${3 * avg} − ${a + b} = ?`], final: 3 * avg - a - b, pic: 2 },
      ],
    };
  };

  /* Table: greatest or least is one box; average of a row uses that row only. */
  const table = (tb, ask_, pics) => {
    const first = S.table(tb, [])[0];
    if (ask_ === "max" || ask_ === "min") {
      const f = ask_ === "max" ? Math.max : Math.min;
      const word = ask_ === "max" ? "biggest" : "smallest";
      return {
        steps: [first],
        lines: [
          { say: "1 box = 1 game. Never add 2 boxes.", pic: 0 },
          { parts: ["how many games? ", ask(8)], pic: 0 },
          { parts: [`${word} box in the home row = `, ask(f(...tb.home))], pic: 0 },
          { parts: [`${word} box in the away row = `, ask(f(...tb.away))], pic: 0 },
          { parts: [`${ask_ === "max" ? "greatest" : "least"} = the ${word} of ${f(...tb.home)} and ${f(...tb.away)} = ?`], final: f(...tb.home, ...tb.away), pic: 0 },
        ],
      };
    }
    /* The row's average uses the average working; its pictures move up by one after the table. */
    const w = average(tb[ask_], pics, { many: "games" });
    const shift = (v) => (v === undefined ? undefined : v + 1);
    return {
      steps: [{ ...first, hl: ask_ }, ...w.steps],
      lines: [
        { say: `${ask_} games = the ${ask_} row only: 4 games`, pic: 0 },
        ...w.lines.slice(1).map((l) => ({ ...l, pic: shift(l.pic), picDone: shift(l.picDone) })),
      ],
    };
  };

  /* ---------- money ---------- */
  /* The coin pictures: the step after each kind of coin is shared, and the last step without values. */
  const coinPics = (steps) => {
    const at = (u) => steps.findIndex((s) => s.give === u);
    const last = steps.length - 1;
    steps[last] = { ...steps[last], hideValues: true };
    return { at, last };
  };

  /* 6 pencils cost 84c: 1 pencil = 84c ÷ 6. */
  const costOfOne = (total, n, one, pile) => {
    const steps = S.shareCoins(total, n, [10, 1], pile);
    const { at, last } = coinPics(steps);
    return {
      steps,
      lines: [
        { say: `1 ${one} = total cost ÷ how many`, pic: 0 },
        { parts: [`1 ${one} = `, ask(total), "c ÷ ", ask(n)], pic: 0 },
        ...divide(total, n, "c", { tens: Math.max(0, at(10)), ones: Math.max(0, at(1)), final: last }),
      ],
    };
  };

  /* 12 plums cost €14·70: 6 plums = half = €14·70 ÷ 2. */
  const halve = (total, many, few, item, pile) => {
    const steps = S.shareCoins(total, 2, [100, 10, 5], pile);
    const { at, last } = coinPics(steps);
    const e = Math.floor(total / 100), c = total % 100;
    const even = e - (e % 2);
    const rest = total - even * 100;
    return {
      steps,
      lines: [
        { say: `${few} ${item} = half of ${many} ${item} → half the money`, pic: 0 },
        { parts: ["half = ", euroAsk(total), " ÷ 2"], pic: 0 },
        ...(even ? [{ parts: [`€${even} ÷ 2 = €`, ask(even / 2)], pic: Math.max(0, at(100)) }] : []),
        ...(e % 2 ? [{ parts: [`€1·${String(c).padStart(2, "0")} = `, ask(rest), "c"], pic: Math.max(0, at(100)) }] : []),
        { parts: [`${rest}c ÷ 2 = `, ask(rest / 2), "c"], pic: Math.max(0, at(5), at(10)) },
        { parts: [`€${even / 2} + ${rest / 2}c = ?`], final: total / 2, pic: last },
      ],
    };
  };

  /* 30c each, €2·40: how many = money ÷ price, counted in coins. */
  const howMany = (total, price, item) => {
    const g = S.groupCoins(total, price, item);
    const steps = [g[0], { ...g[1], noNumbers: true }];
    const u = g[0].unit;
    return {
      steps,
      lines: [
        { say: "how many = money ÷ price of 1", pic: 0 },
        { parts: ["how many = ", euroAsk(total), " ÷ ", ask(price, "cents")], pic: 0 },
        { parts: [`${money(total)} in ${u}c coins = `, ask(total / u), " coins"], pic: 0 },
        { parts: [`1 ${item.one} = ${price}c = `, ask(price / u), ` × ${u}c coins`], pic: 0 },
        { parts: [`${total / u} coins ÷ ${price / u} = ?`], final: total / price, pic: 1 },
      ],
    };
  };

  /* I paid €5 and got €1·40 change for 6 buns: 1 bun = (5·00 − 1·40) ÷ 6. */
  const change = (paid, chg, n, one, many, pile) => {
    const spent = paid - chg;
    const steps = S.shareCoins(spent, n, [100, 10, 5], pile);
    const { last } = coinPics(steps);
    return {
      steps,
      lines: [
        { say: `1 ${one} = (paid − change) ÷ how many ${many}`, pic: 0 },
        { parts: ["1 " + one + " = (", euroAsk(paid), " − ", euroAsk(chg), ") ÷ ", ask(n)], pic: 0 },
        { parts: [`spent = ${money(paid)} − ${money(chg)} = `, euroAsk(spent)], pic: 0 },
        { parts: [`${money(spent)} = `, ask(spent), "c"], pic: 0 },
        ...divide(spent, n, "c", { tens: 0, ones: 0, final: last }),
      ],
    };
  };

  /* ---------- fractions ---------- */
  const fractionOf = (whole, n, d, she) => {
    const f = S.fractionOf(whole, n, d, she);
    const part = whole / d;
    return {
      steps: f,
      lines: [
        { say: `spent = ${n}/${d} of the money → ${n} parts out of ${d}`, pic: 0 },
        { parts: ["spent = ", ask(n), "/", ask(d), " of €", ask(whole)], pic: 0 },
        { parts: [`1 part = €${whole} ÷ ${d} = €`, ask(part)], pic: 0, picDone: 1 },
        { parts: [`${n} parts = ${n} × €${part} = ?`], final: n * part * 100, pic: 2 },
      ],
    };
  };
  const fromLeft = (n, d, left, askStart) => {
    const k = d - n, part = left / k;
    const f = askStart ? S.startFromLeft(n, d, left) : S.spentFromLeft(n, d, left);
    const steps = f.map((s, i) => (i === f.length - 1 ? { ...s, top: undefined } : s));
    return {
      steps,
      lines: [
        { say: `the money is ${d} equal parts; ${n} parts spent`, pic: 0 },
        { parts: ["parts left = ", ask(d), " − ", ask(n), " = ", ask(k)], pic: 0 },
        { parts: [`${k} part${k > 1 ? "s" : ""} = €${left} → 1 part = €${left} ÷ ${k} = €`, ask(part)], pic: 0, picDone: 1 },
        askStart
          ? { parts: [`start = all ${d} parts = ${d} × €${part} = ?`], final: d * part * 100, pic: 2 }
          : { parts: [`spent = ${n} parts = ${n} × €${part} = ?`], final: n * part * 100, pic: 2 },
      ],
    };
  };

  /* ---------- packing into bags (bags.html, where she enters each copybook digit) ---------- */
  const bags = (N, D, thing, asks, one, many) => {
    const steps = S.bags(N, D, thing, asks, one, many).map((s) => ({ ...s, src: s.src + "&mode=try&nofinal=1" }));
    return {
      steps,
      lines: [
        { say: asks === "left" ? `left over = what is left after filling ${many} of ${D}` : `${many} = ${thing} ÷ ${thing} in each ${one}`, pic: 0 },
        { parts: ["", ask(N), " ÷ ", ask(D)], pic: 0 },
        { say: "Pack them step by step in the copybook above.", pic: 0 },
        { parts: [asks === "left" ? `${thing} left over = ?` : `${many} filled = ?`], final: asks === "left" ? N % D : N / D, pic: 0 },
      ],
    };
  };

  return { ask, average, total, fromTotal, missing, table, costOfOne, halve, howMany, change, fractionOf, fromLeft, bags, divide, multiply };
})();
