# Push ALCL stat-tracking schema to the linked Supabase project.
# Ensures LiveAPI tables + match_player_results (kills, assists, knocks, damage).
#
# Prerequisites (once):
#   npx supabase login
#   npm run db:link
#
# Usage:
#   npm run db:push:stats
#   .\scripts\push-stat-tracking.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "ALCL stat-tracking Supabase push" -ForegroundColor Cyan
Write-Host ""

Write-Host "1/2  Pushing pending migrations..." -ForegroundColor Yellow
npx supabase db push --linked --yes
if ($LASTEXITCODE -ne 0) { throw "Migration push failed." }

Write-Host ""
Write-Host "2/2  Ensuring stat-tracking tables and columns..." -ForegroundColor Yellow
npx supabase db query --linked -f "supabase/scripts/ensure-stat-tracking.sql"
if ($LASTEXITCODE -ne 0) { throw "Stat-tracking schema script failed." }

Write-Host ""
Write-Host "Stat-tracking schema is up to date." -ForegroundColor Green
