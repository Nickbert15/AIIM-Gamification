-- Run once in the Supabase SQL editor.
-- Resets the old, inconsistently scaled scores after all game types were
-- normalized to a 0-100 value. Only new rounds count after this — all cleanly
-- on the same scale.

-- === Variant A: delete EVERYTHING (clean restart, recommended during the test phase) ===
delete from scores;

-- Reset gamification points on players so the dashboard & streak match the
-- cleared history. (players.score is separate from the leaderboard sum,
-- see applyPlayGamification.)
update players
  set score = 0,
      current_streak = 0,
      last_played_at = null;

-- === Variant B: instead of variant A, only delete old entries before a cutoff date ===
-- (Comment out variant A above if you use B.)
-- delete from scores where completed_at < '2026-07-21';
