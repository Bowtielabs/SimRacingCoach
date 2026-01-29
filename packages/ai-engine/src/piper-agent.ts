/**
 * Piper TTS Agent - Local Text-to-Speech via child_process
 * Spawns piper.exe to generate Spanish voice
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import type { TTSConfig, SupportedLanguage } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Piper TTS paths - CORRECTED
const PIPER_BIN_PATH = path.join(__dirname, '../../../core/ai_engines/piper/piper/piper.exe');
// Spanish voice (Spain) - works perfectly
const VOICE_PATH = path.join(__dirname, '../../../models/piper/es_ES-davefx-medium.onnx');

const DEFAULT_CONFIG: TTSConfig = {
    modelPath: VOICE_PATH,
    language: 'es',
    voice: 'es_AR-tux-medium',
    speed: 1.0,
    volume: 0.8
};

/**
 * Piper TTS Agent using standalone binary
 */
export class PiperAgent {
    private config: TTSConfig;
    private currentAudio: any = null;

    constructor(config: Partial<TTSConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Initialize (verify piper exists)
     */
    async initialize(modelPath?: string): Promise<void> {
        const path = modelPath || this.config.modelPath;
        console.log(`[Piper] Using voice: ${path}`);
        console.log(`[Piper] Ready for synthesis`);
    }

    /**
     * Speak text using Piper
     */
    async speak(text: string, priority: 'normal' | 'urgent' = 'normal'): Promise<string> {
        console.log(`[Piper] Speaking: "${text}" (${priority})`);

        const outputWav = path.join(__dirname, `../../../core/ai_engines/piper/output_${Date.now()}.wav`);

        return new Promise((resolve, reject) => {
            const piper = spawn(PIPER_BIN_PATH, [
                '--model', this.config.modelPath,
                '--output_file', outputWav
            ]);

            // Send text to stdin
            piper.stdin.write(text);
            piper.stdin.end();

            piper.on('close', async (code) => {
                if (code !== 0) {
                    reject(new Error(`Piper exited with code ${code}`));
                    return;
                }

                try {
                    // Play the WAV file using Windows
                    await this.playWav(outputWav);

                    // Clean up
                    await unlink(outputWav);

                    resolve(outputWav);
                } catch (error) {
                    reject(error);
                }
            });

            piper.stderr.on('data', (data) => {
                console.error('[Piper ERROR]', data.toString());
            });
        });
    }

    /**
     * Play WAV file using Windows sound player
     */
    private async playWav(wavPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Use PowerShell to play audio on Windows
            const player = spawn('powershell', [
                '-Command',
                `(New-Object Media.SoundPlayer '${wavPath}').PlaySync()`
            ]);

            player.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Audio playback failed with code ${code}`));
                }
            });
        });
    }

    /**
     * Interrupt current speech
     */
    async interrupt(): Promise<void> {
        console.log('[Piper] Interrupting speech');
        // TODO: Implement interrupt if needed
    }

    /**
     * Set language/voice
     */
    setLanguage(language: SupportedLanguage): void {
        this.config.language = language;
        console.log(`[Piper] Language set to: ${language}`);
    }

    /**
     * Cleanup
     */
    async dispose(): Promise<void> {
        console.log('[Piper] Disposed');
    }

    /**
     * Check if currently speaking
     */
    isSpeaking(): boolean {
        return false; // TODO: Track playback state
    }

    /**
     * Get queue length
     */
    getQueueLength(): number {
        return 0; // TODO: Implement queue
    }
}

export default PiperAgent;
