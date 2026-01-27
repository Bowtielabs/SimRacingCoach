import pino from 'pino';
export interface LoggerOptions {
    logDir: string;
    level?: string;
    name?: string;
}
export declare function createLogger(options: LoggerOptions): pino.Logger<never, boolean>;
export declare class FpsTracker {
    private lastTick;
    private frames;
    private fps;
    tick(): number;
    get current(): number;
}
