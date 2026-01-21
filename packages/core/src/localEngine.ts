import type { LocalEvent, TelemetryFrame } from "./types";

export class LocalEngine {
  private lastCarLeftRight: number | undefined;
  private lastAnnounceAt: Record<string, number> = {};

  onFrame(f: TelemetryFrame): LocalEvent[] {
    const events: LocalEvent[] = [];

    const clr = f.traffic?.carLeftRight;
    if (typeof clr === "number" && clr !== this.lastCarLeftRight) {
      const text = this.mapCarLeftRightToText(clr);
      if (text) {
        const id = `TRAFFIC:${text}`;
        if (this.cooldownOk(id, 1200)) {
          events.push({
            id,
            t: f.t,
            category: "TRAFFIC",
            severity: "CRITICAL",
            priority: 100,
            cooldownMs: 1200,
            text
          });
        }
      }
      this.lastCarLeftRight = clr;
    }

    return events;
  }

  private cooldownOk(key: string, cooldownMs: number): boolean {
    const now = Date.now();
    const last = this.lastAnnounceAt[key] ?? 0;
    if (now - last < cooldownMs) return false;
    this.lastAnnounceAt[key] = now;
    return true;
  }

  private mapCarLeftRightToText(v: number): string | null {
    switch (v) {
      case 1: return "Auto a la izquierda";
      case 2: return "Auto a la derecha";
      case 3: return "Tres autos";
      default: return null;
    }
  }
}
