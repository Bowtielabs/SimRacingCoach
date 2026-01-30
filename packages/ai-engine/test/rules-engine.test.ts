/**
 * Test del motor de reglas con telemetría simulada
 */

import { TelemetryRulesEngine } from '../src/telemetry-rules-engine';
import type { TelemetryFrame } from '@simracing/core';

// Escenario 1: Auto pasado de vueltas (RPM alto + aceite caliente)
const scenario1: TelemetryFrame = {
    t: Date.now(),
    sim: 'actc', // Probando con ACTC!
    player: { position: 3, classPosition: 2 },
    traffic: {},
    flags: { sessionFlags: 0 },
    powertrain: {
        speedKph: 180,
        rpm: 7850, // ← MUY ALTO!
        gear: 4,
        throttle: 0.95,
        brake: 0,
        clutch: 0
    },
    temps: {
        waterC: 98,
        oilC: 108, // ← CALIENTE!
        trackC: 35,
        airC: 28,
        tyreC: [92, 94, 88, 90],
        brakeC: [280, 285, 275, 280]
    },
    fuel: {
        level: 15.5,
        levelPct: 0.45,
        usePerHour: 18.2
    },
    physics: {
        steeringAngle: 12,
        lateralG: 0.8,
        longitudinalG: 0.3
    },
    session: {
        onPitRoad: false,
        inGarage: false,
        incidents: 0,
        lap: 8,
        lapsCompleted: 7,
        sessionLapsRemain: 12
    },
    lapTimes: {
        best: 92.5,
        last: 93.2,
        current: 45.8
    }
};

// Escenario 2: Frenos sobrecalentados
const scenario2: TelemetryFrame = {
    t: Date.now(),
    sim: 'iracing',
    player: { position: 5, classPosition: 3 },
    traffic: {},
    flags: { sessionFlags: 0 },
    powertrain: {
        speedKph: 145,
        rpm: 6200,
        gear: 3,
        throttle: 0.65,
        brake: 0.85,
        clutch: 0
    },
    temps: {
        waterC: 92,
        oilC: 95,
        trackC: 32,
        airC: 26,
        tyreC: [88, 90, 86, 87],
        brakeC: [420, 425, 415, 418] // ← CRÍTICO!
    },
    fuel: {
        levelPct: 0.65
    },
    physics: {
        steeringAngle: 5,
        lateralG: 0.4,
        longitudinalG: -1.2 // Frenando fuerte
    },
    session: {
        lap: 5
    },
    lapTimes: {
        best: 88.3,
        last: 88.9
    }
};

// Escenario 3: Perdiendo tiempo
const scenario3: TelemetryFrame = {
    t: Date.now(),
    sim: 'acc',
    player: { position: 8 },
    traffic: {},
    flags: { sessionFlags: 0 },
    powertrain: {
        speedKph: 160,
        rpm: 6800,
        gear: 4,
        throttle: 0.75,
        brake: 0.2
    },
    temps: {
        waterC: 88,
        oilC: 92,
        tyreC: [85, 87, 84, 86],
        brakeC: [320, 325, 315, 318]
    },
    physics: {
        lateralG: 1.1,
        longitudinalG: -0.5
    },
    lapTimes: {
        best: 105.2,
        last: 108.5, // ← 3.3 segundos más lento!
        current: 62.1
    }
};

// Escenario 4: Bandera amarilla con tráfico
const scenario4: TelemetryFrame = {
    t: Date.now(),
    sim: 'rfactor2',
    player: { position: 2 },
    traffic: {
        carLeftRight: 0.2 // ← Auto muy cerca!
    },
    flags: {
        sessionFlags: 0x00000001 // ← Bandera amarilla!
    },
    powertrain: {
        speedKph: 195,
        rpm: 7200,
        gear: 5,
        throttle: 0.88
    },
    temps: {
        waterC: 90,
        oilC: 94,
        tyreC: [90, 92, 88, 89],
        brakeC: [300, 305, 295, 298]
    },
    lapTimes: {
        best: 78.5,
        last: 79.1
    }
};

console.log('🧪 TEST DEL MOTOR DE REGLAS\n');
console.log('═'.repeat(100));

const engine = new TelemetryRulesEngine();

// Test Escenario 1
console.log('\n📊 ESCENARIO 1: Auto pasado de vueltas (ACTC)');
console.log('  RPM: 7850 | Aceite: 108°C | Velocidad: 180 km/h');
const buffer1 = Array(600).fill(scenario1); // Simular 30 segundos
const analysis1 = TelemetryRulesEngine.calculateAnalysis(scenario1, buffer1);
const advice1 = engine.analyze(analysis1);
console.log(`  💬 Consejo: "${advice1}"`);

// Test Escenario 2
console.log('\n📊 ESCENARIO 2: Frenos sobrecalentados (iRacing)');
console.log('  Frenos: 420°C promedio | Frenando: -1.2g');
const buffer2 = Array(600).fill(scenario2);
const analysis2 = TelemetryRulesEngine.calculateAnalysis(scenario2, buffer2);
const advice2 = engine.analyze(analysis2);
console.log(`  💬 Consejo: "${advice2}"`);

// Test Escenario 3
console.log('\n📊 ESCENARIO 3: Perdiendo tiempo (ACC)');
console.log('  Mejor: 105.2s | Última: 108.5s | Delta: +3.3s');
const buffer3 = Array(600).fill(scenario3);
const analysis3 = TelemetryRulesEngine.calculateAnalysis(scenario3, buffer3);
const advice3 = engine.analyze(analysis3);
console.log(`  💬 Consejo: "${advice3}"`);

// Test Escenario 4
console.log('\n📊 ESCENARIO 4: Bandera amarilla + tráfico (rFactor 2)');
console.log('  Bandera: AMARILLA | Auto cerca: 0.2m');
const buffer4 = Array(600).fill(scenario4);
const analysis4 = TelemetryRulesEngine.calculateAnalysis(scenario4, buffer4);
const advice4 = engine.analyze(analysis4);
console.log(`  💬 Consejo: "${advice4}"`);

console.log('\n' + '═'.repeat(100));
console.log('✅ Test completado\n');
