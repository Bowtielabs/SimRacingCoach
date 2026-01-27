import { LocalEvent } from './types.js';
export type FlagType = 'yellow' | 'black' | 'blue';
export interface FlagEvent {
    type: FlagType;
    event: LocalEvent;
}
export declare function decodeFlags(mask: number, t: number): FlagEvent[];
