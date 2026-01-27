import { CapabilityMap, LocalEvent, LocalEventConfig, TelemetryFrame } from './types.js';
export declare class LocalEventEngine {
    private readonly capabilities;
    private readonly config;
    private lastTrafficState;
    private lastFlags;
    private tempStates;
    private lastFuelLevel;
    private fuelWarningThreshold;
    private lastOnPitRoad;
    private lastIncidents;
    private lastBestLap;
    constructor(capabilities: CapabilityMap, config: LocalEventConfig);
    update(frame: TelemetryFrame): LocalEvent[];
    private buildTrafficEvent;
    private checkTemperature;
    private decodeEngineWarnings;
    private checkFuelLevel;
}
