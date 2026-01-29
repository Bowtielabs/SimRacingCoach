# Download AI Binaries
# PowerShell script to download llama.cpp and Piper binaries

Write-Host "=== Downloading AI Binaries ===" -ForegroundColor Cyan

# Create directories
New-Item -ItemType Directory -Path "core/ai_engines/llama-cpp" -Force | Out-Null
New-Item -ItemType Directory -Path "core/ai_engines/piper" -Force | Out-Null

# Download llama.cpp server (Windows AVX2 version)
Write-Host "`nDownloading llama.cpp server..." -ForegroundColor Yellow
$llamaUrl = "https://github.com/ggerganov/llama.cpp/releases/download/b4293/llama-b4293-bin-win-avx2-x64.zip"
$llamaZip = "core/ai_engines/llama-cpp/llama.zip"
Invoke-WebRequest -Uri $llamaUrl -OutFile $llamaZip
Expand-Archive -Path $llamaZip -DestinationPath "core/ai_engines/llama-cpp" -Force
Remove-Item $llamaZip

# Download Piper TTS
Write-Host "`nDownloading Piper TTS..." -ForegroundColor Yellow  
$piperUrl = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip"
$piperZip = "core/ai_engines/piper/piper.zip"
Invoke-WebRequest -Uri $piperUrl -OutFile $piperZip
Expand-Archive -Path $piperZip -DestinationPath "core/ai_engines/piper" -Force
Remove-Item $piperZip

Write-Host "`n=== Download Complete ===" -ForegroundColor Green
Write-Host "llama-server.exe: core/ai_engines/llama-cpp/" -ForegroundColor Gray
Write-Host "piper.exe: core/ai_engines/piper/" -ForegroundColor Gray
