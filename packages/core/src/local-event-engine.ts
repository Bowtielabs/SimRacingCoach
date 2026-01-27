import {
  CapabilityMap,
  LocalEvent,
  LocalEventConfig,
  Severity,
  TelemetryFrame,
} from './types.js';
import { decodeFlags, FlagEvent } from './session-flags.js';

const TRAFFIC_COOLDOWNS = {
  leftRight: 1200,
  clear: 700,
  threeWide: 1500,
};

const FLAG_COOLDOWN = 4000;

const DEFAULT_TEMP_WARNING = 110;
const DEFAULT_TEMP_CRITICAL = 120;

const ENGINE_WARNING_MESSAGES: Record<number, string> = {
  0x01: 'Presión de aceite baja',
  0x02: 'Temperatura de agua alta',
  0x04: 'Temperatura de aceite alta',
  0x08: 'Limitador de pits activado',
  0x10: 'Motor dañado',
};

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

  constructor(capabilities: CapabilityMap, config: LocalEventConfig) {
    this.capabilities = capabilities;
    this.config = config;
  }

  update(frame: TelemetryFrame): LocalEvent[] {
    const events: LocalEvent[] = [];
    const now = frame.t;

    if (this.capabilities.hasCarLeftRight && frame.traffic.carLeftRight !== undefined) {
      const current = frame.traffic.carLeftRight;
      if (current !== this.lastTrafficState) {
        const trafficEvent = this.buildTrafficEvent(current, now);
        if (trafficEvent) {
          events.push(trafficEvent);
        }
        this.lastTrafficState = current;
      }
    }

    if (this.capabilities.hasSessionFlags && frame.flags.sessionFlags !== undefined) {
      const flagEvents = decodeFlags(frame.flags.sessionFlags, now);
      for (const flagEvent of flagEvents) {
        const already = this.lastFlags.find((prev) => prev.type === flagEvent.type);
        if (!already) {
          events.push(flagEvent.event);
        }
      }
      this.lastFlags = flagEvents;
    }

    if (this.capabilities.hasWaterTemp && frame.temps.waterC !== undefined) {
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

    if (this.capabilities.hasOilTemp && frame.temps.oilC !== undefined) {
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

    if (this.capabilities.hasEngineWarnings && frame.engineWarnings !== undefined) {
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
    if (frame.session?.onPitRoad !== undefined) {
      if (frame.session.onPitRoad !== this.lastOnPitRoad) {
        events.push({
          id: frame.session.onPitRoad ? 'pit.enter' : 'pit.exit',
          t: now,
          category: 'SYSTEM',
          severity: 'INFO',
          priority: 2,
          cooldownMs: 5000,
          text: frame.session.onPitRoad ? 'Entrando a pits' : 'Saliendo de pits',
          source: 'local',
        });
        this.lastOnPitRoad = frame.session.onPitRoad;
      }
    }

    // New Rules: Incidents
    if (frame.session?.incidents !== undefined) {
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
    if (frame.lapTimes?.best !== undefined && frame.lapTimes.best > 0) {
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

    return {
      id: `temp.${type}.${newState}`,
      t,
      category: 'ENGINE',
      severity,
      priority: newState === 'critical' ? 4 : 3,
      cooldownMs: 4000,
      text: `${type === 'water' ? 'Agua' : 'Aceite'} ${newState === 'critical' ? 'crítica' : 'alta'}`,
      source: 'local',
      metadata: {
        value,
      },
    };
  }

  private decodeEngineWarnings(mask: number, t: number): LocalEvent[] {
    const events: LocalEvent[] = [];
    Object.entries(ENGINE_WARNING_MESSAGES).forEach(([bit, message]) => {
      const bitValue = Number(bit);
      if ((mask & bitValue) !== 0) {
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
}
