-- Spiel-Feedback: eine Bewertung (1–3) + optionaler Kommentar pro gespieltem Spiel.
-- Im Supabase-Dashboard unter "SQL Editor" einmalig ausführen.

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

-- RLS ist auf neuen Tabellen standardmäßig aktiv. Alle Lese-/Schreibzugriffe der App
-- laufen serverseitig über den Service-Role-Key (siehe /api/feedback und
-- /api/admin/feedback), der RLS ohnehin umgeht. Deshalb sind bewusst keine Policies
-- für den Anon-Key gesetzt — Feedback-Kommentare sind so nicht öffentlich lesbar.
alter table public.game_feedback enable row level security;
