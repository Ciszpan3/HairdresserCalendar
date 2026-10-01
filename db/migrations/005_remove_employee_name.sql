-- Usuwa omyłkowo dodaną kolumnę pracownika.
-- Skrypt jest bezpieczny także wtedy, gdy kolumna nigdy nie została utworzona.

alter table public.appointments
  drop column if exists employee_name;
