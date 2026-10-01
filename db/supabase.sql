create extension if not exists pgcrypto;
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  phone text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(), title text not null,
  client_first_name text not null, client_last_name text not null, phone text,
  start_at timestamptz not null, duration_minutes integer not null check (duration_minutes >= 15),
  price numeric(10,2) not null check (price >= 0), notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.appointments add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.appointments add column if not exists employee_name text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_phone_9_digits') then
    alter table public.appointments add constraint appointments_phone_9_digits check (phone is null or phone ~ '^[0-9]{9}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'clients_phone_9_digits') then
    alter table public.clients add constraint clients_phone_9_digits check (phone ~ '^[0-9]{9}$') not valid;
  end if;
end $$;
create index if not exists appointments_start_at_idx on public.appointments(start_at);
create index if not exists appointments_first_name_idx on public.appointments(client_first_name);
create index if not exists appointments_last_name_idx on public.appointments(client_last_name);
create index if not exists appointments_title_idx on public.appointments(title);
create index if not exists appointments_phone_idx on public.appointments(phone);
create index if not exists appointments_client_id_idx on public.appointments(client_id);
create index if not exists clients_first_name_idx on public.clients(first_name);
create index if not exists clients_last_name_idx on public.clients(last_name);
create index if not exists clients_phone_idx on public.clients(phone);
alter table public.appointments enable row level security;
alter table public.clients enable row level security;
drop policy if exists "authenticated appointments" on public.appointments;
create policy "authenticated appointments" on public.appointments for all to authenticated using (true) with check (true);
drop policy if exists "authenticated clients" on public.clients;
create policy "authenticated clients" on public.clients for all to authenticated using (true) with check (true);
