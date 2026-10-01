-- Dodaje opcjonalne przypisanie pracownika do wizyty.
-- Skrypt jest bezpieczny do ponownego uruchomienia.

alter table public.appointments
  add column if not exists employee_name text;
