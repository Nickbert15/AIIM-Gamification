-- "Spiel der Woche": ein Spiel kann global als Spiel der Woche angepinnt werden.
-- Das übersteuert die wöchentliche, personalisierte Auslosung (siehe
-- src/lib/recommendations.ts) und zeigt allen Spielern dasselbe Spiel im Dashboard.
-- Einmalig im Supabase SQL-Editor ausführen.

alter table games add column if not exists is_gotw boolean not null default false;

-- Dieses Excel-Spiel als aktuelles Spiel der Woche setzen; alle anderen zurücksetzen.
-- (Genau ein Spiel true — die Titel-Bedingung setzt den Rest automatisch auf false.)
update games set is_gotw = (title = 'Kostenstellen nach Abteilungen filtern');
