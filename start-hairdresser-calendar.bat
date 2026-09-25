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

start "HairdresserCalendar - Chrome" powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ready=$false; 1..30 | ForEach-Object { if (Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet) { $ready=$true; break }; Start-Sleep -Seconds 1 }; if ($ready) { $chrome=@($env:ProgramFiles\Google\Chrome\Application\chrome.exe, $env:LocalAppData\Google\Chrome\Application\chrome.exe) | Where-Object { Test-Path $_ } | Select-Object -First 1; if ($chrome) { Start-Process -FilePath $chrome -ArgumentList 'http://localhost:5173' } else { Start-Process 'http://localhost:5173' } }"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath $env:PROJECT_DIR; npm.cmd run dev"

echo.
echo Serwer zostal zatrzymany.
pause
