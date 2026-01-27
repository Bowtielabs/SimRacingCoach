import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
export function createLogger(options) {
    fs.mkdirSync(options.logDir, { recursive: true });
    const logPath = path.join(options.logDir, 'simracing.log');
    const streams = [
        {
            level: options.level ?? 'info',
            stream: pino.destination({ dest: logPath, sync: false }),
        },
        {
            level: options.level ?? 'info',
            stream: pino.transport({
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname',
                },
            }),
        },
    ];
    return pino({
        level: options.level ?? 'info',
        name: options.name ?? 'simracing',
    }, pino.multistream(streams));
}
export class FpsTracker {
    lastTick = Date.now();
    frames = 0;
    fps = 0;
    tick() {
        this.frames += 1;
        const now = Date.now();
        if (now - this.lastTick >= 1000) {
            this.fps = this.frames;
            this.frames = 0;
            this.lastTick = now;
        }
        return this.fps;
    }
    get current() {
        return this.fps;
    }
}
//# sourceMappingURL=index.js.map