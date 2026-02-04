
import { TelemetryRule } from '../telemetry-rules-engine';

/**
 * PHASE 6: ADVANCED RACING RULES (The "Pro Engineer" Pack)
 * 50+ localized, high-value coaching rules based on vehicle dynamics.
 */
export const ADVANCED_RULES: TelemetryRule[] = [

    // ==========================================
    // A. VEHICLE DYNAMICS (HANDLING) - 10 Rules
    // ==========================================
    {
        id: 'dyn-understeer-entry',
        category: 'technique',
        priority: 8,
        condition: (d) => d.patterns.understeerFactor > 0.5 && (d.current.powertrain?.brake || 0) > 0.1,
        advice: 'Barriendo la trompa en la entrada. Soltá freno para que muerda.',
        cooldown: 40
    },
    {
        id: 'dyn-understeer-mid',
        category: 'technique',
        priority: 7,
        condition: (d) => d.patterns.understeerFactor > 0.4 && (d.current.powertrain?.throttle || 0) > 0.1,
        advice: 'Ida de trompa en el medio. Esperá la rotación antes de dar gas.',
        cooldown: 40
    },
    {
        id: 'dyn-snap-oversteer',
        category: 'technique',
        priority: 9,
        condition: (d) => d.patterns.oversteerFactor > 0.8,
        advice: '¡Latigazo! Corregí suave, no pelees con el volante.',
        cooldown: 30
    },
    {
        id: 'dyn-power-oversteer',
        category: 'technique',
        priority: 8,
        condition: (d) => d.patterns.oversteerFactor > 0.5 && (d.current.powertrain?.throttle || 0) > 0.8,
        advice: 'Mucha potencia con la dirección cruzada. Dosificá el pie derecho.',
        cooldown: 35
    },
    {
        id: 'dyn-pendulum',
        category: 'technique',
        priority: 8,
        condition: (d) => d.patterns.aggressiveSteeringCount > 5 && d.patterns.oversteerFactor > 0.3,
        advice: 'Efecto péndulo. No tires el auto de un lado al otro, sé progresivo.',
        cooldown: 45
    },
    {
        id: 'dyn-excessive-roll',
        category: 'strategy',
        priority: 5,
        condition: (d) => Math.abs(d.averages.lateralG) > 2.5, // Unrealistic for most cars without sterile setup
        advice: 'El auto rola demasiado. Endurecé las barras estabilizadoras.',
        cooldown: 120
    },
    {
        id: 'dyn-nose-dive',
        category: 'strategy',
        priority: 5,
        condition: (d) => (d.current.physics?.longitudinalG || 0) < -1.8 && (d.current.suspension?.shockDeflection?.[0] || 0) > 0.10,
        advice: 'Mucho cabeceo en frenada. Subí la compresión delantera.',
        cooldown: 60
    },
    {
        id: 'dyn-rear-squat',
        category: 'strategy',
        priority: 5,
        condition: (d) => (d.current.physics?.longitudinalG || 0) > 0.8 && (d.current.suspension?.shockDeflection?.[2] || 0) > 0.10,
        advice: 'El auto se sienta mucho al acelerar. Endurecé la trasera.',
        cooldown: 60
    },
    {
        id: 'dyn-scrub-radius',
        category: 'technique',
        priority: 6,
        condition: (d) => d.patterns.understeerFactor > 0.3 && d.averages.speed < 60,
        advice: 'Estás arrastrando las gomas en lo lento. Abrí más la dirección.',
        cooldown: 50
    },
    {
        id: 'dyn-steering-lock',
        category: 'technique',
        priority: 7,
        condition: (d) => Math.abs(d.current.physics?.steeringAngle || 0) > 3.0, // rads (~170 deg)
        advice: 'Estás cruzando demasiado los brazos. Usá más pista, no tanto volante.',
        cooldown: 40
    },

    // ==========================================
    // B. BRAKING & CORNERING (10 Rules)
    // ==========================================
    {
        id: 'brk-early-release',
        category: 'technique',
        priority: 7,
        condition: (d) => d.patterns.hardBrakingCount > 2 && (d.current.powertrain?.brake || 0) < 0.05 && d.patterns.understeerFactor > 0.2,
        advice: 'Soltaste el freno muy pronto. Aguantalo hasta el vértice.',
        cooldown: 45
    },
    {
        id: 'brk-late-brake',
        category: 'technique',
        priority: 8,
        condition: (d) => d.patterns.hardBrakingCount > 0 && d.current.session?.isOnTrack === false,
        advice: 'Te tiraste muy tarde fiera. Referenciá antes, no somos héroes.',
        cooldown: 60
    },
    {
        id: 'brk-abs-reliance',
        category: 'technique',
        priority: 6,
        condition: (d) => (d.current.carControls?.absActive || false) && (d.current.powertrain?.brake || 0) > 0.95,
        advice: 'Estás colgado del ABS. Frená al 90%, no mates el sistema.',
        cooldown: 40
    },
    {
        id: 'brk-migration-fwd',
        category: 'strategy',
        priority: 5,
        condition: (d) => d.patterns.hardBrakingCount > 3 && d.patterns.understeerFactor > 0.3,
        advice: 'Frenada muy delantera. Tirá el balance de frenos para atrás.',
        cooldown: 120
    },
    {
        id: 'brk-migration-rwd',
        category: 'strategy',
        priority: 5,
        condition: (d) => d.patterns.hardBrakingCount > 3 && d.patterns.oversteerFactor > 0.3,
        advice: 'La cola te quiere pasar frenando. Pasá balance adelante.',
        cooldown: 120
    },
    {
        id: 'cor-early-apex',
        category: 'technique',
        priority: 7,
        condition: (d) => d.patterns.understeerFactor > 0.4 && (d.current.powertrain?.throttle || 0) > 0.5,
        advice: 'Le pegaste muy temprano a la cuerda. Te quedás sin pista a la salida.',
        cooldown: 50
    },
    {
        id: 'cor-missed-apex',
        category: 'technique',
        priority: 6,
        condition: (d) => d.patterns.understeerFactor > 0.2 && d.averages.speed < 50,
        advice: 'Lejísimos del piano interno. Achicá el radio, regalás metros.',
        cooldown: 50
    },
    {
        id: 'cor-v-shape',
        category: 'technique',
        priority: 6,
        condition: (d) => d.patterns.hardBrakingCount > 4 && d.averages.speed < 80,
        advice: 'Hacé la curva en V. Entrá fuerte, rotalo y salí derecho.',
        cooldown: 60
    },
    {
        id: 'cor-u-shape',
        category: 'technique',
        priority: 6,
        condition: (d) => d.averages.lateralG > 1.5 && d.averages.speed > 120,
        advice: 'Redondeá la trazada. Mantené velocidad de paso en lo rápido.',
        cooldown: 60
    },
    {
        id: 'brk-temperature-spike',
        category: 'brakes',
        priority: 9,
        condition: (d) => (d.current.temps?.brakeC?.[0] || 0) > 600,
        advice: '¡Fuego en los discos! Mové el reparto o refrigerá, se cristalizan.',
        cooldown: 40
    },

    // ==========================================
    // C. TRACTION & GEARS (10 Rules)
    // ==========================================
    {
        id: 'trac-wheelspin-low',
        category: 'technique',
        priority: 7,
        condition: (d) => d.patterns.tractionLossCount > 3 && (d.current.powertrain?.gear || 0) < 3,
        advice: 'Patinando en baja. Dosificá el pie o subí una marcha.',
        cooldown: 30
    },
    {
        id: 'trac-wheelspin-exit',
        category: 'technique',
        priority: 8,
        condition: (d) => d.patterns.tractionLossCount > 2 && (d.current.powertrain?.throttle || 0) > 0.9,
        advice: 'Tracción comprometida. Enderezá el volante antes de planchar el acelerador.',
        cooldown: 35
    },
    {
        id: 'trac-short-shift',
        category: 'technique',
        priority: 6,
        condition: (d) => d.patterns.tractionLossCount > 5,
        advice: 'La pista está lavada. Tirá el cambio antes (short-shift) para no patinar.',
        cooldown: 60
    },
    {
        id: 'gr-grinding',
        category: 'engine',
        priority: 9,
        condition: (d) => false, // Requires specific telemetry "ShiftGrindRPM", usually not exposed easily
        advice: '¡Cuidado la caja! Estás errando el cambio, marcá bien el movimiento.',
        cooldown: 30
    },
    {
        id: 'gr-money-shift',
        category: 'engine',
        priority: 10,
        condition: (d) => (d.current.powertrain?.rpm || 0) > 8500, // Generic limit
        advice: '¡Pasaste de vueltas el motor! Cuidado con los rebajes asesinos.',
        cooldown: 30
    },
    {
        id: 'gr-clutch-kick',
        category: 'technique',
        priority: 5,
        condition: (d) => (d.current.powertrain?.clutch || 0) > 0.5 && d.averages.speed > 50 && (d.current.powertrain?.throttle || 0) > 0.8,
        advice: '¿Qué hacés picando embrague? Esto no es drift, cuidá la transmisión.',
        cooldown: 60
    },
    {
        id: 'trac-tc-intrusion',
        category: 'technique',
        priority: 6,
        condition: (d) => (d.current.carControls?.tcLevel || 0) > 10, // Assuming high TC intervention
        advice: 'El control de tracción te está frenando. Bajale un punto al TC.',
        cooldown: 120
    },
    {
        id: 'trac-diff-lock',
        category: 'strategy',
        priority: 5,
        condition: (d) => d.patterns.tractionLossCount > 4 && d.averages.speed < 100,
        advice: 'El diferencial está muy abierto. Cerralo un poco para traccionar.',
        cooldown: 120
    },
    {
        id: 'trac-throttle-map',
        category: 'strategy',
        priority: 4,
        condition: (d) => d.patterns.throttleChanges > 30, // Very jerky
        advice: 'Estás muy nervioso con el gas. Suavizá el mapa de acelerador.',
        cooldown: 120
    },
    {
        id: 'gr-first-gear',
        category: 'technique',
        priority: 5,
        condition: (d) => (d.current.powertrain?.gear || 0) === 1 && d.averages.speed > 30,
        advice: 'No pongas primera en la horquilla, matás la inercia. Usá segunda.',
        cooldown: 45
    },

    // ==========================================
    // D. TIRES & STRATEGY (10 Rules)
    // ==========================================
    {
        id: 'tyre-flat-spot',
        category: 'tyres',
        priority: 9,
        condition: (d) => d.patterns.hardBrakingCount > 5 && d.current.session?.incidents !== undefined, // Placeholder pattern
        advice: '¡Bloqueaste feo! Tenés un plano en la goma, vas a sentir la vibración.',
        cooldown: 60
    },
    {
        id: 'tyre-grainig',
        category: 'tyres',
        priority: 6,
        condition: (d) => d.patterns.understeerFactor > 0.4 && d.averages.tyreC[0] < 70,
        advice: 'Graining delantero. La goma se está rompiendo por frío y arrastre.',
        cooldown: 60
    },
    {
        id: 'tyre-blistering',
        category: 'tyres',
        priority: 8,
        condition: (d) => d.averages.tyreC.some(t => t > 110),
        advice: 'Ampollas en la banda de rodadura (blistering). Refrigerá esas gomas ya.',
        cooldown: 60
    },
    {
        id: 'tyre-puncture-slow',
        category: 'tyres',
        priority: 10,
        condition: (d) => false, // Need pressure delta logic
        advice: 'Pinchadura lenta detectada. Entrá a boxes, no llegamos.',
        cooldown: 30
    },
    {
        id: 'strat-box-window',
        category: 'strategy',
        priority: 8,
        condition: (d) => (d.current.session?.sessionLapsRemain || 100) < 5 && (d.current.fuel?.level || 0) < 5,
        advice: 'Ventana de parada abierta. ¡Box, Box, Box esta vuelta!',
        cooldown: 60
    },
    {
        id: 'strat-push-pass',
        category: 'strategy',
        priority: 7,
        condition: (d) => (d.current.p2p?.count || 0) > 0 && d.patterns.isImproving, // If we have P2P and are fast
        advice: 'Tenés Push-to-Pass disponible. Usalo en la recta opuesta.',
        cooldown: 120
    },
    {
        id: 'strat-fuel-mix',
        category: 'strategy',
        priority: 5,
        condition: (d) => (d.current.session?.sessionLapsRemain || 0) > 10 && d.patterns.fuelUsedInBuffer > 2.0, // High consumption
        advice: 'Estamos cortos de nafta. Pasá a mapa económico (Mix 2).',
        cooldown: 120
    },
    {
        id: 'strat-brake-bias-adj',
        category: 'strategy',
        priority: 5,
        condition: (d) => d.patterns.fuelUsedInBuffer < 0.5, // Car getting lighter
        advice: 'El tanque se vacía. Acordate de mover el freno para atrás.',
        cooldown: 300 // Once per stint usually
    },
    {
        id: 'strat-blue-flag-ignore',
        category: 'strategy',
        priority: 9,
        condition: (d) => (d.current.flags?.sessionFlags || 0) === 0x00000010, // Placeholder hex for Blue
        advice: 'Bandera azul agitada. Respetá al líder, levantá en la recta.',
        cooldown: 20
    },
    {
        id: 'strat-last-lap',
        category: 'strategy',
        priority: 10,
        condition: (d) => (d.current.session?.sessionLapsRemain || 10) === 1,
        advice: 'Última vuelta. A morir nada, cuidá la cuerda y traelo a casa.',
        cooldown: 999
    },

    // ==========================================
    // E. RACECRAFT & MINDSET (10 Rules)
    // ==========================================
    {
        id: 'mind-focus-loss',
        category: 'technique',
        priority: 6,
        condition: (d) => d.patterns.incidentCount > 2 && d.lapTimes.current > d.lapTimes.last + 1.0,
        advice: 'Perdiste el foco. Respirá hondo, mirá lejos y reseteá.',
        cooldown: 60
    },
    {
        id: 'mind-consistency',
        category: 'technique',
        priority: 7,
        condition: (d) => d.patterns.isImproving && Math.abs(d.lapTimes.current - d.lapTimes.best) < 0.2,
        advice: 'Sos un relojito suizo. Mantené ese ritmo, calco tras calco.',
        cooldown: 60
    },
    {
        id: 'mind-anger-management',
        category: 'technique',
        priority: 9,
        condition: (d) => d.patterns.incidentCount > 4, // Many incidents rapidly
        advice: '¡Cortala! Estás manejando con bronca y vas a romper todo. Cabeza fría.',
        cooldown: 60
    },
    {
        id: 'mind-breathing',
        category: 'technique',
        priority: 4,
        condition: (d) => d.averages.speed > 250, // Long straight
        advice: 'Aprovechá la recta. Relajá las manos y respirá.',
        cooldown: 180
    },
    {
        id: 'race-gap-closing',
        category: 'strategy',
        priority: 7,
        condition: (d) => d.patterns.isImproving, // Needs gap logic
        advice: 'Le descontaste tres décimas al de adelante. Ya lo tenés en succión.',
        cooldown: 60
    },
    {
        id: 'race-defense',
        category: 'strategy',
        priority: 8,
        condition: (d) => false, // Needs gap behind logic
        advice: 'Te buscan por adentro. Hacé el radio de giro defensivo.',
        cooldown: 40
    },
    {
        id: 'race-attack',
        category: 'strategy',
        priority: 8,
        condition: (d) => false, // Needs gap ahead logic
        advice: 'Tirale el auto. Hacé la tijera a la salida.',
        cooldown: 40
    },
    {
        id: 'race-start-ready',
        category: 'strategy',
        priority: 10,
        condition: (d) => (d.current.powertrain?.speedKph || 0) < 1 && (d.current.powertrain?.rpm || 0) > 0,
        advice: 'Primera colocada. Buscá el punto de fricción del embrague... ¡Verde!',
        cooldown: 999
    },
    {
        id: 'race-finish-cool',
        category: 'strategy',
        priority: 5,
        condition: (d) => false, // Needs finish flag logic
        advice: 'Bandera a cuadros. Vuelta de honor tranquila, refrigerá frenos.',
        cooldown: 999
    },
    {
        id: 'race-damage-report',
        category: 'strategy',
        priority: 9,
        condition: (d) => (d.current.temps?.waterC || 0) > 110,
        advice: 'El auto está herido. Llevelo despacito a boxes.',
        cooldown: 60
    }
];
