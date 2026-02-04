# Arquitectura de Normalización de Telemetría

Este documento detalla cómo **SimRacingCoach** logra ser agnóstico del simulador (compatible con iRacing, ACC, rFactor, etc.) mediante una capa de estandarización.

## 🔄 El Concepto: "Universal Translator"

El **Motor de IA (AI Engine)** utiliza el estándar `TelemetryFrame` para ser independiente del juego.

```mermaid
graph TD
    A[iRacing] -->|Raw Data| B(Adaptador iRacing)
    C[Assetto Corsa] -->|UDP Packets| D(Adaptador ACC)
    E[rFactor 2] -->|Shared Memory| F(Adaptador RF2)

    B -->|Normalizacion| G{TelemetryFrame}
    D -->|Normalizacion| G
    F -->|Normalizacion| G

    G -->|Datos Estandar| H[Motor de Reglas]
    
    H -->|Analisis| I[Subviraje]
    H -->|Analisis| J[Bloqueo]
    H -->|Analisis| K[Estrategia]

    I --> L[Generador de Consejos]
    J --> L
    K --> L
    
    L --> M((Audio TTS 📻))
```

## 🛠️ Componentes Clave

1.  **`TelemetryFrame`** (`packages/core/src/types.ts`):
    *   Es el "contrato". Define qué datos *debe* tener el sistema.
2.  **`TelemetryRulesEngine`** (`packages/ai-engine`):
    *   Es el "cerebro".
    *   **NO sabe** qué juego se está ejecutando.
3.  **Adaptadores** (`packages/adapters/`):
    *   Actualmente activo: **iRacing Adapter** (`iracing-node`).
