/**
 * Advanced Telemetry Analyzer
 * 
 * Analiza el buffer completo de 30 segundos de telemetría para detectar:
 * - Patrones de entrada/salida de curvas
 * - Tráfico cercano (autos adelante/atrás)
 * - Tendencias de tiempos
 * - Problemas de manejo (subviraje, sobreviraje, frenadas tardías)
 * - Estado del auto (neumaticos, motor, combustible)
 */

import { TelemetryFrame } from '@simracing/core';
import { TelemetryWindow, WindowSummary } from './telemetry-buffer.js';

// ============================================
// TIPOS PARA ANÁLISIS AVANZADO
// ============================================

export interface CornerAnalysis {
    lapDistPct: number;           // Dónde está la curva (% de vuelta)
    entrySpeed: number;           // Velocidad de entrada
    apexSpeed: number;            // Velocidad en el apex
    exitSpeed: number;            // Velocidad de salida
    entrySteeringAngle: number;   // Ángulo de volante al entrar
    maxSteeringAngle: number;     // Ángulo máximo
    brakePoint: number;           // Dónde frenó (% de vuelta)
    throttlePoint: number;        // Dónde aceleró (% de vuelta)
    trailBraking: boolean;        // ¿Usó trail braking?
    understeer: boolean;          // ¿Detectado subviraje?
    oversteer: boolean;           // ¿Detectado sobreviraje?
    wheelSpin: boolean;           // ¿Patinó al acelerar?
    lockup: boolean;              // ¿Bloqueó ruedas?
    timeInCorner: number;         // Tiempo en la curva (ms)
}

export interface TrafficAnalysis {
    carAhead: boolean;
    carBehind: boolean;
    carLeft: boolean;
    carRight: boolean;
    gapToCarAhead: number | null;     // Segundos
    gapToCarBehind: number | null;    // Segundos
    beingPressured: boolean;          // Auto atrás muy cerca
    catchingCar: boolean;             // Alcanzando al de adelante
    inBattle: boolean;                // En pelea rueda a rueda
    blueFlag: boolean;                // Bandera azul
}

export interface TimingAnalysis {
    currentLapTime: number;
    lastLapTime: number;
    bestLapTime: number;
    deltaToBest: number;              // Diferencia con mejor vuelta
    deltaToLast: number;              // Diferencia con última vuelta
    improving: boolean;               // ¿Mejorando tiempos?
    consistent: boolean;              // ¿Consistente en últimas vueltas?
    sectorTrend: 'faster' | 'slower' | 'same';
    estimatedLapTime: number | null;  // Tiempo estimado de esta vuelta
    lapsRemaining: number | null;
}

export interface CarStateAnalysis {
    // Neumáticos
    tyreCondition: 'good' | 'worn' | 'critical';
    tyreTemps: 'cold' | 'optimal' | 'hot' | 'overheating';
    tyreBalance: 'balanced' | 'front_hot' | 'rear_hot';
    tyrePressure: 'low' | 'optimal' | 'high';

    // Motor
    engineTemp: 'cold' | 'optimal' | 'hot' | 'overheating';
    oilTemp: 'cold' | 'optimal' | 'hot';

    // Combustible
    fuelLevel: 'plenty' | 'ok' | 'low' | 'critical';
    fuelPerLap: number;
    lapsOfFuelRemaining: number | null;

    // Daño
    hasIncidents: boolean;
    incidentCount: number;
}

export interface DrivingStyleAnalysis {
    // Frenado
    brakingStyle: 'early' | 'late' | 'optimal';
    brakePressure: 'light' | 'moderate' | 'heavy';
    trailBrakingUsage: 'none' | 'some' | 'good';

    // Acelerador
    throttleApplication: 'smooth' | 'aggressive' | 'jerky';
    fullThrottlePercent: number;
    liftAndCoast: boolean;

    // Volante
    steeringInputs: 'smooth' | 'busy' | 'corrections';
    counterSteerEvents: number;

    // Línea
    usingAllTrack: boolean;
    cuttingCorners: boolean;
    runningWide: boolean;
}

export interface AdvancedAnalysisResult {
    corners: CornerAnalysis[];
    traffic: TrafficAnalysis;
    timing: TimingAnalysis;
    carState: CarStateAnalysis;
    drivingStyle: DrivingStyleAnalysis;

    // Recomendaciones generadas
    recommendations: Recommendation[];
}

export interface Recommendation {
    priority: number;           // 1-10
    category: 'technique' | 'strategy' | 'traffic' | 'car' | 'safety';
    message: string;            // Mensaje corto para TTS (max 25 palabras)
    details?: string;           // Detalles adicionales (no para TTS)
}

// ============================================
// ANALIZADOR AVANZADO
// ============================================

export class AdvancedTelemetryAnalyzer {

    /**
     * Analiza una ventana completa de telemetría
     */
    analyze(window: TelemetryWindow): AdvancedAnalysisResult {
        const frames = window.frames;
        const summary = window.summary;

        if (frames.length === 0) {
            return this.emptyResult();
        }

        const lastFrame = frames[frames.length - 1];

        // Análisis de cada componente
        const corners = this.analyzeCorners(frames);
        const traffic = this.analyzeTraffic(frames, lastFrame);
        const timing = this.analyzeTiming(frames, lastFrame);
        const carState = this.analyzeCarState(frames, lastFrame, summary);
        const drivingStyle = this.analyzeDrivingStyle(frames, summary);

        // Generar recomendaciones basadas en el análisis
        const recommendations = this.generateRecommendations(
            corners, traffic, timing, carState, drivingStyle, lastFrame
        );

        return {
            corners,
            traffic,
            timing,
            carState,
            drivingStyle,
            recommendations,
        };
    }

    // ============================================
    // ANÁLISIS DE CURVAS
    // ============================================

    private analyzeCorners(frames: TelemetryFrame[]): CornerAnalysis[] {
        const corners: CornerAnalysis[] = [];

        let inCorner = false;
        let cornerStart = 0;
        let minSpeed = Infinity;
        let maxSteering = 0;
        let entrySpeed = 0;
        let brakePoint = 0;
        let throttlePoint = 0;
        let hasTrailBraking = false;
        let hasUndersteer = false;
        let hasOversteer = false;
        let hasWheelSpin = false;
        let hasLockup = false;

        for (let i = 1; i < frames.length; i++) {
            const prev = frames[i - 1];
            const curr = frames[i];

            const steering = Math.abs(curr.physics?.steeringAngle ?? 0);
            const speed = curr.powertrain?.speedKph ?? 0;
            const brake = (curr.powertrain?.brake ?? 0) * 100;
            const throttle = (curr.powertrain?.throttle ?? 0) * 100;
            const lapDistPct = (curr as any).session?.lapDistPct ?? 0;
            const lateralG = Math.abs(curr.physics?.lateralG ?? 0);
            const yawRate = Math.abs(curr.physics?.yawRate ?? 0);

            // Detectar entrada a curva (ángulo de volante > 0.15 rad ≈ 8.5°)
            if (!inCorner && steering > 0.15) {
                inCorner = true;
                cornerStart = i;
                entrySpeed = speed;
                minSpeed = speed;
                maxSteering = steering;
                brakePoint = lapDistPct;
                hasTrailBraking = false;
                hasUndersteer = false;
                hasOversteer = false;
            }

            if (inCorner) {
                minSpeed = Math.min(minSpeed, speed);
                maxSteering = Math.max(maxSteering, steering);

                // Trail braking: frenando mientras gira
                if (brake > 20 && steering > 0.1) {
                    hasTrailBraking = true;
                }

                // Subviraje: mucho volante, poca G lateral, poco yaw rate
                if (steering > 0.3 && lateralG < 0.8 && speed > 80) {
                    hasUndersteer = true;
                }

                // Sobreviraje: yaw rate alto relativo al volante
                if (yawRate > 0.5 && steering < 0.2 && speed > 60) {
                    hasOversteer = true;
                }

                // Patinaje en aceleración
                if (throttle > 80 && yawRate > 0.3 && speed < 120) {
                    hasWheelSpin = true;
                }

                // Donde acelera (primer throttle > 50%)
                if (throttle > 50 && throttlePoint === 0) {
                    throttlePoint = lapDistPct;
                }

                // Salida de curva
                if (steering < 0.1) {
                    corners.push({
                        lapDistPct: (frames[cornerStart] as any).session?.lapDistPct ?? 0,
                        entrySpeed,
                        apexSpeed: minSpeed,
                        exitSpeed: speed,
                        entrySteeringAngle: frames[cornerStart].physics?.steeringAngle ?? 0,
                        maxSteeringAngle: maxSteering,
                        brakePoint,
                        throttlePoint,
                        trailBraking: hasTrailBraking,
                        understeer: hasUndersteer,
                        oversteer: hasOversteer,
                        wheelSpin: hasWheelSpin,
                        lockup: hasLockup,
                        timeInCorner: (i - cornerStart) * (1000 / 60),  // Asumiendo 60fps
                    });

                    inCorner = false;
                    throttlePoint = 0;
                }
            }
        }

        return corners;
    }

    // ============================================
    // ANÁLISIS DE TRÁFICO
    // ============================================

    private analyzeTraffic(frames: TelemetryFrame[], lastFrame: TelemetryFrame): TrafficAnalysis {
        const carLeftRight = lastFrame.traffic?.carLeftRight ?? 0;
        const allCars = (lastFrame as any).allCars;
        const playerIdx = lastFrame.player?.carIdx ?? 0;
        const flags = lastFrame.flags?.sessionFlags ?? 0;

        // Decodificar CarLeftRight
        // 0=off, 1=clear, 2=left, 3=right, 4=left+right, 5=2cars left, 6=2cars right
        const carLeft = carLeftRight >= 2 && carLeftRight !== 3;
        const carRight = carLeftRight === 3 || carLeftRight === 4 || carLeftRight === 6;

        // Calcular gaps usando allCars (si está disponible)
        let gapToCarAhead: number | null = null;
        let gapToCarBehind: number | null = null;
        let beingPressured = false;
        let catchingCar = false;

        if (allCars?.position && allCars?.estTime) {
            const myPosition = lastFrame.player?.position ?? 0;
            const myEstTime = allCars.estTime[playerIdx] ?? 0;

            // Buscar auto adelante y atrás
            for (let i = 0; i < 64; i++) {
                if (i === playerIdx) continue;
                const pos = allCars.position[i];
                if (pos === myPosition - 1) {
                    // Auto adelante
                    const theirTime = allCars.estTime[i] ?? 0;
                    gapToCarAhead = Math.abs(theirTime - myEstTime);
                } else if (pos === myPosition + 1) {
                    // Auto atrás
                    const theirTime = allCars.estTime[i] ?? 0;
                    gapToCarBehind = Math.abs(theirTime - myEstTime);
                }
            }
        }

        // ¿Presionado?
        if (gapToCarBehind !== null && gapToCarBehind < 1.0) {
            beingPressured = true;
        }

        // ¿Alcanzando?
        if (gapToCarAhead !== null && gapToCarAhead < 2.0) {
            // Comparar con frames anteriores para ver si se acerca
            const earlierFrame = frames[Math.floor(frames.length / 2)];
            const earlierAllCars = (earlierFrame as any).allCars;
            if (earlierAllCars?.estTime) {
                const earlierGap = Math.abs((earlierAllCars.estTime[playerIdx] ?? 0) -
                    (earlierAllCars.estTime.find((_: any, i: number) =>
                        earlierAllCars.position[i] === (lastFrame.player?.position ?? 0) - 1) ?? 0));
                if (gapToCarAhead < earlierGap) {
                    catchingCar = true;
                }
            }
        }

        // Bandera azul (flag bit 0x40000000)
        const blueFlag = (flags & 0x40000000) !== 0;

        return {
            carAhead: gapToCarAhead !== null && gapToCarAhead < 5,
            carBehind: gapToCarBehind !== null && gapToCarBehind < 5,
            carLeft,
            carRight,
            gapToCarAhead,
            gapToCarBehind,
            beingPressured,
            catchingCar,
            inBattle: (carLeft || carRight) || (gapToCarAhead !== null && gapToCarAhead < 1),
            blueFlag,
        };
    }

    // ============================================
    // ANÁLISIS DE TIEMPOS
    // ============================================

    private analyzeTiming(frames: TelemetryFrame[], lastFrame: TelemetryFrame): TimingAnalysis {
        const lapTimes = lastFrame.lapTimes;
        const lapDeltas = (lastFrame as any).lapDeltas;
        const session = lastFrame.session;

        const currentLapTime = lapTimes?.current ?? 0;
        const lastLapTime = lapTimes?.last ?? 0;
        const bestLapTime = lapTimes?.best ?? 0;

        const deltaToBest = lapDeltas?.deltaToBest ?? (lastLapTime - bestLapTime);
        const deltaToLast = currentLapTime - lastLapTime;

        // ¿Mejorando?
        const improving = deltaToBest < 0 || (lapDeltas?.deltaToBestOK && deltaToBest < 0.5);

        // ¿Consistente? (últimas vueltas dentro de 1 segundo)
        const consistent = Math.abs(lastLapTime - bestLapTime) < 1.0;

        // Tendencia de sector
        let sectorTrend: 'faster' | 'slower' | 'same' = 'same';
        if (deltaToBest < -0.3) sectorTrend = 'faster';
        else if (deltaToBest > 0.3) sectorTrend = 'slower';

        return {
            currentLapTime,
            lastLapTime,
            bestLapTime,
            deltaToBest,
            deltaToLast,
            improving,
            consistent,
            sectorTrend,
            estimatedLapTime: currentLapTime > 0 ? currentLapTime / ((session as any)?.lapDistPct ?? 0.5) : null,
            lapsRemaining: session?.sessionLapsRemain ?? null,
        };
    }

    // ============================================
    // ANÁLISIS DE ESTADO DEL AUTO
    // ============================================

    private analyzeCarState(frames: TelemetryFrame[], lastFrame: TelemetryFrame, summary: WindowSummary): CarStateAnalysis {
        const temps = lastFrame.temps;
        const fuel = lastFrame.fuel;
        const session = lastFrame.session;
        const tyreWear = (lastFrame as any).tyreWear;

        // Neumáticos - temperatura
        const avgTyreTemp = summary.avgTyreTemps.reduce((a, b) => a + b, 0) / 4;
        let tyreTemps: 'cold' | 'optimal' | 'hot' | 'overheating' = 'optimal';
        if (avgTyreTemp < 70) tyreTemps = 'cold';
        else if (avgTyreTemp > 100) tyreTemps = 'overheating';
        else if (avgTyreTemp > 90) tyreTemps = 'hot';

        // Balance de temperatura (front vs rear)
        const frontAvg = (summary.avgTyreTemps[0] + summary.avgTyreTemps[1]) / 2;
        const rearAvg = (summary.avgTyreTemps[2] + summary.avgTyreTemps[3]) / 2;
        let tyreBalance: 'balanced' | 'front_hot' | 'rear_hot' = 'balanced';
        if (frontAvg - rearAvg > 10) tyreBalance = 'front_hot';
        else if (rearAvg - frontAvg > 10) tyreBalance = 'rear_hot';

        // Condición de neumáticos (usando desgaste si está disponible)
        let tyreCondition: 'good' | 'worn' | 'critical' = 'good';
        if (tyreWear) {
            const avgWear = [
                tyreWear.LF?.[1] ?? 100,
                tyreWear.RF?.[1] ?? 100,
                tyreWear.LR?.[1] ?? 100,
                tyreWear.RR?.[1] ?? 100,
            ].reduce((a, b) => a + b, 0) / 4;

            if (avgWear < 30) tyreCondition = 'critical';
            else if (avgWear < 60) tyreCondition = 'worn';
        }

        // Motor
        const waterTemp = summary.avgWaterTemp;
        let engineTemp: 'cold' | 'optimal' | 'hot' | 'overheating' = 'optimal';
        if (waterTemp < 70) engineTemp = 'cold';
        else if (waterTemp > 110) engineTemp = 'overheating';
        else if (waterTemp > 100) engineTemp = 'hot';

        const oilTemp = summary.avgOilTemp;
        let oilTempState: 'cold' | 'optimal' | 'hot' = 'optimal';
        if (oilTemp < 80) oilTempState = 'cold';
        else if (oilTemp > 120) oilTempState = 'hot';

        // Combustible
        const fuelLevel = fuel?.level ?? 0;
        const fuelPct = (fuel?.levelPct ?? 0) * 100;
        let fuelState: 'plenty' | 'ok' | 'low' | 'critical' = 'plenty';
        if (fuelPct < 5) fuelState = 'critical';
        else if (fuelPct < 15) fuelState = 'low';
        else if (fuelPct < 40) fuelState = 'ok';

        // Consumo por vuelta (estimación)
        const fuelPerLap = summary.fuelUsed * 2;  // Estimación basada en 30s ≈ media vuelta
        const lapsOfFuelRemaining = fuelPerLap > 0 ? Math.floor(fuelLevel / fuelPerLap) : null;

        // Incidentes
        const incidentCount = session?.incidents ?? 0;
        const hasIncidents = summary.incidentsDelta > 0;

        return {
            tyreCondition,
            tyreTemps,
            tyreBalance,
            tyrePressure: 'optimal',  // Necesitaría más datos para evaluar
            engineTemp,
            oilTemp: oilTempState,
            fuelLevel: fuelState,
            fuelPerLap,
            lapsOfFuelRemaining,
            hasIncidents,
            incidentCount,
        };
    }

    // ============================================
    // ANÁLISIS DE ESTILO DE MANEJO
    // ============================================

    private analyzeDrivingStyle(frames: TelemetryFrame[], summary: WindowSummary): DrivingStyleAnalysis {
        // Frenado
        let brakingStyle: 'early' | 'late' | 'optimal' = 'optimal';
        if (summary.hardBrakingEvents > 10) brakingStyle = 'late';
        else if (summary.avgBrakePct < 30 && summary.maxBrakePct < 80) brakingStyle = 'early';

        let brakePressure: 'light' | 'moderate' | 'heavy' = 'moderate';
        if (summary.maxBrakePct > 95) brakePressure = 'heavy';
        else if (summary.maxBrakePct < 70) brakePressure = 'light';

        // Trail braking (detectar si frena mientras gira)
        let trailBrakingCount = 0;
        for (const f of frames) {
            const brake = (f.powertrain?.brake ?? 0) * 100;
            const steering = Math.abs(f.physics?.steeringAngle ?? 0);
            if (brake > 20 && steering > 0.1) trailBrakingCount++;
        }
        let trailBrakingUsage: 'none' | 'some' | 'good' = 'none';
        const trailPct = (trailBrakingCount / frames.length) * 100;
        if (trailPct > 5) trailBrakingUsage = 'good';
        else if (trailPct > 2) trailBrakingUsage = 'some';

        // Acelerador
        let throttleApplication: 'smooth' | 'aggressive' | 'jerky' = 'smooth';
        if (summary.liftCount > 20) throttleApplication = 'jerky';
        else if (summary.fullThrottlePct > 60) throttleApplication = 'aggressive';

        // Lift and coast (detectar aceleración parcial)
        let liftAndCoast = false;
        let partialThrottleCount = 0;
        for (const f of frames) {
            const throttle = (f.powertrain?.throttle ?? 0) * 100;
            if (throttle > 20 && throttle < 80) partialThrottleCount++;
        }
        if ((partialThrottleCount / frames.length) > 0.1) liftAndCoast = true;

        // Volante
        let steeringInputs: 'smooth' | 'busy' | 'corrections' = 'smooth';
        if (summary.correctionCount > 15) steeringInputs = 'corrections';
        else if (summary.correctionCount > 8) steeringInputs = 'busy';

        return {
            brakingStyle,
            brakePressure,
            trailBrakingUsage,
            throttleApplication,
            fullThrottlePercent: summary.fullThrottlePct,
            liftAndCoast,
            steeringInputs,
            counterSteerEvents: summary.correctionCount,
            usingAllTrack: summary.maxLateralG > 1.5,
            cuttingCorners: false,  // Necesitaría datos de track limits
            runningWide: false,
        };
    }

    // ============================================
    // GENERACIÓN DE RECOMENDACIONES
    // ============================================

    private generateRecommendations(
        corners: CornerAnalysis[],
        traffic: TrafficAnalysis,
        timing: TimingAnalysis,
        carState: CarStateAnalysis,
        drivingStyle: DrivingStyleAnalysis,
        lastFrame: TelemetryFrame
    ): Recommendation[] {
        const recs: Recommendation[] = [];

        // === TRÁFICO (prioridad alta) ===

        if (traffic.blueFlag) {
            recs.push({
                priority: 10,
                category: 'traffic',
                message: 'Bandera azul, dejá pasar al líder cuando puedas.',
            });
        }

        if (traffic.inBattle && (traffic.carLeft || traffic.carRight)) {
            recs.push({
                priority: 9,
                category: 'traffic',
                message: traffic.carLeft ? 'Auto a la izquierda, cuidado.' : 'Auto a la derecha, ojo.',
            });
        }

        if (traffic.beingPressured && !traffic.inBattle) {
            recs.push({
                priority: 7,
                category: 'traffic',
                message: 'Te presionan atrás, mantené la calma y tu línea.',
            });
        }

        if (traffic.catchingCar && traffic.gapToCarAhead && traffic.gapToCarAhead < 2) {
            recs.push({
                priority: 6,
                category: 'traffic',
                message: `Alcanzando al de adelante, gap ${traffic.gapToCarAhead.toFixed(1)} segundos.`,
            });
        }

        // === ESTADO DEL AUTO (prioridad alta) ===

        if (carState.fuelLevel === 'critical') {
            recs.push({
                priority: 10,
                category: 'car',
                message: 'Combustible crítico, entrá a boxes ya.',
            });
        }

        if (carState.fuelLevel === 'low' && carState.lapsOfFuelRemaining !== null && carState.lapsOfFuelRemaining < 3) {
            recs.push({
                priority: 8,
                category: 'strategy',
                message: `Quedan ${carState.lapsOfFuelRemaining} vueltas de combustible, planificá la parada.`,
            });
        }

        if (carState.engineTemp === 'overheating') {
            recs.push({
                priority: 9,
                category: 'car',
                message: 'Motor sobrecalentado, levantá un poco para enfriarlo.',
            });
        }

        if (carState.tyreTemps === 'cold') {
            recs.push({
                priority: 7,
                category: 'car',
                message: 'Neumáticos fríos, calentálos antes de atacar.',
            });
        }

        if (carState.tyreTemps === 'overheating') {
            recs.push({
                priority: 7,
                category: 'car',
                message: 'Neumáticos muy calientes, bajá el ritmo una vuelta.',
            });
        }

        if (carState.tyreCondition === 'critical') {
            recs.push({
                priority: 8,
                category: 'strategy',
                message: 'Neumáticos muy gastados, considerá entrar a boxes.',
            });
        }

        if (carState.hasIncidents) {
            recs.push({
                priority: 6,
                category: 'safety',
                message: 'Sumaste incidentes, bajá un cambio y concentrate.',
            });
        }

        // === TÉCNICA DE MANEJO ===

        // Curvas con problemas
        const understeerCorners = corners.filter(c => c.understeer);
        if (understeerCorners.length > 0) {
            recs.push({
                priority: 6,
                category: 'technique',
                message: 'Detecté subviraje, probá frenar un poco antes y girar menos.',
            });
        }

        const oversteerCorners = corners.filter(c => c.oversteer);
        if (oversteerCorners.length > 0) {
            recs.push({
                priority: 6,
                category: 'technique',
                message: 'Detecté sobreviraje, suavizá el acelerador a la salida.',
            });
        }

        const wheelSpinCorners = corners.filter(c => c.wheelSpin);
        if (wheelSpinCorners.length > 1) {
            recs.push({
                priority: 5,
                category: 'technique',
                message: 'Patinás al acelerar, aplicá el gas más progresivo.',
            });
        }

        // Trail braking
        if (drivingStyle.trailBrakingUsage === 'none' && corners.length > 2) {
            recs.push({
                priority: 4,
                category: 'technique',
                message: 'Probá trail braking, mantené el freno mientras girás para mejor rotación.',
            });
        }

        // Frenadas
        if (drivingStyle.brakingStyle === 'late') {
            recs.push({
                priority: 5,
                category: 'technique',
                message: 'Frenás muy tarde, perdés tiempo en las curvas. Adelantá el frenado.',
            });
        }

        if (drivingStyle.brakingStyle === 'early') {
            recs.push({
                priority: 4,
                category: 'technique',
                message: 'Podés frenar más tarde, estás dejando tiempo en la mesa.',
            });
        }

        // Correcciones de volante
        if (drivingStyle.steeringInputs === 'corrections') {
            recs.push({
                priority: 5,
                category: 'technique',
                message: 'Muchas correcciones de volante, buscá una línea más limpia.',
            });
        }

        // Acelerador
        if (drivingStyle.throttleApplication === 'jerky') {
            recs.push({
                priority: 4,
                category: 'technique',
                message: 'Acelerador brusco, suavizá las transiciones on-off.',
            });
        }

        // === TIEMPOS ===

        if (timing.improving && timing.deltaToBest < -0.5) {
            recs.push({
                priority: 3,
                category: 'technique',
                message: '¡Buen ritmo! Venís mejorando, mantenelo.',
            });
        }

        if (!timing.consistent && Math.abs(timing.deltaToLast) > 1.5) {
            recs.push({
                priority: 4,
                category: 'technique',
                message: 'Tiempos inconsistentes, enfocate en repetir las mismas líneas.',
            });
        }

        // Ordenar por prioridad
        recs.sort((a, b) => b.priority - a.priority);

        return recs;
    }

    // ============================================
    // HELPERS
    // ============================================

    private emptyResult(): AdvancedAnalysisResult {
        return {
            corners: [],
            traffic: {
                carAhead: false, carBehind: false, carLeft: false, carRight: false,
                gapToCarAhead: null, gapToCarBehind: null,
                beingPressured: false, catchingCar: false, inBattle: false, blueFlag: false,
            },
            timing: {
                currentLapTime: 0, lastLapTime: 0, bestLapTime: 0,
                deltaToBest: 0, deltaToLast: 0,
                improving: false, consistent: false, sectorTrend: 'same',
                estimatedLapTime: null, lapsRemaining: null,
            },
            carState: {
                tyreCondition: 'good', tyreTemps: 'optimal', tyreBalance: 'balanced', tyrePressure: 'optimal',
                engineTemp: 'optimal', oilTemp: 'optimal',
                fuelLevel: 'plenty', fuelPerLap: 0, lapsOfFuelRemaining: null,
                hasIncidents: false, incidentCount: 0,
            },
            drivingStyle: {
                brakingStyle: 'optimal', brakePressure: 'moderate', trailBrakingUsage: 'none',
                throttleApplication: 'smooth', fullThrottlePercent: 0, liftAndCoast: false,
                steeringInputs: 'smooth', counterSteerEvents: 0,
                usingAllTrack: false, cuttingCorners: false, runningWide: false,
            },
            recommendations: [],
        };
    }
}
