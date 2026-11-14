/* Free worksheet. Arithmetic is checked from newly written values, independently of their position. */
globalThis.DivisionSheet = (() => {
  const template = `<style>
  :host { color-scheme: light; --bg:#f3f7f0; --ink:#1d2a22; --muted:#5e6f63; --paper:#fff; --grid:#cfe2f0;
    --leaf:#2c7a4b; --on-leaf:#fff; --soft:#dcefe0; --wrong:#c62828; --wrong-soft:#fbe4e1; --ask:#fff4bf; --ask-line:#b08308;
    --read:"Andika",Verdana,sans-serif; --hand:"Caveat","Segoe Print",cursive; }
  @media (prefers-color-scheme:dark) { :host(:not([data-theme="light"])) { color-scheme:dark; --bg:#141b16; --ink:#e8f0e9; --muted:#9db0a2; --paper:#1c251f; --grid:#2c4352; --leaf:#6cc48f; --on-leaf:#0e1a12; --soft:#1f3627; --wrong:#ff8a80; --wrong-soft:#3d1f1c; --ask:#4a4216; --ask-line:#d9b63e; } }
  :host([data-theme="dark"]) { color-scheme:dark; --bg:#141b16; --ink:#e8f0e9; --muted:#9db0a2; --paper:#1c251f; --grid:#2c4352; --leaf:#6cc48f; --on-leaf:#0e1a12; --soft:#1f3627; --wrong:#ff8a80; --wrong-soft:#3d1f1c; --ask:#4a4216; --ask-line:#d9b63e; }
  * { box-sizing:border-box; }
  :host { display:block; margin:0; background:var(--bg); color:var(--ink); font:18px/1.4 var(--read); }
  button,input { font:inherit; color:inherit; }
  button { cursor:pointer; }
  .wrap { max-width:44rem; margin:auto; padding:12px 12px 20px; display:grid; justify-items:center; gap:12px; }
  #sum { margin:0; font-size:1.6em; font-weight:700; }
  #ask { margin:0; font-weight:700; text-align:center; }
  .instruction { margin:0; color:var(--muted); font-size:.85em; text-align:center; }
  #coaching { width:100%; padding:12px; background:var(--soft); border-radius:8px; display:grid; justify-items:center; gap:10px; }
  #coaching p { margin:0; }
  #coach-question { font-weight:700; text-align:center; }
  #comparison { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:10px; font-size:1.4em; font-weight:700; }
  #comparison span { padding:3px 10px; background:var(--paper); border:2px solid var(--leaf); border-radius:4px; }
  #feedback { font-size:.85em; color:var(--wrong); text-align:center; }
  #yesno { display:flex; gap:12px; }
  .choice,.help,.more { border:1px solid var(--leaf); border-radius:8px; background:var(--paper); padding:8px 18px; }
  .choice { min-width:86px; font-weight:700; }
  #grid { position:relative; display:grid; grid-template-columns:repeat(var(--cols),var(--cell)); grid-auto-rows:var(--cell);
    border-left:1px solid var(--grid); border-top:1px solid var(--grid); background:var(--paper); }
  .square { min-width:0; width:var(--cell); height:var(--cell); padding:0; border:0; border-right:1px solid var(--grid); border-bottom:1px solid var(--grid);
    border-radius:0; background:transparent; text-align:center; font:700 calc(var(--cell)*.78)/1 var(--hand); caret-color:var(--ink); }
  .square:focus { outline:3px solid var(--leaf); outline-offset:-3px; position:relative; z-index:2; }
  .square.rejected { text-decoration:line-through; color:var(--wrong); background:var(--wrong-soft); }
  .square.scratch { color:var(--muted); }
  .square.checked { box-shadow:inset 0 -2px var(--leaf); }
  .square.mistake { color:var(--wrong); background:var(--wrong-soft); box-shadow:inset 0 0 0 2px var(--wrong); }
  .square.dependent { background:var(--ask); box-shadow:inset 0 -2px var(--ask-line); }
  .square.look { background:var(--ask); box-shadow:inset 0 0 0 2px var(--ask-line); }
  .bracket { position:absolute; pointer-events:none; height:var(--cell); width:var(--cell); font:calc(var(--cell)*.96)/1 var(--read); text-align:center; }
  .hline { position:absolute; height:0; border-top:2px solid var(--ink); pointer-events:none; }
  .controls { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:10px; }
  .go { min-width:100px; min-height:52px; border:0; border-radius:12px; background:var(--leaf); color:var(--on-leaf); display:grid; place-items:center; font-weight:700; }
  .go svg { width:34px; height:28px; }
  .help,.more { font-size:.85em; }
  :focus-visible { outline:3px solid var(--leaf); outline-offset:2px; }
  [hidden] { display:none!important; }
</style>
<main class="wrap">
  <p id="sum"></p>
  <p id="unit-note" class="instruction" hidden></p>
  <p id="ask" aria-live="polite">Loading worksheet…</p>
  <p id="startup-status" class="instruction">Starting worksheet…</p>
  <p class="instruction">Use any square. Enter or → checks your next step.</p>
  <section id="coaching" aria-label="Work through this together" hidden>
    <p id="coach-question" aria-live="polite" hidden></p>
    <div id="comparison" aria-hidden="true"></div>
    <p id="feedback" role="status"></p>
    <div id="yesno" hidden><button type="button" class="choice" id="yes">Yes</button><button type="button" class="choice" id="no">No</button></div>
  </section>
  <div id="grid" role="group" aria-label="Division worksheet. Every square is editable."></div>
  <p id="notice" class="instruction" role="status"></p>
  <div class="controls">
    <button class="help" id="help" type="button" disabled>Help me</button>
    <button class="go" id="go" type="button" disabled aria-label="Check step"><svg viewBox="0 0 34 28" aria-hidden="true"><path d="M3 14h24M18 4l10 10-10 10" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <button class="more" id="more" type="button" disabled>More rows</button>
  </div>
</main>`;
  const mount = (host, { n, d, unit = '', onReviewed, onDone } = {}) => {
  const doc = host.ownerDocument, root = host.shadowRoot || host.attachShadow({ mode:'open' });
  root.innerHTML = template;
  const $ = id => root.getElementById(id);
  if (!Number.isInteger(n) || !Number.isInteger(d) || n < 1 || d < 2 || n > 99999 || d > 999) {
    $('ask').textContent = 'Open a division question to use this sheet.';
    $('startup-status').hidden = true;
    $('go').disabled = $('help').disabled = $('more').disabled = true;
    return;
  }
  const syncTheme = () => { const theme = doc.documentElement.dataset.theme; if (theme) host.dataset.theme = theme; else delete host.dataset.theme; };
  syncTheme();
  const coach = globalThis.DivisionCoach.create(n, d), L = coach.lesson, grid = $('grid');
  const cols = Math.max(9, L.cols + 2), cells = [], saved = new Map(), rejected = new Map(), dirty = new Set();
  const c0 = String(d).length + 1;
  let rows = 0, sequence = 0, lastReview = null, failureKey = null, answerFeedback = '';
  const writtenOrder = new Map(), bindings = new Map(), scratch = new Map(), dependentBaseline = new Map(), given = new Map();
  const nextIcon = $('go').innerHTML;
  grid.style.setProperty('--cols', cols);
  $('sum').textContent = `${n} ÷ ${d}`;
  if (unit === 'cents') { $('unit-note').hidden = false; $('unit-note').textContent = 'Use cents on this sheet. Give the final answer in the unit asked by the question.'; }
  const resize = () => {
    const room = Math.min(host.clientWidth - 26, root.querySelector('.wrap').clientWidth - 26);
    grid.style.setProperty('--cell', Math.max(22, Math.min(44, Math.floor(room / cols))) + 'px');
  };
  resize();
  const sizeObserver = new ResizeObserver(resize); sizeObserver.observe(host);
  const themeObserver = new MutationObserver(syncTheme); themeObserver.observe(doc.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const key = (r, c) => r * cols + c;
  const snapshot = () => { cells.forEach((el, k) => saved.set(k, el.value)); dirty.clear(); };
  const move = (el, dr, dc) => {
    const r = Number(el.dataset.row) + dr, c = Number(el.dataset.col) + dc;
    if (r < 0 || c < 0 || c >= cols || r >= rows) return;
    const next = cells[key(r, c)]; next.focus(); next.select();
  };
  const addRows = count => {
    for (let r = rows; r < rows + count; r++) for (let c = 0; c < cols; c++) {
      const el = doc.createElement('input'), k = key(r, c);
      el.type = 'text'; el.inputMode = 'decimal'; el.autocomplete = 'off'; el.maxLength = 1; el.spellcheck = false; el.enterKeyHint = 'next';
      el.className = 'square'; el.dataset.row = r; el.dataset.col = c;
      el.setAttribute('aria-label', `Row ${r + 1}, square ${c + 1}`);
      el.addEventListener('input', () => {
        el.value = el.value.replace(/[·,]/g, '.').replace(/[^0-9.]/g, '').slice(0, 1);
        el.classList.remove('rejected'); el.removeAttribute('aria-invalid'); rejected.delete(k); dirty.add(k);
        scratch.delete(k);
        if (el.value && !writtenOrder.has(k)) writtenOrder.set(k, sequence++);
        if (!el.value) writtenOrder.delete(k);
        $('notice').textContent = '';
        if (lastReview?.complete) { $('ask').textContent = 'Check your edited working.'; $('go').innerHTML = nextIcon; $('go').setAttribute('aria-label', 'Check working'); }
        if (r === 1 && c === String(d).length) bracket.hidden = !!el.value;
        if (el.value && c < cols - 1) move(el, 0, 1);
      });
      el.addEventListener('paste', e => {
        e.preventDefault();
        const text = e.clipboardData.getData('text').replace(/[·,]/g, '.').replace(/[^0-9.]/g, '');
        if (!text) return;
        const values = [...text].slice(0, cells.length - k);
        values.forEach((ch, j) => { const field = cells[k + j]; field.value = ch; field.classList.remove('rejected'); field.removeAttribute('aria-invalid'); rejected.delete(k + j); dirty.add(k + j); scratch.delete(k + j); if (!writtenOrder.has(k + j)) writtenOrder.set(k + j, sequence++); });
        const end = cells[Math.min(k + values.length, cells.length - 1)]; end.focus(); end.select();
      });
      el.addEventListener('keydown', e => {
        if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'Enter') { e.preventDefault(); check(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); move(el, 0, -1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); move(el, 0, 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(el, -1, 0); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); move(el, 1, 0); }
        else if (e.key === 'Backspace' && !el.value) { e.preventDefault(); move(el, 0, -1); }
      });
      cells[k] = el; grid.append(el); saved.set(k, '');
    }
    rows += count;
  };
  addRows(Math.max(9, L.rows + 2));
  L.base.filter(m => !m.bracket).forEach(m => { const k = key(m.r, m.c); cells[k].value = m.x; given.set(k, m.x); });
  snapshot();
  const bracket = doc.createElement('span');
  bracket.className = 'bracket'; bracket.textContent = ')'; bracket.setAttribute('aria-hidden', 'true');
  bracket.style.top = 'var(--cell)'; bracket.style.left = `calc(var(--cell) * ${String(d).length})`; grid.append(bracket);
  const rule = (r, start, length, working = false) => {
    const el = doc.createElement('div'); el.className = 'hline' + (working ? ' review-rule' : '');
    el.style.top = `calc(var(--cell) * ${r})`; el.style.left = `calc(var(--cell) * ${start})`;
    el.style.width = `calc(var(--cell) * ${length})`; grid.append(el);
  };
  rule(1, c0, String(n).length);
  const render = () => {
    const v = coach.view();
    $('ask').textContent = lastReview?.complete ? (answerFeedback || '✓ Your working is correct.') : v.text;
    $('ask').hidden = !!v.boolean;
    $('coach-question').textContent = v.boolean ? v.text : '';
    $('coach-question').hidden = !v.boolean;
    $('coaching').hidden = !v.help;
    $('feedback').textContent = v.feedback || '';
    $('yesno').hidden = !v.boolean;
    $('help').hidden = v.done;
    $('go').setAttribute('aria-label', v.done ? 'Return to answer' : 'Check step');
    if (v.done) $('go').textContent = 'Done';
    else if (!$('go').querySelector('svg')) $('go').innerHTML = nextIcon;
    cells.forEach((el,k) => {
      el.classList.remove('look','checked','mistake','dependent','rejected','scratch');
      el.removeAttribute('aria-invalid'); el.removeAttribute('title');
      const note = scratch.get(k);
      if (note && note.value === el.value) { el.classList.add('scratch'); if (note.bad) el.classList.add('rejected'); }
    });
    lastReview?.checked.forEach(k => { cells[k]?.classList.add('checked'); });
    lastReview?.error?.ids.forEach(k => { if (cells[k]) { cells[k].classList.remove('checked'); cells[k].classList.add('mistake'); cells[k].setAttribute('aria-invalid','true'); } });
    if (lastReview?.error) dependentBaseline.forEach((value,k) => { if (cells[k]?.value === value && !lastReview.checked.includes(k) && !lastReview.error.ids.includes(k)) { cells[k].classList.add('dependent'); cells[k].title = 'Recheck this after correcting the red entry.'; } });
    grid.querySelectorAll('.review-rule').forEach(el => el.remove());
    lastReview?.accepted.filter(a => a.phase === 'multiply' && a.ids.length).forEach(a => {
      const fields = a.ids.map(k=>cells[k]);
      rule(Number(fields[0].dataset.row)+1, Math.min(...fields.map(el=>Number(el.dataset.col))), fields.length, true);
    });
    const comparison = $('comparison'); comparison.replaceChildren();
    const a = v.annotation;
    comparison.hidden = !!v.boolean || !a;
    if (!a) return;
    const chip = text => { const el = doc.createElement('span'); el.textContent = text; comparison.append(el); };
    if (a.divisor !== undefined && a.partial !== undefined) {
      chip(a.partial); comparison.append(doc.createTextNode('÷')); chip(a.divisor); comparison.append(doc.createTextNode('= ?'));
      for (let c = 0; c < String(d).length; c++) cells[key(1, c)].classList.add('look');
      const length = String(a.partial).length;
      const down = lastReview?.accepted.findLast(item => item.phase === 'down' && item.index < coach.index());
      if (down && a.partial === coach.step().current) down.contextIds.forEach(k => cells[k]?.classList.add('look'));
      else for (let c = c0 + Math.max(0, a.source + 1 - length); c <= c0 + a.source; c++) cells[key(1, c)].classList.add('look');
      // An early prefix starts at the first digit, before the full group is used.
      if (coach.step().phase === 'quotient' && coach.index() === 0) {
        cells.forEach(el => { if (Number(el.dataset.row) === 1 && Number(el.dataset.col) >= c0) el.classList.remove('look'); });
        for (let c = c0; c < c0 + length; c++) cells[key(1, c)].classList.add('look');
      }
    } else if (a.left !== undefined) { chip(a.left); comparison.append(doc.createTextNode('→')); chip(a.right); }
    else if (a.groups !== undefined) { chip(a.groups); comparison.append(doc.createTextNode('groups of')); chip(a.divisor); }
    else if (a.down) cells[key(1, c0 + a.source)].classList.add('look');
  };
  const pending = () => cells.map((el, k) => ({ el, k })).filter(({ el, k }) => el.value && (dirty.has(k) || el.value !== saved.get(k)) && el.value !== rejected.get(k));
  const sheetTokens = () => {
    const byRow = new Map();
    cells.forEach((el,k) => {
      if (!el.value || given.has(k) || scratch.get(k)?.value === el.value) return;
      const row = Number(el.dataset.row);
      if (!byRow.has(row)) byRow.set(row, { row, order: Infinity, cells: [] });
      const token = byRow.get(row);
      token.cells.push({ id:k, row, col:Number(el.dataset.col), value:el.value });
      token.order = Math.min(token.order, writtenOrder.get(k) ?? sequence + row);
    });
    return [...byRow.values()];
  };
  const readSheet = () => globalThis.DivisionReview.review(L, sheetTokens(), { bindings });
  const verifiedAnswer = (review = readSheet()) => {
    if ([...given].some(([k,value])=>cells[k].value!==value)) return null;
    return globalThis.DivisionReview.answer(L,review,k=>cells[k]?.value);
  };
  const remember = review => {
    review.accepted.forEach(a => {
      bindings.set(a.index, a);
      [...a.ids,...a.contextIds].forEach(k => { saved.set(k,cells[k].value); dirty.delete(k); rejected.delete(k); });
    });
    const nextFailure = review.error ? review.error.index + ':' + review.error.ids.map(k=>k+'='+cells[k].value).join(',') : null;
    if (nextFailure !== failureKey) {
      dependentBaseline.clear();
      if (review.error) review.dependent.forEach(k=>dependentBaseline.set(k,cells[k].value));
      failureKey = nextFailure;
    }
    lastReview = review;
    coach.resume(review.next);
  };
  const draftRows = entries => {
    const groups = new Map();
    entries.forEach(entry => {
      const row = Number(entry.el.dataset.row);
      if (!groups.has(row)) groups.set(row,{row,entries:[],order:Infinity});
      const group=groups.get(row); group.entries.push(entry);
      group.order=Math.min(group.order,writtenOrder.get(entry.k)??sequence+entry.k);
    });
    return [...groups.values()].sort((a,b)=>a.order-b.order);
  };
  function evaluate({ help = false, checked = false, focus = false } = {}) {
    answerFeedback = '';
    const drafts = pending(), previousIndex = coach.index(), wasHelping = coach.view().help;
    const changedGiven = [...given].filter(([k,value])=>cells[k].value!==value);
    if (changedGiven.length) {
      render(); changedGiven.forEach(([k])=>{cells[k].classList.add('mistake');cells[k].setAttribute('aria-invalid','true');});
      $('notice').textContent='The given question changed. Check the marked question digits.'; return;
    }
    let review = readSheet();
    remember(review);
    // Extra counting done with the coach is scratch work, not a replacement for validated steps.
    if (checked && wasHelping && previousIndex === review.next && !coach.view().boolean && !review.complete) {
      const candidate = drafts.filter(({el,k}) => !review.checked.includes(k) &&
        !(dependentBaseline.get(k)===el.value && !review.error?.ids.includes(k)) &&
        !(!review.error && review.future.includes(k)));
      const groups = draftRows(candidate);
      const results = coach.submitRows(groups.map(g=>({row:g.row,raw:g.entries.map(({el})=>el.value).join('')})));
      let completedStep = false;
      for (const result of results) {
        const current=groups.find(g=>g.row===result.row).entries;
        if (result.status==='support') current.forEach(({el,k})=>{scratch.set(k,{value:el.value,bad:false});saved.set(k,el.value);dirty.delete(k);rejected.delete(k);});
        if (result.status==='right') {
          const oldError = review.error?.index===L.steps.indexOf(result.step) ? review.error : null;
          (oldError?.entryIds || oldError?.ids)?.filter(k=>!current.some(e=>e.k===k)).forEach(k=>scratch.set(k,{value:cells[k].value,bad:oldError.ids.includes(k)}));
          bindings.set(L.steps.indexOf(result.step),{index:L.steps.indexOf(result.step),phase:result.step.phase,ids:current.map(e=>e.k),contextIds:current.map(e=>e.k)});
          completedStep=true;
        }
        if (result.status==='wrong') current.forEach(({el,k})=>rejected.set(k,el.value));
      }
      if (completedStep) { review=readSheet(); remember(review); }
      else if (results.some(r=>r.status==='support')) { lastReview=readSheet(); }
    }
    if ((help || review.error) && !review.complete) coach.requestHelp();
    (review.error?.entryIds || review.error?.ids)?.forEach(k=>rejected.set(k,cells[k].value));
    render();
    if (review.complete) $('notice').textContent='All written division steps are correct.';
    else if (review.error) $('notice').textContent=(review.accepted.length ? 'Your earlier steps are correct. ' : '')+'Fix the red entry. Recheck the amber working after it.';
    else $('notice').textContent=review.accepted.length ? `✓ ${review.accepted.length} steps are correct. What comes next?` : 'Write your working, then check it.';
    if (focus) {
      if (root.activeElement?.classList.contains('square')) root.activeElement.blur();
      if (coach.view().boolean) $('yes').focus({preventScroll:true}); else $('go').focus({preventScroll:true});
    }
    onReviewed?.({ type:'division-working-reviewed', complete:review.complete, next:review.next, error:!!review.error, answer:verifiedAnswer(review) });
  }
  function check() {
    if (lastReview?.complete) { const answer=verifiedAnswer(); if(answer) { onDone?.(answer); return; } }
    evaluate({checked:true,focus:true});
  }
  $('go').addEventListener('click',check);
  const respond=answer=>{coach.yesNo(answer);render();};
  $('yes').addEventListener('click',()=>respond(true));
  $('no').addEventListener('click',()=>respond(false));
  $('help').addEventListener('click',()=>evaluate({help:true}));
  $('more').addEventListener('click', () => { addRows(3); });
  render();
  $('startup-status').hidden = true;
  $('go').disabled = $('help').disabled = $('more').disabled = false;
  host.dataset.ready = 'true';
  return {
    answer: () => verifiedAnswer(),
    review: () => evaluate(),
    help: () => evaluate({help:true}),
    feedback: text => { if (lastReview?.complete) { answerFeedback=text; render(); } },
    destroy: () => { sizeObserver.disconnect(); themeObserver.disconnect(); }
  };
  };
  return { mount };
})();

// The standalone page uses the same component as the inline question panel.
if (document.getElementById('division-standalone')) {
  const P = new URLSearchParams(location.search), host = document.getElementById('division-standalone');
  const sheet = globalThis.DivisionSheet.mount(host, {
    n:Number(P.get('n')), d:Number(P.get('d')), unit:P.get('unit') || '',
    onReviewed: data => parent.postMessage(data,location.origin),
    onDone: answer => parent.postMessage({type:'division-working-done',answer},location.origin)
  });
  if (sheet) {
    document.documentElement.dataset.divisionReady='true';
    parent.postMessage({type:'division-sheet-ready'},location.origin);
    addEventListener('message',e=>{
      if(e.origin!==location.origin || e.source!==parent || e.data?.type!=='division-coach') return;
      if(e.data.action==='help') sheet.help();
      if(e.data.action==='review') sheet.review();
      if(e.data.action==='answer-feedback') sheet.feedback(e.data.text);
    });
  }
}
