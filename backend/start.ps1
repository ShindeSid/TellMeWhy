# Backend dev launcher - creates .venv if missing, installs deps, starts the server.
# Invokes .venv\Scripts\python.exe directly instead of relying on shell activation,
# so it works even when PowerShell's execution policy blocks Activate.ps1.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "No .venv found - creating one..." -ForegroundColor Yellow
    python -m venv .venv
    if (-not (Test-Path $venvPython)) {
        Write-Error "Failed to create .venv. Is 'python' on your PATH?"
        exit 1
    }
}

Write-Host "Installing/updating dependencies..." -ForegroundColor Yellow
& $venvPython -m pip install -q -r requirements.txt

if (-not (Test-Path ".env")) {
    Write-Host "No .env found - copying from .env.example (fill in GEMINI_API_KEY)." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

Write-Host "Starting backend on http://localhost:8000 ..." -ForegroundColor Green
& $venvPython -m uvicorn app.main:app --reload
