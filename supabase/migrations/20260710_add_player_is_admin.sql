-- Admin-Berechtigung getrennt von der fachlichen Rolle (Controller, CFO, …),
-- die weiterhin für Empfehlungen und die Leaderboard-Anzeige benutzt wird.
alter table players
  add column if not exists is_admin boolean not null default false;

-- Ersten Admin freischalten (E-Mail anpassen und einmalig ausführen):
-- update players set is_admin = true where email ilike 'vorname.nachname@lhg.com';
