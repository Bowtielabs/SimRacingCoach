/**
 * TTS Agent - Piper TTS Integration
 * Text-to-Speech with multilingual voices and priority queue
 */

import { EventEmitter } from 'events';
import PQueue from 'p-queue';
import { randomUUID } from 'crypto';
import type { TTSConfig, TTSQueueItem, TTSEvent, SupportedLanguage } from './types.js';

const DEFAULT_CONFIG: TTSConfig = {
    modelPath: '',
    language: 'es',
    voice: 'es_AR-tux-medium',
    speed: 1.0,
    volume: 0.8
};

/**
 * Voice models for each language
 */
const VOICE_MODELS: Record<SupportedLanguage, string> = {
    es: 'es_AR-tux-medium', // Spanish Argentina as default
    en: 'en_US-lessac-medium',
    pt: 'pt_BR-faber-medium',
    fr: 'fr_FR-siwis-medium',
    it: 'it_IT-riccardo-medium'
};

/**
 * TTS Agent using Piper
 */
export class TTSAgent extends EventEmitter {
    private config: TTSConfig;
    private queue: PQueue;
    private queuedItems: Map<string, TTSQueueItem> = new Map();
    private currentItemId: string | null = null;

    constructor(config: Partial<TTSConfig> = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Priority queue: urgent items first
        this.queue = new PQueue({
            concurrency: 1, // One speech at a time
            autoStart: true
        });
    }

    /**
     * Initialize TTS engine
     */
    async initialize(modelPath?: string): Promise<void> {
        const path = modelPath || this.config.modelPath;
        if (!path) {
            throw new Error('Model path not specified');
        }

        console.log(`[TTSAgent] Initializing with voice: ${this.config.voice}`);
        console.log(`[TTSAgent] Language: ${this.config.language}`);

        // TODO: Load Piper model and initialize audio output

        this.emit('ready');
    }

    /**
     * Speak text with priority
     */
    async speak(text: string, priority: 'normal' | 'urgent' = 'normal'): Promise<string> {
        const id = randomUUID();
        const item: TTSQueueItem = {
            text,
            priority,
            id,
            createdAt: Date.now()
        };

        this.queuedItems.set(id, item);

        console.log(`[TTSAgent] Queuing speech: "${text}" (${priority})`);

        // Add to queue with priority
        const queuePriority = priority === 'urgent' ? 10 : 0;

        this.queue.add(async () => {
            await this.synthesizeAndPlay(item);
        }, { priority: queuePriority });

        return id;
    }

    /**
     * Synthesize speech and play audio
     */
    private async synthesizeAndPlay(item: TTSQueueItem): Promise<void> {
        this.currentItemId = item.id;

        this.emit('event', {
            type: 'started',
            id: item.id
        } as TTSEvent);

        try {
            console.log(`[TTSAgent] Speaking: "${item.text}"`);

            // TODO: Call Piper to synthesize audio
            // TODO: Play audio through speaker
            // Simulate speech duration
            const duration = item.text.length * 50; // ~50ms per character
            await new Promise(resolve => setTimeout(resolve, duration));

            this.emit('event', {
                type: 'completed',
                id: item.id
            } as TTSEvent);

            this.queuedItems.delete(item.id);
            this.currentItemId = null;
        } catch (error) {
            console.error(`[TTSAgent] Error speaking:`, error);

            this.emit('event', {
                type: 'error',
                id: item.id,
                error: error as Error
            } as TTSEvent);

            this.currentItemId = null;
        }
    }

    /**
     * Interrupt current speech and clear queue
     */
    async interrupt(): Promise<void> {
        console.log('[TTSAgent] Interrupting speech and clearing queue');

        // Clear queue
        this.queue.clear();

        // Stop current playback
        if (this.currentItemId) {
            this.emit('event', {
                type: 'interrupted',
                id: this.currentItemId
            } as TTSEvent);

            // TODO: Stop audio playback immediately
        }

        // Clear queued items
        this.queuedItems.clear();
        this.currentItemId = null;
    }

    /**
     * Get current queue length
     */
    getQueueLength(): number {
        return this.queue.size + this.queue.pending;
    }

    /**
     * Check if currently speaking
     */
    isSpeaking(): boolean {
        return this.currentItemId !== null;
    }

    /**
     * Set language and voice
     */
    setLanguage(language: SupportedLanguage): void {
        this.config.language = language;
        this.config.voice = VOICE_MODELS[language];
        console.log(`[TTSAgent] Language set to: ${language}, voice: ${this.config.voice}`);

        // TODO: Reload model if needed
    }

    /**
     * Set speaking speed
     */
    setSpeed(speed: number): void {
        this.config.speed = Math.max(0.5, Math.min(2.0, speed));
        console.log(`[TTSAgent] Speed set to: ${this.config.speed}`);
    }

    /**
     * Set volume
     */
    setVolume(volume: number): void {
        this.config.volume = Math.max(0.0, Math.min(1.0, volume));
        console.log(`[TTSAgent] Volume set to: ${this.config.volume}`);
    }

    /**
     * Cleanup
     */
    async dispose(): Promise<void> {
        await this.interrupt();
        this.queue.pause();
        console.log('[TTSAgent] Disposed');
    }
}

export default TTSAgent;
