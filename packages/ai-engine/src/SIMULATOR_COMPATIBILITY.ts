/**
 * Comentarios sobre compatibilidad de telemetría entre simuladores
 * 
 * El sistema de reglas funciona con CUALQUIER simulador que provea TelemetryFrame.
 * 
 * ESTRUCTURA GENÉRICA:
 * - TelemetryFrame usa campos opcionales (?) para máxima flexibilidad
 * - Cada simulador llena los campos que tiene disponibles
 * - Las reglas verifican existencia antes de usar datos
 * 
 * SIMULADORES SOPORTADOS:
 * ✅ iRacing - Soporte completo (todos los campos)
 * ✅ ACC (Assetto Corsa Competizione) - Soporte completo
 * ✅ F1 (Codemasters) - Soporte completo
 * ✅ Assetto Corsa - Soporte completo
 * ✅ rFactor - Soporte completo (motor ISI original)
 * ✅ rFactor 2 - Soporte completo (motor ISI mejorado)
 * ✅ Automobilista 2 - Soporte completo
 * ✅ Project CARS 2 - Soporte completo
 * ✅ ACTC (Turismo Carretera) - Soporte completo (basado en rFactor)
 * ✅ BeamNG.drive - Soporte parcial (física avanzada)
 * ✅ DiRT Rally - Soporte parcial (rally específico)
 * ✅ Wreckfest - Soporte parcial
 * ✅ Generic - Cualquier otro simulador
 * 
 * MAPEO DE CAMPOS POR SIMULADOR:
 * 
 * Campo                  | iRacing | ACC | F1  | AC  | rF2 | AMS2 | PC2 |
 * -----------------------|---------|-----|-----|-----|-----|------|-----|
 * powertrain.speedKph    | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * powertrain.rpm         | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * powertrain.gear        | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * powertrain.throttle    | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * powertrain.brake       | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * temps.waterC           | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * temps.oilC             | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * temps.tyreC[]          | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * temps.brakeC[]         | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * physics.lateralG       | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * physics.longitudinalG  | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * physics.steeringAngle  | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * fuel.levelPct          | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * lapTimes.best          | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * lapTimes.last          | ✅      | ✅  | ✅  | ✅  | ✅  | ✅   | ✅  |
 * traffic.carLeftRight   | ✅      | ⚠️  | ⚠️  | ⚠️  | ⚠️  | ⚠️   | ⚠️  |
 * flags.sessionFlags     | ✅      | ✅  | ✅  | ⚠️  | ⚠️  | ⚠️   | ⚠️  |
 * 
 * ✅ = Disponible directamente
 * ⚠️ = Requiere cálculo o no disponible
 * 
 * NOTAS IMPORTANTES:
 * 
 * 1. **Campos Opcionales**: Todas las reglas usan `?.` para acceso seguro
 *    Ejemplo: `(d.current.powertrain?.rpm || 0) > 7800`
 * 
 * 2. **Valores por Defecto**: Siempre proveer fallback con `|| 0`
 *    Evita errores si el simulador no provee ese campo
 * 
 * 3. **Arrays**: Verificar longitud antes de usar
 *    Ejemplo: `const brakeTemps = d.current.temps?.brakeC || [];`
 * 
 * 4. **Normalización**: Los adaptadores de cada simulador deben:
 *    - Convertir unidades a estándar (km/h, °C, etc.)
 *    - Normalizar valores (throttle/brake 0-1)
 *    - Llenar campos disponibles, dejar undefined los no disponibles
 * 
 * EJEMPLO DE ADAPTADOR:
 * 
 * ```typescript
 * // Adaptador para ACC
 * function accToTelemetryFrame(accData: ACCTelemetry): TelemetryFrame {
 *   return {
 *     t: Date.now(),
 *     sim: 'acc',
 *     powertrain: {
 *       speedKph: accData.physics.speedKmh,
 *       rpm: accData.physics.rpms,
 *       gear: accData.physics.gear,
 *       throttle: accData.physics.gas,
 *       brake: accData.physics.brake,
 *     },
 *     temps: {
 *       waterC: accData.physics.waterTemp,
 *       oilC: accData.physics.oilTemp,
 *       tyreC: accData.physics.tyreCoreTemperature,
 *       brakeC: accData.physics.brakeTemp,
 *     },
 *     // ... resto de campos
 *   };
 * }
 * ```
 * 
 * REGLAS UNIVERSALES:
 * Las reglas están diseñadas para funcionar con CUALQUIER simulador:
 * - Verifican existencia de datos antes de usar
 * - Usan umbrales genéricos (RPM > 7800, temp > 100°C)
 * - No dependen de características específicas de un simulador
 * 
 * AGREGAR NUEVO SIMULADOR:
 * 1. Agregar nombre a SimName en types.ts
 * 2. Crear adaptador que convierta telemetría nativa a TelemetryFrame
 * 3. Las reglas funcionarán automáticamente
 */

export const SIMULATOR_COMPATIBILITY_NOTES = `
Sistema de reglas compatible con TODOS los simuladores.
Cada simulador provee los campos que tiene disponibles.
Las reglas verifican existencia antes de usar datos.
`;
