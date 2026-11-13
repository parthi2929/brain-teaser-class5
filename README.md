# Brain Teaser Class 5

Maths practice for a class 5 pupil in Ireland. It runs on Cloudflare Pages with a small API (Pages Functions) and a D1 database. Hosting setup: [SETUP.md](SETUP.md).

- The home screen shows one block per topic: a Learn page first, then Quick practice (when the topic has it), then the topic's tests.
- Quick practice: tapping it goes straight to a sum, one at a time: a 3-digit number ÷ a 1-digit number (171 ÷ 9), about half with a remainder. ✓ moves on; ✗ offers the 👀 helper (`longdiv.html`): long division on a square grid, one cell at a time, where she enters each quotient digit, product, difference and brought-down digit; then a Next arrow. Escape closes the helper. Answers with a remainder use her copybook form, `52 r 3`. `js/scheduler.js` picks each sum: a sum does not come back within the last N questions (default 100), and a wrong sum comes back after 5 to 10 other questions until she gets it right 2 times. The admin changes these numbers, and can set "divisor digits" to 1 to 2.
- Each test shows its questions in book order, with new numbers every time. The page never shows an answer.
- A wrong answer shows ✗. The same question stays, and its 👀 helper appears. The helper is copybook working: the rule in words, then the sum, then one step at a time; she fills each step's number and Check marks it. The last step ends with "?": she types that answer in the box. A picture beside the working shows what each step means and never shows the final answer.
- New questions come only when she starts the test again.
- The score counts the questions that were correct on the first try.
- She signs in with Google (user button, top right). Every run of a test is stored: each question (type, numbers, right answer) and each answer she entered (value, right or wrong, time). An unfinished run stays as "not completed", with the score over the answered questions.
- My progress shows her runs and her weak question types. The admin (the `ADMIN_EMAIL` secret, checked in the Worker) also sees every user, the runs, the question types with the most wrong answers by month, and the settings: tries per question, when the helper appears, and which tests she can see.

## Files

| File | What it holds |
|---|---|
| `public/` | Everything the browser loads (the paths below are inside it) |
| `index.html` | The page, and the list of topic and test files (one `<script>` line each) |
| `js/engine.js` | Topic and test registry, question format, answer checking |
| `js/steps.js` | Visual helpers as steps: towers of blocks, goals table, coins, coin groups, fraction bar, bags |
| `js/player.js` | Draws the steps, one step per Next |
| `longdiv.html`, `js/longdiv.js` | Quick practice helper: long division on a square grid, one step at a time (`longdiv.html?n=339&d=3`) |
| `js/scheduler.js` | Quick practice: picks the next sum (no-repeat window, wrong sums back) |
| `practice/<topic>.js` | One topic's quick-practice type: title, example, and `groups(rules)`, the lists of valid sums (each list has an equal chance) |
| `js/work.js` | Copybook working for each question type (the 👀 helper) |
| `js/records.js` | One record per run, sent to the API |
| `js/account.js` | Sign-in, user button, My progress, Admin |
| `js/app.js` | Home by topic, Learn pages, practice, helper rule, score |
| `topics/<topic>.js` | One topic: its title and its Learn page |
| `tests/test-NN.js` | One test: its question generators and their helpers |
| `bags.html` | The Apple Bag division lesson (Division Learn page); the helper opens it with `?n=240&d=6&thing=eggs&asks=bags&mode=try&nofinal=1` |
| `functions/api/[[path]].js` | The API: Google token check, session cookie, runs, answers, progress, admin |
| `migrations/` | The D1 tables |
| `wrangler.toml` | Cloudflare project, D1 binding, public Google client id |

## Add a topic

1. Copy `public/topics/averages.js` to `public/topics/<topic>.js`.
2. Set `id` and `title`. Set `learn` to `{ steps: () => [...] }` (steps from `js/steps.js`) or `{ page: "lesson.html" }`.
3. Add `<script src="topics/<topic>.js"></script>` to `index.html`, after the other topic files.

Every topic has a Learn page.

## Add quick practice to a topic

1. Copy `public/practice/division.js` to `public/practice/<topic>.js`.
2. Call `E.registerPractice({ topic: "<topic id>", title: "Quick practice", types: [...] })`. A type has `id`, `title`, `example`, `remainder` and `groups(rules)`, which returns lists of valid sums; each list has an equal chance. The child sees the first type only.
3. Add `<script src="practice/<topic>.js"></script>` to `index.html`, after the test files.
4. Add checks for the type to `tests/check-practice.js` and run `node tests/check-practice.js`.

Today the quick-practice screen and the answer check are written for division sums (`N ÷ D`); a new topic with another kind of sum also needs its own check in `js/engine.js`.

## Add a test

1. Copy `public/tests/test-18.js` to `public/tests/test-NN.js`.
2. Write one `generator(type, make)` per book question, in book order. `make()` returns `question(parts, kind, answer, { meta, post, work })`, or `null` to try again:
   - `kind` is `"count"` (whole number; `post` is a unit after the box, such as `cm`), `"cents"` or `"euro"` (answer in cents).
   - `meta` holds the numbers, for the Node check and the run record.
   - `work` is a function that returns the copybook working from `js/work.js`, for example `() => W.average([7, 11, 6])`. Write a new working in `js/work.js` when no existing one fits; its last line must end with "?" and hold `final` = the answer.
   - Skip the book's own numbers, so the child cannot copy the book's answer.
3. End the file with `E.register({ id: "test-NN", title: "Test NN", topic: "<topic id>", generators: GENERATORS })`.
4. Add `<script src="tests/test-NN.js"></script>` to `index.html`, after the other test files.
5. Add one line per new type to `CHECKS` in `tests/check-generators.js`, then run the check:

```bash
node tests/check-generators.js
```

The check loads the same files as `index.html`, makes 10,000 questions per type, and confirms the answer is a whole number, the right answer passes, a near answer fails, a new question differs from the old one, and the working ends with the answer.
