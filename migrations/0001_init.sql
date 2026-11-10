-- Users, runs and answers for Brain Teaser. One row per run, per question and per answer entered.
CREATE TABLE users (
  id TEXT PRIMARY KEY,            -- Google account id (sub)
  email TEXT NOT NULL,
  name TEXT,
  created_at TEXT NOT NULL,
  last_seen TEXT NOT NULL
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  topic TEXT,
  total INTEGER NOT NULL,         -- questions in the run
  started_at TEXT NOT NULL,
  finished_at TEXT,               -- NULL: not completed
  score INTEGER                   -- right on the first try, when finished
);
CREATE INDEX runs_user ON runs (user_id, started_at);

CREATE TABLE questions (
  run_id TEXT NOT NULL,
  slot INTEGER NOT NULL,
  type TEXT NOT NULL,
  numbers TEXT,                   -- the numbers in the question, as short JSON
  kind TEXT,
  answer INTEGER,
  PRIMARY KEY (run_id, slot)
) WITHOUT ROWID;

CREATE TABLE attempts (
  run_id TEXT NOT NULL,
  slot INTEGER NOT NULL,
  given TEXT NOT NULL,            -- what she typed
  ok INTEGER NOT NULL,            -- 1 right, 0 wrong
  closed INTEGER NOT NULL DEFAULT 0, -- 1: no tries left, the question closed as wrong
  at TEXT NOT NULL
);
CREATE INDEX attempts_run ON attempts (run_id);

-- One row per user, test, question type and month: tries and wrong answers. Progress pages read this table.
CREATE TABLE type_stats (
  user_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  type TEXT NOT NULL,
  month TEXT NOT NULL,            -- 2026-11
  tries INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, test_id, type, month)
) WITHOUT ROWID;

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) WITHOUT ROWID;
