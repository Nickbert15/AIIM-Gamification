-- Einmalig im Supabase SQL-Editor ausführen.
-- Setzt die alten, uneinheitlich skalierten Scores zurück, nachdem alle
-- Spieltypen auf einen 0–100-Wert normalisiert wurden. Nur neue Runden zählen
-- danach – alle sauber auf derselben Skala.

-- === Variante A: ALLES löschen (sauberer Neustart, empfohlen in der Testphase) ===
delete from scores;

-- Gamification-Punkte auf players zurücksetzen, damit Dashboard & Streak zur
-- geleerten Historie passen. (players.score ist getrennt vom Leaderboard-Sum,
-- siehe applyPlayGamification.)
update players
  set score = 0,
      current_streak = 0,
      last_played_at = null;

-- === Variante B: statt Variante A nur Alt-Einträge vor einem Stichtag löschen ===
-- (Variante A oben auskommentieren, wenn du B nutzt.)
-- delete from scores where completed_at < '2026-07-21';
