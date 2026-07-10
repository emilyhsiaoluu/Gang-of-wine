-- Links a meeting back to the suggestion it was scheduled from, so removing
-- the meeting can return the book (votes intact) to the Vote tab.
-- Stored as text (no FK) so it works regardless of the suggestions id type.
--
-- Run once in the PRODUCTION Supabase SQL Editor.

alter table meetings add column if not exists suggestion_id text;
