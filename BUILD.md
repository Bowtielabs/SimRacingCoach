# Guía de Compilación en Producción

## Requisitos Previos
- Node.js v18+ instalado
- pnpm v9.0.0 instalado
- Todas las dependencias instaladas (`pnpm install` en la raíz)

## Pasos para Compilar el Ejecutable

### 1. Compilar todos los paquetes
```bash
cd C:\Users\Mauro\Documents\desarrolloAntigravity\SimRacingCoach
pnpm build
```

Este comando compila:
- Todos los packages en `packages/*` (core, adapters-runtime, config, etc.)
- El servicio en `apps/service`
- La aplicación desktop en `apps/desktop`

### 2. Compilar el ejecutable portable
```bash
pnpm --filter @simracing/desktop dist
```

Este comando:
1. Ejecuta `pnpm build` (compila TypeScript)
2. Ejecuta `pnpm build:service` (empaqueta servicio con dependencias)
3. Ejecuta `pnpm package` (crea el ejecutable con electron-builder)

### 3. Ubicación del ejecutable
El ejecutable portable se encuentra en:
```
apps/desktop/dist/win-unpacked/SimRacing Coach.exe
```

**IMPORTANTE**: Copiar TODA la carpeta `win-unpacked` - es portable y contiene todas las dependencias embebidas.

## Archivos Clave del Build

### bundle-service.js
**Ubicación**: `apps/desktop/scripts/bundle-service.js`

**Propósito**: Empaqueta el servicio Node.js con TODAS sus dependencias para que funcione embebido en Electron.

**Qué hace**:
1. Copia el servicio compilado desde `apps/service/dist`
2. Copia todos los packages internos (@simracing/*)
3. Copia TODAS las dependencias externas del pnpm store (325+ paquetes)
4. Asegura que dependencias críticas estén presentes:
   - `irsdk-node` (módulo nativo para iRacing)
   - `pino` (logging)
   - `edge-tts` (síntesis de voz)
5. Copia los adaptadores de `apps/adapters`

**Estructura resultante en `apps/desktop/resources/`**:
```
resources/
├── service/
│   ├── index.js (servicio compilado)
│   ├── package.json
│   └── node_modules/ (325+ paquetes)
│       ├── @simracing/* (paquetes internos)
│       ├── irsdk-node/
│       ├── pino/
│       ├── edge-tts/
│       └── ... (todas las dependencias)
└── adapters/
    └── iracing/
```

### electron-builder.yml
**Ubicación**: `apps/desktop/electron-builder.yml`

**Configuración clave**:
```yaml
asar: false  # CRÍTICO: No empaquetar en ASAR para que node_modules sean accesibles

extraResources:
  - from: resources  # Copia TODO el directorio resources
    to: .            # A la raíz de resources/ en el paquete final
```

**Estructura en el paquete final**:
```
win-unpacked/
├── SimRacing Coach.exe
├── resources/
│   ├── app/ (aplicación Electron)
│   ├── service/ (servicio Node.js con node_modules)
│   └── adapters/ (adaptadores de simuladores)
└── ... (archivos de Electron)
```

### main.ts
**Ubicación**: `apps/desktop/src/main.ts`

**Cómo inicia el servicio embebido**:
```typescript
const resourcesPath = process.resourcesPath;
const servicePath = path.join(resourcesPath, 'service', 'index.js');
const adapterPath = path.join(resourcesPath, 'adapters');

const proc = spawn(process.execPath, [servicePath], {
  env: {
    ...env,
    ELECTRON_RUN_AS_NODE: '1',  // Usar Node embebido en Electron
    ADAPTER_PATH: adapterPath
  },
  cwd: path.join(resourcesPath, 'service')
});
```

## Checklist de Verificación

Antes de distribuir, verificar:

- [ ] `pnpm build` ejecuta sin errores
- [ ] `apps/desktop/resources/service/node_modules/` tiene 325+ paquetes
- [ ] `irsdk-node` existe en node_modules
- [ ] `apps/desktop/dist/win-unpacked/` se creó correctamente
- [ ] `resources/service/node_modules/` existe en win-unpacked
- [ ] El ejecutable inicia correctamente en modo producción

## Troubleshooting

### Error: "Cannot find module 'irsdk-node'"
**Causa**: El módulo nativo no se copió correctamente.
**Solución**: 
1. Borrar `apps/desktop/resources/`
2. Ejecutar `pnpm --filter @simracing/desktop build:service`
3. Verificar que existe en `apps/desktop/resources/service/node_modules/irsdk-node`

### Error: "Service failed to start"
**Causa**: Dependencias faltantes en el servicio embebido.
**Solución**: 
1. Revisar los logs del servicio en la consola de Electron
2. Agregar la dependencia faltante a `criticalDeps` en `bundle-service.js`
3. Recompilar con `pnpm --filter @simracing/desktop dist`

### El servicio no se empaqueta correctamente
**Causa**: `electron-builder.yml` no está copiando los recursos.
**Solución**: Verificar que `extraResources` apunta a `resources` → `.`

## Cambios Recientes Importantes

### 2026-01-28: Arreglo del empaquetado de dependencias
- **Problema**: `node_modules` no se copiaba al ejecutable final
- **Solución**: Cambiar `electron-builder.yml` de copiar `resources/service` y `resources/adapters` individualmente a copiar `resources/` completo
- **Archivos modificados**:
  - `apps/desktop/electron-builder.yml`
  - `apps/desktop/scripts/bundle-service.js`

### 2026-01-28: Mejoras de coaching
- Agregadas capacidades `hasSteeringAngle` y `hasLateralG` en `types.ts`
- Implementado sistema de coaching avanzado con feedback post-curva
- Thresholds ajustados para alertas más tempranas (65% RPM, 0.9G lateral)
- **IMPORTANTE**: Después de agregar nuevas capabilities, recordar actualizar `buildCapabilities()` en `apps/service/src/index.ts`

## Comandos Rápidos

```bash
# Compilar todo desde cero
pnpm build

# Compilar solo el ejecutable (asume que pnpm build ya corrió)
pnpm --filter @simracing/desktop dist

# Compilar solo el servicio
pnpm --filter @simracing/service build

# Empaquetar el servicio (sin compilar TypeScript)
pnpm --filter @simracing/desktop build:service

# Solo crear el ejecutable con electron-builder (asume build:service ya corrió)
pnpm --filter @simracing/desktop package
```
