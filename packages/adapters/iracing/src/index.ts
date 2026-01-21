import { EventEmitter } from 'node:events';
import { CapabilityMap, TelemetryFrame } from '@simracing/core';

export interface IracingAdapterOptions {
  debugDump?: boolean;
  onLog?: (message: string) => void;
}

export interface IracingAdapterEvents {
  telemetry: (frame: TelemetryFrame) => void;
  connected: () => void;
  disconnected: () => void;
  capabilities: (capabilities: CapabilityMap) => void;
  session: (sessionId?: string) => void;
}

const DEFAULT_CAPABILITIES: CapabilityMap = {
  hasCarLeftRight: false,
  hasSessionFlags: false,
  hasWaterTemp: false,
  hasOilTemp: false,
  hasFuelLevel: false,
  hasEngineWarnings: false,
  hasTyreTemps: false,
  hasBrakeTemps: false,
};

export class IracingAdapter extends EventEmitter {
  private client: any;
  private sessionId?: string;
  private capabilities: CapabilityMap = { ...DEFAULT_CAPABILITIES };
  private options: IracingAdapterOptions;
  private lastDumpAt = 0;

  constructor(options: IracingAdapterOptions = {}) {
    super();
    this.options = options;
  }

  async connect() {
    const irsdkModule: any = await import('irsdk-node');
    const irsdk = irsdkModule.default ?? irsdkModule;

    this.client = typeof irsdk.init === 'function' ? irsdk.init() : new irsdk.Iracing();

    this.registerHandler('Connected', () => this.emit('connected'));
    this.registerHandler('Disconnected', () => this.emit('disconnected'));
    this.registerHandler('SessionInfo', (data: any) => this.handleSessionInfo(data));
    this.registerHandler('TelemetryDescription', (data: any) => this.handleTelemetryDescription(data));
    this.registerHandler('Telemetry', (data: any) => this.handleTelemetry(data));
  }

  disconnect() {
    if (this.client?.disconnect) {
      this.client.disconnect();
    }
  }

  getCapabilities() {
    return this.capabilities;
  }

  private registerHandler(event: string, handler: (...args: any[]) => void) {
    const lowerEvent = event.toLowerCase();
    this.client?.on?.(event, handler);
    this.client?.on?.(lowerEvent, handler);
  }

  private handleSessionInfo(data: any) {
    const sessionId =
      data?.WeekendInfo?.SessionID?.toString() ??
      data?.SessionInfo?.Sessions?.[0]?.SessionID?.toString();
    if (sessionId && sessionId !== this.sessionId) {
      this.sessionId = sessionId;
      this.emit('session', sessionId);
    }
  }

  private handleTelemetryDescription(data: any) {
    const keys = Object.keys(data ?? {});
    if (keys.length > 0) {
      this.capabilities = buildCapabilities(keys);
      this.emit('capabilities', this.capabilities);
    }
  }

  private handleTelemetry(data: Record<string, any>) {
    if (!data) {
      return;
    }

    const keys = Object.keys(data);
    if (!this.options.debugDump && keys.length > 0 && !this.capabilities.hasCarLeftRight) {
      this.capabilities = buildCapabilities(keys);
      this.emit('capabilities', this.capabilities);
    }

    if (this.options.debugDump) {
      this.dumpTelemetry(keys, data);
    }

    const frame: TelemetryFrame = {
      t: Date.now(),
      sim: 'iracing',
      sessionId: this.sessionId,
      player: {
        carIdx: data.PlayerCarIdx,
      },
      traffic: {
        carLeftRight: data.CarLeftRight,
      },
      flags: {
        sessionFlags: data.SessionFlags,
      },
      powertrain: {
        speedKph: typeof data.Speed === 'number' ? data.Speed * 3.6 : undefined,
        rpm: data.RPM,
        gear: data.Gear,
        throttle: data.Throttle,
        brake: data.Brake,
      },
      temps: {
        waterC: data.WaterTemp,
        oilC: data.OilTemp,
      },
      fuel: {
        level: data.FuelLevel,
      },
      engineWarnings: data.EngineWarnings,
    };

    this.emit('telemetry', frame);
  }

  private dumpTelemetry(keys: string[], data: Record<string, any>) {
    const now = Date.now();
    if (now - this.lastDumpAt < 2000) {
      return;
    }
    this.lastDumpAt = now;
    const sample = {
      CarLeftRight: data.CarLeftRight,
      SessionFlags: data.SessionFlags,
      PlayerCarIdx: data.PlayerCarIdx,
      WaterTemp: data.WaterTemp,
      OilTemp: data.OilTemp,
      FuelLevel: data.FuelLevel,
      EngineWarnings: data.EngineWarnings,
    };
    this.options.onLog?.(`Telemetry keys: ${keys.join(', ')}`);
    this.options.onLog?.(`Telemetry sample: ${JSON.stringify(sample)}`);
  }
}

function buildCapabilities(keys: string[]): CapabilityMap {
  const has = (key: string) => keys.includes(key);

  return {
    hasCarLeftRight: has('CarLeftRight'),
    hasSessionFlags: has('SessionFlags'),
    hasWaterTemp: has('WaterTemp'),
    hasOilTemp: has('OilTemp'),
    hasFuelLevel: has('FuelLevel'),
    hasEngineWarnings: has('EngineWarnings'),
    hasTyreTemps: has('LFtempCL') || has('RRtempCL'),
    hasBrakeTemps: has('LFbrakeLinePress') || has('LFbrakeTemp'),
  };
}
