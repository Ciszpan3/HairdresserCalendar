create extension if not exists pgcrypto;
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(), title text not null,
  client_first_name text not null, client_last_name text not null, phone text,
  start_at timestamptz not null, duration_minutes integer not null check (duration_minutes >= 15),
  price numeric(10,2) not null check (price >= 0), notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists appointments_start_at_idx on public.appointments(start_at);
create index if not exists appointments_first_name_idx on public.appointments(client_first_name);
create index if not exists appointments_last_name_idx on public.appointments(client_last_name);
create index if not exists appointments_title_idx on public.appointments(title);
create index if not exists appointments_phone_idx on public.appointments(phone);
alter table public.appointments enable row level security;
drop policy if exists "authenticated appointments" on public.appointments;
create policy "authenticated appointments" on public.appointments for all to authenticated using (true) with check (true);
