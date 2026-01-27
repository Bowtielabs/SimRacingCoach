# SimRacing Coach Companion (iRacing MVP)

Companion app para simracing con telemetría en tiempo real (iRacing), motor local de eventos críticos y coaching remoto vía SimaRacingAnalyzer. Incluye servicio Node.js + UI desktop con Electron.

## Requisitos

- Windows 10/11
- iRacing instalado (opcional - puede funcionar en modo mock sin iRacing)
- Node.js 20+
- pnpm 9+
- **Build tools para `irsdk-node`** (Visual Studio Build Tools + Python)

### Instalación de Build Tools

Para que `irsdk-node` funcione correctamente, necesitas:

1. **Visual Studio Build Tools 2022** con:
   - Desktop development with C++
   - Windows 10/11 SDK

2. **Python 3.x** (agregado al PATH)

Descarga: https://visualstudio.microsoft.com/downloads/ → "Build Tools for Visual Studio 2022"

## Setup

```bash
# Instalar dependencias
pnpm install

# Compilar todos los paquetes
pnpm build
```

## Desarrollo (service + desktop)

```bash
pnpm dev
```

Esto levanta:
- `apps/service` (telemetría, eventos, TTS, integración con API)
- `apps/desktop` (Electron UI)

## Build

```bash
pnpm build
```

## Configuración de API

La configuración se guarda en un JSON local. Desde la UI:
- **API URL**: URL base de SimaRacingAnalyzer (ej. `http://localhost:8080`)
- **API Token**: token Bearer si aplica

Ruta del config (Windows):
```
%APPDATA%\SimRacingCoach\config.json
```

## Hotkeys Globales

Por defecto (configurables desde la UI):
- **Ctrl+Shift+M**: Mute/Unmute
- **Ctrl+Shift+R**: Repetir último mensaje
- **Ctrl+Shift+F**: Modo foco (solo mensajes críticos)

## Troubleshooting

### **irsdk-node no compila**

**Error**: `gyp ERR! build error` o problemas con node-gyp

**Solución**:
1. Instala Visual Studio Build Tools (C++ Desktop) + Python
2. Ejecuta en PowerShell como administrador:
   ```powershell
   npm install -g windows-build-tools
   ```
3. Reinicia y ejecuta `pnpm install` de nuevo

### **No hay telemetría / iRacing desconectado**

**Causas posibles**:
- iRacing no está abierto
- iRacing no está en pista (debe estar en sesión activa)
- `irsdk-node` no pudo compilarse correctamente

**Modo Mock**: Si `irsdk-node` no está disponible, el servicio funciona en **modo mock** (sin telemetría real pero sin crashear). Los logs lo indicarán.

### **Sin audio TTS**

**Solución**:
1. Verifica permisos de PowerShell:
   ```powershell
   Get-ExecutionPolicy
   # Debe ser RemoteSigned o Unrestricted
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```

2. Verifica que existan voces instaladas en Windows:
   ```powershell
   Add-Type -AssemblyName System.Speech
   $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
   $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
   ```

   Para español, busca voces como "Microsoft Sabina Desktop" o "Microsoft Helena Desktop"

### **API offline**

El servicio sigue funcionando localmente (spotter/flags/engine) aunque la API esté offline. Solo se pierden las recomendaciones remotas.

### **Errores de TypeScript en el IDE**

Si ves errores después de clonar, ejecuta:
```bash
pnpm install
```

Los errores desaparecerán una vez instaladas todas las dependencias y tipos.

## Arquitectura

- **Service**: Lee telemetría de iRacing, detecta eventos críticos, maneja TTS
- **Desktop**: Electron UI para configuración y monitoreo
- **Packages compartidos**:
  - `@simracing/core`: Motor de eventos local
  - `@simracing/adapters-iracing`: Integración con irsdk-node
  - `@simracing/speech`: Sistema de TTS con PowerShell
  - `@simracing/api-client`: Cliente para servidor remoto
  - `@simracing/config`: Gestión de configuración persistente
  - `@simracing/diagnostics`: Logging y FPS tracking

## Scripts útiles

- `pnpm dev`: corre service + desktop en paralelo
- `pnpm build`: compila todos los paquetes
- `pnpm lint`: linting (si configurado)
- `pnpm format`: formateo (si configurado)

## Características

✅ **Spotter virtual**: Avisos de tráfico cercano (izquierda, derecha, tres autos, libre)  
✅ **Alertas de motor**: Temperaturas críticas (agua/aceite), presión baja, motor dañado  
✅ **Banderas**: Bandera amarilla, negra, azul  
✅ **Modo foco**: Solo avisos críticos durante carrera  
✅ **Coaching remoto**: Recibe recomendaciones de servidor externo vía WebSocket  
✅ **Funciona offline**: Sistema local sigue funcionando sin API  
✅ **Cooldowns inteligentes**: Evita spam de mensajes repetidos  
✅ **Mensajes en español**: Todo localizado  

## Licencia

Propietario - Uso interno
