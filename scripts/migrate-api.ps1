$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\..\apps\api"
if (-not (Test-Path ".venv\Scripts\python.exe")) {
  python -m venv .venv
}
.\.venv\Scripts\python.exe -m pip install -r requirements\development.txt
$env:DJANGO_SETTINGS_MODULE = "config.settings.development"
.\.venv\Scripts\python.exe manage.py migrate
