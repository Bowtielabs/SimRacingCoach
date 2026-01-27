import { CapabilityMap, LocalEvent, LocalEventConfig, TelemetryFrame } from './types.js';
export declare class LocalEventEngine {
    private readonly capabilities;
    private readonly config;
    private lastTrafficState;
    private lastFlags;
    private tempStates;
    constructor(capabilities: CapabilityMap, config: LocalEventConfig);
    update(frame: TelemetryFrame): LocalEvent[];
    private buildTrafficEvent;
    private checkTemperature;
    private decodeEngineWarnings;
}
