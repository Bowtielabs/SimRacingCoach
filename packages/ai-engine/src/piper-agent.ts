/**
 * Piper TTS Agent - Sound-Play Version
 * Uses sound-play for audio playback (pure JS, no external dependencies)
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFile, unlink } from 'fs/promises';
// @ts-ignore - sound-play doesn't have type definitions
import soundPlay from 'sound-play';
import type { TTSConfig, SupportedLanguage } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Piper TTS paths
const PIPER_BIN_PATH = path.join(__dirname, '../../../core/ai_engines/piper/piper/piper.exe');
const VOICE_PATH = path.join(__dirname, '../../../core/ai_engines/piper/es_AR-daniela.onnx');

// Audio config for Daniela voice
const SAMPLE_RATE = 22050;

const DEFAULT_CONFIG: TTSConfig = {
    modelPath: VOICE_PATH,
    language: 'es',
    voice: 'es_AR-daniela',
    speed: 1.0,
    volume: 0.8
};

/**
 * Create WAV header for raw PCM data
 */
function createWavHeader(dataLength: number): Buffer {
    const header = Buffer.alloc(44);
    const byteRate = SAMPLE_RATE * 1 * 16 / 8;
    const blockAlign = 1 * 16 / 8;

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(SAMPLE_RATE, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);

    return header;
}

/**
 * Piper TTS Agent with sound-play for audio playback
 */
export class PiperAgent {
    private config: TTSConfig;
    private _isSpeaking: boolean = false;
    private speakQueue: Array<{ text: string; priority: string; speed: number; resolve: (value: string) => void; reject: (error: Error) => void }> = [];
    private isInitialized: boolean = false;

    constructor(config: Partial<TTSConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    async initialize(modelPath?: string): Promise<void> {
        // Usar path por defecto si no se especifica o es vacío
        const voicePath = modelPath || this.config.modelPath || VOICE_PATH;
        this.config.modelPath = voicePath; // Guardar en config para uso en speak()
        console.log(`[Piper] Using voice: ${voicePath}`);
        this.isInitialized = true;
        console.log(`[Piper] Ready for synthesis (sound-play)`);
    }

    async speak(text: string, priority: 'normal' | 'urgent' = 'normal', speed: number = 1.0): Promise<string> {
        console.log(`[Piper] Queueing: "${text.substring(0, 50)}..." (${priority}, speed: ${speed})`);

        if (this._isSpeaking) {
            console.log(`[Piper] Already speaking, adding to queue (queue size: ${this.speakQueue.length})`);
            return new Promise((resolve, reject) => {
                this.speakQueue.push({ text, priority, speed, resolve, reject });
            });
        }

        return this.doSpeak(text, speed);
    }

    /**
     * Perform TTS with sound-play
     */
    private async doSpeak(text: string, speed: number): Promise<string> {
        this._isSpeaking = true;
        const startTime = Date.now();
        console.log(`[Piper] 🔊 Speaking: "${text.substring(0, 50)}..."`);

        const lengthScale = 1.0 / speed;
        const pcmChunks: Buffer[] = [];

        try {
            // Log the actual piper path and args for debugging
            const piperArgs = [
                '--model', this.config.modelPath,
                '--output_raw',
                '--length_scale', lengthScale.toFixed(2)
            ];
            console.log(`[Piper] DEBUG - Path: ${PIPER_BIN_PATH}`);
            console.log(`[Piper] DEBUG - Model: ${this.config.modelPath}`);

            // Collect PCM data from Piper
            await new Promise<void>((resolve, reject) => {
                const piper = spawn(PIPER_BIN_PATH, piperArgs);

                piper.stdin.write(text);
                piper.stdin.end();

                piper.stdout.on('data', (chunk: Buffer) => {
                    pcmChunks.push(chunk);
                });

                piper.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Piper exited with code ${code}`));
                        return;
                    }
                    resolve();
                });

                piper.stderr.on('data', (data) => {
                    const msg = data.toString();
                    if (msg.includes('[error]')) {
                        console.error('[Piper ERROR]', msg);
                    }
                });
            });

            const pcmData = Buffer.concat(pcmChunks);
            const synthesisTime = Date.now() - startTime;
            const audioDurationMs = (pcmData.length / (SAMPLE_RATE * 2)) * 1000;
            console.log(`[Piper] ⚡ Synthesis: ${synthesisTime}ms, audio: ${Math.round(audioDurationMs)}ms`);

            // Create WAV
            const wavHeader = createWavHeader(pcmData.length);
            const wavData = Buffer.concat([wavHeader, pcmData]);

            // Write temp file
            const tempWav = path.join(__dirname, `../../../core/ai_engines/piper/audio_${Date.now()}.wav`);
            await writeFile(tempWav, wavData);

            // Play with sound-play (starts immediately, returns before done)
            const playStart = Date.now();
            soundPlay.play(tempWav, this.config.volume);

            // Wait for audio to finish
            await new Promise(resolve => setTimeout(resolve, audioDurationMs + 200));

            const playTime = Date.now() - playStart;
            await unlink(tempWav).catch(() => { });

            const totalTime = Date.now() - startTime;
            console.log(`[Piper] ✅ Total: ${totalTime}ms (synthesis: ${synthesisTime}ms, play: ${playTime}ms)`);

            return tempWav;
        } finally {
            this._isSpeaking = false;
            this.processQueue();
        }
    }

    private async processQueue(): Promise<void> {
        if (this.speakQueue.length === 0) return;
        if (this._isSpeaking) return;

        const next = this.speakQueue.shift()!;
        console.log(`[Piper] Processing queue item (${this.speakQueue.length} remaining)`);

        try {
            const result = await this.doSpeak(next.text, next.speed);
            next.resolve(result);
        } catch (error) {
            next.reject(error as Error);
        }
    }

    async interrupt(): Promise<void> {
        console.log('[Piper] Interrupting speech');
    }

    setLanguage(language: SupportedLanguage): void {
        this.config.language = language;
        console.log(`[Piper] Language set to: ${language}`);
    }

    async dispose(): Promise<void> {
        console.log('[Piper] Disposed');
    }

    isSpeaking(): boolean {
        return this._isSpeaking;
    }

    getQueueLength(): number {
        return this.speakQueue.length;
    }
}

export default PiperAgent;
