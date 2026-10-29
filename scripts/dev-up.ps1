$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."
if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Fichier .env créé depuis .env.example"
}
docker compose up --build
