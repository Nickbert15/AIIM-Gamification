-- Game feedback: a rating (1-3) + optional comment per game played.
-- Run once in the Supabase dashboard under "SQL Editor".

create table if not exists public.game_feedback (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null,
  game_title  text,
  player_id   uuid references public.players(id) on delete set null,
  rating      smallint not null check (rating between 1 and 3),
  comment     text,
  created_at  timestamptz not null default now()
);

create index if not exists game_feedback_game_id_idx    on public.game_feedback (game_id);
create index if not exists game_feedback_created_at_idx on public.game_feedback (created_at desc);

-- RLS is enabled by default on new tables. All app read/write access runs
-- server-side through the service role key (see /api/feedback and
-- /api/admin/feedback), which bypasses RLS anyway. So no policies are
-- deliberately set for the anon key — this keeps feedback comments from being
-- publicly readable.
alter table public.game_feedback enable row level security;
