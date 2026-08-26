-- Admin permission kept separate from the functional role (Controller, CFO, …),
-- which is still used for recommendations and the leaderboard display.
alter table players
  add column if not exists is_admin boolean not null default false;

-- Unlock the first admin (adjust the email and run once):
-- update players set is_admin = true where email ilike 'firstname.lastname@lhg.com';
