/* The app: home screen by topic, one Learn page per topic, one practice page per test.
   Practice rules (same for every test):
   - the questions come in book order with new numbers; answers stay hidden
   - a wrong answer shows ✗, then the same question stays and its 👀 helper appears
   - new questions come only when she starts the test again
   - every run is stored as a record (js/records.js) when she is signed in
   The admin settings (js/account.js) set: tries per question, when the helper appears, which tests show. */
(() => {
  const E = globalThis.Engine, P = globalThis.Player;
  const initialRoute = location.hash.slice(1);
  let navigated = false;
  const $ = (id) => document.getElementById(id);
  const make = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  const MARK_MS = 900;
  const NEXT_ARROW = '<svg width="34" height="28" viewBox="0 0 34 28" aria-hidden="true"><path d="M3 14h24M18 4l10 10-10 10" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const settings = () => globalThis.Account.state.settings;

  /* ---- modal ---- */
  const modal = $("modal");
  let afterClose = null;
  const closeVis = () => {
    modal.hidden = true;
    $("modal-vis").replaceChildren();
    if (afterClose) { const f = afterClose; afterClose = null; f(); }
  };

  /* ---- the 👀 helper: copybook working beside a picture ----
     She fills the blanks of one line at a time; Check marks each blank. A right line shows the next line.
     The last line ends with "?": she works it out and types it in the answer box. */
  const fmtBlank = (kind, v) => (kind === "euro" ? (v / 100).toFixed(2) : String(v));
  const openWork = (slot) => {
    if (!slot.work) slot.work = { w: slot.q.work(), at: 0, given: {} };
    const st = slot.work, { w } = st;
    modal.hidden = false;
    const host = $("modal-vis");
    host.className = "workview";
    host.replaceChildren();
    const picHost = make("div", "wpic");
    const list = make("ol", "wlines");
    host.append(make("p", "wq", slot.q.text.replace(/ \[.*\]$/, "")), picHost, list);
    const pic = P.play(picHost, w.steps, null, { controlled: true, height: 300 });
    /* The helper screen has its final width only after layout: draw the picture again then. */
    requestAnimationFrame(() => pic.redraw());

    const renderLine = (line, k) => {
      const li = make("li", "wline" + (line.say ? " say" : "") + (line.final !== undefined ? " final" : ""));
      if (line.say) { li.textContent = line.say; return li; }
      const blanks = [];
      line.parts.forEach((p, j) => {
        if (typeof p === "string") { li.append(document.createTextNode(p)); return; }
        const key = k + ":" + j;
        if (k < st.at) { li.append(make("span", "hand wdone", fmtBlank(p.kind, p.ask).replace(/^0\./, "0."))); return; }
        const input = make("input", "wbox");
        Object.assign(input, { type: "text", autocomplete: "off", inputMode: p.kind === "count" ? "numeric" : "decimal" });
        input.setAttribute("aria-label", "Step " + (k + 1) + " blank " + (blanks.length + 1));
        if (st.given[key]) input.value = st.given[key];
        blanks.push({ input, p, key });
        li.append(input);
      });
      if (k === st.at && blanks.length) {
        const form = make("form", "wcheck");
        form.noValidate = true;
        const btn = make("button", "check", "Check");
        btn.type = "submit";
        const mark = make("span", "mark");
        form.append(btn, mark);
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          let allRight = true;
          blanks.forEach(({ input, p, key }) => {
            const r = E.check({ kind: p.kind, answer: p.ask }, input.value);
            if (r === "right") { input.classList.add("ok"); input.readOnly = true; st.given[key] = input.value; return; }
            allRight = false;
            input.classList.remove("bad");
            void input.offsetWidth;
            input.classList.add("bad");
            input.value = "";
          });
          if (allRight) { st.at = k + 1; advance(); }
          else {
            mark.textContent = "✗";
            const firstEmpty = blanks.find((b) => !b.input.readOnly);
            if (firstEmpty) firstEmpty.input.focus();
          }
        });
        blanks.forEach((b, j) => b.input.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && j < blanks.length - 1 && !blanks[j + 1].input.readOnly) { e.preventDefault(); blanks[j + 1].input.focus(); }
        }));
        li.append(form);
        setTimeout(() => (blanks.find((b) => !b.input.readOnly) || blanks[0]).input.focus(), 50);
      }
      if (line.final !== undefined && k === st.at) {
        const go = make("button", "again", "Type it in the box ↓");
        go.type = "button";
        go.addEventListener("click", () => { afterClose = () => slot.ui.box.focus(); closeVis(); });
        li.append(make("br"), go);
      }
      return li;
    };
    const advance = () => {
      /* Rule lines need no answer: show them and move on. */
      while (st.at < w.lines.length && w.lines[st.at].say) st.at++;
      list.replaceChildren(...w.lines.slice(0, Math.min(st.at + 1, w.lines.length)).map(renderLine));
      const cur = w.lines[Math.min(st.at, w.lines.length - 1)];
      const prev = w.lines[st.at - 1];
      pic.show(cur.pic ?? (prev && (prev.picDone ?? prev.pic)) ?? 0);
      list.lastElementChild.scrollIntoView({ block: "nearest" });
    };
    advance();
  };
  $("close").addEventListener("click", closeVis);
  /* The long division helper's OK button: close it and go back to the answer boxes. */
  addEventListener("message", (e) => {
    if (e.origin !== location.origin || !e.data || e.data.type !== "helper-done" || modal.hidden) return;
    closeVis();
    const b = $("qp-box");
    if (b && !b.closest("[hidden]")) b.focus();
  });
  const onEscape = (e) => { if (e.key === "Escape" && !modal.hidden) { e.preventDefault(); closeVis(); } };
  document.addEventListener("keydown", onEscape);
  modal.addEventListener("load", (e) => {
    if (e.target.tagName === "IFRAME") { try { e.target.contentWindow.addEventListener("keydown", onEscape); } catch { /* other origin */ } }
  }, true);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeVis(); });

  /* ---- home: one block per topic, Learn first, then its tests ---- */
  const LEARN_ICON = `<svg width="44" height="34" viewBox="0 0 56 44" aria-hidden="true"><g stroke="rgba(0,0,0,.25)">
    <rect x="4" y="30" width="12" height="12" rx="3" fill="#6b9cf0"/><rect x="4" y="16" width="12" height="12" rx="3" fill="#6b9cf0"/>
    <rect x="22" y="30" width="12" height="12" rx="3" fill="#f39a4f"/><rect x="22" y="16" width="12" height="12" rx="3" fill="#6b9cf0"/>
    <rect x="40" y="30" width="12" height="12" rx="3" fill="#b18ae6"/><rect x="40" y="16" width="12" height="12" rx="3" fill="#f39a4f"/></g></svg>`;
  const renderHome = () => $("topics").replaceChildren(...E.TOPICS.map((topic) => {
    const tests = E.TESTS.filter((t) => t.topic === topic.id && !settings().hiddenTests.includes(t.id));
    if (!tests.length && !topic.learn) return "";
    const block = make("section", "topic");
    block.append(make("h2", "", topic.title));
    const tiles = make("div", "tiles");
    if (topic.learn) {
      const b = make("button", "tile", `${LEARN_ICON}<span>Learn<small>${topic.learn.hint || ""}</small></span>`);
      b.type = "button";
      b.dataset.go = "learn:" + topic.id;
      tiles.append(b);
    }
    if (E.PRACTICE.some((p) => p.topic === topic.id)) {
      const b = make("button", "tile qp", `<span>⚡ Quick practice<small>one sum at a time</small></span>`);
      b.type = "button";
      b.dataset.go = "qp:" + topic.id;
      tiles.append(b);
    }
    tests.forEach((t) => {
      const b = make("button", "tile alt", `<span>${t.title}</span>`);
      b.type = "button";
      b.dataset.go = t.id;
      tiles.append(b);
    });
    block.append(tiles);
    return block;
  }));
  renderHome();
  globalThis.Account.onChange(renderHome);
  const SECTIONS = ["home", "learn", "practice", "account", "quick"];
  const showLearn = (topic) => {
    $("home-link").textContent = topic.title;
    if (topic.learn.page) {
      const f = make("iframe", "bagframe learnframe");
      f.src = topic.learn.page;
      f.title = topic.title;
      $("learn").className = "";
      $("learn").replaceChildren(f);
    } else P.play($("learn"), topic.learn.steps(), () => go("home"));
  };
  const go = (where) => {
    navigated = true;
    history.replaceState(null, '', location.pathname + location.search + (where === 'home' ? '' : '#' + where));
    const test = E.TESTS.find((t) => t.id === where);
    const topic = where.startsWith("learn:") && E.TOPICS.find((t) => "learn:" + t.id === where);
    const qp = where.startsWith("qp:") && E.PRACTICE.find((p) => "qp:" + p.topic === where.split(":").slice(0, 2).join(":"));
    const sec = test ? "practice" : topic ? "learn" : qp ? "quick" : where;
    SECTIONS.forEach((s) => ($(s).hidden = s !== sec));
    window.scrollTo(0, 0);
    if (qp) startQuick(qp, qp.types[0]); /* one type per topic for now: she never chooses */
    else if (test) startTest(test);
    else if (topic) showLearn(topic);
    else $("home-link").textContent = "Brain Teaser";
  };
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go]");
    if (t) go(t.dataset.go);
  });
  $("home-link").addEventListener("click", () => go("home"));

  /* ---- practice ---- */
  let slots = [], current = null; /* current = { test, run } */
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
  const askWorksheet = frame => {
    if (frame?.sheet) frame.sheet.help();
  };
  const makeWorksheet = (n, d, title = 'Division worksheet', unit = '') => {
    const frame = make('div', 'division-working');
    frame.setAttribute('role','group'); frame.setAttribute('aria-label',title);
    frame.loadingNote = make('p', 'worksheet-loading');
    const message = make('span', '', 'Starting worksheet…');
    message.setAttribute('role','status');
    const retry = make('button','small','Retry'); retry.type='button';
    frame.loadingNote.append(message,retry);
    frame.start = () => {
      frame.sheet?.destroy();
      const started=performance.now();
      try {
        frame.sheet = globalThis.DivisionSheet.mount(frame, {
          n,d,unit,
          onReviewed: data => onWorksheetMessage(frame,data),
          onDone: answer => onWorksheetMessage(frame,{type:'division-working-done',answer})
        });
        frame.dataset.ready='true'; frame.dataset.startupMs=String(performance.now()-started);
        frame.loadingNote.hidden=true;
      } catch(error) {
        frame.dataset.ready='false'; frame.loadingNote.hidden=false;
        message.textContent='The worksheet could not start.';
        console.error('Worksheet startup failed',error);
      }
    };
    retry.addEventListener('click',frame.start);
    return frame;
  };
  const divisionFor = slot => {
    const m = slot.q.meta;
    if (['how-many-boxes', 'remainder', 'bags-of-tens'].includes(slot.gen.type)) return [m.total, m.d];
    if (slot.gen.type === 'cost-of-one') return [m.total, m.n];
    if (slot.gen.type === 'how-many-for-money') return [m.total, m.price];
    if (slot.gen.type === 'halve-money') return [m.total, 2];
    return null;
  };
  const showWorksheet = slot => {
    const nums = divisionFor(slot), panel = $('test-working');
    panel.hidden = !nums;
    if (!nums) return;
    if (!slot.worksheet) {
      const unit=['cost-of-one','how-many-for-money','halve-money'].includes(slot.gen.type)?'cents':'';
      slot.worksheet = makeWorksheet(...nums, 'Working for question ' + (slots.indexOf(slot) + 1),unit);
      $('test-sheets').append(slot.worksheet.loadingNote, slot.worksheet);
      slot.worksheet.start();
    }
    slots.forEach(s => { if (s.worksheet) { s.worksheet.hidden = s !== slot; s.worksheet.loadingNote.hidden = s !== slot || s.worksheet.dataset.ready === 'true'; } });
    $('test-working-title').textContent = 'Working · Question ' + (slots.indexOf(slot) + 1);
    $('test-working-question').textContent = slot.q.text;
  };
  const onWorksheetMessage = (frame,data) => {
    const qp=$('qp-working');
    const slot=slots.find(s=>s.worksheet===frame);
    if (data.type === 'division-working-reviewed') {
      if (frame !== qp || qp.closest('[hidden]') || !quick || quick.cur.busy) return;
      const box=$('qp-box'), remainder=$('qp-r');
      [box,remainder].forEach(input=>{ if(input) { input.classList.remove('answer-review-error','answer-review-dependent'); input.removeAttribute('aria-invalid'); } });
      if (!data.complete) { if ($('qp-mark').dataset.working) { $('qp-mark').textContent=''; delete $('qp-mark').dataset.working; } return; }
      const answer=data.answer || frame.sheet.answer();
      if (!answer || E.checkDivision(quick.cur.n,quick.cur.d,answer.q+' r '+answer.r)!=='right') return;
      box.value=String(answer.q);
      if(remainder) remainder.value=String(answer.r);
      quickCheck(true);
      return;
    }
    if (data.type !== 'division-working-done') return;
    const answer=data.answer || frame.sheet.answer();
    if (!answer) { frame.sheet.review(); return; }
    if (frame === qp && !qp.closest('[hidden]')) {
      if(E.checkDivision(quick.cur.n,quick.cur.d,answer.q+' r '+answer.r)!=='right') return;
      if(!quick.cur.busy) {
        $('qp-box').value=String(answer.q);
        if($('qp-r')) $('qp-r').value=String(answer.r);
        quickCheck(true);
      }
      if(quick.cur.busy && $('qp-form').classList.contains('done')) quickAsk();
      return;
    }
    if(slot && !slot.ui.row.closest('[hidden]')) {
      if(!slot.done) {
        const raw=slot.gen.type==='remainder'?String(answer.r):slot.q.kind==='euro'?(answer.q/100).toFixed(2):String(answer.q);
        if(E.check(slot.q,raw)!=='right') return;
        clearTimeout(slot.markTimer); slot.busy=false;
        slot.ui.box.value=raw;
        onCheck(slot,slots.indexOf(slot));
      } else {
        const rest=slots.find((s,k)=>k>slots.indexOf(slot)&&!s.done)||slots.find(s=>!s.done);
        rest?.ui.box.focus();
      }
    }
  };
  const showQ = (slot) => {
    const { q, ui } = slot;
    ui.text.replaceChildren(...q.parts.map((p) => (typeof p === "string" ? document.createTextNode(p) : fractionNode(p))));
    ui.table.replaceChildren(...(q.table ? [bookTable(q.table)] : []));
    ui.before.textContent = q.kind === "euro" ? "€" : "";
    ui.after.textContent = q.kind === "cents" ? "c" : q.post || "";
    ui.box.inputMode = q.kind === "count" ? "numeric" : "decimal";
    ui.box.value = "";
    ui.see.hidden = !(settings().helper === "always" || slot.hinted);
  };
  const finish = () => {
    const score = slots.filter((s) => s.firstTry).length;
    globalThis.Records.finish(current.run, score);
    $("score-value").textContent = score + "/" + slots.length;
    $("score").hidden = false;
    $("score").scrollIntoView({ block: "center" });
  };
  const onCheck = (slot, index) => {
    const { ui } = slot;
    if (slot.done || slot.busy) return;
    if (!ui.box.value.trim()) { ui.box.focus(); return; }
    const result = E.check(slot.q, ui.box.value);
    const given = ui.box.value.trim();
    if (result === "wrong") {
      slot.tries = (slot.tries || 0) + 1;
      if (divisionFor(slot)) { showWorksheet(slot); askWorksheet(slot.worksheet); }
    }
    /* With a tries limit, the last wrong try closes the question as wrong. */
    const closed = result === "wrong" && settings().maxTries > 0 && slot.tries >= settings().maxTries;
    if (result !== "unclear") globalThis.Records.attempt(current.run, index, slot.gen.type, given, result === "right", closed);
    if (closed) {
      slot.done = true;
      slot.firstTry = false;
      ui.row.classList.add("closed");
      ui.mark.textContent = "✗";
      ui.box.readOnly = true;
      ui.check.hidden = true;
      ui.see.hidden = true;
      const rest = slots.find((s, k) => k > index && !s.done) || slots.find((s) => !s.done);
      if (rest) rest.ui.box.focus();
      else finish();
      return;
    }
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
    slot.markTimer = setTimeout(() => {
      slot.busy = false;
      ui.row.classList.remove("wrong", "unsure");
      ui.mark.textContent = "";
      if (wrong) {
        /* Same question again; its helper appears. */
        slot.hinted = true;
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
    see.addEventListener("click", () => {
      if (divisionFor(slot)) { showWorksheet(slot); askWorksheet(slot.worksheet); }
      else openWork(slot);
    });
    form.append(before, box, after, check, mark, see);
    form.addEventListener("submit", (e) => { e.preventDefault(); onCheck(slot, index); });
    body.append(text, table, form);
    body.addEventListener('focusin', () => showWorksheet(slot));
    text.addEventListener('click', () => showWorksheet(slot));
    row.append(make("span", "num", String(index + 1)), body);
    slot.ui = { row, text, table, before, after, box, check, mark, see };
    showQ(slot);
    return row;
  };
  const startTest = (test) => {
    $("home-link").textContent = test.title;
    slots = test.generators.map((gen) => ({ gen, q: E.nextQuestion(gen), done: false, busy: false, firstTry: true, hinted: false }));
    current = { test, run: globalThis.Records.start(test, slots.map((s) => ({ type: s.gen.type, q: s.q }))) };
    $('test-sheets').querySelectorAll('.division-working').forEach(host=>host.sheet?.destroy());
    $('test-sheets').replaceChildren();
    $('test-working').hidden = true;
    $("plist").replaceChildren(...slots.map(buildRow));
    if (test.topic === 'division') {
      const first = slots.find(s => divisionFor(s));
      if (first) showWorksheet(first);
    }
    $("score").hidden = true;
  };
  $("again").addEventListener("click", () => { startTest(current.test); window.scrollTo(0, 0); });

  /* ---- Quick practice: one sum at a time, chosen by js/scheduler.js ---- */
  /* The sums as keys "171/9", in the type's groups (for division: without and with a remainder). */
  const groupKeys = {};
  const groupsOf = (type, rules) => {
    const id = type.id + ":" + rules.divisorDigits;
    groupKeys[id] ||= type.groups(rules).map((g) => g.map(([n, d]) => n + "/" + d));
    return groupKeys[id];
  };
  const rulesOf = (type) => ({ ...globalThis.Scheduler.DEFAULTS, ...((settings().practice || {})[type.id] || {}) });
  const renderCount = () => {
    $("qp-count").innerHTML = quick.right + quick.wrong ? `
      <button type="button" class="count-tip okc" aria-label="${quick.right} correct answers" aria-describedby="qp-right-tip">✓ ${quick.right}<span class="count-tooltip" id="qp-right-tip" role="tooltip">Number of correct answers in this Quick practice session.</span></button>
      <button type="button" class="count-tip noc" aria-label="${quick.wrong} wrong attempts" aria-describedby="qp-wrong-tip">✗ ${quick.wrong}<span class="count-tooltip" id="qp-wrong-tip" role="tooltip">Number of wrong answer attempts in this Quick practice session.</span></button>` : "";
    $("qp-count").querySelectorAll('.count-tip').forEach(button => {
      button.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); button.classList.add('tooltip-dismissed'); } });
      button.addEventListener('mouseleave', () => button.classList.remove('tooltip-dismissed'));
      button.addEventListener('focus', () => button.classList.remove('tooltip-dismissed'));
    });
  };
  let quick = null; /* { type, state, cur: { key, n, d, repeat }, right, wrong } */
  const localKey = (type) => "bt-qp-" + type.id;
  const shownKey = type => localKey(type) + '-shown:' + encodeURIComponent(globalThis.Account.state.user?.email || 'guest');
  const restoreShown = type => {
    try { return JSON.parse(localStorage.getItem(shownKey(type))); } catch { return null; }
  };
  const saveShown = () => {
    const state=quick.state;
    const history={shownCount:state.shownCount,lastShown:state.lastShown,recentShown:state.recentShown,wrongShownAt:state.wrongShownAt};
    try {
      localStorage.setItem(shownKey(quick.type),JSON.stringify(history));
      if(!globalThis.Account.state.user) localStorage.setItem(localKey(quick.type),JSON.stringify(state));
    } catch { /* private window */ }
  };
  const loadState = async (type) => {
    if (globalThis.Account.state.user) {
      try { const r = await globalThis.Account.api("practice/" + type.id); if (r.state) return r.state; } catch { /* use a new state */ }
      return globalThis.Scheduler.fresh();
    }
    try { return JSON.parse(localStorage.getItem(localKey(type))) || globalThis.Scheduler.fresh(); } catch { return globalThis.Scheduler.fresh(); }
  };
  const startQuick = async (qp, type) => {
    const topic = E.TOPICS.find((t) => t.id === qp.topic);
    $("home-link").textContent = (topic ? topic.title : type.title) + " ⚡";
    const box = $("quick");
    $('qp-working')?.sheet?.destroy();
    box.replaceChildren(make("p", "", "…"));
    const state = await loadState(type);
    const shownHistory=restoreShown(type);
    if(shownHistory && (shownHistory.shownCount || 0)>=(state.shownCount || 0)) {
      ['shownCount','lastShown','recentShown','wrongShownAt'].forEach(key=>{if(shownHistory[key]!==undefined) state[key]=shownHistory[key];});
    }
    quick = { qp, type, state, right: 0, wrong: 0 };
    const view = make("div", "qpview");
    view.innerHTML = `
      <div class="qpquestion">
        <div class="qpcount" id="qp-count"></div>
        <form class="qpform" id="qp-form" novalidate>
          <span class="qpsum" id="qp-sum"></span> =
          <input class="box qpbox" id="qp-box" type="text" inputmode="numeric" autocomplete="off" aria-label="Answer">
          ${type.remainder ? '<span class="qpremainder"><span class="qpr">r</span><input class="box qpbox qprbox" id="qp-r" type="text" inputmode="numeric" autocomplete="off" aria-label="Remainder"></span>' : ""}
          <button class="check" type="submit">Check</button>
          <span class="mark" id="qp-mark" aria-live="polite"></span>
        </form>
        <div class="qpafter" id="qp-after">
          <button class="next-question" id="qp-next" type="button" aria-label="Next question">Next question ${NEXT_ARROW}</button>
        </div>
      </div>
      <aside class="division-panel" aria-label="Division working"><h2>Working</h2><div id="qp-sheet-host"></div></aside>`;
    box.replaceChildren(view);
    $("qp-form").addEventListener("submit", (e) => { e.preventDefault(); quickCheck(); });
    $('qp-form').addEventListener('input', () => {
      [$('qp-box'),$('qp-r')].forEach(input=>{if(input){input.classList.remove('answer-review-error','answer-review-dependent');input.removeAttribute('aria-invalid');}});
    });
    $('qp-form').addEventListener('change', () => {
      const frame=$('qp-working');
      if(frame?.dataset.ready==='true'&&!quick.cur.busy) frame.sheet.review();
    });
    $("qp-next").addEventListener("click", quickAsk);
    quickAsk();
  };
  const quickAsk = () => {
    clearTimeout(quick.cur?.advanceTimer);
    const rules = rulesOf(quick.type);
    const { key, repeat } = globalThis.Scheduler.next(quick.state, groupsOf(quick.type, rules), { ...rules, fresh: !quick.cur });
    globalThis.Scheduler.shown(quick.state,key,rules);
    saveShown();
    const [n, d] = key.split("/").map(Number);
    quick.cur = { key, n, d, repeat, busy: false };
    $("qp-sum").textContent = `${n} ÷ ${d}`;
    const frame = makeWorksheet(n, d);
    frame.id = 'qp-working';
    $('qp-working')?.sheet?.destroy();
    $('qp-sheet-host').replaceChildren(frame.loadingNote, frame);
    frame.start();
    $("qp-mark").textContent = "";
    delete $("qp-mark").dataset.working;
    $("qp-after").hidden = false;
    $("qp-form").classList.remove("done", "wrong");
    const b = $("qp-box");
    [b, $("qp-r")].forEach((x) => { if (x) { x.value = ""; x.readOnly = false; } });
    b.focus();
    renderCount();
  };
  const quickCheck = (keepWorking = false) => {
    const c = quick.cur, b = $("qp-box"), rb = $("qp-r");
    if (c.busy || b.readOnly) return;
    /* 2 boxes: quotient and remainder; an empty remainder box counts as 0. */
    const given = b.value.trim() + (rb && rb.value.trim() ? " r " + rb.value.trim() : "");
    const result = b.value.trim() ? E.checkDivision(c.n, c.d, given) : "unclear";
    if (result === "unclear") { b.focus(); return; }
    const ok = result === "right";
    c.attempted = true;
    c.busy = true;
    b.readOnly = ok;
    if (rb) rb.readOnly = ok;
    globalThis.Scheduler.answered(quick.state, c.key, ok, rulesOf(quick.type));
    if (globalThis.Account.state.user) globalThis.Records.practice(quick.type.id, c.key, given, ok, c.repeat, quick.state);
    else { try { localStorage.setItem(localKey(quick.type), JSON.stringify(quick.state)); } catch { /* private window */ } }
    if (ok) {
      quick.right++;
      renderCount();
      $("qp-mark").textContent = "✓";
      $("qp-form").classList.remove("wrong");
      [b, rb].forEach(input => { if (input) { input.classList.remove('answer-review-error','answer-review-dependent'); input.removeAttribute('aria-invalid'); } });
      delete $("qp-mark").dataset.working;
      $("qp-form").classList.add("done");
      if (keepWorking) $("qp-after").hidden = false;
      else c.advanceTimer = setTimeout(() => { if (quick?.cur === c) quickAsk(); }, 800);
    } else {
      quick.wrong++;
      renderCount();
      $("qp-mark").textContent = "✗";
      $("qp-form").classList.add("wrong");
      $("qp-after").hidden = false;
      c.busy = false;
      askWorksheet($('qp-working'));
    }
  };

  /* For browser checks: the current questions. */
  const openStart = () => {
    if(navigated) return;
    const start=initialRoute;
    if (start && (SECTIONS.includes(start) || start.startsWith("learn:") || start.startsWith("qp:") || E.TESTS.some((t) => t.id === start))) go(start);
  };
  globalThis.App = { slots: () => slots, go, quick: () => quick, openStart };
})();
