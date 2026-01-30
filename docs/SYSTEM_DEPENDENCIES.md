# System Dependencies for SimRacing Coach

This document lists all system dependencies required for the SimRacing Coach application.
The installer should ensure these are available or bundled.

## Required Dependencies

### 1. FFmpeg (for audio streaming)
- **Purpose**: Real-time audio playback via `ffplay`
- **Components needed**: `ffplay.exe`
- **Download**: https://github.com/GyanD/codexffmpeg/releases
- **Install command**: `winget install ffmpeg`
- **Bundling option**: Include `ffplay.exe` in `core/dependencies/ffmpeg/`

### 2. Piper TTS
- **Purpose**: Text-to-speech synthesis
- **Components needed**: 
  - `piper.exe`
  - Voice model: `es_AR-daniela.onnx` + `.json`
- **Location**: `core/ai_engines/piper/`
- **Status**: Already bundled ✓

### 3. Node.js Runtime
- **Purpose**: Service execution
- **Version**: 20.x or higher
- **Bundling**: Use pkg or electron for standalone builds

## NPM Dependencies (auto-installed)
- `sound-play` - Fallback audio player (no native deps)
- `p-queue` - Queue management

## Installer Checklist

```powershell
# Check FFmpeg
where ffplay
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing FFmpeg..."
    winget install ffmpeg --accept-package-agreements
}

# Check Piper
$piperPath = ".\core\ai_engines\piper\piper\piper.exe"
if (-not (Test-Path $piperPath)) {
    Write-Host "ERROR: Piper not found at $piperPath"
}

# Check Voice Model
$voicePath = ".\core\ai_engines\piper\es_AR-daniela.onnx"
if (-not (Test-Path $voicePath)) {
    Write-Host "ERROR: Voice model not found at $voicePath"
}
```

## Bundled vs System Dependencies

| Dependency | Bundled | System |
|------------|---------|--------|
| Piper TTS | ✓ | - |
| Voice Models | ✓ | - |
| FFmpeg/ffplay | Optional | Preferred |
| Node.js | Via Electron | - |
