-- Date poll support: a meeting can start life as a poll over candidate dates.
-- Options + availability votes live in a jsonb column so no new tables or
-- foreign keys are needed. Shape:
--   [{ "id": "opt-1", "date": "2026-07-18", "voters": ["Emily", "Sarah"] }]
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

alter table meetings add column if not exists date_options jsonb;

-- A polling meeting has no date yet, so date must allow null.
alter table meetings alter column date drop not null;
