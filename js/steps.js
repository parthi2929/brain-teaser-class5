/* Visual step builders. No DOM code here, so the Node check can build every visual.
   A visual is a list of steps. js/player.js draws one step at a time; Next goes to the next step.
   Each step has eq (the top line), hint (one short line) and mode:
     towers / row   blocks that move between steps (the same blocks in one scene)
     table          the goals table, one box per game
     coins          a purse of coins shared into piles
     groups         coins put into groups of one price
     bar            a fraction bar split into equal parts
     frame          an embedded page (bags.html) */
globalThis.Steps = (() => {
  const sum = (l) => l.reduce((s, x) => s + x, 0);
  const col = (i) => `var(--c${i % 5})`;
  const B = (v, i) => (i == null ? `<b>${v}</b>` : `<b style="color:${col(i)}">${v}</b>`);
  const money = (c) => (c < 100 ? c + "c" : "€" + Math.floor(c / 100) + "·" + String(c % 100).padStart(2, "0"));

  /* ---------- blocks: averages ---------- */
  let SC = 0;
  const scene = (N, colors, o = {}) => ({ id: ++SC, N, colors, skin: o.skin, who: o.who, rider: o.rider, horiz: o.horiz, unit: o.unit || "" });
  const GIRLS = ["Joan", "Sandi", "Aoife", "Niamh", "Orla", "Emma", "Grace", "Sara"];
  const face = (name) => (GIRLS.includes(name) ? "👧" : name === "Artil" ? "🧒" : "👦");
  const people = (names) => names.map((name) => ({ face: face(name), name }));
  const towersFrom = (nums) => { let id = 0; return nums.map((n) => Array.from({ length: n }, () => id++)); };
  const towerColors = (nums) => nums.flatMap((n, i) => Array(n).fill(col(i)));
  const deal = (order, n) => {
    const t = Array.from({ length: n }, () => []);
    order.forEach((id, j) => t[j % n].push(id));
    return t;
  };
  const argOf = (l, better) => l.reduce((best, v, i) => (better(v, l[best]) ? i : best), 0);

  const level = (nums, o = {}) => {
    const sc = scene(sum(nums), towerColors(nums), o);
    const t = towersFrom(nums), n = nums.length, tot = sum(nums), avg = tot / n;
    const idx = nums.map((_, i) => i);
    /* Frogs only: first they sit at the start, then they jump. */
    const jump = o.horiz
      ? [{ sc, mode: "towers", towers: t, lcol: idx, hideBlocks: true, hint: "Tap the arrow: the frogs jump.", eq: `${n} frogs jump` }]
      : [];
    /* This step moves one block per Next (or per tap) until all are level. */
    return [
      ...jump,
      { sc, mode: "towers", towers: t, lcol: idx, interactive: true, eq: "", moveHint: o.moveHint, doneHint: o.doneHint },
      { sc, mode: "row", order: t.flat(), rowLabel: tot,
        notes: o.her ? [{ red: true, text: `${o.her} = all ${n} together` }] : [],
        hint: "Another way: put them all together.",
        eq: `${nums.map((v, i) => B(v, i)).join(" + ")} = ${B(tot)}` },
      { sc, mode: "towers", towers: deal(t.flat(), n), line: avg, stagger: true,
        notes: o.her ? [{ t: 0, red: true, text: `÷ ${n}` }] : [],
        hint: `Share them equally into ${n}. Each gets the average.`,
        eq: `${B(tot)} ÷ ${n} = ${B(avg)}` },
    ];
  };

  const total = (n, avg, pre, post, thing, o = {}) => {
    const nums = Array(n).fill(avg);
    const sc = scene(n * avg, towerColors(nums), o);
    const t = towersFrom(nums);
    const m = (v) => pre + v + post;
    return [
      { sc, mode: "towers", towers: t, line: avg, labels: nums.map(() => m(avg)), lcol: nums.map((_, i) => i),
        hint: `Average ${m(avg)} = each one counts as ${m(avg)}.`, eq: `${n} ${thing}, average ${B(m(avg))}` },
      { sc, mode: "row", order: t.flat(), rowLabel: m(n * avg), hint: "Put them all together = total.",
        eq: `${B(m(avg))} × ${n} = ${B(m(n * avg))}` },
    ];
  };

  const missing = (avg, a, b) => {
    const tot = 3 * avg, c = tot - a - b;
    const sc = scene(tot, Array(tot).fill("var(--grey)"));
    const t = towersFrom([avg, avg, avg]);
    const order = t.flat();
    const parts = [order.slice(0, a), order.slice(a, a + b), order.slice(a + b)];
    const colors = order.map((_, j) => (j < a ? col(0) : j < a + b ? col(1) : col(4)));
    return [
      { sc, mode: "towers", towers: t, line: avg, labels: [avg, avg, avg],
        hint: `Average ${avg} = each of the 3 numbers counts as ${avg}.`, eq: `average ${B(avg)} → ${avg} + ${avg} + ${avg} = ${B(tot)}` },
      { sc, mode: "row", order, rowLabel: tot, hint: "Put them all together = total.", eq: `total ${B(tot)}` },
      { sc, mode: "towers", towers: parts, colors, labels: [a, b, "?"], lcol: [0, 1, 4],
        hint: "Take away the 2 numbers we know.", eq: `${B(tot)} − ${B(a, 0)} − ${B(b, 1)} = ${B("?", 4)}` },
      { sc, mode: "towers", towers: parts, colors, labels: [a, b, c], lcol: [0, 1, 4],
        notes: [{ t: 2, text: "this one ↓" }], hint: "What is left is the 3rd number.",
        eq: `${B(tot)} − ${B(a, 0)} − ${B(b, 1)} = ${B(c, 4)}` },
    ];
  };

  const fromTotal = (tot, n, post, thing, o = {}) => {
    const sc = scene(tot, Array(tot).fill("var(--grey)"), o);
    const order = [...Array(tot).keys()];
    const colors = order.map((j) => col(j % n));
    return [
      { sc, mode: "row", order, rowLabel: tot + post, hint: "All together = total.", eq: `${n} ${thing}, total ${B(tot + post)}` },
      { sc, mode: "towers", towers: deal(order, n), colors, line: tot / n, stagger: true, lcol: [...Array(n).keys()],
        hint: `Share equally into ${n}. Each gets the average.`, eq: `${B(tot + post)} ÷ ${n} = ${B(tot / n + post)}` },
    ];
  };

  /* asks: "max", "min", "home", "away". her: show her column-adding first. */
  const table = (tb, asks, her) => {
    const cells = [...tb.home, ...tb.away];
    const steps = [{ mode: "table", tb, shoot: true, hint: "Each box is 1 game.", eq: `${B(8)} games` }];
    asks.forEach((ask) => {
      if (her && (ask === "max" || ask === "min")) {
        const cs = tb.home.map((h, i) => h + tb.away[i]);
        const ci = argOf(cs, ask === "max" ? (a, b) => a > b : (a, b) => a < b);
        steps.push({ mode: "table", tb, her: true, hint: "Adding 2 boxes mixes 2 games.",
          eq: `${tb.home[ci]} + ${tb.away[ci]} = ${cs[ci]} → 2 games ✗` });
      }
      if (ask === "max") steps.push({ mode: "table", tb, hl: "max", hint: "Find the biggest single box.", eq: `1 box = 1 game → most = ${B(Math.max(...cells))}` });
      if (ask === "min") steps.push({ mode: "table", tb, hl: "min", hint: "Find the smallest single box.", eq: `1 box = 1 game → least = ${B(Math.min(...cells))}` });
      if (ask === "home" || ask === "away") {
        steps.push({ mode: "table", tb, hl: ask, hint: `Only the ${ask} row.`, eq: `${ask}: 4 games` });
        const first = ask === "home" ? 1 : 5;
        steps.push(...level(tb[ask], {
          skin: "ball", who: tb[ask].map((_, c) => ({ face: "🥅", name: "game " + (first + c) })),
          moveHint: "Average = share the goals fairly across the games.",
          doneHint: "Every game has the same goals now. That is the average." }));
      }
    });
    return steps;
  };

  /* ---------- coins: share money equally ---------- */
  const COIN = { 200: "€2", 100: "€1", 50: "50c", 20: "20c", 10: "10c", 5: "5c", 1: "1c" };
  const coinsOf = (cents, units) => {
    const out = {};
    let left = cents;
    units.forEach((u) => { out[u] = Math.floor(left / u); left -= out[u] * u; });
    return out;
  };
  const copy = (o) => JSON.parse(JSON.stringify(o));
  /* Shares `cents` into n piles. Coins left over change into smaller coins, then share again.
     pile: { face, name } under each pile. */
  const shareCoins = (cents, n, units, pile, o = {}) => {
    const purse = coinsOf(cents, units);
    const piles = Array.from({ length: n }, () => ({}));
    const steps = [];
    const snap = (s) => steps.push({ mode: "coins", purse: copy(purse), piles: copy(piles), units, pile, ...s });
    snap({ eq: o.startEq || `${money(cents)} → ${n} equal shares`, hint: o.startHint || "Share the coins equally." });
    units.forEach((u, k) => {
      const c = purse[u];
      if (!c) return;
      const each = Math.floor(c / n), left = c % n;
      if (each) {
        piles.forEach((p) => (p[u] = (p[u] || 0) + each));
        purse[u] = left;
        snap({ eq: `${c} × ${COIN[u]} ÷ ${n} = ${B(each)} each` + (left ? `, ${left} left` : ""), hint: "Each one gets the same coins.", give: u });
      }
      const next = units[k + 1];
      if (purse[u] && next) {
        const more = (purse[u] * u) / next;
        snap({ eq: `${purse[u]} × ${COIN[u]} = ${more} × ${COIN[next]}`, hint: "Too few to share. Change them into smaller coins.", swap: u });
        purse[next] += more;
        purse[u] = 0;
        snap({ eq: `${purse[next]} × ${COIN[next]} to share`, hint: "Now share these." });
      }
    });
    snap({ eq: `${money(cents)} ÷ ${n} = ${B(money(cents / n))}`, hint: o.endHint || "Each share is the same.", hl: true });
    return steps;
  };

  /* Groups coins by price: how many can I buy? */
  const groupCoins = (cents, price, item) => {
    const unit = price % 10 === 0 && cents % 10 === 0 ? 10 : 5;
    const k = price / unit, count = cents / price;
    return [
      { mode: "groups", unit, coins: cents / unit, k, count, grouped: false, item,
        eq: `${money(cents)} = ${cents / unit} × ${COIN[unit]}`, hint: `1 ${item.one} costs ${price}c = ${k} coins.` },
      { mode: "groups", unit, coins: cents / unit, k, count, grouped: true, item,
        eq: `${money(cents)} ÷ ${price}c = ${B(count)}`, hint: `1 group buys 1 ${item.one}. Count the groups.` },
    ];
  };

  /* ---------- fraction bar ---------- */
  const bar = (o) => ({ mode: "bar", ...o });
  const fractionOf = (whole, n, d, she) => {
    const part = whole / d;
    return [
      bar({ d: 1, shaded: 0, top: `€${whole}`, eq: `€${whole}`, hint: "The bar is all the money." }),
      bar({ d, shaded: 0, top: `€${whole}`, labels: Array(d).fill(`€${part}`), eq: `€${whole} ÷ ${d} = ${B("€" + part)}`, hint: `${d} equal parts.` }),
      bar({ d, shaded: n, top: `€${whole}`, labels: Array(d).fill(`€${part}`), eq: `${n} × €${part} = ${B("€" + n * part)}`,
        hint: `${she} spent ${n} parts.` }),
    ];
  };
  const spentFromLeft = (n, d, left) => [
    bar({ d, shaded: n, labels: [...Array(n).fill(""), `€${left}`], eq: `left: 1 part = €${left}`, hint: "Shaded = spent. The white part is left." }),
    bar({ d, shaded: n, labels: Array(d).fill(`€${left}`), eq: `every part = €${left}`, hint: "All the parts are equal." }),
    bar({ d, shaded: n, labels: Array(d).fill(`€${left}`), eq: `${n} × €${left} = ${B("€" + n * left)}`, hint: `Spent = ${n} parts.` }),
  ];
  const startFromLeft = (n, d, left) => {
    const k = d - n, part = left / k;
    const lbl = (all) => Array.from({ length: d }, (_, i) => (all || i >= n ? `€${part}` : ""));
    return [
      bar({ d, shaded: n, bracket: `€${left}`, labels: Array(d).fill(""), eq: `${k} white parts = €${left}`, hint: "Shaded = spent. The white parts are left." }),
      bar({ d, shaded: n, bracket: `€${left}`, labels: lbl(false), eq: `€${left} ÷ ${k} = ${B("€" + part)}`, hint: "Find 1 part." }),
      bar({ d, shaded: n, labels: lbl(true), top: `€${d * part}`, eq: `${d} × €${part} = ${B("€" + d * part)}`, hint: `All ${d} parts = the money at the start.` }),
    ];
  };

  /* ---------- bags: the Apple Bag page ---------- */
  const bags = (N, D, thing, asks, bagOne, bagMany) => [{
    mode: "frame",
    src: `bags.html?n=${N}&d=${D}&thing=${encodeURIComponent(thing)}&asks=${asks}&bag=${encodeURIComponent(bagOne)}&bags=${encodeURIComponent(bagMany)}`,
    eq: "", hint: "",
  }];

  return { B, money, people, level, total, missing, fromTotal, table, shareCoins, groupCoins, fractionOf, spentFromLeft, startFromLeft, bags };
})();
