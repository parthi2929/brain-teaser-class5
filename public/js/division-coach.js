/* Question-led help. The child supplies every answer; the model never places working on the sheet. */
globalThis.DivisionCoach = (() => {
  const readNumber = raw => /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(raw).trim()) ? Number(raw) : null;
  const create = (n, d) => {
    const lesson = globalThis.LongDiv.build(n, d);
    let at = 0, help = null, feedback = '';
    const step = () => lesson.steps[at];
    const complete = () => { at++; help = null; feedback = ''; return { status: 'right', done: at === lesson.steps.length }; };
    const requestHelp = () => {
      if (!step()) { feedback = 'Read the quotient digits you wrote. What number do they make? Check your last subtraction for the remainder, then try the answer boxes again.'; return; }
      if (help) return;
      const s = step();
      if (s.phase === 'quotient') help = { mode: 'fit', probe: 0 };
      if (s.phase === 'multiply') help = { mode: 'groups', count: s.digit === 0 ? 0 : 1 };
      if (s.phase === 'subtract') help = { mode: 'subtract-fit' };
      if (s.phase === 'down') help = { mode: 'down' };
    };
    const view = () => {
      const s = step();
      if (!s) return { done: true, text: feedback || 'Working complete. Use your working to answer the question.', help: !!feedback };
      const base = { done: false, text: s.q, phase: s.phase, help: !!help, boolean: false, feedback };
      if (!help) return base;
      const comparison = (partial, prefix) => ({ divisor: d, partial, prefix, source: s.source });
      if (help.mode === 'fit') {
        const partial = s.probes[help.probe];
        return { ...base, boolean: true, text: (help.probe ? `Let's take ${partial}. ` : '') + `Can ${d} go into ${partial}?`, annotation: comparison(partial, true) };
      }
      if (help.mode === 'multiple') return { ...base, text: `How many groups of ${d} fit into ${s.current}? Use the largest whole number that fits. Write it anywhere on the sheet.`, annotation: comparison(s.current, true) };
      if (help.mode === 'trial-product') return { ...base, text: `Let's check your multiple. What is ${help.guess} × ${d}? Write the product on the sheet.`, annotation: comparison(s.current, true) };
      if (help.mode === 'trial-fit') return { ...base, boolean: true, text: `Does ${help.product} fit into ${s.current}?`, annotation: { left: help.product, right: s.current } };
      if (help.mode === 'trial-more') return { ...base, boolean: true, text: `Can one more group of ${d} fit into ${s.current}?`, annotation: { left: help.product, right: s.current } };
      if (help.mode === 'groups') return { ...base, text: help.count === 0 ? `Zero groups of ${d}. How many is that? Write it on the sheet.` : help.count === 1 ? `One group of ${d}. How many is that? Write it on the sheet.` : `You counted ${(help.count - 1) * d}. Add one more group of ${d}. How much now? Write it on the sheet.`, annotation: { groups: help.count, divisor: d } };
      if (help.mode === 'subtract-fit') return { ...base, boolean: true, text: `Does ${s.product} fit into ${s.current}?`, annotation: { left: s.product, right: s.current } };
      if (help.mode === 'difference') return { ...base, text: `Count up from ${s.product} to ${s.current}. How many more? Write the difference on the sheet.`, annotation: { left: s.product, right: s.current } };
      return { ...base, text: 'Look at the marked digit in the question. Bring it down to any square on your sheet.', annotation: { source: s.source, down: true } };
    };
    const yesNo = answer => {
      const s = step();
      if (!s || !help || !view().boolean || typeof answer !== 'boolean') return { status: 'wait' };
      let expected;
      if (help.mode === 'fit') expected = s.probes[help.probe] >= d;
      if (help.mode === 'trial-fit') expected = help.product <= s.current;
      if (help.mode === 'trial-more') expected = help.product + d <= s.current;
      if (help.mode === 'subtract-fit') expected = s.product <= s.current;
      if (answer !== expected) { feedback = 'Look at the two numbers again. Try Yes or No.'; return { status: 'wrong' }; }
      feedback = '';
      if (help.mode === 'fit') {
        if (answer || help.probe === s.probes.length - 1) help = { mode: 'multiple' };
        else help.probe++;
      } else if (help.mode === 'trial-fit') {
        if (answer) help.mode = 'trial-more';
        else { feedback = 'Try fewer groups.'; help = { mode: 'multiple' }; }
      } else if (help.mode === 'trial-more') {
        feedback = answer ? 'Try more groups.' : 'Use the number of groups you checked.';
        help = { mode: 'multiple' };
      } else help = { mode: 'difference' };
      return { status: 'support' };
    };
    const submit = raw => {
      const s = step();
      if (!s) return { status: 'done' };
      const value = readNumber(raw);
      if (value === null) return { status: 'empty' };
      if (view().boolean) return { status: 'wait' };
      feedback = '';
      if (help?.mode === 'trial-product') {
        if (value === help.guess * d) { help.product = value; help.mode = 'trial-fit'; return { status: 'support' }; }
        feedback = `Add ${d}, ${help.guess} times. Try the product again.`;
        return { status: 'wrong' };
      }
      if (help?.mode === 'groups') {
        if (value === Number(s.answer)) return complete();
        if (value !== help.count * d) { feedback = `Count ${help.count} group${help.count === 1 ? '' : 's'} of ${d} again.`; return { status: 'wrong' }; }
        if (help.count === s.digit || s.digit === 0) return complete();
        help.count++;
        return { status: 'support' };
      }
      if (value === Number(s.answer)) return complete();
      if (help?.mode === 'multiple' && Number.isInteger(value) && value >= 0 && value <= 9) help = { mode: 'trial-product', guess: value };
      else requestHelp();
      feedback = 'Let’s work through this together.';
      return { status: 'wrong' };
    };
    const submitRows = rows => {
      const results = [];
      for (const row of rows) {
        if (view().done || view().boolean) break;
        const current = step();
        const result = submit(row.raw);
        results.push({ ...row, ...result, step: current });
        if (!['right', 'support'].includes(result.status)) break;
      }
      return results;
    };
    const resume = index => {
      const target = Math.max(0, Math.min(lesson.steps.length, index));
      if (target !== at) { at = target; help = null; feedback = ''; }
    };
    return { lesson, step, view, submit, submitRows, yesNo, requestHelp, resume, index: () => at };
  };
  return { create, readNumber };
})();
