# AI Installation Guide

## Current Status

The SimRacing Coach application can work in **three modes**:

1. **Rules-based mode** (default) - Fast, deterministic coaching using pre-defined rules
2. **AI mode** - Intelligent coaching using local LLM (Llama 3.2 1B)
3. **Hybrid mode** - Combination of rules + AI insights

Currently, the system is configured to use **rules-based mode** because the AI dependencies cannot be installed on your Windows system with Node v24.13.0.

## The Problem

The `node-llama-cpp` package requires native binaries that fail to install on Windows with exit code `3221225477` (access violation). This is a known compatibility issue with:
- Node.js v24.x
- Windows native module compilation
- C++ binary dependencies

## Current Workaround

The codebase has been modified to make AI dependencies **optional**:
- ✅ `node-llama-cpp` and `onnxruntime-node` are now in `optionalDependencies`
- ✅ Dynamic imports with try/catch for graceful degradation
- ✅ System works perfectly in rules-based mode
- ✅ AI code paths exist but are skipped when dependencies unavailable

## Future Solutions

### Option 1: Downgrade Node.js (Recommended)

```powershell
# Install Node v20 LTS (most compatible)
nvm install 20
nvm use 20

# Reinstall dependencies
cd c:\Users\Mauro\Documents\desarrolloAntigravity\SimRacingCoach
pnpm install
```

### Option 2: Use WSL2 (Advanced)

Install and run the service in Windows Subsystem for Linux:

```bash
# In WSL2 (Ubuntu)
cd /mnt/c/Users/Mauro/Documents/desarrolloAntigravity/SimRacingCoach
pnpm install
pnpm run build
```

### Option 3: Wait for Package Updates

Monitor these packages for Windows compatibility fixes:
- `node-llama-cpp` - https://github.com/withcatai/node-llama-cpp/issues
- Check for prebuilt binaries for Node v24 + Windows

## Enabling AI (Once Dependencies Work)

1. **Install dependencies** (after applying one of the solutions above):
   ```powershell
   pnpm install
   ```

2. **Download AI models** (automatic on first run):
   - Llama 3.2 1B (~850 MB)
   - Whisper Tiny (~75 MB)
   - Piper TTS voices (~15 MB each)

3. **Update config** (`$env:APPDATA\SimRacingCoach\config.json`):
   ```json
   {
     "ai": {
       "enabled": true,
       "mode": "ai",  // or "hybrid"
       "language": "es"
     }
   }
   ```

4. **Restart service**:
   ```powershell
   node apps/service/dist/index.js
   ```

## Verifying Current Setup

Check that rules-based mode is active:

```powershell
# Check config
Get-Content "$env:APPDATA\SimRacingCoach\config.json" | ConvertFrom-Json | Select-Object -ExpandProperty ai

# Should show:
# enabled: False
# mode: rules
```

Start the service and verify no AI errors:

```powershell
cd c:\Users\Mauro\Documents\desarrolloAntigravity\SimRacingCoach
node apps/service/dist/index.js

# Should not see any "node-llama-cpp" errors
# Should see: "[EventEngine] Rules-based coaching active"
```

## Technical Details

### What Works Without AI

- ✅ Telemetry capture from iRacing
- ✅ Real-time data processing (20 FPS)
- ✅ Pattern detection (temperatures, traffic, warnings)
- ✅ Rules-based recommendations
- ✅ Windows TTS for audio output
- ✅ Cooldown management
- ✅ Priority queuing

### What Requires AI Dependencies

- ❌ LLM-based coaching insights
- ❌ Natural language voice input (STT)
- ❌ Advanced TTS with Piper voices
- ❌ Context-aware conversational coaching
- ❌ Pattern learning and adaptation

## Support

If you encounter issues:

1. Check Node version: `node --version`
2. Check build status: `pnpm run build` in `packages/ai-engine`
3. Review logs in `logs/` directory
4. Verify config: `Get-Content "$env:APPDATA\SimRacingCoach\config.json"`

## Next Steps

For now, continue using the system in **rules-based mode**. It provides excellent coaching capabilities without AI complexity. When you want to enable AI features, try Option 1 (downgrade to Node v20 LTS).
