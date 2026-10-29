$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\..\apps\api"
if (-not (Test-Path ".venv\Scripts\python.exe")) {
  python -m venv .venv
}
.\.venv\Scripts\python.exe -m pip install -r requirements\test.txt
$env:DJANGO_SETTINGS_MODULE = "config.settings.test"
.\.venv\Scripts\python.exe -m pytest
