# HairdresserCalendar — terminarz salonu

Prywatny terminarz wizyt dla jednoosobowego salonu fryzjerskiego.

## Uruchomienie z Supabase

1. Utwórz jeden projekt Supabase — będzie wspólną bazą niezależnie od komputera.
2. Uruchom zawartość `db/supabase.sql` w Supabase SQL Editorze.
3. W Supabase przejdź do Authentication → Users i utwórz użytkownika dla salonu.
4. Skopiuj `.env.example` do `.env.local` i wpisz `Project URL` oraz `Publishable key`.
5. Uruchom `npm install`, a następnie `npm run dev`.

Jeśli baza była skonfigurowana przed dodaniem książki klientów, uruchom jednorazowo zawartość pliku `db/migrations/002_clients.sql` w Supabase SQL Editorze. Nie usuwa on istniejących wizyt i można go bezpiecznie wykonać ponownie.

Po aktualizacji walidacji telefonu uruchom również `db/migrations/004_phone_length.sql`. Jeśli wcześniej została wykonana usunięta migracja pracowników, uruchom jednorazowo `db/migrations/005_remove_employee_name.sql`.

Do działania aplikacji wymagane są zmienne Supabase w `.env.local`. Logowanie, odczyt, dodawanie, edycja, usuwanie i przesuwanie wizyt korzystają z tego samego projektu Supabase na każdym komputerze.

## Przeniesienie na drugi komputer

Nie przenoś folderu `node_modules` ani `.env.local`. Skopiuj cały projekt, utwórz nowy `.env.local` na podstawie `.env.example`, używając tych samych danych projektu Supabase, i uruchom:

```powershell
npm install
npm run dev
```

Dane wizyt i klientów pozostają w Supabase, więc nie trzeba ich eksportować ani kopiować ręcznie. Katalog usług i kolory znajdują się w kodzie projektu. Plik `.env.local` jest ignorowany przez Git i nie powinien być udostępniany publicznie.

## Szybkie uruchamianie na Windows

Możesz uruchomić plik `start-hairdresser-calendar.bat` dwuklikiem. Otworzy PowerShell, przejdzie do folderu projektu na pulpicie i wykona `npm.cmd run dev`. Następnie otwórz `http://localhost:5173` w przeglądarce.
