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
    private muted: boolean = false;

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

    /**
     * Plays a sequence of audio files seamlessly using ffmpeg concat filter
     * @param fileIds Array of file IDs to play
     * @param priority Priority of the sequence
     */
    async playSequence(fileIds: string[], priority: 'normal' | 'urgent' = 'normal'): Promise<void> {
        // Create a unique ID for this sequence to handle it as a single queue item
        // or handle it internally. For now, let's treat it as a special queue item format "SEQ:id1,id2,id3"
        const sequenceId = `SEQ:${fileIds.join(',')}`;

        if (priority === 'urgent') {
            this.queue.unshift(sequenceId);
        } else {
            this.queue.push(sequenceId);
        }

        this.processQueue();
    }

    private async processQueue() {
        if (this.isPlaying || this.queue.length === 0) return;

        this.isPlaying = true;
        const itemId = this.queue.shift();

        try {
            if (itemId) {
                if (this.muted) {
                    // console.log('[AudioAgent] Skipping playback (muted):', itemId);
                } else if (itemId.startsWith('SEQ:')) {
                    // Handle Sequence
                    const fileIds = itemId.substring(4).split(',');
                    await this.playSequenceWithFFplay(fileIds);
                } else if (this.availableFiles.has(itemId)) {
                    // Handle Single File
                    const filePath = path.join(this.audioDir, `${itemId}.wav`);
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

    private playSequenceWithFFplay(fileIds: string[]): Promise<void> {
        return new Promise((resolve) => {
            // Filter valid files
            const validFiles = fileIds.filter(id => this.availableFiles.has(id));

            if (validFiles.length === 0) {
                resolve();
                return;
            }

            // Construct ffmpeg complex filter for concatenation
            // ffmpeg -i 1.wav -i 2.wav -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[out]" -map "[out]" -f wav - | ffplay -

            // Simpler approach for ffplay: use concat protocol with intermediate list or complex filter direct playback
            // ffplay -f lavfi "amovie=1.wav,amovie=2.wav,concat=n=2:v=0:a=1" 
            // BUT Windows paths are messy in filter strings. 

            // Safer approach: Generate a temporary concat list file
            // file 'path/to/1.wav'
            // file 'path/to/2.wav'

            const listFileName = `concat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.txt`;
            const listPath = path.join(this.audioDir, listFileName);

            try {
                const fileContent = validFiles
                    .map(id => `file '${id}.wav'`) // Assuming cwd is audioDir or using relative paths
                    .join('\n');

                fs.writeFileSync(listPath, fileContent);

                const command = `ffplay -f concat -safe 0 -nodisp -autoexit -v 0 "${listPath}"`;

                exec(command, (error) => {
                    // Cleanup list file
                    try { fs.unlinkSync(listPath); } catch { }

                    if (error) {
                        console.error('[AudioAgent] Sequence Error:', error.message);
                    }
                    resolve();
                });

            } catch (err) {
                console.error('[AudioAgent] Failed to create concat list:', err);
                resolve();
            }
        });
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

    setMuted(muted: boolean) {
        this.muted = muted;
        if (this.muted) {
            console.log('[AudioAgent] Muted');
        } else {
            console.log('[AudioAgent] Unmuted');
        }
    }

    async dispose(): Promise<void> {
        this.queue = [];
        this.isPlaying = false;
    }
}
