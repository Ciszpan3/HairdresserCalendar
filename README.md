# HairdresserCalendar — terminarz salonu

Prywatny terminarz wizyt dla jednoosobowego salonu fryzjerskiego.

## Uruchomienie z Supabase

1. Utwórz jeden projekt Supabase — będzie wspólną bazą niezależnie od komputera.
2. Uruchom zawartość `db/supabase.sql` w Supabase SQL Editorze.
3. W Supabase przejdź do Authentication → Users i utwórz użytkownika dla salonu.
4. Skopiuj `.env.example` do `.env.local` i wpisz `Project URL` oraz `Publishable key`.
5. Uruchom `npm install`, a następnie `npm run dev`.

Bez zmiennych Supabase aplikacja działa w trybie lokalnym: dane są przechowywane w localStorage, dzięki czemu można od razu przetestować cały interfejs. Po uzupełnieniu `.env.local` logowanie, odczyt, dodawanie, edycja, usuwanie i przesuwanie wizyt korzystają z Supabase.

## Przeniesienie na drugi komputer

Nie przenoś folderu `node_modules` ani `.env.local`. Skopiuj cały projekt, utwórz nowy `.env.local` na podstawie `.env.example`, używając tych samych danych projektu Supabase, i uruchom:

```powershell
npm install
npm run dev
```

Dane wizyt pozostają w Supabase, więc nie trzeba ich eksportować ani kopiować ręcznie. Plik `.env.local` jest ignorowany przez Git i nie powinien być udostępniany publicznie.
