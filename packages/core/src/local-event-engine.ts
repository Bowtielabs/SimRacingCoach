import {
  CapabilityMap,
  LocalEvent,
  LocalEventConfig,
  Severity,
  TelemetryFrame,
} from './types.js';
import { decodeFlags, FlagEvent } from './session-flags.js';

const TRAFFIC_COOLDOWNS = {
  leftRight: 0,      // Instant alerts - iRacing only reports when car is already alongside
  clear: 0,          // Instant clear notification  
  threeWide: 0,      // Instant three-wide alert
};

const FLAG_COOLDOWN = 4000;

const DEFAULT_TEMP_WARNING = 110;
const DEFAULT_TEMP_CRITICAL = 120;
const MIN_SPEED_FOR_ALERTS = 0.5; // Minimum speed in m/s to trigger alerts (~2 km/h)

// Advanced Coaching Thresholds
const COACHING_COOLDOWNS = {
  lateBraking: 8000,     // 8 seconds between late braking warnings
  cornerSpeed: 6000,     // 6 seconds between corner speed warnings (more frequent)
  gearSuggestion: 2500,  // 2.5 seconds between gear suggestions (very responsive)
  cornerExit: 10000,     // 10 seconds between corner exit feedback
};

const LATE_BRAKING_THRESHOLD = {
  minSpeed: 100,         // km/h - only warn above this speed
  brakePercent: 0.7,     // 70% brake application
  decelThreshold: -1.2,  // G-force (strong deceleration)
};

const CORNER_SPEED_THRESHOLD = {
  minSteeringAngle: 0.08, // ~8 degrees (very sensitive now)
  minSpeed: 45,           // km/h (lowered from 50)
  lateralGThreshold: 0.9, // Lateral G (much more sensitive - was 1.2)
};

const GEAR_SUGGESTION_RPM = {
  highRpmThreshold: 0.65,  // 65% of estimated max RPM (MUCH earlier)
  lowRpmThreshold: 0.35,   // 35% of estimated max RPM
  estimatedRedline: 7000,  // Default redline, will vary by car
};

// Helper for random messages
function randomMessage(options: string[]): string {
  return options[Math.floor(Math.random() * options.length)];
}

const ENGINE_WARNING_MESSAGES: Record<number, string[]> = {
  0x01: [
    'Ojo, la presión del aceite está baja',
    'Cuidado con la presión de aceite, está bajando',
    'Presión de aceite baja, andá con cuidado'
  ],
  0x02: [
    'Temperatura de agua subiendo',
    'El agua está subiendo de temperatura',
    'Ojo con el agua, se está calentando'
  ],
  0x04: [
    'Temperatura de aceite subiendo',
    'El aceite se está calentando',
    'Ojo con la temperatura del aceite'
  ],
  0x08: [
    'Limitador de pits activado',
    'Limitador activo'
  ],
  0x10: [
    'Cuidado, tenés daño en el motor',
    'El motor tiene daño, cuidalo',
    'Motor dañado, andá tranquilo'
  ],
};

// Coaching message templates
const LATE_BRAKING_MESSAGES = [
  'Frenaste tarde, la próxima empezá antes',
  'Mucho freno de golpe, anticip á la frenada',
  'Llegaste muy rápido, frenada más temprano',
];

const CORNER_SPEED_MESSAGES = [
  'Vas muy rápido para esa curva, levantá antes',
  'Reducí velocidad, entraste pasado',
  'Demasiado rápido, la próxima entrada más lenta',
];

function getGearSuggestionMessage(currentGear: number, suggestedGear: number, reason: 'high' | 'low'): string {
  // Convert gear number to word for natural speech
  const gearNames = ['neutral', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava'];
  const gearName = gearNames[suggestedGear] || `cambio ${suggestedGear}`;

  const messages = reason === 'high' ? [
    `Pasa a ${gearName}, estás pasado de vueltas`,
    `Tira ${gearName}, muy alto de RPM`,
    `Metele ${gearName}, estás al corte`,
  ] : [
    `Bajá a ${gearName}, te falta empuje`,
    `Pasa a ${gearName}, vas muy bajo`,
    `Tira ${gearName}, necesitás más vueltas`,
  ];
  return randomMessage(messages);
}

export class LocalEventEngine {
  private readonly capabilities: CapabilityMap;
  private readonly config: LocalEventConfig;
  private lastTrafficState: number | undefined;
  private lastFlags: FlagEvent[] = [];
  private tempStates = {
    water: 'normal' as 'normal' | 'warning' | 'critical',
    oil: 'normal' as 'normal' | 'warning' | 'critical',
  };
  private lastFuelLevel: number | undefined;
  private fuelWarningThreshold = 5.0; // Litros
  private lastOnPitRoad: boolean | undefined;
  private lastIncidents: number | undefined;
  private lastBestLap: number | undefined;
  private lastEngineWarnings: number = 0; // Track engine warning mask
  private isInitialized: boolean = false; // Track if we've initialized state

  // Coaching state tracking
  private lastLateBrakingWarning: number = 0;
  private lastCornerSpeedWarning: number = 0;
  private lastGearSuggestion: number = 0;
  private lastSpeed: number = 0;
  private lastBrake: number = 0;

  // Corner analysis tracking
  private inCorner: boolean = false;
  private cornerEntrySpeed: number = 0;
  private cornerEntryTooFast: boolean = false;
  private lastCornerExitFeedback: number = 0;

  // Performance optimization - cache values
  private lastRpm: number = 0;
  private lastGear: number = 0;

  constructor(capabilities: CapabilityMap, config: LocalEventConfig) {
    this.capabilities = capabilities;
    this.config = config;
  }

  update(frame: TelemetryFrame): LocalEvent[] {
    const events: LocalEvent[] = [];
    const now = frame.t;

    // On first frame, initialize all state without emitting events
    if (!this.isInitialized) {
      console.log('[LocalEventEngine] INITIALIZING - skipping all events on first frame');
      if (this.capabilities.hasCarLeftRight && frame.traffic.carLeftRight !== undefined) {
        this.lastTrafficState = frame.traffic.carLeftRight;
      }
      if (this.capabilities.hasEngineWarnings && typeof frame.engineWarnings === 'number') {
        this.lastEngineWarnings = frame.engineWarnings;
      }
      if (typeof frame.session?.onPitRoad === 'boolean') {
        this.lastOnPitRoad = frame.session.onPitRoad;
      }
      if (typeof frame.session?.incidents === 'number') {
        this.lastIncidents = frame.session.incidents;
      }
      this.isInitialized = true;
      return events; // Return empty - no events on first frame
    }

    // Check if car is moving - only give alerts when car is in motion
    const speed = frame.powertrain.speedKph ? (frame.powertrain.speedKph / 3.6) : 0; // Convert to m/s
    const isMoving = speed > MIN_SPEED_FOR_ALERTS;
    const shouldAlert = isMoving || frame.session?.onPitRoad === true; // Alert if moving OR on pit road


    if (this.capabilities.hasCarLeftRight && frame.traffic.carLeftRight !== undefined) {
      const current = frame.traffic.carLeftRight;
      console.log('[Traffic] current:', current, 'last:', this.lastTrafficState, 'changed:', current !== this.lastTrafficState);
      if (current !== this.lastTrafficState) {
        const trafficEvent = this.buildTrafficEvent(current, now);
        if (trafficEvent) {
          console.log('[Traffic] EVENT CREATED:', trafficEvent.text);
          events.push(trafficEvent);
        }
        this.lastTrafficState = current;
      }
    }

    // DEBUG: Log flags before processing
    console.log('[LocalEventEngine] Frame flags:', {
      hasCapability: this.capabilities.hasSessionFlags,
      flagsObject: frame.flags,
      sessionFlagsValue: frame.flags?.sessionFlags,
      sessionFlagsType: typeof frame.flags?.sessionFlags
    });

    if (this.capabilities.hasSessionFlags && frame.flags.sessionFlags !== undefined) {
      console.log('[Flags] SessionFlags raw value:', frame.flags.sessionFlags);
      const flagEvents = decodeFlags(frame.flags.sessionFlags, now);
      console.log('[Flags] Decoded flag events:', flagEvents.map(f => f.type));
      console.log('[Flags] Last flags:', this.lastFlags.map(f => f.type));

      for (const flagEvent of flagEvents) {
        const already = this.lastFlags.find((prev) => prev.type === flagEvent.type);
        if (!already) {
          console.log('[Flags] NEW FLAG DETECTED:', flagEvent.type);
          events.push(flagEvent.event);
        } else {
          console.log('[Flags] Flag already active:', flagEvent.type);
        }
      }
      this.lastFlags = flagEvents;
    }

    if (shouldAlert && this.capabilities.hasWaterTemp && frame.temps.waterC !== undefined) {
      const event = this.checkTemperature(
        'water',
        frame.temps.waterC,
        this.config.waterTemp?.warning ?? DEFAULT_TEMP_WARNING,
        this.config.waterTemp?.critical ?? DEFAULT_TEMP_CRITICAL,
        now,
      );
      if (event) {
        events.push(event);
      }
    }

    if (shouldAlert && this.capabilities.hasOilTemp && frame.temps.oilC !== undefined) {
      const event = this.checkTemperature(
        'oil',
        frame.temps.oilC,
        this.config.oilTemp?.warning ?? DEFAULT_TEMP_WARNING,
        this.config.oilTemp?.critical ?? DEFAULT_TEMP_CRITICAL,
        now,
      );
      if (event) {
        events.push(event);
      }
    }

    if (this.capabilities.hasEngineWarnings && typeof frame.engineWarnings === 'number') {
      const warningEvents = this.decodeEngineWarnings(frame.engineWarnings, now);
      events.push(...warningEvents);
    }

    if (this.capabilities.hasFuelLevel && frame.fuel?.level !== undefined) {
      const fuelEvent = this.checkFuelLevel(frame.fuel.level, now);
      if (fuelEvent) {
        events.push(fuelEvent);
      }
    }

    // New Rules: Pit Road
    if (typeof frame.session?.onPitRoad === 'boolean') {
      if (frame.session.onPitRoad !== this.lastOnPitRoad) {
        const pitMessages = {
          enter: [
            'Entrando a boxes',
            'A boxes',
            'Entrando al pitlane'
          ],
          exit: [
            'Saliendo de boxes, pista libre',
            'Fuera de boxes, dale que va',
            'Saliendo a pista'
          ]
        };

        events.push({
          id: frame.session.onPitRoad ? 'pit.enter' : 'pit.exit',
          t: now,
          category: 'SYSTEM',
          severity: 'INFO',
          priority: 2,
          cooldownMs: 5000,
          text: frame.session.onPitRoad
            ? randomMessage(pitMessages.enter)
            : randomMessage(pitMessages.exit),
          source: 'local',
        });
        this.lastOnPitRoad = frame.session.onPitRoad;
      }
    }

    // New Rules: Incidents
    if (typeof frame.session?.incidents === 'number') {
      if (this.lastIncidents !== undefined && frame.session.incidents > this.lastIncidents) {
        events.push({
          id: 'incident.increase',
          t: now,
          category: 'COACHING',
          severity: 'WARNING',
          priority: 3,
          cooldownMs: 2000,
          text: `Incidente: ${frame.session.incidents}x`,
          source: 'local',
        });
      }
      this.lastIncidents = frame.session.incidents;
    }

    // New Rules: Best Lap
    if (typeof frame.lapTimes?.best === 'number' && frame.lapTimes.best > 0) {
      if (this.lastBestLap !== undefined && frame.lapTimes.best < this.lastBestLap) {
        events.push({
          id: 'lap.best',
          t: now,
          category: 'COACHING',
          severity: 'INFO',
          priority: 4,
          cooldownMs: 10000,
          text: `¡Nuevo récord personal! ${frame.lapTimes.best.toFixed(3)}`,
          source: 'local',
        });
      }
      this.lastBestLap = frame.lapTimes.best;
    }

    // Advanced Coaching Checks
    if (shouldAlert) {
      const lateBrakingEvent = this.checkLateBraking(frame, now);
      if (lateBrakingEvent) events.push(lateBrakingEvent);

      const cornerSpeedEvent = this.checkCornerSpeed(frame, now);
      if (cornerSpeedEvent) events.push(cornerSpeedEvent);

      const gearSuggestionEvent = this.checkGearSuggestion(frame, now);
      if (gearSuggestionEvent) events.push(gearSuggestionEvent);

      const cornerExitEvent = this.checkCornerExit(frame, now);
      if (cornerExitEvent) events.push(cornerExitEvent);
    }

    return events;
  }

  private buildTrafficEvent(state: number, t: number): LocalEvent | null {
    switch (state) {
      case 0:
        return {
          id: 'traffic.clear',
          t,
          category: 'TRAFFIC',
          severity: 'CRITICAL',
          priority: 5,
          cooldownMs: TRAFFIC_COOLDOWNS.clear,
          text: 'Libre',
          source: 'local',
        };
      case 1:
        return {
          id: 'traffic.left',
          t,
          category: 'TRAFFIC',
          severity: 'CRITICAL',
          priority: 5,
          cooldownMs: TRAFFIC_COOLDOWNS.leftRight,
          text: 'Auto a la izquierda',
          source: 'local',
        };
      case 2:
        return {
          id: 'traffic.right',
          t,
          category: 'TRAFFIC',
          severity: 'CRITICAL',
          priority: 5,
          cooldownMs: TRAFFIC_COOLDOWNS.leftRight,
          text: 'Auto a la derecha',
          source: 'local',
        };
      case 3:
        return {
          id: 'traffic.threewide',
          t,
          category: 'TRAFFIC',
          severity: 'CRITICAL',
          priority: 5,
          cooldownMs: TRAFFIC_COOLDOWNS.threeWide,
          text: 'Tres autos',
          source: 'local',
        };
      default:
        return null;
    }
  }

  private checkTemperature(
    type: 'water' | 'oil',
    value: number,
    warning: number,
    critical: number,
    t: number,
  ): LocalEvent | null {
    const state = this.tempStates[type];
    let newState: 'normal' | 'warning' | 'critical' = 'normal';

    if (value >= critical) {
      newState = 'critical';
    } else if (value >= warning) {
      newState = 'warning';
    }

    if (newState === state) {
      return null;
    }

    this.tempStates[type] = newState;
    if (newState === 'normal') {
      return null;
    }

    const severity: Severity = newState === 'critical' ? 'CRITICAL' : 'WARNING';
    const tempRounded = Math.round(value);
    const fluidName = type === 'water' ? 'agua' : 'aceite';

    // Natural, coach-like messages with variations
    const criticalMessages = [
      `Temperatura de ${fluidName} en ${tempRounded} grados, es crítica, aflojá`,
      `${fluidName.charAt(0).toUpperCase() + fluidName.slice(1)} en ${tempRounded} grados, muy alta, bajá el ritm o`,
      `Cuidado, ${fluidName} crítica: ${tempRounded} grados, andá más tranquilo`
    ];

    const warningMessages = [
      `Temperatura de ${fluidName} en ${tempRounded} grados, está alta, ojo`,
      `${fluidName.charAt(0).toUpperCase() + fluidName.slice(1)} en ${tempRounded} grados, se está calentando`,
      `La ${fluidName} está en ${tempRounded} grados, un poco alta`
    ];

    const text = newState === 'critical'
      ? randomMessage(criticalMessages)
      : randomMessage(warningMessages);

    return {
      id: `temp.${type}.${newState}`,
      t,
      category: 'ENGINE',
      severity,
      priority: newState === 'critical' ? 4 : 3,
      cooldownMs: 4000,
      text,
      source: 'local',
      metadata: {
        value,
      },
    };
  }

  private decodeEngineWarnings(mask: number, t: number): LocalEvent[] {
    const events: LocalEvent[] = [];

    // Only emit events for NEW warnings (bits that changed from 0 to 1)
    const newWarnings = mask & ~this.lastEngineWarnings;

    console.log('[EngineWarnings]', {
      currentMask: mask,
      lastMask: this.lastEngineWarnings,
      newWarnings: newWarnings,
    });

    Object.entries(ENGINE_WARNING_MESSAGES).forEach(([bit, messages]) => {
      const bitValue = Number(bit);
      // Only create event if this specific bit just turned on
      if ((newWarnings & bitValue) !== 0) {
        const message = randomMessage(messages);
        console.log('[EngineWarnings] NEW WARNING:', message, 'bit:', bitValue);
        events.push({
          id: `engine.warning.${bitValue}`,
          t,
          category: 'ENGINE',
          severity: bitValue === 0x10 ? 'CRITICAL' : 'WARNING',
          priority: bitValue === 0x10 ? 5 : 3,
          cooldownMs: 10000,
          text: message,
          source: 'local',
        });
      }
    });

    this.lastEngineWarnings = mask;
    return events;
  }

  private checkFuelLevel(level: number, t: number): LocalEvent | null {
    if (this.lastFuelLevel === undefined) {
      this.lastFuelLevel = level;
      return null;
    }

    if (level <= this.fuelWarningThreshold && this.lastFuelLevel > this.fuelWarningThreshold) {
      this.lastFuelLevel = level;
      return {
        id: 'fuel.low',
        t,
        category: 'ENGINE',
        severity: 'WARNING',
        priority: 4,
        cooldownMs: 60000,
        text: 'Bajo nivel de combustible',
        source: 'local',
        metadata: { level },
      };
    }

    this.lastFuelLevel = level;
    return null;
  }

  // Advanced Coaching Methods

  private checkLateBraking(frame: TelemetryFrame, t: number): LocalEvent | null {
    const speed = frame.powertrain.speedKph ?? 0;
    const brake = frame.powertrain.brake ?? 0;
    const longitudinalG = frame.physics?.longitudinalG ?? 0;

    // Check cooldown
    if (t - this.lastLateBrakingWarning < COACHING_COOLDOWNS.lateBraking) {
      return null;
    }

    // Detect late braking: high speed + sudden hard braking
    const isLateBraking =
      speed > LATE_BRAKING_THRESHOLD.minSpeed &&
      brake > LATE_BRAKING_THRESHOLD.brakePercent &&
      this.lastBrake < 0.3 && // Was not braking before
      longitudinalG < LATE_BRAKING_THRESHOLD.decelThreshold;

    if (isLateBraking) {
      this.lastLateBrakingWarning = t;
      this.lastBrake = brake;
      this.lastSpeed = speed;

      return {
        id: 'coaching.late_braking',
        t,
        category: 'COACHING',
        severity: 'INFO',
        priority: 2,
        cooldownMs: COACHING_COOLDOWNS.lateBraking,
        text: randomMessage(LATE_BRAKING_MESSAGES),
        source: 'local',
      };
    }

    // Update tracking variables
    this.lastBrake = brake;
    this.lastSpeed = speed;
    return null;
  }

  private checkCornerSpeed(frame: TelemetryFrame, t: number): LocalEvent | null {
    const speed = frame.powertrain.speedKph ?? 0;
    const steeringAngle = Math.abs(frame.physics?.steeringAngle ?? 0);
    const lateralG = Math.abs(frame.physics?.lateralG ?? 0);
    const throttle = frame.powertrain.throttle ?? 0;

    // Detect if we're in corner based on steering angle
    const isInCorner = steeringAngle > CORNER_SPEED_THRESHOLD.minSteeringAngle;

    // Track corner entry
    if (isInCorner && !this.inCorner) {
      // Just entered corner
      this.inCorner = true;
      this.cornerEntrySpeed = speed;
      this.cornerEntryTooFast = false;
    } else if (!isInCorner && this.inCorner) {
      // Just exited corner
      this.inCorner = false;
    }

    // Check cooldown for warnings
    if (t - this.lastCornerSpeedWarning < COACHING_COOLDOWNS.cornerSpeed) {
      return null;
    }

    // Detect high corner entry speed: steering turned + high speed + not accelerating + high lateral G
    const isCornerTooFast =
      isInCorner &&
      speed > CORNER_SPEED_THRESHOLD.minSpeed &&
      throttle < 0.5 && // Not accelerating
      lateralG > CORNER_SPEED_THRESHOLD.lateralGThreshold;

    if (isCornerTooFast) {
      this.lastCornerSpeedWarning = t;
      this.cornerEntryTooFast = true; // Mark for exit feedback

      return {
        id: 'coaching.corner_speed',
        t,
        category: 'COACHING',
        severity: 'INFO',
        priority: 2,
        cooldownMs: COACHING_COOLDOWNS.cornerSpeed,
        text: randomMessage(CORNER_SPEED_MESSAGES),
        source: 'local',
      };
    }

    return null;
  }

  private checkGearSuggestion(frame: TelemetryFrame, t: number): LocalEvent | null {
    const rpm = frame.powertrain.rpm ?? 0;
    const gear = frame.powertrain.gear ?? 0;
    const speed = frame.powertrain.speedKph ?? 0;

    // Performance optimization: Skip if RPM/gear haven't changed significantly
    const rpmChanged = Math.abs(rpm - this.lastRpm) > 100;
    const gearChanged = gear !== this.lastGear;

    if (!rpmChanged && !gearChanged) {
      return null; // No significant change, skip calculation
    }

    this.lastRpm = rpm;
    this.lastGear = gear;

    // Check cooldown
    if (t - this.lastGearSuggestion < COACHING_COOLDOWNS.gearSuggestion) {
      return null;
    }

    // Skip if in neutral or reverse
    if (gear <= 0) {
      return null;
    }

    // Skip if not moving
    if (speed < 20) {
      return null;
    }

    const rpmRatio = rpm / GEAR_SUGGESTION_RPM.estimatedRedline;

    // Suggest upshift if RPM too high (only if actually moving at decent speed)
    // This avoids confusing "al corte" messages when just crawling in first gear
    if (rpmRatio > GEAR_SUGGESTION_RPM.highRpmThreshold && speed > 40) {
      this.lastGearSuggestion = t;

      return {
        id: 'coaching.gear_high',
        t,
        category: 'COACHING',
        severity: 'INFO',
        priority: 1,
        cooldownMs: COACHING_COOLDOWNS.gearSuggestion,
        text: getGearSuggestionMessage(gear, gear + 1, 'high'),
        source: 'local',
        metadata: { rpm, gear },
      };
    }

    // Suggest downshift if RPM too low (only if throttle is pressed)
    const throttle = frame.powertrain.throttle ?? 0;
    if (rpmRatio < GEAR_SUGGESTION_RPM.lowRpmThreshold && throttle > 0.5 && gear > 2) {
      this.lastGearSuggestion = t;

      return {
        id: 'coaching.gear_low',
        t,
        category: 'COACHING',
        severity: 'INFO',
        priority: 1,
        cooldownMs: COACHING_COOLDOWNS.gearSuggestion,
        text: getGearSuggestionMessage(gear, gear - 1, 'low'),
        source: 'local',
        metadata: { rpm, gear },
      };
    }

    return null;
  }

  private checkCornerExit(frame: TelemetryFrame, t: number): LocalEvent | null {
    const steeringAngle = Math.abs(frame.physics?.steeringAngle ?? 0);
    const speed = frame.powertrain.speedKph ?? 0;
    const throttle = frame.powertrain.throttle ?? 0;

    // Check if we just exited a corner
    const isInCorner = steeringAngle > CORNER_SPEED_THRESHOLD.minSteeringAngle;

    // Only give feedback when exiting corner and enough time has passed
    if (this.inCorner && !isInCorner && (t - this.lastCornerExitFeedback > COACHING_COOLDOWNS.cornerExit)) {
      this.lastCornerExitFeedback = t;

      // If we warned about entry speed, give improvement feedback
      if (this.cornerEntryTooFast) {
        const feedbackMessages = [
          'Entraste pasado, para la próxima levantá antes',
          'Mucha velocidad en esa, aflojá más temprano la próxima',
          'Frenada más temprano, entraste muy rápido',
        ];

        this.cornerEntryTooFast = false; // Reset

        return {
          id: 'coaching.corner_exit_bad',
          t,
          category: 'COACHING',
          severity: 'INFO',
          priority: 1,
          cooldownMs: COACHING_COOLDOWNS.cornerExit,
          text: randomMessage(feedbackMessages),
          source: 'local',
        };
      } else if (this.cornerEntrySpeed > 0 && throttle > 0.7) {
        // Good corner - high throttle on exit
        const goodFeedbackMessages = [
          'Buena curva, salida limpia',
          'Bien, velocidad correcta',
          'Perfecto, así se hace',
        ];

        return {
          id: 'coaching.corner_exit_good',
          t,
          category: 'COACHING',
          severity: 'INFO',
          priority: 1,
          cooldownMs: COACHING_COOLDOWNS.cornerExit,
          text: randomMessage(goodFeedbackMessages),
          source: 'local',
        };
      }
    }

    return null;
  }
}
