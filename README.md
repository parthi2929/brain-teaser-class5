# Brain Teaser Class 5

Maths practice for a class 5 pupil in Ireland. It runs in the browser and has no server, no sign-in and no stored data (the two parent settings stay in that browser only).

- The home screen lists the tests and a Learn page (what an average is).
- Each test shows its questions in book order, with new numbers every time. The page never shows an answer.
- A wrong answer shows ✗ and replaces the question with a new question of the same type.
- The 👀 helper for a question appears only after a wrong answer on that question. It shows the new question step by step with pictures.
- The score counts the questions that were correct on the first try.
- Behind the gear, the parent can show the helper from the start, keep the same question after a wrong answer, and open her marked Test 17.

## Files

| File | What it holds |
|---|---|
| `index.html` | The page, and the list of test files (one `<script>` line per test) |
| `js/engine.js` | Question format, answer checking, question swap |
| `js/steps.js` | Visual helpers as steps: towers of blocks, goals table, coins, coin groups, fraction bar, bags |
| `js/player.js` | Draws the steps, one step per Next |
| `js/app.js` | Home, practice, helper rule, score, Learn, her answers |
| `tests/test-NN.js` | One test: its question generators and their helpers |
| `bags.html` | The Apple Bag division page; the bags helper opens it with `?n=240&d=6&thing=eggs&asks=bags` |

## Add a test

1. Copy `tests/test-18.js` to `tests/test-NN.js`.
2. Write one `generator(type, make)` per book question, in book order. `make()` returns `question(parts, kind, answer, { meta, post, vis })`, or `null` to try again:
   - `kind` is `"count"` (whole number; `post` is a unit after the box, such as `cm`), `"cents"` or `"euro"` (answer in cents).
   - `meta` holds the numbers, for the Node check.
   - `vis` is a function that returns steps from `js/steps.js`, for example `() => S.level([7, 11, 6])`.
   - Skip the book's own numbers, so the child cannot copy the book's answer.
3. End the file with `E.register({ id: "test-NN", title: "Test NN", topic: "...", generators: GENERATORS })`.
4. Add `<script src="tests/test-NN.js"></script>` to `index.html`, after the other test files.
5. Add one line per new type to `CHECKS` in `tests/check-generators.js`, then run the check:

```bash
node tests/check-generators.js
```

The check loads the same files as `index.html`, makes 10,000 questions per type, and confirms the answer is a whole number, the right answer passes, a near answer fails, a new question differs from the old one, and the helper builds.
