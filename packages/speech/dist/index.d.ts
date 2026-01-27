import { LocalEvent } from '@simracing/core';
export interface SpeechOptions {
    voice?: string;
    volume: number;
    rate: number;
}
export declare class SpeechQueue {
    private queue;
    private currentProcess;
    private muted;
    private focusMode;
    private lastSpoken?;
    private options;
    private onSpeak?;
    private speaking;
    constructor(options: SpeechOptions, onSpeak?: (text: string, options: SpeechOptions) => void);
    updateOptions(options: Partial<SpeechOptions>): void;
    setMuted(muted: boolean): void;
    toggleFocusMode(): void;
    setFocusMode(value: boolean): void;
    setSpeakHandler(handler: (text: string, options: SpeechOptions) => void): void;
    enqueue(event: LocalEvent, bargeIn: boolean): void;
    repeatLast(): void;
    private interrupt;
    private playNext;
    static getAvailableVoices(): Promise<string[]>;
}
