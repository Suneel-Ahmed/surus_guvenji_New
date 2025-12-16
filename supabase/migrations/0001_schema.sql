-- Initial schema for Road Safety Report System

-- Extension for UUID generation (available in Supabase)
create extension if not exists "pgcrypto";

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz default now()
);

-- REPORTS
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  public_slug text not null unique,
  operator_id uuid not null references public.profiles (id) on delete cascade,
  origin_city text not null,
  origin_county text not null,
  origin_lat double precision,
  origin_lng double precision,
  destination_city text not null,
  destination_county text not null,
  destination_lat double precision,
  destination_lng double precision,
  departure_time timestamptz,
  analysis jsonb,
  status text not null default 'pending' check (status in ('pending','processing','ready','failed')),
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- BATCHES
create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.profiles (id) on delete cascade,
  file_name text,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  created_at timestamptz default now(),
  finished_at timestamptz
);

-- BATCH ITEMS
create table if not exists public.batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id) on delete cascade,
  row_index int not null,
  raw_json jsonb,
  report_id uuid references public.reports (id) on delete set null,
  status text not null default 'pending' check (status in ('pending','processing','ready','failed')),
  error_message text
);

-- Indexes
create index if not exists idx_reports_operator on public.reports (operator_id);
create index if not exists idx_reports_public_slug on public.reports (public_slug);
create index if not exists idx_batches_operator on public.batches (operator_id);
create index if not exists idx_batch_items_batch on public.batch_items (batch_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.batches enable row level security;
alter table public.batch_items enable row level security;

-- profiles policies
create policy "profiles_self_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_self_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id);

-- reports policies
create policy "reports_owner_select" on public.reports for select using (auth.uid() = operator_id);
create policy "reports_owner_insert" on public.reports for insert with check (auth.uid() = operator_id);
create policy "reports_owner_update" on public.reports for update using (auth.uid() = operator_id);
create policy "reports_owner_delete" on public.reports for delete using (auth.uid() = operator_id);
-- Public read via slug (ensure slug is not null and caller filters by slug)
create policy "reports_public_slug_read" on public.reports for select using (public_slug is not null);

-- batches policies
create policy "batches_owner_select" on public.batches for select using (auth.uid() = operator_id);
create policy "batches_owner_insert" on public.batches for insert with check (auth.uid() = operator_id);
create policy "batches_owner_update" on public.batches for update using (auth.uid() = operator_id);
create policy "batches_owner_delete" on public.batches for delete using (auth.uid() = operator_id);

-- batch_items policies
create policy "batch_items_owner_select" on public.batch_items for select using (
  exists (select 1 from public.batches b where b.id = batch_id and b.operator_id = auth.uid())
);
create policy "batch_items_owner_insert" on public.batch_items for insert with check (
  exists (select 1 from public.batches b where b.id = batch_id and b.operator_id = auth.uid())
);
create policy "batch_items_owner_update" on public.batch_items for update using (
  exists (select 1 from public.batches b where b.id = batch_id and b.operator_id = auth.uid())
);
create policy "batch_items_owner_delete" on public.batch_items for delete using (
  exists (select 1 from public.batches b where b.id = batch_id and b.operator_id = auth.uid())
);

-- Timestamp update trigger for reports.updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_reports_set_updated_at on public.reports;
create trigger trg_reports_set_updated_at
before update on public.reports
for each row execute procedure public.set_updated_at();
