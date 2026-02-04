// ═══════════════════════════════════════════════════════════════
// DEBUG FLAGS - Motor de Reglas
// ═══════════════════════════════════════════════════════════════
const DEBUG = {
    ENTRADA: true,         // Log de entrada con resumen del buffer (TEMP DEBUG)
    REGLAS_EVALUADAS: true, // Log de cada regla que cumple condición ✅
    REGLAS_ACTIVADAS: true, // Log de reglas que se van a hablar ✅
    SALIDA: true,          // Log cuando no hay reglas aplicables ✅
    FLAGS: true,           // Log de session flags ✅
    INIT: false            // Log de inicialización
};
// ═══════════════════════════════════════════════════════════════

import { TelemetryFrame } from '@simracing/core';
import { TELEMETRY_RULES } from './telemetry-rules.js';

/**
 * Análisis de telemetría para el motor de reglas
 */
export interface TelemetryAnalysis {
    current: TelemetryFrame;
    last30sec: TelemetryFrame[];
    averages: {
        speed: number;
        rpm: number;
        throttle: number;
        brake: number;
        lateralG: number;
        longitudinalG: number;
        steeringAngle: number;
        waterC: number;
        oilC: number;
        fuelPct: number;
        tyreC: number[]; // Averages per wheel over buffer
        brakeC: number[]; // Averages per wheel over buffer
    };
    patterns: {
        hardBrakingCount: number;
        overRevCount: number;
        aggressiveSteeringCount: number;
        throttleChanges: number;
        incidentCount: number;
        lapsSinceLastPit: number;
        fuelUsedInBuffer: number;
        isImproving: boolean;
        bottomingCount: number;
        rakeInstabilityCount: number;
        // Phase 6: Advanced Dynamics
        understeerFactor: number; // >0 means understeer tendency
        oversteerFactor: number;  // >0 means oversteer tendency
        tractionLossCount: number; // instances of wheelspin
        trailBrakingQuality: number; // 0-1, 1 is perfect progressive release
    };
    lapTimes: {
        best: number;
        last: number;
        current: number;
        delta: number; // last - best
    };
}

/**
 * Regla de telemetría
 */
export interface TelemetryRule {
    id: string;
    category: 'engine' | 'brakes' | 'tyres' | 'technique' | 'strategy' | 'track';
    priority: number; // 1-10, mayor = más importante
    condition: (data: TelemetryAnalysis) => boolean;
    advice: string; // Español argentino, máximo 20 palabras
    cooldown?: number; // Segundos antes de repetir
}

/**
 * Resultado de análisis con múltiples recomendaciones
 */
export interface AnalysisResult {
    ruleId: string;
    category: 'engine' | 'brakes' | 'tyres' | 'technique' | 'strategy' | 'track';
    priority: number;
    advice: string;
}

/**
 * Motor de reglas de telemetría
 * Analiza datos de iRacing y genera consejos basados en conocimiento de ingeniería de carreras
 */
export class TelemetryRulesEngine {
    private rules: TelemetryRule[] = [];
    private lastAdviceTime: Map<string, number> = new Map();

    constructor() {
        this.initializeRules();
    }

    /**
     * Analiza telemetría y devuelve el mejor consejo disponible
     */
    analyze(data: TelemetryAnalysis): string | null {
        const results = this.analyzeAll(data, 1);
        return results.length > 0 ? results[0].advice : null;
    }

    /**
     * Analiza telemetría y devuelve MÚLTIPLES consejos ordenados por prioridad
     * @param data Análisis de telemetría
     * @param maxResults Máximo de resultados a devolver (default: 5)
     */
    analyzeAll(data: TelemetryAnalysis, maxResults: number = 5): AnalysisResult[] {
        if (DEBUG.ENTRADA) {
            console.log(`[RulesEngine] 🔵 ENTRADA - Buffer: ${data.last30sec?.length || 0} frames, Speed: ${Math.round(data.averages?.speed || 0)} kph`);
        }

        const now = Date.now();
        const flags = data.current.flags?.sessionFlags || 0;

        if (DEBUG.FLAGS && flags !== 0) {
            console.log(`[RulesEngine] 🚩 Analizando flags: 0x${flags.toString(16)}`);
        }

        // Filtrar reglas que cumplen condición y no están en cooldown
        const applicableRules = this.rules.filter(rule => {
            // Verificar cooldown
            const lastTime = this.lastAdviceTime.get(rule.id);
            if (lastTime && rule.cooldown) {
                const elapsed = (now - lastTime) / 1000;
                if (elapsed < rule.cooldown) {
                    return false;
                }
            }

            // Verificar condición
            try {
                const result = rule.condition(data);
                if (DEBUG.REGLAS_EVALUADAS && result) {
                    console.log(`[RulesEngine] -> Regla "${rule.id}" CUMPLE condición.`);
                }
                return result;
            } catch (error) {
                console.error(`[RulesEngine] Error en regla ${rule.id}:`, error);
                return false;
            }
        });

        if (applicableRules.length === 0) {
            if (DEBUG.SALIDA) {
                console.log(`[RulesEngine] 🔴 SALIDA - Sin reglas aplicables`);
            }
            return [];
        }

        // Ordenar por prioridad (mayor primero)
        applicableRules.sort((a, b) => b.priority - a.priority);

        // Tomar las reglas de mayor prioridad (hasta maxResults)
        const selectedRules = applicableRules.slice(0, maxResults);

        // Actualizar tiempos y construir resultados
        const results: AnalysisResult[] = selectedRules.map(rule => {
            this.lastAdviceTime.set(rule.id, now);
            if (DEBUG.REGLAS_ACTIVADAS) {
                console.log(`[RulesEngine] 🎯 Regla activada: ${rule.id} (prioridad ${rule.priority})`);
            }
            return {
                ruleId: rule.id,
                category: rule.category,
                priority: rule.priority,
                advice: rule.advice,
            };
        });

        return results;
    }

    /**
     * Calcula análisis de telemetría desde buffer
     */
    static calculateAnalysis(current: TelemetryFrame, buffer: TelemetryFrame[]): TelemetryAnalysis {
        const last30sec = buffer.slice(-600); // ~30 segundos at 20fps

        if (last30sec.length === 0) {
            // Sin datos históricos, usar solo current
            return {
                current,
                last30sec: [],
                averages: {
                    speed: current.powertrain?.speedKph || 0,
                    rpm: current.powertrain?.rpm || 0,
                    throttle: (current.powertrain?.throttle || 0) * 100,
                    brake: (current.powertrain?.brake || 0) * 100,
                    lateralG: Math.abs(current.physics?.lateralG || 0),
                    longitudinalG: current.physics?.longitudinalG || 0,
                    steeringAngle: Math.abs(current.physics?.steeringAngle || 0),
                    waterC: current.temps?.waterC || 0,
                    oilC: current.temps?.oilC || 0,
                    fuelPct: (current.fuel?.levelPct || 0) * 100,
                    tyreC: current.temps?.tyreC || [0, 0, 0, 0],
                    brakeC: current.temps?.brakeC || [0, 0, 0, 0]
                },
                patterns: {
                    hardBrakingCount: 0,
                    overRevCount: 0,
                    aggressiveSteeringCount: 0,
                    throttleChanges: 0,
                    incidentCount: current.session?.incidents || 0,
                    lapsSinceLastPit: 0,
                    fuelUsedInBuffer: 0,
                    isImproving: false,
                    bottomingCount: 0,
                    rakeInstabilityCount: 0,
                    // Phase 6 placeholders
                    understeerFactor: 0,
                    oversteerFactor: 0,
                    tractionLossCount: 0,
                    trailBrakingQuality: 0
                },
                lapTimes: {
                    best: current.lapTimes?.best || 0,
                    last: current.lapTimes?.last || 0,
                    current: current.lapTimes?.current || 0,
                    delta: (current.lapTimes?.last || 0) - (current.lapTimes?.best || 0)
                }
            };
        }

        // Calcular promedios
        const count = last30sec.length;
        const avgSpeed = last30sec.reduce((sum, f) => sum + (f.powertrain?.speedKph || 0), 0) / count;
        const avgRPM = last30sec.reduce((sum, f) => sum + (f.powertrain?.rpm || 0), 0) / count;
        const avgThrottle = last30sec.reduce((sum, f) => sum + ((f.powertrain?.throttle || 0) * 100), 0) / count;
        const avgBrake = last30sec.reduce((sum, f) => sum + ((f.powertrain?.brake || 0) * 100), 0) / count;
        const avgLateralG = last30sec.reduce((sum, f) => sum + Math.abs(f.physics?.lateralG || 0), 0) / count;
        const avgLongG = last30sec.reduce((sum, f) => sum + (f.physics?.longitudinalG || 0), 0) / count;
        const avgSteering = last30sec.reduce((sum, f) => sum + Math.abs(f.physics?.steeringAngle || 0), 0) / count;
        const avgWater = last30sec.reduce((sum, f) => sum + (f.temps?.waterC || 0), 0) / count;
        const avgOil = last30sec.reduce((sum, f) => sum + (f.temps?.oilC || 0), 0) / count;
        const avgFuelPct = last30sec.reduce((sum, f) => sum + ((f.fuel?.levelPct || 0) * 100), 0) / count;

        // Promedios neumáticos y frenos (por rueda)
        const avgTyres = [0, 1, 2, 3].map(i =>
            last30sec.reduce((sum, f) => sum + (f.temps?.tyreC?.[i] || 0), 0) / count
        );
        const avgBrakes = [0, 1, 2, 3].map(i =>
            last30sec.reduce((sum, f) => sum + (f.temps?.brakeC?.[i] || 0), 0) / count
        );

        // Detectar patrones
        const hardBrakingCount = last30sec.filter(f => (f.physics?.longitudinalG || 0) < -1.0).length;
        const overRevCount = last30sec.filter(f => (f.powertrain?.rpm || 0) > 7500).length;
        const aggressiveSteeringCount = last30sec.filter(f => Math.abs(f.physics?.steeringAngle || 0) > 45).length;
        const incidentCount = current.session?.incidents || 0;

        // Consumo de combustible en el buffer
        const firstFuel = last30sec[0].fuel?.level || 0;
        const lastFuel = current.fuel?.level || 0;
        const fuelUsedInBuffer = Math.max(0, firstFuel - lastFuel);

        // ¿Está mejorando su tiempo actual?
        const isImproving = (current.lapTimes?.current || 0) < (current.lapTimes?.last || 0);

        // Detectar cambios bruscos de acelerador
        let throttleChanges = 0;
        for (let i = 1; i < last30sec.length; i++) {
            const prev = (last30sec[i - 1].powertrain?.throttle || 0) * 100;
            const curr = (last30sec[i].powertrain?.throttle || 0) * 100;
            if (Math.abs(curr - prev) > 50) {
                throttleChanges++;
            }
        }

        // Phase 5: Suspension & Aero Patterns
        const bottomingCount = last30sec.filter(f => {
            if (!f.suspension?.shockDeflection) return false;
            // > 0.12m heuristic
            return f.suspension.shockDeflection.some(d => Math.abs(d) > 0.12);
        }).length;

        let rakeInstabilityCount = 0;
        // Check rake variance
        for (let i = 1; i < last30sec.length; i++) {
            const prevAero = last30sec[i - 1].aero;
            const currAero = last30sec[i].aero;
            if (prevAero?.rake !== undefined && currAero?.rake !== undefined) {
                if (Math.abs(currAero.rake - prevAero.rake) > 0.005) {
                    rakeInstabilityCount++;
                }
            }
        }

        // Phase 6: Advanced Dynamics Calculation
        // 1. Traction Loss (Wheelspin)
        let tractionLossCount = 0;
        for (let i = 1; i < last30sec.length; i++) {
            const prev = last30sec[i - 1];
            const curr = last30sec[i];
            if ((curr.powertrain?.rpm || 0) - (prev.powertrain?.rpm || 0) > 500 &&
                (curr.powertrain?.speedKph || 0) - (prev.powertrain?.speedKph || 0) < 2 &&
                (curr.powertrain?.throttle || 0) > 0.5 &&
                (curr.powertrain?.gear || 0) < 4) {
                tractionLossCount++;
            }
        }

        // 2. Understeer/Oversteer (Simplified Heuristics)
        const avgSteeringAbs = avgSteering;
        const avgLatGAbs = avgLateralG;

        let understeerFactor = 0;
        // High Speed Understeer: High steering (>30 deg) but low G (< 1G) at speed (>80kph)
        if (avgSteeringAbs > 30 && avgLatGAbs < 10 && avgSpeed > 80) {
            understeerFactor = (avgSteeringAbs / Math.max(1, avgLatGAbs)) * 0.1;
        }

        let oversteerFactor = 0;
        // Opposite lock detection
        const counterSteerEvents = last30sec.filter(f => {
            const steer = f.physics?.steeringAngle || 0;
            const latG = f.physics?.lateralG || 0;
            const speed = f.powertrain?.speedKph || 0;
            return speed > 50 && Math.abs(steer) > 5 && (steer * latG) < 0;
        }).length;
        if (counterSteerEvents > 5) oversteerFactor = 1;

        // 3. Trail Braking Quality (Placeholder - requires detailed release analysis)
        let trailBrakingQuality = 0.5;


        return {
            current,
            last30sec,
            averages: {
                speed: avgSpeed,
                rpm: avgRPM,
                throttle: avgThrottle,
                brake: avgBrake,
                lateralG: avgLateralG,
                longitudinalG: avgLongG,
                steeringAngle: avgSteering,
                waterC: avgWater,
                oilC: avgOil,
                fuelPct: avgFuelPct,
                tyreC: avgTyres,
                brakeC: avgBrakes
            },
            patterns: {
                hardBrakingCount,
                overRevCount,
                aggressiveSteeringCount,
                throttleChanges,
                incidentCount,
                lapsSinceLastPit: 0, // Habría que trackearlo en sesión
                fuelUsedInBuffer,
                isImproving,
                bottomingCount,
                rakeInstabilityCount,
                // Phase 6 populated
                understeerFactor,
                oversteerFactor,
                tractionLossCount,
                trailBrakingQuality
            },
            lapTimes: {
                best: current.lapTimes?.best || 0,
                last: current.lapTimes?.last || 0,
                current: current.lapTimes?.current || 0,
                delta: (current.lapTimes?.last || 0) - (current.lapTimes?.best || 0)
            }
        };
    }

    /**
     * Inicializa las reglas de telemetría desde archivo externo
     */
    private initializeRules(): void {
        this.rules = TELEMETRY_RULES;
        if (DEBUG.INIT) {
            console.log(`[RulesEngine] ✓ Inicializadas ${this.rules.length} reglas de telemetría`);
        }
    }
}
