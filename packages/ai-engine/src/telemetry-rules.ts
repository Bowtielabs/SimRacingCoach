import { TelemetryRule } from './telemetry-rules-engine';

/**
 * Definición de reglas de telemetría
 * Agregar nuevas reglas aquí de forma simple
 */
export const TELEMETRY_RULES: TelemetryRule[] = [
    // ========================================
    // SISTEMA - HEARTBEAT (para verificar que funciona)
    // ========================================

    {
        id: 'system-heartbeat',
        category: 'technique',
        priority: 1, // Baja prioridad, solo si no hay otras reglas
        condition: (d) => {
            const speed = d.current.powertrain?.speedKph || 0;
            const onTrack = speed > 50; // Solo cuando está rodando a buena velocidad
            return onTrack;
        },
        advice: 'Sistema de coaching activo. Vamos bien.',
        cooldown: 60 // Solo cada 60 segundos como máximo
    },

    // ========================================
    // MOTOR Y TRANSMISIÓN
    // ========================================

    {
        id: 'engine-overrev-critical',
        category: 'engine',
        priority: 10,
        condition: (d) => (d.current.powertrain?.rpm || 0) > 7800,
        advice: 'RPM muy alto, cambiar marcha YA',
        cooldown: 20
    },

    {
        id: 'oil-critical',
        category: 'engine',
        priority: 9,
        condition: (d) => (d.current.temps?.oilC || 0) > 110,
        advice: 'Aceite a más de 110°C, reducir RPM',
        cooldown: 30
    },

    {
        id: 'water-critical',
        category: 'engine',
        priority: 9,
        condition: (d) => (d.current.temps?.waterC || 0) > 100,
        advice: 'Agua a más de 100°C, revisar refrigeración',
        cooldown: 30
    },

    {
        id: 'engine-overrev-hot',
        category: 'engine',
        priority: 8,
        condition: (d) =>
            (d.current.powertrain?.rpm || 0) > 7200 &&
            (d.current.temps?.oilC || 0) > 100,
        advice: 'RPM alto y aceite caliente, cambiar marcha antes',
        cooldown: 25
    },

    // ========================================
    // FRENOS
    // ========================================

    {
        id: 'brakes-critical',
        category: 'brakes',
        priority: 9,
        condition: (d) => {
            const brakeTemps = d.current.temps?.brakeC || [];
            return brakeTemps.some(t => t > 400);
        },
        advice: 'Frenos a más de 400°C, peligro de falla',
        cooldown: 30
    },

    {
        id: 'brakes-hot',
        category: 'brakes',
        priority: 8,
        condition: (d) => {
            const brakeTemps = d.current.temps?.brakeC || [];
            return brakeTemps.some(t => t > 350);
        },
        advice: 'Frenos a más de 350°C, frenar más suave',
        cooldown: 25
    },

    {
        id: 'braking-too-hard',
        category: 'technique',
        priority: 7,
        condition: (d) => d.patterns.hardBrakingCount > 5,
        advice: 'Muchas frenadas fuertes, frenar más temprano',
        cooldown: 45
    },

    // ========================================
    // NEUMÁTICOS
    // ========================================

    {
        id: 'tyres-cold',
        category: 'tyres',
        priority: 7,
        condition: (d) => {
            const tyreTemps = d.current.temps?.tyreC || [];
            if (tyreTemps.length === 0) return false;
            const avgTemp = tyreTemps.reduce((a, b) => a + b, 0) / tyreTemps.length;
            return avgTemp < 60 && avgTemp > 0;
        },
        advice: 'Neumáticos fríos, calentar con zigzag suave',
        cooldown: 40
    },

    {
        id: 'tyres-hot',
        category: 'tyres',
        priority: 7,
        condition: (d) => {
            const tyreTemps = d.current.temps?.tyreC || [];
            return tyreTemps.some(t => t > 100);
        },
        advice: 'Neumáticos a más de 100°C, reducir agresividad',
        cooldown: 30
    },

    // ========================================
    // TÉCNICA DE MANEJO
    // ========================================

    {
        id: 'losing-time',
        category: 'technique',
        priority: 6,
        condition: (d) => d.lapTimes.delta > 2 && d.lapTimes.best > 0,
        advice: 'Perdiendo 2 segundos por vuelta, revisar frenadas',
        cooldown: 60
    },

    {
        id: 'throttle-aggressive',
        category: 'technique',
        priority: 5,
        condition: (d) => d.patterns.throttleChanges > 20,
        advice: 'Acelerador muy brusco, suavizar aplicación',
        cooldown: 50
    },

    {
        id: 'steering-erratic',
        category: 'technique',
        priority: 5,
        condition: (d) => d.averages.steeringAngle > 30,
        advice: 'Volante muy movido, suavizar entradas',
        cooldown: 50
    },

    // ========================================
    // ESTRATEGIA
    // ========================================

    {
        id: 'fuel-low',
        category: 'strategy',
        priority: 6,
        condition: (d) => {
            const fuelPct = d.current.fuel?.levelPct || 1;
            const lapsRemain = d.current.session?.sessionLapsRemain || 0;
            return fuelPct < 0.10 && lapsRemain > 5;
        },
        advice: 'Combustible bajo, ahorrar o entrar a boxes',
        cooldown: 40
    },

    // ========================================
    // CONDICIONES DE PISTA
    // ========================================

    {
        id: 'flag-yellow',
        category: 'track',
        priority: 9,
        condition: (d) => {
            const flags = d.current.flags?.sessionFlags || 0;
            // irsdk_yellow = 0x00000008, irsdk_caution = 0x00000100
            return (flags & 0x00000108) !== 0;
        },
        advice: 'Bandera amarilla, bajá la velocidad y cuidado.',
        cooldown: 15
    },
    {
        id: 'flag-black',
        category: 'track',
        priority: 10,
        condition: (d) => {
            const flags = d.current.flags?.sessionFlags || 0;
            // irsdk_black = 0x00000080
            return (flags & 0x00000080) !== 0;
        },
        advice: '¡Bandera negra! Tenés una sanción, entrá a boxes.',
        cooldown: 30
    },
    {
        id: 'flag-blue',
        category: 'track',
        priority: 7,
        condition: (d) => {
            const flags = d.current.flags?.sessionFlags || 0;
            // irsdk_blue = 0x00000010
            return (flags & 0x00000010) !== 0;
        },
        advice: 'Bandera azul, dejá pasar al auto de atrás.',
        cooldown: 20
    },
    {
        id: 'flag-meatball',
        category: 'track',
        priority: 10,
        condition: (d) => {
            const flags = d.current.flags?.sessionFlags || 0;
            // irsdk_repair = 0x00002000
            return (flags & 0x00002000) !== 0;
        },
        advice: '¡Bandera técnica! El auto está dañado, entrá a boxes ya.',
        cooldown: 30
    },

    {
        id: 'traffic-close',
        category: 'track',
        priority: 6,
        condition: (d) => {
            const lr = d.current.traffic?.carLeftRight;
            return lr !== undefined && Math.abs(lr) < 0.3;
        },
        advice: 'Auto muy cerca, cuidado al maniobrar',
        cooldown: 10
    }
];
