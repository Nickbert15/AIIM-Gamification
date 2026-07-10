-- Persistente Gamification-Werte für die Weekly-Mail (n8n liest diese Spalten).
alter table players
  add column if not exists score          integer not null default 0,
  add column if not exists current_streak integer not null default 0,
  add column if not exists last_played_at timestamptz;
