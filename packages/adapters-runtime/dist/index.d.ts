import { EventEmitter } from 'node:events';
export type AdapterId = 'iracing' | 'ams2' | 'raceroom' | 'rfactor' | 'rfactor2' | 'automobilista' | 'simutc' | 'ac' | 'acc' | 'mock-iracing' | 'other';
export type AdapterStatusState = 'waiting' | 'connected' | 'disconnected' | 'error';
export interface AdapterSpec {
    id: AdapterId;
    label: string;
    simName: string;
}
export declare const ADAPTER_SPECS: AdapterSpec[];
export interface NormalizedFrame {
    speed_mps?: number | null;
    rpm?: number | null;
    gear?: number | null;
    throttle_pct?: number | null;
    brake_pct?: number | null;
    steering_rad?: number | null;
    lap?: number | null;
    session_flags_raw?: number | null;
    traffic?: number | string | null;
    temps?: {
        water_c?: number | null;
        oil_c?: number | null;
    } | null;
    fuel_level?: number | null;
    on_pit_road?: boolean | null;
    incidents?: number | null;
    lap_times?: {
        best?: number | null;
        last?: number | null;
    } | null;
    engine_warnings?: number | null;
    tickCount?: number | null;
    tickRate?: number | null;
}
export interface AdapterStatusMessage {
    type: 'status';
    state: AdapterStatusState;
    sim: string;
    details?: string;
}
export interface AdapterFrameMessage {
    type: 'frame';
    sim: string;
    ts: number;
    data: NormalizedFrame;
}
export interface AdapterLogMessage {
    type: 'log';
    level: 'info' | 'warn' | 'error';
    message: string;
}
export interface AdapterSessionInfoMessage {
    type: 'sessionInfo';
    sim: string;
    ts: number;
    yaml: string;
}
export type AdapterMessage = AdapterStatusMessage | AdapterFrameMessage | AdapterLogMessage | AdapterSessionInfoMessage;
export interface AdapterCommand {
    command: string;
    args: string[];
    env?: NodeJS.ProcessEnv;
    cwd?: string;
}
export type AdapterCommandResolver = (adapterId: AdapterId) => Promise<AdapterCommand | null> | AdapterCommand | null;
export interface AdapterSupervisorOptions {
    adapterId: AdapterId;
    resolveCommand: AdapterCommandResolver;
    env?: NodeJS.ProcessEnv;
}
export declare class AdapterSupervisor extends EventEmitter {
    private adapterId;
    private resolveCommand;
    private env?;
    private child;
    private buffer;
    private stopRequested;
    private restartAttempts;
    private restartTimer?;
    private lastStatus?;
    constructor(options: AdapterSupervisorOptions);
    start(): void;
    stop(): void;
    private spawnAdapter;
    private handleStdout;
    private handleStderr;
    private handleMessage;
    private emitStatus;
    private handleExit;
}
export declare function getAdapterSpec(adapterId: AdapterId): AdapterSpec;
