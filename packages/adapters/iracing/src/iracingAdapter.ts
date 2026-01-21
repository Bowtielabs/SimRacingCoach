import { EventEmitter } from "node:events";
import type { CapabilityMap, TelemetryFrame } from "../../../packages/core/src/types";
import * as IRacing from "irsdk-node";

export interface IRacingAdapterOptions {
  telemetryHz: number;
  sessionId: string;
}

export class IRacingAdapter extends EventEmitter {
  private opts: IRacingAdapterOptions;
  private connected = false;
  private sdk: any;

  constructor(opts: IRacingAdapterOptions) {
    super();
    this.opts = opts;
  }

  start() {
    this.sdk = IRacing;
    this.connected = true;
    this.emit("status", { connected: true });

    const caps: CapabilityMap = {
      hasCarLeftRight: true,
      hasSessionFlags: true,
      hasWaterTemp: true,
      hasOilTemp: true,
      hasTyreTemps: false,
      hasBrakeTemps: false
    };

    this.emit("capabilities", caps);

    const intervalMs = Math.max(5, Math.floor(1000 / this.opts.telemetryHz));
    setInterval(() => {
      if (!this.connected) return;

      const frame: TelemetryFrame = {
        t: Date.now(),
        sim: "iracing",
        sessionId: this.opts.sessionId,
        player: { carIdx: 0 },
        traffic: { carLeftRight: undefined },
        flags: { sessionFlags: undefined }
      };

      this.emit("frame", frame);
    }, intervalMs);
  }

  stop() {
    this.connected = false;
    this.emit("status", { connected: false });
    try { this.sdk?.shutdown?.(); } catch {}
  }
}
