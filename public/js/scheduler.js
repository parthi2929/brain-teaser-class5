/* Quick practice: chooses the next sum of one type. No DOM code here, so the Node check runs it.

   state (one per user and type, saved when shown and answered):
     count   graded attempts so far
     recent  keys of the last graded questions, newest last (at most noRepeat)
     recentShown / lastShown remember displayed questions, including skipped questions
     wrong   { key: { due, need, got } }  sums that must come back:
             due  = come back when count reaches this
             need = right answers needed before the sum stops coming back
             got  = right answers so far since the last wrong answer
   rules (admin, per type): noRepeat, gapMin, gapMax, rightTimes, divisorDigits (division only: 1, or 2 for 1 to 2). */
globalThis.Scheduler = (() => {
  const DEFAULTS = { noRepeat: 100, gapMin: 5, gapMax: 10, rightTimes: 2, divisorDigits: 1 };
  const fresh = () => ({ count: 0, recent: [], wrong: {} });
  const rnd = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));

  /* Returns { key, repeat } for the next question.
     groups: lists of keys; each list has an equal chance (for example: sums without and with a remainder). */
  const next = (state, groups, rules, rng = Math.random) => {
    const r = { ...DEFAULTS, ...rules };
    /* 1. A sum she got wrong whose turn has come (the earliest first). */
    const due = r.fresh ? [] : Object.entries(state.wrong).filter(([key, w]) =>
      w.due <= state.count && key !== state.lastShown &&
      (state.wrongShownAt?.[key] === undefined || (state.shownCount || 0) - state.wrongShownAt[key] >= r.gapMin) &&
      groups.some(group => group.includes(key))
    ).sort((a, b) => a[1].due - b[1].due);
    if (due.length) return { key: due[0][0], repeat: true };
    /* 2. A random sum that was not among the last noRepeat questions. With a small pool, the window shrinks. */
    const size = groups.reduce((s, g) => s + g.length, 0);
    const window = Math.min(r.noRepeat, size - 1);
    const blocked = new Set(state.recent.slice(Math.max(0, state.recent.length - window)));
    (state.recentShown || []).slice(-Math.max(1, window)).forEach(k=>blocked.add(k));
    if (state.lastShown) blocked.add(state.lastShown);
    Object.keys(state.wrong).forEach((k) => blocked.add(k)); /* it comes back on its own turn */
    for (let i = 0; i < 60; i++) {
      const g = groups[rnd(rng, 0, groups.length - 1)];
      const k = g[rnd(rng, 0, g.length - 1)];
      if (!blocked.has(k)) return { key: k, repeat: false };
    }
    const all = groups.flat();
    const open = all.filter((k) => !blocked.has(k));
    const different = all.filter(k => k !== state.lastShown);
    const from = open.length ? open : different.length ? different : all;
    return { key: from[rnd(rng, 0, from.length - 1)], repeat: false };
  };

  /* Remember display/skip/refresh without grading an answer. */
  const shown = (state, key, rules) => {
    const r = { ...DEFAULTS, ...rules };
    state.shownCount = (state.shownCount || 0) + 1;
    state.lastShown = key;
    state.recentShown ||= [];
    state.recentShown.push(key);
    state.recentShown = state.recentShown.slice(-Math.max(1,r.noRepeat));
    state.wrongShownAt ||= {};
    Object.keys(state.wrongShownAt).forEach(k=>{if(!state.wrong[k]) delete state.wrongShownAt[k];});
    if(state.wrong[key]) state.wrongShownAt[key]=state.shownCount;
    return state;
  };

  /* Updates the state after an answer to `key`. */
  const answered = (state, key, ok, rules, rng = Math.random) => {
    const r = { ...DEFAULTS, ...rules };
    state.count += 1;
    state.recent.push(key);
    if (state.recent.length > Math.max(r.noRepeat, 1)) state.recent.splice(0, state.recent.length - r.noRepeat);
    const w = state.wrong[key];
    if (!ok) {
      if (r.rightTimes > 0) state.wrong[key] = { due: state.count + rnd(rng, r.gapMin, r.gapMax), need: r.rightTimes, got: 0 };
    } else if (w) {
      w.got += 1;
      if (w.got >= w.need) delete state.wrong[key];
      else w.due = state.count + rnd(rng, r.gapMin, r.gapMax);
    }
    return state;
  };

  return { DEFAULTS, fresh, next, shown, answered };
})();
