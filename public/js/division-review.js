/* Review the child's complete worksheet, keeping cell references independent of alignment. */
globalThis.DivisionReview = (() => {
  const number = raw => globalThis.DivisionCoach.readNumber(raw);
  const unique = ids => [...new Set(ids)];
  const review = (lesson, input, options = {}) => {
    const tokens = input.filter(t => t.cells.length).map(t => ({ ...t, raw: t.cells.map(c => c.value).join('') })).sort((a,b) => a.order - b.order || a.row - b.row);
    const byId = new Map(tokens.flatMap(t => t.cells.map(c => [c.id, { cell: c, token: t }])));
    const bindings = options.bindings || new Map();
    const firstQ = lesson.steps.findIndex(s => s.phase === 'quotient');
    const firstAnchor = bindings.get(firstQ)?.ids.find(id => byId.has(id));
    const quotient = firstAnchor !== undefined ? byId.get(firstAnchor).token : tokens[0];
    let qCells = quotient ? quotient.cells.slice() : [];
    // An optional leading zero or .0 does not change a whole-number quotient.
    while (qCells.length > 1 && qCells[0].value === '0') qCells.shift();
    const dot = qCells.findIndex(c => c.value === '.');
    if (dot >= 0 && qCells.slice(dot + 1).every(c => c.value === '0')) qCells = qCells.slice(0, dot);
    const usedQ = new Set(), used = new Set(quotient ? [quotient] : []), accepted = [];
    let qIndex = 0, at = 0, error = null, missing = false;
    const ids = cells => cells.map(c => c.id);
    const unused = () => tokens.filter(t => !used.has(t));
    const bound = index => {
      const binding = bindings.get(index);
      const id = binding?.ids.find(id => byId.has(id));
      const token = id === undefined ? null : byId.get(id).token;
      return token && !used.has(token) ? token : null;
    };
    const take = index => bound(index) || unused()[0];
    const accept = (index, cells, context = cells) => accepted.push({ index, phase: lesson.steps[index].phase, ids: ids(cells), contextIds: ids(context) });
    const mismatch = (cells, expected) => {
      const chars = String(expected);
      const wrong = cells.length === chars.length ? cells.filter((c,i) => c.value !== chars[i]) : cells;
      return ids(wrong.length ? wrong : cells);
    };
    const fail = (index, cells, raw, expected) => { error = { index, phase: lesson.steps[index].phase, ids: mismatch(cells, expected), entryIds: ids(cells), actual: raw }; at = index; };
    while (at < lesson.steps.length) {
      const s = lesson.steps[at];
      if (s.phase === 'quotient') {
        let cells;
        const anchor = bindings.get(at)?.ids.map(id => byId.get(id)?.cell).filter(Boolean);
        if (anchor?.length) cells = anchor;
        else if (qCells[qIndex]) cells = [qCells[qIndex]];
        else {
          const t = take(at);
          if (!t || t.cells.length !== 1) { missing = true; break; }
          cells = t.cells; used.add(t);
        }
        cells.forEach(c => { usedQ.add(c.id); const token = byId.get(c.id)?.token; if (token && token !== quotient) used.add(token); });
        const raw = cells.map(c => c.value).join('');
        if (number(raw) !== Number(s.answer)) { fail(at, cells, raw, s.answer); break; }
        accept(at, cells); qIndex++; at++; continue;
      }
      const t = take(at);
      if (!t) { missing = true; break; }
      const value = number(t.raw);
      if (s.phase === 'subtract' && lesson.steps[at + 1]?.phase === 'down') {
        const down = lesson.steps[at + 1], combined = Number(s.answer) * 10 + Number(down.answer);
        if (value === combined) {
          const split = Math.max(0, t.cells.length - 1);
          accept(at, t.cells.slice(0, split));
          accept(at + 1, t.cells.slice(split), t.cells);
          used.add(t); at += 2; continue;
        }
      }
      if (s.phase === 'down') {
        const previous = lesson.steps[at - 1];
        const combined = Number(previous.answer) * 10 + Number(s.answer);
        if (value === combined && t.cells.length > 1) {
          accept(at, t.cells.slice(-1), t.cells); used.add(t); at++; continue;
        }
      }
      if (value !== Number(s.answer)) { used.add(t); fail(at, t.cells, t.raw, s.answer); break; }
      accept(at, t.cells); used.add(t); at++;
    }
    const quotientSteps = lesson.steps.map((s,index) => ({ s, index })).filter(({s}) => s.phase === 'quotient');
    if (!error && at === lesson.steps.length && qCells.length > quotientSteps.length) {
      at = quotientSteps.at(-1).index;
      error = { index: at, phase: 'quotient', ids: ids(qCells.slice(quotientSteps.length)), actual: quotient.raw, message: 'Check the extra quotient entry.' };
      for (let i = accepted.length - 1; i >= 0; i--) if (accepted[i].index >= at) accepted.splice(i, 1);
    }
    const futureQ = qCells.filter(c => !usedQ.has(c.id));
    const future = unique([...ids(futureQ), ...unused().flatMap(t => ids(t.cells))]);
    const wrong = new Set(error?.ids || []);
    const dependent = future.filter(id => !wrong.has(id));
    const checked = unique(accepted.flatMap(a => [...a.ids, ...a.contextIds]));
    return { accepted, checked, error, dependent, future, next: at, missing, complete: at === lesson.steps.length, quotientRow: quotient?.row,
      quotientIds: accepted.filter(a => a.phase === 'quotient').flatMap(a => a.ids),
      remainderIds: accepted.findLast(a => a.phase === 'subtract')?.ids || [] };
  };
  const answer = (lesson, result, readCell) => {
    if (!result?.complete) return null;
    const q = number(result.quotientIds.map(readCell).join(''));
    const r = number(result.remainderIds.map(readCell).join('') || '0');
    return q === lesson.q && r === lesson.r ? { q, r } : null;
  };
  return { review, answer };
})();
