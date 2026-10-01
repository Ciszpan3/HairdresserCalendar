-- Wymusza 9-cyfrowe numery dla nowych i aktualizowanych rekordów.
-- NOT VALID zachowuje zgodność ze starszymi danymi, które mogły mieć prefiks +48.

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_phone_9_digits') then
    alter table public.appointments
      add constraint appointments_phone_9_digits
      check (phone is null or phone ~ '^[0-9]{9}$') not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'clients_phone_9_digits') then
    alter table public.clients
      add constraint clients_phone_9_digits
      check (phone ~ '^[0-9]{9}$') not valid;
  end if;
end $$;
