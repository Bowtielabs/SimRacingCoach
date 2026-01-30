import { TelemetryRule } from './telemetry-rules-engine';

/**
 * Definición de reglas de telemetría
 * Agregar nuevas reglas aquí de forma simple
 */
export const TELEMETRY_RULES: TelemetryRule[] = [
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
        advice: 'Gomas frías, hacé unas serpentinas para levantar temperatura',
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
        advice: 'Tenés tráfico, ojo con la maniobra',
        cooldown: 10
    },

    // ========================================
    // REGLAS ADICIONALES - INGENIERO DE CARRERAS
    // ========================================

    {
        id: 'pit-window-open',
        category: 'strategy',
        priority: 5,
        condition: (d) => {
            const fuelPct = d.current.fuel?.levelPct || 1;
            return fuelPct < 0.25 && fuelPct > 0.10;
        },
        advice: 'Se abre la ventana de boxes, prepará la parada',
        cooldown: 60
    },

    {
        id: 'apex-early',
        category: 'technique',
        priority: 4,
        condition: (d) => {
            // Detectar si está girando mucho con velocidad alta (apex prematuro)
            const steering = Math.abs(d.averages.steeringAngle || 0);
            const speed = d.current.powertrain?.speedKph || 0;
            return steering > 25 && speed > 100;
        },
        advice: 'Estás tocando el apex muy temprano, paciencia en la entrada',
        cooldown: 45
    },

    {
        id: 'trail-braking-needed',
        category: 'technique',
        priority: 4,
        condition: (d) => {
            // Si frena fuerte pero no hay freno entrando a curva
            return d.patterns.hardBrakingCount > 3 && d.patterns.throttleChanges < 5;
        },
        advice: 'Probá trail braking, soltar el freno gradual mientras girás',
        cooldown: 60
    },

    {
        id: 'smooth-inputs',
        category: 'technique',
        priority: 3,
        condition: (d) => {
            return d.patterns.throttleChanges > 15 && d.patterns.hardBrakingCount > 3;
        },
        advice: 'Suavizá los inputs, el auto te lo va a agradecer',
        cooldown: 55
    },

    {
        id: 'save-tyres',
        category: 'strategy',
        priority: 4,
        condition: (d) => {
            const tyreTemps = d.current.temps?.tyreC || [];
            const avgTemp = tyreTemps.length > 0
                ? tyreTemps.reduce((a, b) => a + b, 0) / tyreTemps.length
                : 0;
            return avgTemp > 95 && avgTemp < 100;
        },
        advice: 'Las gomas están al límite, cuidá el caucho en las curvas',
        cooldown: 45
    },

    {
        id: 'engine-cold',
        category: 'engine',
        priority: 5,
        condition: (d) => {
            const oilC = d.current.temps?.oilC || 100;
            const waterC = d.current.temps?.waterC || 100;
            return oilC < 70 || waterC < 60;
        },
        advice: 'Motor frío todavía, no le exijas hasta que levante temperatura',
        cooldown: 30
    },

    {
        id: 'brake-bias-front',
        category: 'technique',
        priority: 4,
        condition: (d) => {
            const brakeTemps = d.current.temps?.brakeC || [];
            if (brakeTemps.length < 4) return false;
            const frontAvg = (brakeTemps[0] + brakeTemps[1]) / 2;
            const rearAvg = (brakeTemps[2] + brakeTemps[3]) / 2;
            return frontAvg > rearAvg + 50;
        },
        advice: 'Frenos delanteros mucho más calientes, probá correr el balance para atrás',
        cooldown: 50
    },

    {
        id: 'push-now',
        category: 'strategy',
        priority: 5,
        condition: (d) => {
            const fuelPct = d.current.fuel?.levelPct || 0;
            return fuelPct > 0.6 && d.lapTimes.delta < 0;
        },
        advice: 'Buen ritmo con nafta, dale que estás rápido',
        cooldown: 60
    },

    {
        id: 'consistent-laps',
        category: 'technique',
        priority: 3,
        condition: (d) => {
            const delta = Math.abs(d.lapTimes.delta || 0);
            return delta < 0.5 && d.lapTimes.best > 0;
        },
        advice: 'Vueltas consistentes, seguí así que no regales nada',
        cooldown: 90
    },

    {
        id: 'lift-and-coast',
        category: 'strategy',
        priority: 4,
        condition: (d) => {
            const fuelPct = d.current.fuel?.levelPct || 1;
            const lapsRemain = d.current.session?.sessionLapsRemain || 0;
            return fuelPct < 0.20 && lapsRemain > 3;
        },
        advice: 'Levantá antes de las frenadas para estirar la nafta',
        cooldown: 45
    },

    {
        id: 'tyre-pressure-high',
        category: 'tyres',
        priority: 5,
        condition: (d) => {
            const tyreTemps = d.current.temps?.tyreC || [];
            // Si las gomas están calientes pero con mucho desgaste central
            return tyreTemps.some(t => t > 90 && t < 95);
        },
        advice: 'Gomas en ventana óptima, ahora rendís, manzana',
        cooldown: 120
    },

    {
        id: 'defensive-line',
        category: 'track',
        priority: 6,
        condition: (d) => {
            const lr = d.current.traffic?.carLeftRight;
            const speed = d.current.powertrain?.speedKph || 0;
            return lr !== undefined && Math.abs(lr) < 0.5 && speed > 80;
        },
        advice: 'Cuidá la línea, te quieren pasar',
        cooldown: 15
    },

    {
        id: 'accelerate-earlier',
        category: 'technique',
        priority: 4,
        condition: (d) => {
            const throttle = d.averages.throttle || 0;
            const speed = d.averages.speed || 0;
            return throttle < 60 && speed > 80 && d.patterns.throttleChanges < 10;
        },
        advice: 'Acelerá antes a la salida de las curvas, estás dejando tiempo',
        cooldown: 50
    },

    {
        id: 'incidents-warning',
        category: 'track',
        priority: 7,
        condition: (d) => {
            const incidents = d.current.session?.incidents || 0;
            return incidents > 5 && incidents < 10;
        },
        advice: 'Ojo con los incidentes, no te descalifiquen',
        cooldown: 60
    },

    {
        id: 'incidents-critical',
        category: 'track',
        priority: 9,
        condition: (d) => {
            const incidents = d.current.session?.incidents || 0;
            return incidents >= 10;
        },
        advice: '¡Muchos incidentes! Un toque más y te sacan, calmá',
        cooldown: 30
    }
];
