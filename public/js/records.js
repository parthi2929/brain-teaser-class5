/* Run records: one record per run of a test, sent to the Worker (functions/api) when she is signed in.
   The record holds every question (type, numbers, right answer) and every answer she entered
   (value, right or wrong, time). Without sign-in the app still works, but nothing is stored.
   Calls for one run go out in order, so an answer never arrives before its run. */
globalThis.Records = (() => {
  const A = () => globalThis.Account;
  const start = (test, questions) => {
    const run = { testId: test.id, finished: false, chain: Promise.resolve(null) };
    if (!A().state.user) return run;
    run.chain = A().api("runs", {
      method: "POST",
      body: {
        testId: test.id, topic: test.topic,
        questions: questions.map(({ type, q }, slot) => ({ slot, type, numbers: q.meta, kind: q.kind, answer: q.answer })),
      },
    }).then((r) => r.runId).catch(() => null);
    return run;
  };
  const then = (run, f) => { run.chain = run.chain.then((id) => (id ? f(id).then(() => id, () => id) : null)); };
  const attempt = (run, slot, type, given, ok, closed = false) =>
    then(run, (id) => A().api(`runs/${id}/attempts`, { method: "POST", body: { slot, type, given, ok, closed } }));
  const finish = (run, score) => {
    run.finished = true;
    then(run, (id) => A().api(`runs/${id}/finish`, { method: "POST", body: { score } }));
  };
  return { start, attempt, finish };
})();
