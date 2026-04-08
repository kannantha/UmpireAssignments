-- Run this in your Supabase SQL Editor (https://supabase.com → your project → SQL Editor)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Fixtures ────────────────────────────────────────────────────────────────
create table if not exists fixtures (
  id            uuid primary key default uuid_generate_v4(),
  match_number  text,
  date          date not null,
  time          text,
  ground        text,
  series_name   text,
  division      text,
  match_type    text,
  team1         text not null,
  team2         text not null,
  source_url    text,
  external_id   text unique,       -- <match_number>-<team1>-<team2> for dedup
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── Umpires ─────────────────────────────────────────────────────────────────
create table if not exists umpires (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  phone      text,
  zelle      text,
  active     boolean default true,
  created_at timestamptz default now()
);

-- ─── Assignments (up to 2 umpires per fixture) ───────────────────────────────
create table if not exists assignments (
  id         uuid primary key default uuid_generate_v4(),
  fixture_id uuid references fixtures(id) on delete cascade,
  umpire_id  uuid references umpires(id) on delete set null,
  role       text default 'umpire1',  -- 'umpire1' | 'umpire2'
  created_at timestamptz default now(),
  unique(fixture_id, role)
);

-- ─── Payments ─────────────────────────────────────────────────────────────────
create table if not exists payments (
  id            uuid primary key default uuid_generate_v4(),
  fixture_id    uuid references fixtures(id) on delete cascade unique,
  team1_amount  numeric(10,2) default 0,
  team2_amount  numeric(10,2) default 0,
  team1_paid    boolean default false,
  team2_paid    boolean default false,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── Row Level Security ──────────────────────────────────────────────────────
alter table fixtures    enable row level security;
alter table umpires     enable row level security;
alter table assignments enable row level security;
alter table payments    enable row level security;

-- Public can read fixtures, umpires (active only), and assignments
create policy "public_read_fixtures"    on fixtures    for select using (true);
create policy "public_read_umpires"     on umpires     for select using (active = true);
create policy "public_read_assignments" on assignments for select using (true);

-- Authenticated users (admins) get full access
create policy "auth_all_fixtures"    on fixtures    for all using (auth.role() = 'authenticated');
create policy "auth_all_umpires"     on umpires     for all using (auth.role() = 'authenticated');
create policy "auth_all_assignments" on assignments for all using (auth.role() = 'authenticated');
create policy "auth_all_payments"    on payments    for all using (auth.role() = 'authenticated');

-- ─── Helper: auto-update updated_at ─────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_fixtures_updated_at
  before update on fixtures
  for each row execute function update_updated_at();

create trigger trg_payments_updated_at
  before update on payments
  for each row execute function update_updated_at();
