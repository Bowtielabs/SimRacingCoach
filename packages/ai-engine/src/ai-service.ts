/**
 * AI Coaching Service - Simplified Buffer Architecture
 * Telemetry → Buffer (30s) → Rules Engine → TTS
 */

// ═══════════════════════════════════════════════════════════════
// DEBUG FLAGS - Cambiar a true para activar logs específicos
// ═══════════════════════════════════════════════════════════════
const DEBUG = {
    LIFECYCLE: false,      // Logs de inicialización/destrucción
    FRAME_PROCESSING: false, // Logs de processFrame (cada frame)
    BUFFER: true,          // Logs del buffer (cada 30s) ✅ IMPORTANTE
    GREETING: false        // Logs de saludos iniciales
};
// ═══════════════════════════════════════════════════════════════

import type { TelemetryFrame } from '@simracing/core';
import { PrerenderedAudioAgent } from './prerendered-audio-agent.js';
import { TelemetryRulesEngine } from './telemetry-rules-engine.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import type {
    AIServiceConfig,
    SessionContext,
    SupportedLanguage
} from './types.js';

const DEFAULT_CONFIG: AIServiceConfig = {
    analysisInterval: 20, // 20 seconds buffer window (Medium)
    enabled: true,
    mode: 'ai',
    language: {
        stt: 'es',
        tts: 'es'
    },
    llm: {
        modelPath: '',
        contextSize: 2048,
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 40
    },
    stt: {
        modelPath: '',
        language: 'es',
        vadEnabled: false
    },
    tts: {
        modelPath: '',
        language: 'es',
        voice: 'es_AR-tux-medium',
        speed: 1.0,
        volume: 0.8
    },
    voiceInputMode: 'push-to-talk'
};

export class AICoachingService {
    private config: AIServiceConfig;
    private tts: PrerenderedAudioAgent;
    private rulesEngine: TelemetryRulesEngine;

    // Simple buffer system
    private frameBuffer: TelemetryFrame[] = [];
    private bufferStartTime: number = 0;
    private isProcessingBuffer: boolean = false;

    private sessionContext: SessionContext | null = null;
    private hasGivenInitialGreeting: boolean = false;
    private initialized: boolean = false;
    private externalAgents: boolean = false;

    // New tracking for UI
    private lastRecommendation: {
        ruleId: string;
        advice: string;
        category: string;
        priority: number;
        timestamp: number;
    } | null = null;

    // Recommendation history for feed (last 20)
    private recommendationHistory: Array<{
        id: string;
        ruleId: string;
        advice: string;
        category: string;
        priority: number;
        timestamp: number;
    }> = [];

    constructor(config: Partial<AIServiceConfig> = {}, externalTts?: PrerenderedAudioAgent) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        if (externalTts) {
            if (DEBUG.LIFECYCLE) console.log('[AIService] Using external TTS agent');
            this.tts = externalTts;
            this.externalAgents = true;
        } else {
            if (DEBUG.LIFECYCLE) console.log('[AIService] Creating new Audio agent');
            this.tts = new PrerenderedAudioAgent();
            this.externalAgents = false;
        }

        this.rulesEngine = new TelemetryRulesEngine();
        if (DEBUG.LIFECYCLE) console.log('[AIService] ✓ Simple 30s Buffer System initialized');
    }

    async initialize(): Promise<void> {
        if (DEBUG.LIFECYCLE) console.log('[AIService] Initializing...');

        try {
            if (!this.externalAgents) {
                await this.tts.initialize();
            }
            this.initialized = true;
            if (DEBUG.LIFECYCLE) console.log('[AIService] ✓ Ready');
        } catch (error) {
            console.error('[AIService] Failed to initialize:', error);
            throw error;
        }
    }

    async startSession(context: SessionContext): Promise<void> {
        this.sessionContext = context;
        this.frameBuffer = [];
        this.bufferStartTime = 0; // Start at 0 so first frame initializes it
        this.hasGivenInitialGreeting = false;
        this.recommendationHistory = []; // Clear old recommendations from previous session
        if (DEBUG.LIFECYCLE) console.log('[AIService] Session started');
    }

    endSession(): void {
        this.sessionContext = null;
        this.frameBuffer = [];
        if (DEBUG.LIFECYCLE) console.log('[AIService] Session ended');
    }

    /**
     * Process telemetry frame - Simple flow:
     * 1. Add frame to buffer
     * 2. Every 30s, send buffer to rules engine
     * 3. Clear buffer and repeat
     */
    async processFrame(frame: TelemetryFrame): Promise<void> {
        if (DEBUG.FRAME_PROCESSING && Math.random() < 0.01) {
            console.log('🟢 processFrame CALLED');
        }

        if (!this.initialized) {
            if (DEBUG.FRAME_PROCESSING) console.log('[AIService] ⚠ processFrame skipped: not initialized');
            return;
        }
        if (!this.sessionContext) {
            if (DEBUG.FRAME_PROCESSING) console.log('[AIService] ⚠ processFrame skipped: no session context');
            return;
        }

        // 1. Add frame to buffer
        this.frameBuffer.push(frame);

        // Initialize buffer start time on first frame
        if (this.bufferStartTime === 0) {
            this.bufferStartTime = Date.now();
            if (DEBUG.BUFFER) console.log('[Buffer] ▶ Buffer started, collecting frames for 10s...');
        }

        // 4. Log buffer progress every 5 seconds (~300 frames at 60fps)
        const elapsed = Date.now() - this.bufferStartTime;
        if (DEBUG.BUFFER && this.frameBuffer.length % 300 === 0) {
            const progress = Math.min(100, (elapsed / 10000) * 100);
            console.log(`[Buffer] 📊 frames=${this.frameBuffer.length}, elapsed=${(elapsed / 1000).toFixed(1)}s/30s (${progress.toFixed(0)}%), isProcessing=${this.isProcessingBuffer}`);
        }

        // 5. Every X seconds (configurable), process buffer and send to rules engine
        const intervalMs = this.config.analysisInterval * 1000;
        if (elapsed >= intervalMs && !this.isProcessingBuffer) {
            if (DEBUG.BUFFER) console.log(`[Buffer] ⏰ ${this.config.analysisInterval}s reached! Calling processBufferAndSendToEngine...`);
            this.bufferStartTime = 0; // Reset immediately so progress bar goes to 0% while processing
            await this.processBufferAndSendToEngine();
        }
    }

    /**
     * Uses edge detection: only announces when flag transitions from OFF to ON
     */
    private activeFlagsState: Map<string, boolean> = new Map();

    private async checkCriticalFlags(frame: TelemetryFrame): Promise<void> {
        const flags = frame.flags?.sessionFlags || 0;

        // Define critical flags with their announcements
        const criticalFlags = [
            { id: 'black', bit: 0x00000080, message: '¡Bandera negra! Tenés una sanción, entrá a boxes.' },
            { id: 'meatball', bit: 0x00002000, message: '¡Bandera técnica! El auto está dañado, entrá a boxes ya.' },
            { id: 'yellow', bit: 0x00000008, message: 'Bandera amarilla, bajá la velocidad y cuidado.' },
            { id: 'blue', bit: 0x00000010, message: 'Bandera azul, dejá pasar al auto de atrás.' }
        ];

        for (const flag of criticalFlags) {
            const isActive = (flags & flag.bit) !== 0;
            const wasActive = this.activeFlagsState.get(flag.id) || false;

            // DEBUG: Ver qué está pasando con el estado
            if (isActive) {
                console.log(`🔍 DEBUG ${flag.id}: isActive=${isActive}, wasActive=${wasActive}, Map size=${this.activeFlagsState.size}`);
            }

            // Edge detection: announce only when flag transitions from OFF to ON
            if (isActive && !wasActive) {
                console.log(`🚩 [BANDERA CRÍTICA] ${flag.id.toUpperCase()} detectada - Anunciando (primera vez)`);
                await this.tts.speak(flag.message, 'urgent');
            }

            // Update state for next frame
            this.activeFlagsState.set(flag.id, isActive);
            console.log(`✅ DEBUG AFTER SET: ${flag.id} = ${this.activeFlagsState.get(flag.id)}, Map size=${this.activeFlagsState.size}`);
        }
    }

    /**
     * Check if car is stopped/in pits and motivate driver to start
     */
    private lastStoppedAnnouncement: number = 0;
    private stoppedSince: number = 0;

    private async checkIfStoppedAndMotivate(frame: TelemetryFrame): Promise<void> {
        const speedKph = frame.powertrain?.speedKph || 0;
        const now = Date.now();

        // Si el auto está en movimiento, resetear
        if (speedKph >= 5) {
            this.stoppedSince = 0;
            return;
        }

        // Si acaba de pararse, marcar el inicio
        if (this.stoppedSince === 0) {
            this.stoppedSince = now;
            return;
        }

        // Calcular cuánto tiempo lleva parado
        const stoppedDuration = now - this.stoppedSince;
        const timeSinceLastAnnouncement = now - this.lastStoppedAnnouncement;

        // Si lleva más de 5 segundos parado Y pasaron al menos 30 segundos desde el último anuncio
        if (stoppedDuration > 5000 && timeSinceLastAnnouncement > 30000) {
            const messages = [
                "Dale, acelerá que arrancamos!",
                "Vamos, salí a pista que te estoy esperando!",
                "Largá el freno y vamos, que hay que rodar!",
                "Che, arrancá que se enfría todo!"
            ];

            const message = messages[Math.floor(Math.random() * messages.length)];
            console.log(`🏁 [AUTO PARADO] Motivando al piloto: "${message}"`);
            await this.tts.speak(message, 'normal');
            this.lastStoppedAnnouncement = now;
        }
    }

    /**
     * Process buffer and send to rules engine
     */
    private async processBufferAndSendToEngine(): Promise<void> {
        if (this.isProcessingBuffer || this.frameBuffer.length === 0) {
            return;
        }

        this.isProcessingBuffer = true;

        try {
            console.log('\n' + '═'.repeat(60));
            console.log('[AIService] 🔔 30s window complete - Analyzing buffer');
            console.log('═'.repeat(60));

            // Log buffer summary
            const firstFrame = this.frameBuffer[0];
            const lastFrame = this.frameBuffer[this.frameBuffer.length - 1];

            console.log(`\n📋 BUFFER ENVIADO AL MOTOR:`);
            console.log(`   Frames: ${this.frameBuffer.length}`);
            console.log(`   Duration: 30 seconds`);
            console.log(`   First frame speed: ${Math.round(firstFrame?.powertrain?.speedKph || 0)} kph`);
            console.log(`   Last frame speed: ${Math.round(lastFrame?.powertrain?.speedKph || 0)} kph`);

            // Log tail of buffer (last 5 frames)
            console.log(`\n📋 BUFFER TAIL (últimos 5 frames):`);
            const tail = this.frameBuffer.slice(-5);
            tail.forEach((f, i) => {
                console.log(`   [${this.frameBuffer.length - 5 + i}] Speed=${Math.round(f.powertrain?.speedKph || 0)}kph, Throttle=${Math.round((f.powertrain?.throttle || 0) * 100)}%, Brake=${Math.round((f.powertrain?.brake || 0) * 100)}%`);
            });

            // Calculate analysis using rules engine
            const analysis = TelemetryRulesEngine.calculateAnalysis(lastFrame, this.frameBuffer);

            console.log(`\n📈 ANÁLISIS:`);
            console.log(`   HardBrakes: ${analysis.patterns.hardBrakingCount}`);
            console.log(`   ThrottleChanges: ${analysis.patterns.throttleChanges}`);
            console.log(`   AvgSpeed: ${Math.round(analysis.averages.speed)} kph`);

            console.log(`\n🔍 DEBUG - Datos del frame actual:`);
            console.log(`   RPM: ${lastFrame?.powertrain?.rpm || 'N/A'}`);
            console.log(`   Water temp: ${lastFrame?.temps?.waterC || 'N/A'}°C`);
            console.log(`   Oil temp: ${lastFrame?.temps?.oilC || 'N/A'}°C`);
            console.log(`   Tyre temps: ${lastFrame?.temps?.tyreC?.join(', ') || 'N/A'}`);
            console.log(`   Brake temps: ${lastFrame?.temps?.brakeC?.join(', ') || 'N/A'}`);

            // Get ALL matching rules from rules engine (sorted by priority)
            const allRules = this.rulesEngine.analyzeAll(analysis, 50); // Pedir hasta 50 reglas (devuelve TODAS)

            if (allRules.length > 0) {
                console.log(`\n🎯 REGLAS ACTIVADAS (${allRules.length} total):`);
                console.log('─'.repeat(60));

                // Loguear TODAS las reglas que se cumplieron
                allRules.forEach((rule, i) => {
                    const marker = i < 4 ? '🔊' : '  ';
                    console.log(`${marker} [${i + 1}] ${rule.ruleId} (P${rule.priority}) - "${rule.advice}"`);
                });

                console.log('─'.repeat(60));

                // Hablar hasta 4 consejos de mayor prioridad
                const MAX_CONSEJOS = 4;
                const topRules = allRules.slice(0, MAX_CONSEJOS);

                console.log(`\n🔊 HABLANDO ${topRules.length} consejos (de ${allRules.length} total):`);
                for (const rule of topRules) {
                    console.log(`   -> "${rule.advice}" (${rule.ruleId})`);

                    // Track recommendation for UI feed
                    const recId = `${rule.ruleId}-${Date.now()}`;
                    this.recommendationHistory.unshift({
                        id: recId,
                        ruleId: rule.ruleId,
                        advice: rule.advice,
                        category: rule.category,
                        priority: rule.priority,
                        timestamp: Date.now()
                    });

                    // Keep only last 20 recommendations
                    if (this.recommendationHistory.length > 20) {
                        this.recommendationHistory.pop();
                    }

                    // ⚡ Using PiperAgent with prerendered WAV (NO TTS synthesis)
                    await this.tts.speak(rule.ruleId, 'normal');
                }
                console.log('[AIService] ✓ Consejos reproducidos');
            } else {
                console.log('[AIService] ℹ️ No hay consejos aplicables');
            }

            // Clear buffer (bufferStartTime already reset when 10s was reached)
            this.frameBuffer = [];
            console.log('[AIService] ✓ Buffer cleared, ready for new 10s window');

        } catch (error) {
            console.error('[AIService] ❌ Error processing buffer:', error);
        } finally {
            this.isProcessingBuffer = false;
        }
    }



    private async giveInitialGreeting(): Promise<void> {
        try {
            const greetings = [
                "greeting-1",
                "greeting-2",
                "greeting-3",
                "greeting-4"
            ];

            const greeting = greetings[Math.floor(Math.random() * greetings.length)];
            if (DEBUG.GREETING) console.log(`[AIService] 🎯 GREETING: "${greeting}"`);

            await this.tts.speak(greeting, 'normal');
            if (DEBUG.GREETING) console.log('[AIService] ✅ Greeting spoken');
        } catch (error) {
            if (DEBUG.GREETING) console.error('[AIService] Greeting failed:', error);
        }
    }

    setLanguage(language: SupportedLanguage): void {
        this.config.language.stt = language;
        this.config.language.tts = language;
        this.tts.setLanguage(language);
        if (DEBUG.LIFECYCLE) console.log(`[AIService] Language changed to: ${language}`);
    }

    updateConfig(partial: Partial<AIServiceConfig>) {
        this.config = { ...this.config, ...partial };
        if (partial.analysisInterval) {
            console.log(`[AIService] Analysis interval updated to ${partial.analysisInterval}s`);
        }
    }

    setMuted(muted: boolean) {
        this.tts.setMuted(muted);
    }

    getStatus() {
        // Dynamic target based on configured interval
        const intervalFrames = this.config.analysisInterval * 20; // ~20fps assumption
        const intervalMs = this.config.analysisInterval * 1000;

        const currentFrames = this.frameBuffer.length;
        const elapsed = this.bufferStartTime > 0 ? Date.now() - this.bufferStartTime : 0; // Handle reset case
        const secondsToAnalysis = Math.max(0, (intervalMs - elapsed) / 1000);
        const timeBasedProgress = this.bufferStartTime > 0 ? Math.min(100, Math.round((elapsed / intervalMs) * 100)) : 0;

        return {
            initialized: this.initialized,
            sessionActive: this.sessionContext !== null,
            mode: 'ai' as const,
            language: this.config.language,

            audio: {
                isSpeaking: this.tts.isSpeaking(),
                queue: this.tts.getQueueLength()
            },

            buffer: {
                size: currentFrames,
                target: intervalFrames,
                progress: timeBasedProgress, // Now based on time elapsed (0-100% over 10s)
                secondsToAnalysis: Math.round(secondsToAnalysis)
            },

            lastRecommendation: this.lastRecommendation,

            recommendations: this.recommendationHistory
        };
    }

    async dispose(): Promise<void> {
        await this.tts.dispose();
        this.initialized = false;
        if (DEBUG.LIFECYCLE) console.log('[AIService] Disposed');
    }
}

export default AICoachingService;
