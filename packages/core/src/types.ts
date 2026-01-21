export type Severity = "CRITICAL" | "WARNING" | "INFO" | "COACH";

export type Category =
  | "TRAFFIC"
  | "FLAGS"
  | "ENGINE"
  | "TEMPS"
  | "PIT"
  | "SYSTEM"
  | "COACHING";

export interface TelemetryFrame {
  t: number;
  sim: "iracing";
  sessionId: string;

  player: { carIdx: number };

  traffic?: { carLeftRight?: number };
  flags?: { sessionFlags?: number };

  powertrain?: {
    speedKph?: number;
    rpm?: number;
    gear?: number;
    throttle?: number;
    brake?: number;
  };

  temps?: {
    waterC?: number;
    oilC?: number;
    tyreTempC?: { fl?: number; fr?: number; rl?: number; rr?: number };
    brakeTempC?: { fl?: number; fr?: number; rl?: number; rr?: number };
  };
}

export interface CapabilityMap {
  hasCarLeftRight: boolean;
  hasSessionFlags: boolean;
  hasWaterTemp: boolean;
  hasOilTemp: boolean;
  hasTyreTemps: boolean;
  hasBrakeTemps: boolean;
}

export interface LocalEvent {
  id: string;
  t: number;
  category: Category;
  severity: Severity;
  priority: number;
  cooldownMs: number;
  text: string;
}
