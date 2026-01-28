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
    clutch_pct?: number | null;
    steering_rad?: number | null;
    position?: number | null;
    class_position?: number | null;
    lap?: number | null;
    laps_completed?: number | null;
    lap_dist_pct?: number | null;
    session_time?: number | null;
    session_laps_remain?: number | null;
    session_time_remain?: number | null;
    session_num?: number | null;
    session_state?: number | null;
    session_flags_raw?: number | null;
    traffic?: number | string | null;
    temps?: {
        water_c?: number | null;
        oil_c?: number | null;
        track_c?: number | null;
        air_c?: number | null;
    } | null;
    fuel_level?: number | null;
    fuel_level_pct?: number | null;
    fuel_use_per_hour?: number | null;
    on_pit_road?: boolean | null;
    in_garage?: boolean | null;
    pit_sv_flags?: number | null;
    incidents?: number | null;
    lap_times?: {
        best?: number | null;
        last?: number | null;
        current?: number | null;
    } | null;
    engine_warnings?: number | null;
    tickCount?: number | null;
    tickRate?: number | null;
    is_on_track?: boolean | null;
    is_replay_playing?: boolean | null;
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
