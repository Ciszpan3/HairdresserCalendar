@echo off
setlocal

set "PROJECT_DIR=%USERPROFILE%\Desktop\HairdresserCalendar"

if not exist "%PROJECT_DIR%\package.json" (
  echo Nie znaleziono projektu HairdresserCalendar w:
  echo %PROJECT_DIR%
  echo.
  pause
  exit /b 1
)

echo Uruchamianie HairdresserCalendar...
echo Nie zamykaj tego okna podczas korzystania z aplikacji.
echo.

start "HairdresserCalendar - Server" powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%PROJECT_DIR%'; npm.cmd run dev"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%\open-hairdresser-calendar.ps1"

echo.
echo Serwer zostal zatrzymany.
pause
