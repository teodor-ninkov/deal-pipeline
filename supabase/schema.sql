-- Deal Pipeline: shared team board on Supabase.
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste > Run.

-- Who may use the board. Signing in with an email that is not here shows "not on the team".
create table if not exists public.team_members (
  email text primary key,
  added_at timestamptz not null default now()
);

-- One row per deal. The whole deal (fields and activity log) is stored as JSON,
-- so the table does not need to change when the app adds a field.
create table if not exists public.deals (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text default (auth.jwt() ->> 'email')
);

create or replace function public.touch_deal() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.jwt() ->> 'email';
  return new;
end $$;

drop trigger if exists deals_touch on public.deals;
create trigger deals_touch before insert or update on public.deals
  for each row execute function public.touch_deal();

create or replace function public.is_team_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

alter table public.team_members enable row level security;
alter table public.deals enable row level security;

-- Members can see that they are members (the app checks this after sign-in).
drop policy if exists "see own membership" on public.team_members;
create policy "see own membership" on public.team_members
  for select to authenticated using (lower(email) = lower(auth.jwt() ->> 'email'));

-- Members can read and change every deal; nobody else can see anything.
drop policy if exists "team reads deals" on public.deals;
create policy "team reads deals" on public.deals
  for select to authenticated using (public.is_team_member());
drop policy if exists "team inserts deals" on public.deals;
create policy "team inserts deals" on public.deals
  for insert to authenticated with check (public.is_team_member());
drop policy if exists "team updates deals" on public.deals;
create policy "team updates deals" on public.deals
  for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
drop policy if exists "team deletes deals" on public.deals;
create policy "team deletes deals" on public.deals
  for delete to authenticated using (public.is_team_member());

-- Live updates between teammates.
do $$
begin
  alter publication supabase_realtime add table public.deals;
exception when duplicate_object then null;
end $$;

-- Add your team (replace with real addresses):
-- insert into public.team_members (email) values ('you@example.com'), ('teammate@example.com');
