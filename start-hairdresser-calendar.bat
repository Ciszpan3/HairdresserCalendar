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

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath $env:PROJECT_DIR; npm.cmd run dev"

echo.
echo Serwer zostal zatrzymany.
pause
