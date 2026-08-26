-- "Game of the week": a game can be globally pinned as the game of the week.
-- This overrides the weekly, personalized selection (see
-- src/lib/recommendations.ts) and shows all players the same game in the dashboard.
-- Run once in the Supabase SQL editor.

alter table games add column if not exists is_gotw boolean not null default false;

-- Set this Excel game as the current game of the week; reset all others.
-- (Exactly one game true — the title condition automatically sets the rest to false.)
update games set is_gotw = (title = 'Kostenstellen nach Abteilungen filtern');
