import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';

export interface LoggerOptions {
  logDir: string;
  level?: string;
  name?: string;
}

export function createLogger(options: LoggerOptions) {
  fs.mkdirSync(options.logDir, { recursive: true });
  const logPath = path.join(options.logDir, 'simracing.log');
  const destination = pino.destination({ dest: logPath, sync: false });

  return pino(
    {
      level: options.level ?? 'info',
      name: options.name ?? 'simracing',
    },
    destination,
  );
}

export class FpsTracker {
  private lastTick = Date.now();
  private frames = 0;
  private fps = 0;

  tick(): number {
    this.frames += 1;
    const now = Date.now();
    if (now - this.lastTick >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastTick = now;
    }
    return this.fps;
  }

  get current(): number {
    return this.fps;
  }
}
