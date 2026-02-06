import { TelemetryRule } from './telemetry-rules-engine';
import { SUSPENSION_RULES } from './rules/suspension-rules.js';
import { AERO_RULES } from './rules/aero-rules.js';
import { ADVANCED_RULES } from './rules/advanced-rules.js';

/**
 * 80+ REGLAS DE ANÁLISIS DE TELEMETRÍA - INGENIERO DE CARRERAS
 * Motor de evaluación avanzado para conducción en SimRacing
 * TODAS LAS REGLAS INCLUYEN VALIDACIÓN DEFENSIVA DE DATOS
 */
export const TELEMETRY_RULES: TelemetryRule[] = [
    // Include Phase 6 Rules (Pro Engineer)
    ...ADVANCED_RULES,
    // Include Phase 5 Rules
    ...SUSPENSION_RULES,
    ...AERO_RULES,

    // ========================================
    // CATEGORÍA 1: TÉCNICA DE PEDALES
    // ========================================

    {
        id: 'throttle-punch',
        category: 'technique',
        priority: 7,
        condition: (d) => {
            if (!d.patterns || d.patterns.throttleChanges === undefined) return false;
            return d.patterns.throttleChanges > 20;
        },
        advice: 'Entrada de potencia muy brusca, aplicá el acelerador más gradual',
        cooldown: 40
    },

    {
        id: 'pedal-fidgeting',
        category: 'technique',
        priority: 6,
        condition: (d) => {
            if (!d.patterns || d.patterns.throttleChanges === undefined || d.patterns.hardBrakingCount === undefined) return false;
            return d.patterns.throttleChanges > 15 && d.patterns.hardBrakingCount > 5;
        },
        advice: 'Demasiado movimiento en los pedales, suavizá las transiciones',
        cooldown: 45
    },

    {
        id: 'brake-riding',
        category: 'technique',
        priority: 8,
        condition: (d) => {
            if (!d.current?.powertrain) return false;
            const throttle = d.current.powertrain.throttle ?? 0;
            const brake = d.current.powertrain.brake ?? 0;
            return throttle > 0.3 && brake > 0.1;
        },
        advice: 'Estás pisando freno y acelerador al mismo tiempo, es ineficiente',
        cooldown: 30
    },

    {
        id: 'soft-braking',
        category: 'technique',
        priority: 5,
        condition: (d) => {
            if (!d.patterns || d.patterns.hardBrakingCount === undefined || !d.averages || d.averages.speed === undefined) return false;
            return d.patterns.hardBrakingCount < 2 && d.averages.speed > 60;
        },
        advice: 'Frenadas muy suaves, metele más presión inicial',
        cooldown: 50
    },

    {
        id: 'brake-stomp',
        category: 'technique',
        priority: 7,
        condition: (d) => {
            if (!d.patterns || d.patterns.hardBrakingCount === undefined) return false;
            return d.patterns.hardBrakingCount > 8;
        },
        advice: 'Frenadas muy bruscas, graduar mejor la presión del pedal',
        cooldown: 40
    },

    {
        id: 'lazy-throttle',
        category: 'technique',
        priority: 6,
        condition: (d) => {
            if (!d.averages || d.averages.throttle === undefined || d.averages.speed === undefined) return false;
            const throttle = d.averages.throttle;
            return throttle < 50 && d.averages.speed > 70;
        },
        advice: 'Estás demorando mucho en acelerar después del apex, dale antes',
        cooldown: 45
    },

    {
        id: 'coasting-too-much',
        category: 'technique',
        priority: 5,
        condition: (d) => {
            if (!d.averages || d.averages.throttle === undefined || d.averages.speed === undefined) return false;
            if (!d.current?.powertrain || d.current.powertrain.brake === undefined) return false;
            const throttle = d.averages.throttle;
            const brake = d.current.powertrain.brake;
            return throttle < 10 && brake < 0.1 && d.averages.speed > 40;
        },
        advice: 'Estás yendo mucho en vacío, perdés tiempo sin acelerar ni frenar',
        cooldown: 50
    },

    {
        id: 'throttle-overlap',
        category: 'technique',
        priority: 7,
        condition: (d) => {
            if (!d.patterns || d.patterns.throttleChanges === undefined) return false;
            return d.patterns.throttleChanges > 25;
        },
        advice: 'Levantás mucho el acelerador en los cambios, perdés potencia',
        cooldown: 45
    },

    {
        id: 'unfinished-braking',
        category: 'technique',
        priority: 6,
        condition: (d) => {
            if (!d.patterns || d.patterns.hardBrakingCount === undefined || d.patterns.throttleChanges === undefined) return false;
            return d.patterns.hardBrakingCount > 3 && d.patterns.throttleChanges < 5;
        },
        advice: 'Te falta trail braking, soltá el freno gradual mientras girás',
        cooldown: 50
    },

    {
        id: 'brake-inconsistency',
        category: 'technique',
        priority: 5,
        condition: (d) => {
            if (!d.patterns || d.patterns.hardBrakingCount === undefined) return false;
            return Math.abs(d.patterns.hardBrakingCount - 5) < 2;
        },
        advice: 'Frenadas inconsistentes, buscá puntos de referencia fijos',
        cooldown: 55
    },

    // ========================================
    // CATEGORÍA 2: TRANSMISIÓN Y MOTOR
    // ========================================

    {
        id: 'redline-hanging',
        category: 'engine',
        priority: 8,
        condition: (d) => {
            if (!d.current?.powertrain || d.current.powertrain.rpm === undefined) return false;
            return d.current.powertrain.rpm > 7500;
        },
        advice: 'Estás colgado del limitador, cambiá antes para mantener potencia',
        cooldown: 25
    },

    {
        id: 'early-short-shift',
        category: 'engine',
        priority: 5,
        condition: (d) => {
            if (!d.current?.powertrain || d.current.powertrain.rpm === undefined || d.current.powertrain.gear === undefined) return false;
            return d.current.powertrain.rpm < 5000 && d.current.powertrain.gear > 3;
        },
        advice: 'Cambios muy prematuros, aprovechá más el rango de RPM',
        cooldown: 40
    },

    {
        id: 'engine-braking-risk',
        category: 'engine',
        priority: 7,
        condition: (d) => {
            if (!d.current?.powertrain || d.current.powertrain.rpm === undefined || d.current.powertrain.brake === undefined) return false;
            return d.current.powertrain.rpm > 7000 && d.current.powertrain.brake > 0.5;
        },
        advice: 'Mucho freno motor, cuidado con romper el cambio',
        cooldown: 30
    },

    {
        id: 'neutral-driving',
        category: 'engine',
        priority: 6,
        condition: (d) => {
            if (!d.current?.powertrain || d.current.powertrain.gear === undefined) return false;
            if (!d.averages || d.averages.speed === undefined) return false;
            return d.current.powertrain.gear === 0 && d.averages.speed > 20;
        },
        advice: 'Estás en punto muerto andando, enganchá una marcha',
        cooldown: 35
    },

    {
        id: 'slow-shifts',
        category: 'technique',
        priority: 4,
        condition: (d) => {
            if (!d.patterns || d.patterns.throttleChanges === undefined) return false;
            return d.patterns.throttleChanges > 18;
        },
        advice: 'Cambios muy lentos, practicá la velocidad de palanca',
        cooldown: 50
    },

    {
        id: 'wrong-gear-slow-corner',
        category: 'engine',
        priority: 5,
        condition: (d) => {
            if (!d.current?.powertrain || d.current.powertrain.gear === undefined || d.current.powertrain.speedKph === undefined) return false;
            const gear = d.current.powertrain.gear;
            const speed = d.current.powertrain.speedKph;
            return gear > 4 && speed < 60;
        },
        advice: 'Marcha muy larga para curva lenta, bajá una más',
        cooldown: 40
    },

    {
        id: 'no-rev-match',
        category: 'technique',
        priority: 6,
        condition: (d) => {
            if (!d.current?.powertrain || d.current.powertrain.rpm === undefined || d.current.powertrain.gear === undefined) return false;
            const rpm = d.current.powertrain.rpm;
            return rpm < 4000 && d.current.powertrain.gear < 4;
        },
        advice: 'No estás haciendo punta-tacón, igualá las RPM en la bajada',
        cooldown: 45
    },

    {
        id: 'engine-warnings-detected',
        category: 'engine',
        priority: 10,
        condition: (d) => {
            if (!d.current || d.current.engineWarnings === undefined) return false;
            return d.current.engineWarnings === 128;
        },
        advice: '¡Warning del motor detectado! Revisá la telemetría',
        cooldown: 20
    },

    // ========================================
    // CATEGORÍA 3: NEUMÁTICOS
    // ========================================

    {
        id: 'tyres-too-cold',
        category: 'tyres',
        priority: 7,
        condition: (d) => {
            if (!d.current?.temps?.tyreC || d.current.temps.tyreC.length === 0) return false;
            const tyreTemps = d.current.temps.tyreC;
            const avgTemp = tyreTemps.reduce((a, b) => a + b, 0) / tyreTemps.length;
            return avgTemp < 55 && avgTemp > 0;
        },
        advice: 'Gomas muy frías (menos de 55°C), hacé serpentinas',
        cooldown: 40
    },

    {
        id: 'tyres-overheating',
        category: 'tyres',
        priority: 8,
        condition: (d) => {
            if (!d.current?.temps?.tyreC || d.current.temps.tyreC.length === 0) return false;
            const tyreTemps = d.current.temps.tyreC;
            return tyreTemps.some(t => t > 100);
        },
        advice: 'Neumáticos sobrecalentados (>100°C), reducí agresividad',
        cooldown: 30
    },

    {
        id: 'thermal-imbalance-lr',
        category: 'tyres',
        priority: 6,
        condition: (d) => {
            if (!d.current?.temps?.tyreC || d.current.temps.tyreC.length < 4) return false;
            const tyreTemps = d.current.temps.tyreC;
            const leftAvg = (tyreTemps[0] + tyreTemps[2]) / 2;
            const rightAvg = (tyreTemps[1] + tyreTemps[3]) / 2;
            return Math.abs(leftAvg - rightAvg) > 15;
        },
        advice: 'Desbalance térmico izquierda/derecha en gomas, revisá setup',
        cooldown: 50
    },

    {
        id: 'thermal-imbalance-fb',
        category: 'tyres',
        priority: 6,
        condition: (d) => {
            if (!d.current?.temps?.tyreC || d.current.temps.tyreC.length < 4) return false;
            const tyreTemps = d.current.temps.tyreC;
            const frontAvg = (tyreTemps[0] + tyreTemps[1]) / 2;
            const rearAvg = (tyreTemps[2] + tyreTemps[3]) / 2;
            return Math.abs(frontAvg - rearAvg) > 20;
        },
        advice: 'Desbalance térmico delantero/trasero, ajustá balance aerodinámico',
        cooldown: 50
    },

    {
        id: 'brake-fade',
        category: 'brakes',
        priority: 9,
        condition: (d) => {
            if (!d.current?.temps?.brakeC || d.current.temps.brakeC.length === 0) return false;
            const brakeTemps = d.current.temps.brakeC;
            return brakeTemps.some(t => t > 400);
        },
        advice: 'Frenos a más de 400°C, peligro de fatiga por calor',
        cooldown: 30
    },

    // ========================================
    // CATEGORÍA 4: MOTOR (TEMPERATURA)
    // ========================================

    {
        id: 'cold-engine-stress',
        category: 'engine',
        priority: 7,
        condition: (d) => {
            if (!d.current?.temps || d.current.temps.oilC === undefined) return false;
            if (!d.current?.powertrain || d.current.powertrain.rpm === undefined) return false;
            const oilC = d.current.temps.oilC;
            const rpm = d.current.powertrain.rpm;
            return oilC < 70 && rpm > 6000;
        },
        advice: 'Motor frío con mucha exigencia, cuidado que el aceite está frío',
        cooldown: 35
    },

    {
        id: 'water-overheating',
        category: 'engine',
        priority: 9,
        condition: (d) => {
            if (!d.current?.temps || d.current.temps.waterC === undefined) return false;
            return d.current.temps.waterC > 105;
        },
        advice: 'Temperatura de agua crítica (>105°C), levantá que se recalienta',
        cooldown: 30
    },

    // ========================================
    // CATEGORÍA 5: RENDIMIENTO Y CONSISTENCIA
    // ========================================

    {
        id: 'top-speed-inconsistency',
        category: 'technique',
        priority: 5,
        condition: (d) => {
            if (!d.averages || d.averages.speed === undefined) return false;
            if (!d.patterns || d.patterns.throttleChanges === undefined) return false;
            const speed = d.averages.speed;
            return speed > 0 && Math.abs(speed - 150) < 20 && d.patterns.throttleChanges > 12;
        },
        advice: 'Velocidad de punta inconsistente, mantené el gas a fondo en recta',
        cooldown: 50
    },

    {
        id: 'erratic-speed-variation',
        category: 'technique',
        priority: 6,
        condition: (d) => {
            if (!d.patterns || d.patterns.throttleChanges === undefined) return false;
            if (!d.averages || d.averages.speed === undefined) return false;
            return d.patterns.throttleChanges > 18 && d.averages.speed > 80;
        },
        advice: 'Variaciones erráticas de velocidad en recta, suavizá',
        cooldown: 45
    },

    // ========================================
    // CATEGORÍA 6: COMBUSTIBLE Y ESTRATEGIA
    // ========================================

    {
        id: 'inefficient-fuel-consumption',
        category: 'strategy',
        priority: 5,
        condition: (d) => {
            if (!d.current?.fuel || d.current.fuel.usePerHour === undefined) return false;
            const fuelUse = d.current.fuel.usePerHour;
            return fuelUse > 50;
        },
        advice: 'Consumo de combustible ineficiente, levantá antes de frenar',
        cooldown: 60
    },

    {
        id: 'fuel-critical-low',
        category: 'strategy',
        priority: 9,
        condition: (d) => {
            if (!d.current?.fuel || d.current.fuel.level === undefined) return false;
            const fuelLevel = d.current.fuel.level;
            return fuelLevel < 5 && fuelLevel > 0;
        },
        advice: '¡Menos de 5 litros de nafta! Entrá a boxes o gestioná',
        cooldown: 25
    },

    {
        id: 'stalling-risk',
        category: 'engine',
        priority: 10,
        condition: (d) => {
            if (!d.current?.powertrain || d.current.powertrain.rpm === undefined || d.current.powertrain.speedKph === undefined) return false;
            const rpm = d.current.powertrain.rpm;
            const speed = d.current.powertrain.speedKph;
            return rpm < 1500 && speed > 5;
        },
        advice: '¡Riesgo de calado! RPM muy bajas, bajá de marcha o acelerá',
        cooldown: 15
    },

    // ========================================
    // CATEGORÍA 7: AYUDAS Y AMBIENTE (NEW)
    // ========================================

    {
        id: 'abs-heavy-usage',
        category: 'technique',
        priority: 6,
        condition: (d) => {
            if (!d.current?.carControls?.absActive) return false;
            // Solo si ABS está activo y frenando fuerte
            return d.current.carControls.absActive && (d.current.powertrain?.brake || 0) > 0.8;
        },
        advice: 'Estás abusando del ABS, frená más suave en la entrada',
        cooldown: 20
    },

    {
        id: 'tc-heavy-usage',
        category: 'technique',
        priority: 6,
        condition: (d) => {
            if (!d.current?.carControls?.tcActive) return false;
            // Solo si TC está activo y acelerando fuerte
            return d.current.carControls.tcActive && (d.current.powertrain?.throttle || 0) > 0.8;
        },
        advice: 'El control de tracción está cortando, gestioná el gas',
        cooldown: 20
    },

    {
        id: 'track-hot',
        category: 'strategy',
        priority: 5,
        condition: (d) => {
            if (!d.current?.temps?.trackC) return false;
            return d.current.temps.trackC > 45;
        },
        advice: 'Pista muy caliente (más de 45°C), cuidá las gomas',
        cooldown: 120 // Aviso muy espaciado
    }
];
