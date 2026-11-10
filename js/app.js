/* The app: home screen, one practice page per test, the Learn lesson and her Test 17 answers.
   Practice rules (same for every test):
   - the questions come in book order with new numbers; answers stay hidden
   - a wrong answer shows ✗, then the slot gets a new question of the same type
   - the 👀 helper for a slot appears only after a wrong answer in that slot
   The parent can change the last two rules behind the gear. */
(() => {
  const E = globalThis.Engine, P = globalThis.Player;
  const $ = (id) => document.getElementById(id);
  const make = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  const MARK_MS = 900;

  /* ---- parent settings (stored in this browser only) ---- */
  const load = (k) => { try { return localStorage.getItem(k) === "1"; } catch { return false; } };
  const save = (k, v) => { try { localStorage.setItem(k, v ? "1" : "0"); } catch { /* private window */ } };
  const opt = { always: load("bt-always"), same: load("bt-same") };
  $("opt-always").checked = opt.always;
  $("opt-same").checked = opt.same;
  $("opt-always").addEventListener("change", (e) => { opt.always = e.target.checked; save("bt-always", opt.always); });
  $("opt-same").addEventListener("change", (e) => { opt.same = e.target.checked; save("bt-same", opt.same); });

  /* ---- modal ---- */
  const modal = $("modal");
  const openVis = (steps) => { modal.hidden = false; P.play($("modal-vis"), steps); };
  const closeVis = () => { modal.hidden = true; $("modal-vis").replaceChildren(); };
  $("close").addEventListener("click", closeVis);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeVis(); });

  /* ---- home ---- */
  E.TESTS.forEach((t) => {
    const b = make("button", "tile alt", `<span>${t.title}<small>${t.topic}</small></span>`);
    b.type = "button";
    b.dataset.go = t.id;
    $("tiles").append(b);
  });
  const SECTIONS = ["home", "learn", "practice", "her"];
  const learnTest = E.TESTS.find((t) => t.learn);
  const herTest = E.TESTS.find((t) => t.her);
  const go = (where) => {
    $("gear-menu").hidden = true;
    const test = E.TESTS.find((t) => t.id === where);
    const sec = test ? "practice" : where;
    SECTIONS.forEach((s) => ($(s).hidden = s !== sec));
    window.scrollTo(0, 0);
    if (test) startTest(test);
    else if (where === "learn") { $("home-link").textContent = "Average"; P.play($("learn"), learnTest.learn(), () => go("home")); }
    else if (where === "her") { $("home-link").textContent = "Her Test 17"; buildHer(); }
    else $("home-link").textContent = "Brain Teaser";
  };
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go]");
    if (t) go(t.dataset.go);
  });
  $("home-link").addEventListener("click", () => go("home"));
  $("gear").addEventListener("click", () => ($("gear-menu").hidden = !$("gear-menu").hidden));

  /* ---- practice ---- */
  let slots = [], current = null;
  const fractionNode = ({ n, d }) => {
    const el = make("span", "frac");
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", n + " over " + d);
    el.append(make("span", "frac-n", String(n)), make("span", "frac-d", String(d)));
    return el;
  };
  const bookTable = (tb) => {
    const t = make("table", "book");
    t.innerHTML = `<tr><th></th><th>Game 1</th><th>Game 2</th><th>Game 3</th><th>Game 4</th></tr>
      <tr><td>Goals scored in home games</td>${tb.home.map((v) => `<td>${v}</td>`).join("")}</tr>
      <tr><td>Goals scored in away games</td>${tb.away.map((v) => `<td>${v}</td>`).join("")}</tr>`;
    return t;
  };
  const showQ = (slot) => {
    const { q, ui } = slot;
    ui.text.replaceChildren(...q.parts.map((p) => (typeof p === "string" ? document.createTextNode(p) : fractionNode(p))));
    ui.table.replaceChildren(...(q.table ? [bookTable(q.table)] : []));
    ui.before.textContent = q.kind === "euro" ? "€" : "";
    ui.after.textContent = q.kind === "cents" ? "c" : q.post || "";
    ui.box.inputMode = q.kind === "count" ? "numeric" : "decimal";
    ui.box.value = "";
    ui.see.hidden = !(opt.always || slot.hinted);
  };
  const finish = () => {
    $("score-value").textContent = slots.filter((s) => s.firstTry).length + "/" + slots.length;
    $("score").hidden = false;
    $("score").scrollIntoView({ block: "center" });
  };
  const onCheck = (slot, index) => {
    const { ui } = slot;
    if (slot.done || slot.busy) return;
    if (!ui.box.value.trim()) { ui.box.focus(); return; }
    const result = E.check(slot.q, ui.box.value);
    if (result === "right") {
      slot.done = true;
      ui.row.classList.add("done");
      ui.mark.textContent = "✓";
      ui.box.readOnly = true;
      ui.check.hidden = true;
      const rest = slots.find((s, k) => k > index && !s.done) || slots.find((s) => !s.done);
      if (rest) rest.ui.box.focus();
      else finish();
      return;
    }
    slot.busy = true;
    const wrong = result === "wrong";
    ui.row.classList.add(wrong ? "wrong" : "unsure");
    ui.mark.textContent = wrong ? "✗" : "?";
    if (wrong) slot.firstTry = false;
    setTimeout(() => {
      slot.busy = false;
      ui.row.classList.remove("wrong", "unsure");
      ui.mark.textContent = "";
      if (wrong) {
        slot.hinted = true;
        if (!opt.same) {
          slot.q = E.nextQuestion(slot.gen, slot.q);
          ui.row.classList.remove("fresh");
          void ui.row.offsetWidth;
          ui.row.classList.add("fresh");
        }
        showQ(slot);
        ui.see.classList.remove("nudge");
        void ui.see.offsetWidth;
        ui.see.classList.add("nudge");
      }
      ui.box.value = "";
      ui.box.focus();
    }, MARK_MS);
  };
  const buildRow = (slot, index) => {
    const row = make("li", "q");
    const body = make("div", "body");
    const text = make("p", "text");
    const table = make("div");
    const form = make("form", "ans");
    form.noValidate = true;
    const before = make("span", "unit"), after = make("span", "unit");
    const box = make("input", "box");
    Object.assign(box, { type: "text", autocomplete: "off", spellcheck: false });
    box.setAttribute("aria-label", "Answer " + (index + 1));
    const check = make("button", "check", "Check");
    check.type = "submit";
    const mark = make("span", "mark");
    mark.setAttribute("aria-live", "polite");
    const see = make("button", "see", "👀");
    see.type = "button";
    see.setAttribute("aria-label", "See how");
    see.addEventListener("click", () => openVis(slot.q.vis()));
    form.append(before, box, after, check, mark, see);
    form.addEventListener("submit", (e) => { e.preventDefault(); onCheck(slot, index); });
    body.append(text, table, form);
    row.append(make("span", "num", String(index + 1)), body);
    slot.ui = { row, text, table, before, after, box, check, mark, see };
    showQ(slot);
    return row;
  };
  const startTest = (test) => {
    current = test;
    $("home-link").textContent = test.title;
    slots = test.generators.map((gen) => ({ gen, q: E.nextQuestion(gen), done: false, busy: false, firstTry: true, hinted: false }));
    $("plist").replaceChildren(...slots.map(buildRow));
    $("score").hidden = true;
  };
  $("again").addEventListener("click", () => { startTest(current); window.scrollTo(0, 0); });

  /* ---- her Test 17 ---- */
  const buildHer = () => {
    $("her-list").replaceChildren(...herTest.her.map((h, k) => {
      const row = make("div", "her-row");
      row.append(
        make("span", "num", String(k + 1)),
        make("div", "", `<small>${h.q}</small><br><span class="hand">${h.her}</span> ` +
          (h.ok ? '<span class="ok">✓</span>' : `<span class="no">✗</span> <span class="hand fix">${h.right}</span>`)),
      );
      const see = make("button", "see", "👀");
      see.type = "button";
      see.setAttribute("aria-label", "See why");
      see.addEventListener("click", () => openVis(h.vis()));
      row.append(see);
      return row;
    }));
  };

  /* For browser checks: the current questions. */
  globalThis.App = { slots: () => slots, go };

  /* Open a page from the address: index.html#learn, #test-26. */
  const start = location.hash.slice(1);
  if (start && (SECTIONS.includes(start) || E.TESTS.some((t) => t.id === start))) go(start);
})();
