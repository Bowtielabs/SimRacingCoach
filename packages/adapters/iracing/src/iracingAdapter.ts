import { EventEmitter } from 'node:events';
import type { CapabilityMap, TelemetryFrame } from '../../../packages/core/src/types.js';


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

        // Construir frame de telemetría
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

    return {
      t: now,
      sim: 'iracing',
      sessionId: this.lastSessionId,
      player: {
        carIdx: this.getVar('PlayerCarIdx'),
      },
      traffic: {
        carLeftRight: this.getVar('CarLeftRight'),
      },
      flags: {
        sessionFlags: this.getVar('SessionFlags'),
      },
      powertrain: {
        speedKph: (this.getVar('Speed') ?? 0) * 3.6, // m/s to km/h
        rpm: this.getVar('RPM'),
        gear: this.getVar('Gear'),
        throttle: this.getVar('Throttle'),
        brake: this.getVar('Brake'),
      },
      temps: {
        waterC: this.getVar('WaterTemp'),
        oilC: this.getVar('OilTemp'),
        tyreC: [
          this.getVar('LFtempCL'),
          this.getVar('RFtempCL'),
          this.getVar('LRtempCL'),
          this.getVar('RRtempCL'),
        ],
        brakeC: [
          this.getVar('LFbrakeLinePress'),
          this.getVar('RFbrakeLinePress'),
          this.getVar('LRbrakeLinePress'),
          this.getVar('RRbrakeLinePress'),
        ],
      },
      fuel: {
        level: this.getVar('FuelLevel'),
      },
      physics: {
        steeringAngle: this.getVar('SteeringWheelAngle'),  // Returns value in radians, ~-1 to 1
        lateralG: this.getVar('LatAccel'),  // Lateral acceleration in G
        longitudinalG: this.getVar('LongAccel'),  // Longitudinal acceleration in G
      },
      engineWarnings: this.getVar('EngineWarnings'),
    };
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
