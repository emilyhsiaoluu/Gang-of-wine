-- Full schema for the STAGING Supabase project (gang-of-wine-staging).
-- Run this once in the staging project's SQL Editor. It mirrors production's
-- tables so preview deployments can point here and never touch real data.

create table suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  description text,
  cover_url text,
  suggested_by text not null,
  created_at timestamptz default now()
);

create table votes (
  suggestion_id uuid references suggestions(id) on delete cascade,
  voter_name text not null,
  primary key (suggestion_id, voter_name)
);

create table meetings (
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

create table meeting_rsvps (
  meeting_id uuid references meetings(id) on delete cascade,
  rsvp_name text not null,
  response text check (response in ('yes', 'maybe', 'no')),
  primary key (meeting_id, rsvp_name)
);

-- Same open-access policy style as production (no auth in this app).
alter table suggestions enable row level security;
alter table votes enable row level security;
alter table meetings enable row level security;
alter table meeting_rsvps enable row level security;

create policy "Enable access for all users" on suggestions for all using (true) with check (true);
create policy "Enable access for all users" on votes for all using (true) with check (true);
create policy "Enable access for all users" on meetings for all using (true) with check (true);
create policy "Enable access for all users" on meeting_rsvps for all using (true) with check (true);
