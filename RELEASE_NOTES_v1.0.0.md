# SimRacing Coach v1.0.0 - Production Release

**Release Date**: 2026-01-29  
**Tag**: `v1.0.0`  
**Commit**: `88aafa6`

---

## 🎉 First Production Release

SimRacing Coach v1.0.0 is the first production-ready release featuring advanced real-time coaching for iRacing with natural Argentine racing slang.

---

## ✨ Key Features

### Advanced Corner Coaching
- **Aggressive corner detection** with 0.9G lateral threshold
- **Post-corner feedback system**:
  - "Entrante pasado, para la próxima levantá antes" (bad entry)
  - "Buena curva, salida limpia" (good exit)
- **Corner state tracking** for entry/exit analysis
- **6-second cooldown** for more frequent feedback

### Optimized Gear Suggestions
- **Early warnings** at 65% RPM (vs. standard 85%)
- **Speed-aware messaging**: Only suggests "al corte" when truly needed
- **Natural slang**: "Pasa a segunda", "Tira tercera", "Metele cuarta"
- **Contextual downshifts**: Only when throttle > 0.5 and gear > 2
- **2.5-second cooldown** for responsive feedback

### Physics Data Integration
- ✅ Lateral G-force monitoring (`LateralAccel`)
- ✅ Steering wheel angle tracking (`SteeringWheelAngle`)
- ✅ Full capability system for physics data
- ✅ Real-time telemetry at 20 FPS

### Performance Optimizations
- **UV_THREADPOOL_SIZE=8**: Utilizes 8 CPU cores for I/O operations (2x default)
- **20 FPS polling**: Optimized from 60 FPS for voice coaching efficiency
- **Performance caching**: Skips RPM/gear calculations when values unchanged
- **Smart cooldowns**: Prevents message spam while maintaining responsiveness

---

## 🔧 Technical Improvements

### Production Build
- ✅ **324 dependencies** fully embedded and portable
- ✅ **Fixed UI loading** with `app.getAppPath()` for production compatibility
- ✅ **Splash screen** support
- ✅ **787 MB** standalone executable (no installation required)

### Build System
- ✅ Enhanced `bundle-service.js` for reliable dependency copying
- ✅ Fixed `electron-builder.yml` configuration
- ✅ Comprehensive `BUILD.md` documentation
- ✅ Deployment guide (`INSTRUCCIONES.md`)

### Code Quality
- ✅ TypeScript compilation without errors
- ✅ Proper capability reporting
- ✅ Efficient event routing
- ✅ Robust error handling

---

## 📦 Download & Installation

### Portable Executable
**Location**: `apps/desktop/dist/win-unpacked/`

**Installation**:
1. Copy entire `win-unpacked` folder to your simulator PC
2. Run `SimRacing Coach.exe`
3. No installation required - 100% portable!

**Requirements**:
- Windows 10/11
- iRacing installed
- ~800 MB disk space

---

## 🎯 What's Included

### Core Features
- ✅ Real-time telemetry from iRacing
- ✅ Voice coaching with edge-TTS
- ✅ Temperature monitoring (water, oil)
- ✅ Session flags detection
- ✅ Personal best lap tracking
- ✅ Configurable hotkeys
- ✅ Volume control
- ✅ Mute/unmute functionality

### Coaching Categories
- 🏎️ **Gear changes**: Early, contextual suggestions
- 🏁 **Corner analysis**: Entry speed, exit quality
- 🌡️ **Temperature alerts**: Engine protection
- 🚩 **Session flags**: Blue, yellow, checkered
- ⏱️ **Lap times**: Personal best notifications

---

## 📚 Documentation

- **[BUILD.md](../../BUILD.md)**: Complete build process documentation
- **[INSTRUCCIONES.md](apps/desktop/dist/win-unpacked/INSTRUCCIONES.md)**: Deployment guide for simulator
- **[walkthrough.md](.gemini/antigravity/brain/.../walkthrough.md)**: Development walkthrough

---

## 🔄 Upgrade from Previous Versions

This is the first production release. No upgrade needed!

---

## 🐛 Known Issues

None reported in this release.

---

## 🙏 Acknowledgments

Built with:
- **irsdk-node**: Native iRacing SDK integration
- **Electron**: Cross-platform desktop framework
- **edge-tts**: Microsoft Edge text-to-speech
- **pnpm**: Fast, disk-efficient package manager

---

## 📝 Changelog

### Features
- Advanced corner coaching with lateral G detection
- Post-corner feedback system
- Optimized gear suggestions (65% RPM threshold)
- Natural Argentine racing slang messages
- Performance optimizations (8 cores, 20fps)

### Technical
- Added `hasSteeringAngle` and `hasLateralG` capabilities
- Implemented performance caching for calculations
- Fixed production UI loading paths
- Embedded all 324 dependencies

### Documentation
- Created BUILD.md with build process
- Added INSTRUCCIONES.md for deployment
- Updated walkthrough with all features

---

## 🚀 Next Steps

1. Copy `win-unpacked` folder to simulator
2. Run `SimRacing Coach.exe`
3. Start iRacing and enter a session
4. Click "Iniciar" in the app
5. Enjoy real-time coaching!

---

**¡Buenas vueltas! 🏎️**
