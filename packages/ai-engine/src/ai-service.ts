/**
 * AI Coaching Service - Simplified Buffer Architecture
 * Telemetry → Buffer (30s) → Rules Engine → TTS
 */

import type { TelemetryFrame } from '@simracing/core';
import { PiperAgent } from './piper-agent.js';
import { TelemetryRulesEngine } from './telemetry-rules-engine.js';
import type {
    AIServiceConfig,
    SessionContext,
    SupportedLanguage
} from './types.js';

const DEFAULT_CONFIG: AIServiceConfig = {
    analysisInterval: 30, // 30 seconds buffer window
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
    private tts: PiperAgent;
    private rulesEngine: TelemetryRulesEngine;

    // Simple buffer system
    private frameBuffer: TelemetryFrame[] = [];
    private bufferStartTime: number = 0;
    private isProcessingBuffer: boolean = false;

    private sessionContext: SessionContext | null = null;
    private hasGivenInitialGreeting: boolean = false;
    private initialized: boolean = false;
    private externalAgents: boolean = false;

    constructor(config: Partial<AIServiceConfig> = {}, externalTts?: PiperAgent) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        if (externalTts) {
            console.log('[AIService] Using external TTS agent');
            this.tts = externalTts;
            this.externalAgents = true;
        } else {
            console.log('[AIService] Creating new TTS agent');
            this.tts = new PiperAgent(this.config.tts);
            this.externalAgents = false;
        }

        this.rulesEngine = new TelemetryRulesEngine();
        console.log('[AIService] ✓ Simple 30s Buffer System initialized');
    }

    async initialize(): Promise<void> {
        console.log('[AIService] Initializing...');

        try {
            if (!this.externalAgents) {
                await this.tts.initialize();
            }
            this.initialized = true;
            console.log('[AIService] ✓ Ready');
        } catch (error) {
            console.error('[AIService] Failed to initialize:', error);
            throw error;
        }
    }

    async startSession(context: SessionContext): Promise<void> {
        this.sessionContext = context;
        this.frameBuffer = [];
        this.bufferStartTime = Date.now();
        this.hasGivenInitialGreeting = false;
        console.log('[AIService] Session started');
    }

    endSession(): void {
        this.sessionContext = null;
        this.frameBuffer = [];
        console.log('[AIService] Session ended');
    }

    /**
     * Process telemetry frame - Simple flow:
     * 1. Add frame to buffer
     * 2. Every 30s, send buffer to rules engine
     * 3. Clear buffer and repeat
     */
    async processFrame(frame: TelemetryFrame): Promise<void> {
        // LOG SUPER VISIBLE para confirmar que esta version se ejecuta
        if (Math.random() < 0.01) {
            console.log('🟢🟢🟢 processFrame CALLED! 🟢🟢🟢');
        }

        if (!this.initialized) {
            console.log('[AIService] ⚠ processFrame skipped: not initialized');
            return;
        }
        if (!this.sessionContext) {
            console.log('[AIService] ⚠ processFrame skipped: no session context');
            return;
        }

        // 1. Add frame to buffer
        this.frameBuffer.push(frame);

        // Initialize buffer start time on first frame
        if (this.bufferStartTime === 0) {
            this.bufferStartTime = Date.now();
            console.log('[Buffer] ▶ Buffer started, collecting frames for 30s...');
        }

        // 2. Check for initial greeting (when speed > 5 kph)
        const currentSpeed = frame.powertrain?.speedKph || 0;
        if (!this.hasGivenInitialGreeting && currentSpeed > 5) {
            this.hasGivenInitialGreeting = true;
            console.log(`[AIService] 🏁 Speed detected: ${currentSpeed.toFixed(1)} kph - Greeting!`);
            await this.giveInitialGreeting();
        }

        // 3. Log buffer progress every 5 seconds (~300 frames at 60fps)
        const elapsed = Date.now() - this.bufferStartTime;
        if (this.frameBuffer.length % 300 === 0) {
            const progress = Math.min(100, (elapsed / 30000) * 100);
            console.log(`[Buffer] 📊 frames=${this.frameBuffer.length}, elapsed=${(elapsed / 1000).toFixed(1)}s/30s (${progress.toFixed(0)}%), isProcessing=${this.isProcessingBuffer}`);
        }

        // 4. Every 30 seconds, process buffer and send to rules engine
        if (elapsed >= 30000 && !this.isProcessingBuffer) {
            console.log(`[Buffer] ⏰ 30s reached! Calling processBufferAndSendToEngine...`);
            await this.processBufferAndSendToEngine();
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

            // Get ALL matching rules from rules engine (sorted by priority)
            const allRules = this.rulesEngine.analyzeAll(analysis, 20);

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

                console.log(`\n🔊 HABLANDO ${topRules.length} consejos:`);
                for (const rule of topRules) {
                    console.log(`   -> "${rule.advice}" (${rule.ruleId})`);
                    await this.tts.speak(rule.advice, 'normal');
                }
                console.log('[AIService] ✓ Consejos reproducidos');
            } else {
                console.log('[AIService] ℹ️ No hay consejos aplicables');
            }

            // Clear buffer and reset timer
            this.frameBuffer = [];
            this.bufferStartTime = Date.now();
            console.log('[AIService] ✓ Buffer cleared, starting new 30s window');

        } catch (error) {
            console.error('[AIService] ❌ Error processing buffer:', error);
        } finally {
            this.isProcessingBuffer = false;
        }
    }

    private async giveInitialGreeting(): Promise<void> {
        try {
            const greetings = [
                "¡Dale dale! Te voy a estar mirando y te ayudo a mejorar.",
                "¡Vamos vamos! Estoy acá con vos, te voy dando consejos.",
                "¡Arrancamos! Concentrate en la pista que yo te voy guiando.",
                "¡Dale que podés! Vamos por ese tiempazo, estoy con vos."
            ];

            const greeting = greetings[Math.floor(Math.random() * greetings.length)];
            console.log(`[AIService] 🎯 GREETING: "${greeting}"`);

            await this.tts.speak(greeting, 'normal');
            console.log('[AIService] ✅ Greeting spoken');
        } catch (error) {
            console.error('[AIService] Greeting failed:', error);
        }
    }

    setLanguage(language: SupportedLanguage): void {
        this.config.language.stt = language;
        this.config.language.tts = language;
        this.tts.setLanguage(language);
        console.log(`[AIService] Language changed to: ${language}`);
    }

    getStatus() {
        return {
            initialized: this.initialized,
            sessionActive: this.sessionContext !== null,
            bufferSize: this.frameBuffer.length,
            mode: 'ai',
            language: this.config.language
        };
    }

    async dispose(): Promise<void> {
        await this.tts.dispose();
        this.initialized = false;
        console.log('[AIService] Disposed');
    }
}

export default AICoachingService;
