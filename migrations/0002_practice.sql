-- Quick practice: every answer, one row per sum seen, totals per type, and the scheduler state.
CREATE TABLE practice_attempts (
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  sum TEXT NOT NULL,              -- "171/9"
  given TEXT NOT NULL,
  ok INTEGER NOT NULL,
  repeat INTEGER NOT NULL,        -- 1: a wrong sum brought back on purpose
  at TEXT NOT NULL
);

CREATE TABLE practice_sums (
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  sum TEXT NOT NULL,
  asked INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  last_at TEXT NOT NULL,
  PRIMARY KEY (user_id, type, sum)
) WITHOUT ROWID;
CREATE INDEX practice_sums_wrong ON practice_sums (user_id, type, wrong) WHERE wrong > 0;

CREATE TABLE practice_totals (
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  asked INTEGER NOT NULL DEFAULT 0,
  unique_sums INTEGER NOT NULL DEFAULT 0,
  repeats INTEGER NOT NULL DEFAULT 0,  -- asked again, for any reason
  rights INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, type)
) WITHOUT ROWID;

CREATE TABLE practice_state (
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  state TEXT NOT NULL,             -- scheduler state (js/scheduler.js), JSON
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, type)
) WITHOUT ROWID;
