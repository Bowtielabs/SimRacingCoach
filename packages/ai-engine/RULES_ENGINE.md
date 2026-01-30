# Motor de Reglas - Documentación Técnica

## Resumen

El motor de reglas analiza telemetría cada 15 segundos y genera consejos de voz.  
Actualmente tiene **19 reglas** organizadas en 6 categorías.

---

## Datos de Telemetría Disponibles

### Frame Actual

**Powertrain (Motor)**
| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `speedKph` | Velocidad km/h | 220 |
| `rpm` | RPM motor | 7200 |
| `gear` | Marcha actual | 4 |
| `throttle` | Acelerador (0-1) | 0.85 |
| `brake` | Freno (0-1) | 0.3 |

**Temperaturas**
| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `waterC` | Agua °C | 92 |
| `oilC` | Aceite °C | 105 |
| `tyreC[]` | Neumáticos °C (4) | [85, 87, 84, 86] |
| `brakeC[]` | Frenos °C (4) | [320, 325, 315, 318] |

**Sesión**
| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `onPitRoad` | ¿En boxes? | false |
| `lap` | Vuelta actual | 5 |
| `incidents` | Incidentes | 2 |
| `sessionLapsRemain` | Vueltas restantes | 8 |

**Tiempos de Vuelta**
| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `best` | Mejor vuelta (s) | 92.5 |
| `last` | Última vuelta (s) | 93.8 |
| `current` | Vuelta actual (s) | 45.2 |

**Banderas**
| Campo | Descripción |
|-------|-------------|
| `sessionFlags` | Bitmask de banderas iRacing |

### Patrones Detectados (últimos 30 segundos)

| Patrón | Descripción |
|--------|-------------|
| `hardBrakingCount` | Frenadas con G < -1.0 |
| `overRevCount` | RPM > 7500 |
| `throttleChanges` | Cambios bruscos acelerador |
| `delta` | Diferencia última vs mejor vuelta |

---

## Reglas Actuales (19)

### 🔧 Sistema (1)

| Regla | Prioridad | Condición | Consejo |
|-------|-----------|-----------|---------|
| heartbeat | 1 | Vel > 50 km/h | "Sistema de coaching activo. Vamos bien." |

### 🏎️ Motor (4)

| Regla | Prioridad | Condición | Consejo |
|-------|-----------|-----------|---------|
| overrev-critical | 10 | RPM > 7800 | "RPM muy alto, cambiar marcha YA" |
| oil-critical | 9 | Aceite > 110°C | "Aceite a más de 110°C, reducir RPM" |
| water-critical | 9 | Agua > 100°C | "Agua a más de 100°C, revisar refrigeración" |
| overrev-hot | 8 | RPM > 7200 + Aceite > 100°C | "RPM alto y aceite caliente, cambiar marcha antes" |

### 🛑 Frenos (3)

| Regla | Prioridad | Condición | Consejo |
|-------|-----------|-----------|---------|
| brakes-critical | 9 | Frenos > 400°C | "Frenos a más de 400°C, peligro de falla" |
| brakes-hot | 8 | Frenos > 350°C | "Frenos a más de 350°C, frenar más suave" |
| braking-too-hard | 7 | +5 frenadas fuertes | "Muchas frenadas fuertes, frenar más temprano" |

### 🔘 Neumáticos (2)

| Regla | Prioridad | Condición | Consejo |
|-------|-----------|-----------|---------|
| tyres-cold | 7 | Promedio < 60°C | "Neumáticos fríos, calentar con zigzag suave" |
| tyres-hot | 7 | Alguno > 100°C | "Neumáticos a más de 100°C, reducir agresividad" |

### 🎮 Técnica (3)

| Regla | Prioridad | Condición | Consejo |
|-------|-----------|-----------|---------|
| losing-time | 6 | Delta > 2s | "Perdiendo 2 segundos por vuelta, revisar frenadas" |
| throttle-aggressive | 5 | +20 cambios bruscos | "Acelerador muy brusco, suavizar aplicación" |
| steering-erratic | 5 | Ángulo promedio > 30° | "Volante muy movido, suavizar entradas" |

### ⛽ Estrategia (1)

| Regla | Prioridad | Condición | Consejo |
|-------|-----------|-----------|---------|
| fuel-low | 6 | Fuel < 10% + 5 vueltas | "Combustible bajo, ahorrar o entrar a boxes" |

### 🚩 Banderas y Pista (5)

| Regla | Prioridad | Condición | Consejo |
|-------|-----------|-----------|---------|
| flag-black | 10 | Bandera negra | "¡Bandera negra! Tenés una sanción, entrá a boxes." |
| flag-meatball | 10 | Bandera técnica | "¡Bandera técnica! El auto está dañado, entrá a boxes ya." |
| flag-yellow | 9 | Bandera amarilla | "Bandera amarilla, bajá la velocidad y cuidado." |
| flag-blue | 7 | Bandera azul | "Bandera azul, dejá pasar al auto de atrás." |
| traffic-close | 6 | Auto cerca (< 0.3) | "Auto muy cerca, cuidado al maniobrar" |

---

## Agregar Nueva Regla

Editar `packages/ai-engine/src/telemetry-rules.ts`:

```typescript
{
    id: 'mi-regla',
    category: 'technique',
    priority: 5,
    condition: (d) => d.current.powertrain?.speedKph > 200,
    advice: 'Consejo en español, máximo 20 palabras',
    cooldown: 30
}
```

**Categorías:** engine, brakes, tyres, technique, strategy, track  
**Prioridad:** 1-10 (mayor = más importante)
