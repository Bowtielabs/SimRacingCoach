import { LocalEvent, RouterOptions } from './types.js';
export interface RoutedEvent {
    event: LocalEvent;
    shouldBarge: boolean;
}
export declare class EventRouter {
    private options;
    private state;
    constructor(options: RouterOptions);
    updateOptions(options: Partial<RouterOptions>): void;
    route(events: LocalEvent[]): RoutedEvent[];
}
