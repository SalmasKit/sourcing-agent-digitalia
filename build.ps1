#!/usr/bin/env pwsh
# build.ps1 — Build all three service images once.
# Run this before `docker compose up` or whenever source changes.
# Uses host networking during build to bypass Docker Desktop MTU/TLS proxy issues.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $true
}

function Check-LastExitCode {
    param([string]$StepName)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed during: $StepName (Exit code: $LASTEXITCODE)"
        exit $LASTEXITCODE
    }
}

Write-Host "==> Building backend-spring (copies pre-built JAR)" -ForegroundColor Cyan
Push-Location backend-spring
.\mvnw.cmd package -DskipTests -q
Check-LastExitCode "Maven package"
Pop-Location
docker build --no-cache --network host -t sourcing-backend-spring:latest ./backend-spring
Check-LastExitCode "Docker build sourcing-backend-spring"

Write-Host "==> Building frontend (copies pre-built dist/)" -ForegroundColor Cyan
Push-Location frontend
npm run build --silent
Check-LastExitCode "NPM build frontend"
Pop-Location
docker build --no-cache --network host -t sourcing-frontend:latest ./frontend
Check-LastExitCode "Docker build sourcing-frontend"

Write-Host "==> Building agent-service (pip installs from PyPI with host network)" -ForegroundColor Cyan
docker build --network host -t sourcing-agent-service:latest ./agent-service
Check-LastExitCode "Docker build sourcing-agent-service"

Write-Host ""
Write-Host "All images built successfully!" -ForegroundColor Green
Write-Host "  sourcing-backend-spring:latest"
Write-Host "  sourcing-frontend:latest"
Write-Host "  sourcing-agent-service:latest"
Write-Host ""
Write-Host "Run 'docker compose up -d' to start the stack." -ForegroundColor Yellow
