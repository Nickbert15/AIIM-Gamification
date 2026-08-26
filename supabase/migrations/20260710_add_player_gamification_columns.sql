-- Persistent gamification values for the weekly email (n8n reads these columns).
alter table players
  add column if not exists score          integer not null default 0,
  add column if not exists current_streak integer not null default 0,
  add column if not exists last_played_at timestamptz;
