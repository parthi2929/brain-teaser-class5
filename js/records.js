/* Run records. One record per run of a test: every question (type, numbers, right answer)
   and every answer she entered (value, right or wrong, time).
   Today the records stay in this browser (localStorage). The Cloudflare API will receive the same
   records later: send() is the one place to change. */
globalThis.Records = (() => {
  const KEY = "bt-runs";
  const now = () => new Date().toISOString();
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const all = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  };
  const save = (runs) => {
    try { localStorage.setItem(KEY, JSON.stringify(runs.slice(-200))); } catch { /* private window: keep in memory only */ }
  };
  const send = (run) => {
    const runs = all().filter((r) => r.id !== run.id);
    runs.push(run);
    save(runs);
  };

  /* test: the registered test. questions: [{ type, q }] in slot order. */
  const start = (test, questions) => {
    const run = {
      id: id(), testId: test.id, topic: test.topic, startedAt: now(), finishedAt: null, score: null,
      questions: questions.map(({ type, q }, slot) => ({ slot, type, text: q.text, numbers: q.meta, kind: q.kind, answer: q.answer })),
      attempts: [],
    };
    send(run);
    return run;
  };
  const attempt = (run, slot, given, result) => {
    run.attempts.push({ slot, given: String(given), result, at: now() });
    send(run);
  };
  const finish = (run, score) => {
    run.finishedAt = now();
    run.score = score;
    send(run);
  };
  return { start, attempt, finish, all };
})();
