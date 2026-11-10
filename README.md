# Brain Teaser Class 5

Maths practice for a class 5 pupil in Ireland. It runs in the browser.

- The home screen shows one block per topic: a Learn page first, then the topic's tests.
- Each test shows its questions in book order, with new numbers every time. The page never shows an answer.
- A wrong answer shows ✗. The same question stays, and its 👀 helper appears. The helper shows the question step by step with pictures.
- New questions come only when she starts the test again.
- The score counts the questions that were correct on the first try.
- Every run of a test is stored as a record: each question (type, numbers, right answer) and each answer she entered (value, right or wrong, time). Today the records stay in the browser (`js/records.js`); the Cloudflare API is the next step.

## Files

| File | What it holds |
|---|---|
| `index.html` | The page, and the list of topic and test files (one `<script>` line each) |
| `js/engine.js` | Topic and test registry, question format, answer checking |
| `js/steps.js` | Visual helpers as steps: towers of blocks, goals table, coins, coin groups, fraction bar, bags |
| `js/player.js` | Draws the steps, one step per Next |
| `js/records.js` | One record per run |
| `js/app.js` | Home by topic, Learn pages, practice, helper rule, score |
| `topics/<topic>.js` | One topic: its title and its Learn page |
| `tests/test-NN.js` | One test: its question generators and their helpers |
| `bags.html` | The Apple Bag division lesson (Division Learn page); the bags helper opens it with `?n=240&d=6&thing=eggs&asks=bags` |

## Add a topic

1. Copy `topics/averages.js` to `topics/<topic>.js`.
2. Set `id` and `title`. Set `learn` to `{ steps: () => [...] }` (steps from `js/steps.js`) or `{ page: "lesson.html" }`.
3. Add `<script src="topics/<topic>.js"></script>` to `index.html`, after the other topic files.

Every topic has a Learn page.

## Add a test

1. Copy `tests/test-18.js` to `tests/test-NN.js`.
2. Write one `generator(type, make)` per book question, in book order. `make()` returns `question(parts, kind, answer, { meta, post, vis })`, or `null` to try again:
   - `kind` is `"count"` (whole number; `post` is a unit after the box, such as `cm`), `"cents"` or `"euro"` (answer in cents).
   - `meta` holds the numbers, for the Node check and the run record.
   - `vis` is a function that returns steps from `js/steps.js`, for example `() => S.level([7, 11, 6])`.
   - Skip the book's own numbers, so the child cannot copy the book's answer.
3. End the file with `E.register({ id: "test-NN", title: "Test NN", topic: "<topic id>", generators: GENERATORS })`.
4. Add `<script src="tests/test-NN.js"></script>` to `index.html`, after the other test files.
5. Add one line per new type to `CHECKS` in `tests/check-generators.js`, then run the check:

```bash
node tests/check-generators.js
```

The check loads the same files as `index.html`, makes 10,000 questions per type, and confirms the answer is a whole number, the right answer passes, a near answer fails, a new question differs from the old one, and the helper builds.
