import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AudioAgentConfig {
    audioDir?: string;
    volume?: number;
}

export class PrerenderedAudioAgent {
    private audioDir: string;
    private volume: number;
    private isPlaying: boolean = false;
    private queue: string[] = [];

    // Cache to check if files exist before trying to play
    private availableFiles: Set<string> = new Set();

    constructor(config: AudioAgentConfig = {}) {
        // Default to core/ai_engines/piper/prerendered relative to this file
        // In dev (ts-node/tsx), we are in packages/ai-engine/src
        // In prod (dist), we are in resources/service/core... or similar

        // DEV PATH logic
        const devPath = path.resolve(__dirname, '../../../core/ai_engines/piper/prerendered');
        this.audioDir = config.audioDir || devPath;

        // Debug
        // console.log(`[AudioAgent] Resolved audioDir: ${this.audioDir}`);

        if (!fs.existsSync(this.audioDir)) {
            console.warn(`[AudioAgent] ⚠️ WARN: Audio directory missing at ${this.audioDir}`);
            // Fallback
            const fallbackPath = path.resolve(process.cwd(), 'core/ai_engines/piper/prerendered');
            // console.log(`[AudioAgent] Trying fallback path: ${fallbackPath}`);
            if (fs.existsSync(fallbackPath)) {
                // console.log('[AudioAgent] ✅ Found at fallback path!');
                this.audioDir = fallbackPath;
            }
        }
        this.volume = config.volume || 1.0;

        this.scanAvailableFiles();
    }

    private scanAvailableFiles() {
        try {
            if (fs.existsSync(this.audioDir)) {
                const files = fs.readdirSync(this.audioDir);
                files.forEach(file => {
                    if (file.endsWith('.wav')) {
                        this.availableFiles.add(file.replace('.wav', ''));
                    }
                });
                console.log(`[AudioAgent] Indexed ${this.availableFiles.size} audio files in ${this.audioDir}`);
            } else {
                console.warn(`[AudioAgent] Warning: Audio directory not found: ${this.audioDir}`);
            }
        } catch (err) {
            console.error('[AudioAgent] Failed to scan audio files:', err);
        }
    }

    async initialize(): Promise<void> {
        console.log('[AudioAgent] Initialized (ffplay Mode)');
        // Check availability of ffplay?
        exec('ffplay -version', (err) => {
            if (err) {
                console.warn('[AudioAgent] ⚠️ ffplay not found in PATH. Audio may fail.');
            } else {
                console.log('[AudioAgent] ✅ ffplay found.');
            }
        });
        return Promise.resolve();
    }

    async speak(ruleId: string, priority: 'normal' | 'urgent' = 'normal'): Promise<void> {
        if (priority === 'urgent') {
            this.queue.unshift(ruleId);
        } else {
            this.queue.push(ruleId);
        }

        this.processQueue();
    }

    private async processQueue() {
        if (this.isPlaying || this.queue.length === 0) return;

        this.isPlaying = true;
        const ruleId = this.queue.shift();

        try {
            if (ruleId) {
                if (this.availableFiles.has(ruleId)) {
                    const filePath = path.join(this.audioDir, `${ruleId}.wav`);
                    await this.playWithFFplay(filePath);
                }
            }
        } catch (error) {
            console.error('[AudioAgent] Playback error:', error);
        } finally {
            this.isPlaying = false;
            if (this.queue.length > 0) {
                setTimeout(() => this.processQueue(), 100);
            }
        }
    }

    private playWithFFplay(filePath: string): Promise<void> {
        return new Promise((resolve) => {
            // -nodisp: No graphical window
            // -autoexit: Exit when audio finishes
            // -v 0: Quiet log level
            const command = `ffplay -nodisp -autoexit -v 0 "${filePath}"`;

            exec(command, (error) => {
                // If it plays, it exits with 0. 
                // Any error is usually logged to stderr but we resolve anyway to not block queue
                if (error) {
                    console.error('[AudioAgent] ffplay Error:', error.message);
                }
                resolve();
            });
        });
    }

    isSpeaking(): boolean {
        return this.isPlaying;
    }

    getQueueLength(): number {
        return this.queue.length;
    }

    setLanguage(lang: string) {
        // No-op for prerendered
    }

    async dispose(): Promise<void> {
        this.queue = [];
        this.isPlaying = false;
    }
}
