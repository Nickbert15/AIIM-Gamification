-- Zentrales Audit-Log für alle KI-Prozesse (direkte kiconnect-LLM-Calls sowie die
-- n8n-Generierungs-Trigger), damit nachvollziehbar bleibt, wer wann welchen
-- KI-Prozess mit welchem Ergebnis ausgelöst hat. Nur über die Service-Role
-- (supabaseAdmin) beschrieben/gelesen, s. players/scores/game_feedback.
create table if not exists ai_process_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  actor_id uuid references players(id) on delete set null,
  -- Kein FK: games.id ist wie bei scores.game_id/game_feedback.game_id nur lose referenziert.
  game_id text,
  model text,
  status text not null check (status in ('success', 'error')),
  duration_ms integer,
  request jsonb,
  response jsonb,
  error_message text,
  meta jsonb
);

create index if not exists ai_process_logs_created_at_idx on ai_process_logs (created_at desc);
create index if not exists ai_process_logs_source_idx on ai_process_logs (source);
create index if not exists ai_process_logs_game_id_idx on ai_process_logs (game_id);

alter table ai_process_logs enable row level security;
-- Bewusst keine Policies: nur die Service-Role (umgeht RLS) schreibt/liest dieses Log.
