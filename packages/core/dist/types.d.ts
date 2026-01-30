export type SimName = 'iracing' | 'acc' | 'f1' | 'assetto_corsa' | 'rfactor' | 'rfactor2' | 'automobilista2' | 'project_cars2' | 'beamng' | 'dirt_rally' | 'wreckfest' | 'actc' | 'generic';
export type Category = 'TRAFFIC' | 'FLAGS' | 'ENGINE' | 'COACHING' | 'SYSTEM';
export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';
export type Priority = 1 | 2 | 3 | 4 | 5;
export interface TelemetryFrame {
    t: number;
    sim: SimName;
    sessionId?: string;
    player: {
        carIdx?: number;
        position?: number;
        classPosition?: number;
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
        clutch?: number;
    };
    temps: {
        waterC?: number;
        oilC?: number;
        trackC?: number;
        airC?: number;
        tyreC?: number[];
        brakeC?: number[];
    };
    fuel?: {
        level?: number;
        levelPct?: number;
        usePerHour?: number;
    };
    physics?: {
        steeringAngle?: number;
        lateralG?: number;
        longitudinalG?: number;
    };
    session?: {
        onPitRoad?: boolean;
        inGarage?: boolean;
        isOnTrack?: boolean;
        incidents?: number;
        lap?: number;
        lapsCompleted?: number;
        sessionTime?: number;
        sessionLapsRemain?: number;
        sessionTimeRemain?: number;
    };
    lapTimes?: {
        best?: number;
        last?: number;
        current?: number;
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
    hasSteeringAngle: boolean;
    hasLateralG: boolean;
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
