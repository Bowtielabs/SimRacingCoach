import { EventEmitter } from 'node:events';
import type { CapabilityMap, TelemetryFrame } from '@simracing/core';


// Importar irsdk-node dinámicamente para evitar errores si no está disponible
let irsdk: any = null;
try {
  irsdk = require('irsdk-node');
} catch (err) {
  console.warn('irsdk-node not available, adapter will run in mock mode');
}

export interface IracingAdapterOptions {
  debugDump?: boolean;
  onLog?: (message: string) => void;
}

export class IracingAdapter extends EventEmitter {
  private options: IracingAdapterOptions;
  private connected = false;
  private pollIntervalId?: NodeJS.Timeout;
  private lastSessionId?: string;
  private reconnectTimeoutId?: NodeJS.Timeout;

  constructor(options: IracingAdapterOptions = {}) {
    super();
    this.options = options;
  }

  async connect(): Promise<void> {
    if (!irsdk) {
      this.log('irsdk-node not available, running in mock mode');
      this.startMockMode();
      return;
    }

    try {
      this.log('Attempting to connect to iRacing...');

      // Asegurar shutdown previo para evitar múltiples instancias
      try {
        irsdk.shutdown();
      } catch {
        // Ignorar errores si no había nada que cerrar
      }

      // Inicializar SDK
      const result = irsdk.init();

      if (!result) {
        throw new Error('Failed to initialize iRacing SDK');
      }

      // Esperar conexión (con timeout)
      const connected = await this.waitForConnection(5000);

      if (!connected) {
        this.log('iRacing not running or no active session');
        this.scheduleReconnect();
        return;
      }

      this.connected = true;
      this.emit('connected');
      this.log('Connected to iRacing');

      // Detectar capacidades
      this.detectCapabilities();

      // Iniciar polling de telemetría
      this.startPolling();

    } catch (error) {
      this.log(`Failed to connect: ${error}`);
      this.scheduleReconnect();
      throw error;
    }
  }

  disconnect(): void {
    this.connected = false;

    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = undefined;
    }

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }

    if (irsdk) {
      try {
        irsdk.shutdown();
      } catch (err) {
        this.log(`Error during shutdown: ${err}`);
      }
    }

    this.emit('disconnected');
    this.log('Disconnected from iRacing');
  }

  private async waitForConnection(timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (irsdk.waitForConnection()) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }

  private detectCapabilities(): void {
    const caps: CapabilityMap = {
      hasCarLeftRight: this.hasVar('CarLeftRight'),
      hasSessionFlags: this.hasVar('SessionFlags'),
      hasWaterTemp: this.hasVar('WaterTemp'),
      hasOilTemp: this.hasVar('OilTemp'),
      hasFuelLevel: this.hasVar('FuelLevel'),
      hasEngineWarnings: this.hasVar('EngineWarnings'),
      hasTyreTemps: this.hasVar('LFtempCL'),
      hasBrakeTemps: this.hasVar('LFbrakeLinePress'),
      hasSteeringAngle: this.hasVar('SteeringWheelAngle'),
      hasLateralG: this.hasVar('LatAccel'),
    };

    this.emit('capabilities', caps);
    this.log(`Capabilities detected: ${JSON.stringify(caps)}`);
  }

  private hasVar(varName: string): boolean {
    try {
      const value = irsdk.getTelemetryValue(varName);
      return value !== undefined && value !== null;
    } catch {
      return false;
    }
  }

  private startPolling(): void {
    const pollRate = 60; // 60 Hz
    const intervalMs = Math.floor(1000 / pollRate);

    this.pollIntervalId = setInterval(() => {
      if (!this.connected) {
        return;
      }

      try {
        // Intentar leer una variable simple para verificar conectividad
        // (evitamos waitForConnection() en cada poll - puede causar crashes)
        const testValue = this.getVar('IsOnTrack');
        if (testValue === undefined || testValue === null) {
          // Posiblemente desconectado, verificar con un método más seguro
          try {
            if (!irsdk.waitForConnection()) {
              this.log('Lost connection to iRacing');
              this.disconnect();
              this.scheduleReconnect();
              return;
            }
          } catch (err) {
            this.log(`Connection check failed: ${err}`);
            this.disconnect();
            this.scheduleReconnect();
            return;
          }
        }

        // Leer session ID
        const sessionId = this.getSessionId();
        if (sessionId && sessionId !== this.lastSessionId) {
          this.lastSessionId = sessionId;
          this.emit('session', sessionId);
          this.log(`New session detected: ${sessionId}`);
        }

        // Construir frame de telemetría COMPLETO
        const frame = this.buildTelemetryFrame();

        if (this.options.debugDump) {
          this.log(`Frame: ${JSON.stringify(frame)}`);
        }

        this.emit('telemetry', frame);

      } catch (error) {
        this.log(`Error reading telemetry: ${error}`);
        this.disconnect();
        this.scheduleReconnect();
      }
    }, intervalMs);
  }

  private buildTelemetryFrame(): TelemetryFrame {
    const now = Date.now();
    const playerIdx = this.getVar('PlayerCarIdx') ?? 0;

    return {
      t: now,
      sim: 'iracing',
      sessionId: this.lastSessionId,

      // Player info
      player: {
        carIdx: playerIdx,
        position: this.getVar('PlayerCarPosition'),
        classPosition: this.getVar('PlayerCarClassPosition'),
      },

      // Traffic awareness
      traffic: {
        carLeftRight: this.getVar('CarLeftRight'),
      },

      // Session flags
      flags: {
        sessionFlags: this.getVar('SessionFlags'),
      },

      // Powertrain - pedals, engine, transmission
      powertrain: {
        speedKph: (this.getVar('Speed') ?? 0) * 3.6, // m/s to km/h
        rpm: this.getVar('RPM'),
        gear: this.getVar('Gear'),
        throttle: this.getVar('Throttle'),
        brake: this.getVar('Brake'),
        clutch: this.getVar('Clutch'),
      },

      // Temperatures
      temps: {
        waterC: this.getVar('WaterTemp'),
        oilC: this.getVar('OilTemp'),
        trackC: this.getVar('TrackTempCrew'),
        airC: this.getVar('AirTemp'),
        // Tyre temps - promedio de izquierda, centro, derecha para cada rueda
        tyreC: [
          (this.avgTemp('LFtempCL', 'LFtempCM', 'LFtempCR') ?? 0),
          (this.avgTemp('RFtempCL', 'RFtempCM', 'RFtempCR') ?? 0),
          (this.avgTemp('LRtempCL', 'LRtempCM', 'LRtempCR') ?? 0),
          (this.avgTemp('RRtempCL', 'RRtempCM', 'RRtempCR') ?? 0),
        ],
        // Brake line pressure (bar) - representa calor indirecto
        brakeC: [
          (this.getVar('LFbrakeLinePress') ?? 0),
          (this.getVar('RFbrakeLinePress') ?? 0),
          (this.getVar('LRbrakeLinePress') ?? 0),
          (this.getVar('RRbrakeLinePress') ?? 0),
        ],
      },

      // Fuel
      fuel: {
        level: this.getVar('FuelLevel'),           // Liters remaining
        levelPct: this.getVar('FuelLevelPct'),     // Percent remaining (0-1)
        usePerHour: this.getVar('FuelUsePerHour'), // kg/h consumption
      },

      // Physics / dynamics
      physics: {
        steeringAngle: this.getVar('SteeringWheelAngle'),  // radians
        lateralG: this.getVar('LatAccel'),         // m/s^2
        longitudinalG: this.getVar('LongAccel'),   // m/s^2
      },

      // Session info
      session: {
        onPitRoad: this.getVar('OnPitRoad'),
        inGarage: this.getVar('IsInGarage'),
        isOnTrack: this.getVar('IsOnTrack'),
        incidents: this.getVar('PlayerCarMyIncidentCount'),
        lap: this.getVar('Lap'),
        lapsCompleted: this.getVar('LapCompleted'),
        lapDistPct: this.getVar('LapDistPct'),     // % around lap
        sessionTime: this.getVar('SessionTime'),
        sessionTimeRemain: this.getVar('SessionTimeRemain'),
        sessionLapsRemain: this.getVar('SessionLapsRemainEx'),
      },

      // Lap times
      lapTimes: {
        best: this.getVar('LapBestLapTime'),
        last: this.getVar('LapLastLapTime'),
        current: this.getVar('LapCurrentLapTime'),
      },

      // Car controls / settings
      carControls: {
        bias: this.getVar('dcBrakeBias'),
        absLevel: this.getVar('dcABS'),
        tcLevel: this.getVar('dcTractionControl'),
        absActive: this.getVar('BrakeABSactive'),
      },

      engineWarnings: this.getVar('EngineWarnings'),

      // Suspension & Aero (Phase 5)
      suspension: {
        rideHeight: [
          (this.getVar('LFrideHeight') ?? 0),
          (this.getVar('RFrideHeight') ?? 0),
          (this.getVar('LRrideHeight') ?? 0),
          (this.getVar('RRrideHeight') ?? 0)
        ],
        shockDeflection: [
          (this.getVar('LFshockDefl') ?? 0),
          (this.getVar('RFshockDefl') ?? 0),
          (this.getVar('LRshockDefl') ?? 0),
          (this.getVar('RRshockDefl') ?? 0)
        ],
        shockVelocity: [
          (this.getVar('LFshockVel') ?? 0),
          (this.getVar('RFshockVel') ?? 0),
          (this.getVar('LRshockVel') ?? 0),
          (this.getVar('RRshockVel') ?? 0)
        ],
      },

      aero: {
        frontRideHeight: this.avgTemp('LFrideHeight', 'LFrideHeight', 'RFrideHeight'), // Avg Front using existing helper hack
        rearRideHeight: this.avgTemp('LRrideHeight', 'LRrideHeight', 'RRrideHeight'), // Avg Rear
      },

      p2p: {
        status: this.getVar('P2P_Status'),
        count: this.getVar('P2P_Count'),
      },
    };
  }

  // Helper para calcular promedio de temperaturas
  private avgTemp(left: string, mid: string, right: string): number | undefined {
    const l = this.getVar(left);
    const m = this.getVar(mid);
    const r = this.getVar(right);
    if (l === undefined && m === undefined && r === undefined) return undefined;
    const vals = [l, m, r].filter(v => v !== undefined) as number[];
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
  }

  private getVar(varName: string): any {
    try {
      return irsdk.getTelemetryValue(varName);
    } catch {
      return undefined;
    }
  }

  private getSessionId(): string | undefined {
    try {
      const sessionNum = irsdk.getTelemetryValue('SessionNum');
      const sessionTime = irsdk.getTelemetryValue('SessionTime');

      if (sessionNum !== undefined && sessionTime !== undefined) {
        return `session-${sessionNum}-${Math.floor(sessionTime / 100)}`;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId) {
      return; // Ya hay un reconnect programado
    }

    this.log('Scheduling reconnect in 5 seconds...');
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = undefined;
      this.connect().catch((err) => {
        this.log(`Reconnect failed: ${err}`);
      });
    }, 5000);
  }

  private startMockMode(): void {
    this.log('Starting in MOCK mode - no real telemetry');
    this.connected = true;
    this.emit('connected');

    const mockCaps: CapabilityMap = {
      hasCarLeftRight: true,
      hasSessionFlags: true,
      hasWaterTemp: true,
      hasOilTemp: true,
      hasFuelLevel: false,
      hasEngineWarnings: false,
      hasTyreTemps: false,
      hasBrakeTemps: false,
      hasSteeringAngle: false,
      hasLateralG: false,
    };

    this.emit('capabilities', mockCaps);

    // Emitir frames mock muy básicos
    this.pollIntervalId = setInterval(() => {
      const frame: TelemetryFrame = {
        t: Date.now(),
        sim: 'iracing',
        sessionId: 'mock-session',
        player: { carIdx: 0 },
        traffic: { carLeftRight: undefined },
        flags: { sessionFlags: undefined },
        powertrain: {},
        temps: {},
      };

      this.emit('telemetry', frame);
    }, 1000);
  }

  private log(message: string): void {
    if (this.options.onLog) {
      this.options.onLog(message);
    }
  }
}
