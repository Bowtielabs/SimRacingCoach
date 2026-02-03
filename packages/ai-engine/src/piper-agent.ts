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
const SAMPLE_RATE = 44100;

const DEFAULT_CONFIG: TTSConfig = {
    modelPath: VOICE_PATH,
    language: 'es',
    voice: 'es_AR-daniela',
    speed: 3.5,  // Fast speech for quick in-race feedback (max 3s per message)
    volume: 1.0  // Maximum volume for better audibility
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
        console.log(`[Audio] Using voice: ${voicePath}`);
        this.isInitialized = true;
        console.log(`[Audio] Ready for synthesis (sound-play)`);
    }

    async speak(text: string, priority: 'normal' | 'urgent' = 'normal', speed: number = 1.0): Promise<string> {
        const queueTimestamp = Date.now();
        console.log(`[Audio] 🎯 QUEUED at ${queueTimestamp}: "${text.substring(0, 50)}..." (${priority}, speed: ${speed})`);

        if (this._isSpeaking) {
            console.log(`[Audio] Already speaking, adding to queue (queue size: ${this.speakQueue.length})`);
            return new Promise((resolve, reject) => {
                this.speakQueue.push({ text, priority, speed, resolve, reject });
            });
        }

        return this.doSpeak(text, speed, queueTimestamp);
    }

    /**
     * Perform TTS with sound-play
     */
    private async doSpeak(text: string, speed: number, queueTimestamp?: number): Promise<string> {
        this._isSpeaking = true;
        const startTime = Date.now();

        if (queueTimestamp) {
            const latencyMs = startTime - queueTimestamp;
            console.log(`[Audio] ⏱️ LATENCY: ${latencyMs}ms from queue to playback start`);
        }

        console.log(`[Audio] 🔊 Speaking: "${text.substring(0, 50)}..."`);

        try {
            // ⚡ PRERENDERED AUDIO - INSTANT PLAYBACK
            const prerenderedPath = this.getPrerenderedPath(text);

            if (prerenderedPath) {
                console.log(`[Audio] ⚡ Using prerendered: ${path.basename(prerenderedPath)}`);

                // Use ffplay for reliable playback
                await new Promise<void>((resolve, reject) => {
                    const ffplay = spawn('ffplay', [
                        '-nodisp',
                        '-autoexit',
                        '-loglevel', 'quiet',
                        prerenderedPath
                    ], {
                        windowsHide: true
                    });

                    ffplay.on('close', (code) => {
                        if (code !== 0 && code !== null) {
                            reject(new Error(`ffplay failed with code ${code}`));
                        } else {
                            resolve();
                        }
                    });

                    ffplay.on('error', (err) => {
                        reject(err);
                    });
                });

                const totalTime = Date.now() - startTime;
                console.log(`[Audio] ✅ ${totalTime}ms (prerendered)`);
                return prerenderedPath;
            }

            // FALLBACK: Synthesize if not prerendered
            console.log(`[Audio] ⚠️ Not prerendered, synthesizing...`);

            const lengthScale = 1.0 / speed;
            const pcmChunks: Buffer[] = [];
            // Log the actual piper path and args for debugging
            const piperArgs = [
                '--model', this.config.modelPath,
                '--output_raw',
                '--length_scale', lengthScale.toFixed(2)
            ];
            console.log(`[Audio] DEBUG - Path: ${PIPER_BIN_PATH}`);
            console.log(`[Audio] DEBUG - Model: ${this.config.modelPath}`);

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
            console.log(`[Audio] ⚡ Synthesis: ${synthesisTime}ms, audio: ${Math.round(audioDurationMs)}ms`);

            // Create WAV
            const wavHeader = createWavHeader(pcmData.length);
            const wavData = Buffer.concat([wavHeader, pcmData]);

            // Write temp file
            const tempWav = path.join(__dirname, `../../../core/ai_engines/piper/audio_${Date.now()}.wav`);
            await writeFile(tempWav, wavData);

            // Play with sound-play (starts immediately, returns before done)
            const playStart = Date.now();
            console.log(`[Audio] 🔊 Reproduciendo audio: ${tempWav} (${Math.round(audioDurationMs / 1000)}s, vol: ${this.config.volume})`);
            soundPlay.play(tempWav, this.config.volume);

            // Wait for audio to finish + extra buffer for sound-play Windows quirks
            await new Promise(resolve => setTimeout(resolve, audioDurationMs + 1000));

            const playTime = Date.now() - playStart;

            // Extra delay before cleanup to ensure sound-play is done with the file
            await new Promise(resolve => setTimeout(resolve, 500));
            await unlink(tempWav).catch(() => { });

            const totalTime = Date.now() - startTime;
            console.log(`[Audio] ✅ Total: ${totalTime}ms (synthesis: ${synthesisTime}ms, play: ${playTime}ms)`);

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
        console.log(`[Audio] Processing queue item (${this.speakQueue.length} remaining)`);

        try {
            const result = await this.doSpeak(next.text, next.speed);
            next.resolve(result);
        } catch (error) {
            next.reject(error as Error);
        }
    }

    /**
     * Get path to prerendered audio file if it exists for this exact message
     */
    private getPrerenderedPath(text: string): string | null {
        // Map exact text to prerendered filename (rule ID)
        const MESSAGE_TO_FILE: Record<string, string> = {
            // Greetings
            'greeting-1': 'greeting-1',
            'greeting-2': 'greeting-2',
            'greeting-3': 'greeting-3',
            'greeting-4': 'greeting-4',
            // Coach connected
            'coach-connected': 'coach-connected',
            // RuleId mappings (direct)
            'throttle-punch': 'throttle-punch',
            'pedal-fidgeting': 'pedal-fidgeting',
            'brake-riding': 'brake-riding',
            'soft-braking': 'soft-braking',
            'brake-stomp': 'brake-stomp',
            'lazy-throttle': 'lazy-throttle',
            'coasting-too-much': 'coasting-too-much',
            'throttle-overlap': 'throttle-overlap',
            'unfinished-braking': 'unfinished-braking',
            'brake-inconsistency': 'brake-inconsistency',
            'redline-hanging': 'redline-hanging',
            'early-short-shift': 'early-short-shift',
            'engine-braking-risk': 'engine-braking-risk',
            'neutral-driving': 'neutral-driving',
            'slow-shifts': 'slow-shifts',
            'wrong-gear-slow-corner': 'wrong-gear-slow-corner',
            'no-rev-match': 'no-rev-match',
            'engine-warnings-detected': 'engine-warnings-detected',
            'tyres-too-cold': 'tyres-too-cold',
            'tyres-overheating': 'tyres-overheating',
            'thermal-imbalance-lr': 'thermal-imbalance-lr',
            'thermal-imbalance-fb': 'thermal-imbalance-fb',
            'brake-fade': 'brake-fade',
            'cold-engine-stress': 'cold-engine-stress',
            'water-overheating': 'water-overheating',
            'top-speed-inconsistency': 'top-speed-inconsistency',
            'erratic-speed-variation': 'erratic-speed-variation',
            'inefficient-fuel-consumption': 'inefficient-fuel-consumption',
            'fuel-critical-low': 'fuel-critical-low',
            'stalling-risk': 'stalling-risk',
            // Spanish text mappings (for backwards compatibility)
            'Entrada de potencia muy brusca, aplicá el acelerador más gradual': 'throttle-punch',
            'Demasiado movimiento en los pedales, suavizá las transiciones': 'pedal-fidgeting',
            'Estás pisando freno y acelerador al mismo tiempo, es ineficiente': 'brake-riding',
            'Frenadas muy suaves, metele más presión inicial': 'soft-braking',
            'Frenadas muy bruscas, graduar mejor la presión del pedal': 'brake-stomp',
            'Estás demorando mucho en acelerar después del apex, dale antes': 'lazy-throttle',
            'Estás yendo mucho en vacío, perdés tiempo sin acelerar ni frenar': 'coasting-too-much',
            'Levantás mucho el acelerador en los cambios, perdés potencia': 'throttle-overlap',
            'Te falta trail braking, soltá el freno gradual mientras girás': 'unfinished-braking',
            'Frenadas inconsistentes, buscá puntos de referencia fijos': 'brake-inconsistency',
            'Estás colgado del limitador, cambiá antes para mantener potencia': 'redline-hanging',
            'Cambios muy prematuros, aprovechá más el rango de RPM': 'early-short-shift',
            'Mucho freno motor, cuidado con romper el cambio': 'engine-braking-risk',
            'Estás en punto muerto andando, enganchá una marcha': 'neutral-driving',
            'Cambios muy lentos, practicá la velocidad de palanca': 'slow-shifts',
            'Marcha muy larga para curva lenta, bajá una más': 'wrong-gear-slow-corner',
            'No estás haciendo punta-tacón, igualá las RPM en la bajada': 'no-rev-match',
            '¡Warning del motor detectado! Revisá la telemetría': 'engine-warnings-detected',
            'Gomas muy frías (menos de 65°C), hacé serpentinas': 'tyres-too-cold',
            'Neumáticos sobrecalentados (más de 100°C), reducí agresividad': 'tyres-overheating',
            'Desbalance térmico izquierda/derecha en gomas, revisá setup': 'thermal-imbalance-lr',
            'Desbalance térmico delantero/trasero, ajustá balance aerodinámico': 'thermal-imbalance-fb',
            'Frenos a más de 400°C, peligro de fatiga por calor': 'brake-fade',
            'Motor frío con mucha exigencia, cuidado que el aceite está frío': 'cold-engine-stress',
            'Temperatura de agua crítica (más de 105°C), levantá que se recalienta': 'water-overheating',
            'Velocidad de punta inconsistente, mantené el gas a fondo en recta': 'top-speed-inconsistency',
            'Variaciones erráticas de velocidad en recta, suavizá': 'erratic-speed-variation',
            'Consumo de combustible ineficiente, levantá antes de frenar': 'inefficient-fuel-consumption',
            '¡Menos de 5 litros de nafta! Entrá a boxes o gestioná': 'fuel-critical-low',
            '¡Riesgo de calado! RPM muy bajas, bajá de marcha o acelerá': 'stalling-risk'
        };

        const filename = MESSAGE_TO_FILE[text];
        if (!filename) return null;

        return path.join(__dirname, `../../../core/ai_engines/piper/prerendered/${filename}.wav`);
    }

    async interrupt(): Promise<void> {
        console.log('[Audio] Interrupting speech');
    }

    setLanguage(language: SupportedLanguage): void {
        this.config.language = language;
        console.log(`[Audio] Language set to: ${language}`);
    }

    async dispose(): Promise<void> {
        console.log('[Audio] Disposed');
    }

    isSpeaking(): boolean {
        return this._isSpeaking;
    }

    getQueueLength(): number {
        return this.speakQueue.length;
    }
}

export default PiperAgent;
