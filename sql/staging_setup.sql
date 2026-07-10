-- Staging schema for "Emily's App" Supabase project (shared with other apps
-- like hang_ideas, poop_entries, etc.) — tables are prefixed with gow_ to
-- avoid colliding with existing table names in that project. The app code
-- picks this prefix up via NEXT_PUBLIC_TABLE_PREFIX="gow_" set on Vercel's
-- Preview environment only; production is unprefixed and untouched.

create table gow_suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  description text,
  cover_url text,
  suggested_by text not null,
  created_at timestamptz default now()
);

create table gow_votes (
  suggestion_id uuid references gow_suggestions(id) on delete cascade,
  voter_name text not null,
  primary key (suggestion_id, voter_name)
);

create table gow_meetings (
  id uuid primary key default gen_random_uuid(),
  book_title text not null,
  book_author text not null,
  book_cover_url text,
  date date,
  time text not null default 'TBD',
  location text not null default '',
  wine_theme text,
  date_options jsonb,
  suggestion_id text,
  created_at timestamptz default now()
);

create table gow_meeting_rsvps (
  meeting_id uuid references gow_meetings(id) on delete cascade,
  rsvp_name text not null,
  response text check (response in ('yes', 'maybe', 'no')),
  primary key (meeting_id, rsvp_name)
);

alter table gow_suggestions enable row level security;
alter table gow_votes enable row level security;
alter table gow_meetings enable row level security;
alter table gow_meeting_rsvps enable row level security;

create policy "Enable access for all users" on gow_suggestions for all using (true) with check (true);
create policy "Enable access for all users" on gow_votes for all using (true) with check (true);
create policy "Enable access for all users" on gow_meetings for all using (true) with check (true);
create policy "Enable access for all users" on gow_meeting_rsvps for all using (true) with check (true);
