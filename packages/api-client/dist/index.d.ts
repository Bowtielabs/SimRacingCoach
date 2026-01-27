import { Recommendation, TelemetryFrame } from '@simracing/core';
export interface ApiClientOptions {
    baseUrl: string;
    token?: string;
}
export declare class ApiClient {
    private readonly options;
    private ws?;
    private pollTimer?;
    constructor(options: ApiClientOptions);
    sendTelemetry(frames: TelemetryFrame[]): Promise<boolean>;
    connectRecommendations(sessionId: string, onMessage: (message: Recommendation) => void, onStatus: (status: 'online' | 'offline') => void): void;
    disconnectRecommendations(): void;
    private startPolling;
}
