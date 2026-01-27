# SimRacing Coach Companion (Adapters MMF)

Companion app para simracing con telemetría en tiempo real, motor local de eventos críticos y coaching remoto vía SimaRacingAnalyzer. Incluye servicio Node.js + UI desktop con Electron, y adapters externos para telemetría.

## Requisitos

- Windows 10/11
- Node.js 20+
- pnpm 9+
- Python 3.11+ (solo si usás el adapter de iRacing)

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

## Telemetry adapters

- **iRacing**: usa el SDK oficial vía Memory Mapped File y un adapter Python (`apps/adapters/iracing-ctypes/adapter.py`).
- **Otros sims**: stubs que reportan "Not implemented yet" (AMS2, RaceRoom, rFactor, rFactor2, Automobilista, SimuTC, AC, ACC, Other).

## Configuración de API

La configuración se guarda en un JSON local. Desde la UI:
- **API URL**: URL base de SimaRacingAnalyzer (ej. `http://localhost:8080`)
- **API Token**: token Bearer si aplica

Ruta del config (Windows):
```
%APPDATA%\SimRacingCoach\config.json
```

## Troubleshooting

- **Python no encontrado**: instalá Python 3.11+ y asegurate de que `py -3` o `python` estén en el PATH.
- **No hay telemetría**: asegurate de que iRacing esté abierto y en pista.
- **Sin audio TTS**: revisá permisos de PowerShell y que haya voces instaladas en Windows.
- **API offline**: el servicio sigue funcionando localmente (spotter/flags/engine).

## Scripts útiles

- `pnpm dev`: corre service + desktop en paralelo.
- `pnpm build`: compila todos los paquetes.
