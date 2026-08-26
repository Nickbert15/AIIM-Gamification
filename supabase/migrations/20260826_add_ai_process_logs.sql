-- Central audit log for all AI processes (direct kiconnect LLM calls as well as
-- the n8n generation triggers), so it stays traceable who triggered which AI
-- process, when, and with what result. Only written/read via the service role
-- (supabaseAdmin), same as players/scores/game_feedback.
create table if not exists ai_process_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  actor_id uuid references players(id) on delete set null,
  -- No FK: games.id is only loosely referenced here, same as scores.game_id/game_feedback.game_id.
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
-- Deliberately no policies: only the service role (bypasses RLS) writes/reads this log.
