$ErrorActionPreference = "SilentlyContinue"
$url = "http://localhost:5173"
$ready = $false

for ($attempt = 0; $attempt -lt 30; $attempt++) {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -ge 200) {
      $ready = $true
      break
    }
  } catch {
  }
  Start-Sleep -Seconds 1
}

if (-not $ready) {
  Write-Host "Nie udalo sie polaczyc z serwerem na porcie 5173." -ForegroundColor Red
  exit 1
}

$chromeCandidates = @(
  (Join-Path ${env:ProgramFiles} "Google\Chrome\Application\chrome.exe"),
  (Join-Path ${env:LocalAppData} "Google\Chrome\Application\chrome.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe")
)

$chrome = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($chrome) {
  Write-Host "Otwieranie Google Chrome..."
  Start-Process -FilePath $chrome -ArgumentList $url
} else {
  Write-Host "Nie znaleziono Chrome. Otwieranie domyslnej przegladarki..."
  Start-Process $url
}
