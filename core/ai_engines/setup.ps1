# AI Engines Setup Script
# Verifies prerequisites and downloads models

Write-Host "=== SimRacing Coach AI Setup ===" -ForegroundColor Cyan

# Check Python
Write-Host "`nChecking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python 3\.(\d+)") {
        $minorVersion = [int]$Matches[1]
        if ($minorVersion -ge 10) {
            Write-Host "  ✓ Python $pythonVersion" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Python 3.10+ required (found $pythonVersion)" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "  ✗ Python not found. Install Python 3.10+" -ForegroundColor Red
    exit 1
}

# Check Node.js
Write-Host "`nChecking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found" -ForegroundColor Red
    exit 1
}

# Download models
Write-Host "`nDownloading AI models and binaries..." -ForegroundColor Yellow
Write-Host "  This will download ~940MB of data" -ForegroundColor Gray
Write-Host "  Press Ctrl+C to cancel or wait 5 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 5

node download-models.mjs

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
    Write-Host "AI engines are ready!" -ForegroundColor Green
} else {
    Write-Host "`n=== Setup Failed ===" -ForegroundColor Red
    exit 1
}
