# SimRacing Coach Companion (iRacing MVP)

Companion app para simracing con telemetría en tiempo real (iRacing), motor local de eventos críticos y coaching remoto vía SimaRacingAnalyzer. Incluye servicio Node.js + UI desktop con Electron.

## Requisitos

- Windows 10/11
- iRacing instalado y corriendo
- Node.js 20+
- pnpm 9+
- Build tools para `irsdk-node` (Visual Studio Build Tools + Python, si el paquete lo requiere)

## Setup

```bash
pnpm install
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

## Troubleshooting

- **irsdk-node no compila**: instalá Visual Studio Build Tools (C++ Desktop) + Python.
- **No hay telemetría**: asegurate de que iRacing esté abierto y en pista.
- **Sin audio TTS**: revisá permisos de PowerShell y que haya voces instaladas en Windows.
- **API offline**: el servicio sigue funcionando localmente (spotter/flags/engine).

## Scripts útiles

- `pnpm dev`: corre service + desktop en paralelo.
- `pnpm build`: compila todos los paquetes.

