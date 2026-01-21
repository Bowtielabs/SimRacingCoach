export type SimName = 'iracing';

export type Category = 'TRAFFIC' | 'FLAGS' | 'ENGINE' | 'COACHING' | 'SYSTEM';

export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

export type Priority = 1 | 2 | 3 | 4 | 5;

export interface TelemetryFrame {
  t: number;
  sim: SimName;
  sessionId?: string;
  player: {
    carIdx?: number;
  };
  traffic: {
    carLeftRight?: number;
  };
  flags: {
    sessionFlags?: number;
  };
  powertrain: {
    speedKph?: number;
    rpm?: number;
    gear?: number;
    throttle?: number;
    brake?: number;
  };
  temps: {
    waterC?: number;
    oilC?: number;
    tyreC?: number[];
    brakeC?: number[];
  };
  fuel?: {
    level?: number;
  };
  engineWarnings?: number;
}

export interface CapabilityMap {
  hasCarLeftRight: boolean;
  hasSessionFlags: boolean;
  hasWaterTemp: boolean;
  hasOilTemp: boolean;
  hasFuelLevel: boolean;
  hasEngineWarnings: boolean;
  hasTyreTemps: boolean;
  hasBrakeTemps: boolean;
}

export interface LocalEvent {
  id: string;
  t: number;
  category: Category;
  severity: Severity;
  priority: Priority;
  cooldownMs: number;
  text: string;
  source?: 'local' | 'remote';
  metadata?: Record<string, unknown>;
}

export interface ApiMessage extends LocalEvent {
  sessionId?: string;
}

export interface Recommendation extends LocalEvent {
  id: string;
  source: 'remote';
}

export interface TemperatureThresholds {
  warning: number;
  critical: number;
}

export interface LocalEventConfig {
  waterTemp?: TemperatureThresholds;
  oilTemp?: TemperatureThresholds;
}

export interface TrafficState {
  carLeftRight?: number;
}

export interface RouterEvent {
  event: LocalEvent;
  dedupeKey: string;
}

export interface RouterOptions {
  focusMode: boolean;
}
