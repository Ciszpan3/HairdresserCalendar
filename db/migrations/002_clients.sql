-- Aktualizacja istniejącej instalacji HairdresserCalendar o książkę klientów.
-- Skrypt jest bezpieczny do ponownego uruchomienia.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  phone text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointments
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists clients_first_name_idx on public.clients (lower(first_name));
create index if not exists clients_last_name_idx on public.clients (lower(last_name));
create index if not exists clients_phone_idx on public.clients (phone);
create index if not exists appointments_client_id_idx on public.appointments (client_id);

alter table public.clients enable row level security;

drop policy if exists "Authenticated users manage clients" on public.clients;
create policy "Authenticated users manage clients"
on public.clients
for all
to authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.clients to authenticated;
