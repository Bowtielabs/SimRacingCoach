/**
 * AI Coaching Service - Standalone Binary Architecture
 * Orchestrates Llama.cpp, Piper TTS via child processes
 */

import type { TelemetryFrame } from '@simracing/core';
import { LlamaCppAgent } from './llama-cpp-agent.js';
import { PiperAgent } from './piper-agent.js';
import { TelemetryRulesEngine } from './telemetry-rules-engine.js';
import type {
    AIServiceConfig,
    CoachingContext,
    SessionContext,
    SupportedLanguage
} from './types.js';

const DEFAULT_CONFIG: AIServiceConfig = {
    analysisInterval: 15, // seconds - lowered to 15s for more reactive feedback
    enabled: true,
    mode: 'ai', // AI-only mode
    language: {
        stt: 'es',
        tts: 'es'
    },
    llm: {
        modelPath: '',
        contextSize: 2048,
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 40 // Ultra-short responses - just the essential advice
    },
    stt: {
        modelPath: '',
        language: 'es',
        vadEnabled: false // Not implemented yet
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
    private llm: LlamaCppAgent;
    private tts: PiperAgent;
    private rulesEngine: TelemetryRulesEngine;

    private sessionContext: SessionContext | null = null;
    private lastAnalysisTime: number = 0;
    private frameBuffer: TelemetryFrame[] = [];
    private isAnalyzing: boolean = false;
    private hasGivenInitialGreeting: boolean = false;
    private lastSpeed: number = 0;
    private lastOnPitRoad: boolean = true; // Track pit road status for exit detection

    private initialized: boolean = false;
    private externalAgents: boolean = false;

    constructor(config: Partial<AIServiceConfig> = {}, externalLlm?: LlamaCppAgent, externalTts?: PiperAgent) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Use external TTS if provided (critical to avoid multiple Piper instances)
        if (externalTts) {
            console.log('[AIService] Using external TTS agent (shared Piper instance)');
            this.tts = externalTts;
            this.externalAgents = true;
        } else {
            console.log('[AIService] Creating new TTS agent (standalone Piper)');
            this.tts = new PiperAgent(this.config.tts);
            this.externalAgents = false;
        }

        // LLM is disabled but keep reference for compatibility
        if (externalLlm) {
            this.llm = externalLlm;
        } else {
            this.llm = new LlamaCppAgent(this.config.llm);
        }

        this.rulesEngine = new TelemetryRulesEngine();
        console.log('[AIService] ✓ Telemetry Rules Engine active');
    }

    /**
     * Initialize the service - starts child processes
     */
    async initialize(): Promise<void> {
        console.log('[AIService] Initializing AI Coaching Service...');

        try {
            if (this.externalAgents) {
                // External agents are already initialized, just mark as ready
                console.log('[AIService] Using pre-initialized external agents');
                // this.llm.setLanguage(this.config.language.stt); // Disabled LLM
            } else {
                // Initialize Piper (LLM start disabled per user request)
                console.log('[AIService] Initializing Piper TTS...');
                await this.tts.initialize();

                console.log('[AIService] ℹ️ LLM disabled for performance (Rules Engine only)');
            }

            this.initialized = true;
            console.log('[AIService] ✓ AI Coaching Service initialized successfully');
        } catch (error) {
            console.error('[AIService] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Start AI coaching session
     */
    async startSession(context: SessionContext): Promise<void> {
        this.sessionContext = context;
        this.frameBuffer = [];
        this.lastAnalysisTime = 0;
        this.hasGivenInitialGreeting = false;
        this.lastSpeed = 0;
        this.lastOnPitRoad = true; // Assume starting in pits or wanting a greeting on first exit
        console.log('[AIService] Session started:', context);
    }

    /**
     * End current session
     */
    endSession(): void {
        this.sessionContext = null;
        console.log('[AIService] Session ended');
    }

    /**
     * Process telemetry frame
     */
    async processFrame(frame: TelemetryFrame): Promise<void> {
        if (!this.initialized || !this.sessionContext) {
            return;
        }

        // Add to buffer (600 frames = 30s at 20fps, 1000 frames = ~50s)
        this.frameBuffer.push(frame);
        if (this.frameBuffer.length > 1000) {
            this.frameBuffer.shift();
        }

        // Detect pit exit using both speed and onPitRoad flag
        const currentSpeed = frame.powertrain?.speedKph || 0;
        const currentOnPitRoad = frame.session?.onPitRoad ?? false;

        // Debug logging for greeting trigger (every 100 frames = ~5 seconds to reduce spam)
        if (this.frameBuffer.length % 100 === 0 && !this.hasGivenInitialGreeting) {
            console.log(`[AIService] Waiting for speed > 5 Kph... Current: ${currentSpeed.toFixed(1)} Kph`);
        }

        // Transition: if speed goes above 5 kph for the first time in the session, greet.
        if (!this.hasGivenInitialGreeting && currentSpeed > 5) {
            console.log('\n' + '🏁'.repeat(40));
            console.log(`[AIService] 🏁 PIT EXIT DETECTED! Speed: ${currentSpeed.toFixed(1)} Kph`);
            console.log('[AIService] 🎯 Calling giveInitialGreeting()...');
            this.hasGivenInitialGreeting = true;

            // Make it synchronous so we can see errors immediately
            try {
                await this.giveInitialGreeting();
                console.log('[AIService] ✅ Greeting completed successfully!');
            } catch (err) {
                console.error('[AIService] ❌ Greeting FAILED:', err);
            }
        }


        // Update states for next frame
        this.lastSpeed = currentSpeed;
        this.lastOnPitRoad = currentOnPitRoad;

        // Periodic status log every 500 frames (~25s) to avoid spam
        if (this.frameBuffer.length % 500 === 0) {
            const flags = frame.flags?.sessionFlags || 0;
            console.log(`[AIService] Telemetry Status: Speed=${currentSpeed.toFixed(1)} Kph, Pit=${currentOnPitRoad}, Flags=0x${flags.toString(16)}, Buffer=${this.frameBuffer.length}`);
        }

        const now = Date.now();
        const timeSinceLastAnalysis = (now - this.lastAnalysisTime) / 1000;

        // DEBUG: Log every 100 frames to see state of analysis
        if (this.frameBuffer.length % 100 === 0) {
            console.log(`[AIService DEBUG] isAnalyzing=${this.isAnalyzing}, timeSinceLastAnalysis=${timeSinceLastAnalysis.toFixed(1)}s, interval=${this.config.analysisInterval}s, sessionContext=${!!this.sessionContext}`);
        }

        // Skip if already analyzing
        if (this.isAnalyzing) {
            return;
        }

        if (timeSinceLastAnalysis >= this.config.analysisInterval) {
            console.log(`[AIService] ⏱️ Triggering analysis (${timeSinceLastAnalysis.toFixed(1)}s since last)...`);
            this.isAnalyzing = true;
            this.runRulesAnalysis(frame) // Call the rules engine analysis
                .finally(() => {
                    this.isAnalyzing = false;
                    console.log(`[AIService] ✓ Analysis complete, isAnalyzing=false`);
                });
            this.lastAnalysisTime = now;
        }
    }

    /**
     * Run AI analysis on current telemetry
     */
    private async runRulesAnalysis(frame: TelemetryFrame): Promise<void> {
        if (!this.sessionContext) return;

        try {
            console.log('\n' + '═'.repeat(80));
            console.log('[AIService] 📊 ANÁLISIS DE TELEMETRÍA (cada 30 seg)');
            console.log('═'.repeat(80));

            // Log FULL telemetry frame for debugging
            console.log('\n📦 FRAME COMPLETO:');
            console.log(JSON.stringify(frame, null, 2));
            console.log('\n' + '─'.repeat(80));

            // Calcular análisis de telemetría
            const analysis = TelemetryRulesEngine.calculateAnalysis(frame, this.frameBuffer);

            console.log('\n📈 RESUMEN:');
            console.log(`  Powertrain: RPM=${Math.round(frame.powertrain?.rpm || 0)}, Speed=${Math.round(frame.powertrain?.speedKph || 0)}km/h, Gear=${frame.powertrain?.gear || 'N'}`);
            console.log(`  Pedales: Throttle=${Math.round((frame.powertrain?.throttle || 0) * 100)}%, Brake=${Math.round((frame.powertrain?.brake || 0) * 100)}%`);
            console.log(`  Temps: Oil=${Math.round(frame.temps?.oilC || 0)}°C, Water=${Math.round(frame.temps?.waterC || 0)}°C`);
            console.log(`  Tyres: ${frame.temps?.tyreC?.map(t => Math.round(t)).join('/') || 'N/A'}°C`);
            console.log(`  Brakes: ${frame.temps?.brakeC?.map(t => Math.round(t)).join('/') || 'N/A'}°C`);
            console.log(`  Session: Pit=${frame.session?.onPitRoad}, Lap=${frame.session?.lap}, Incidents=${frame.session?.incidents}`);
            console.log(`  Fuel: ${Math.round((frame.fuel?.levelPct || 0) * 100)}%`);
            console.log(`  Flags: 0x${(frame.flags?.sessionFlags || 0).toString(16)}`);
            console.log(`  Buffer: ${this.frameBuffer.length} frames`);
            console.log(`  Patterns: HardBrakes=${analysis.patterns.hardBrakingCount}, ThrottleChanges=${analysis.patterns.throttleChanges}`);

            // Obtener consejo del motor de reglas
            const advice = this.rulesEngine.analyze(analysis);

            if (advice) {
                console.log('\n' + '🎯'.repeat(50));
                console.log('[AIService] 💬 Consejo generado:');
                console.log(`  "${advice}"`);
                console.log('─'.repeat(100));

                // Generar voz con Piper
                console.log('[AIService] 🔊 Generando voz...');
                await this.tts.speak(advice, 'normal'); // Use this.tts and 'normal' speed
                console.log('[AIService] ✓ Voz reproducida');
            } else {
                console.log('[AIService] ℹ️ No hay consejos aplicables en este momento');
            }

        } catch (error) {
            console.error('[AIService] ❌ Error en análisis:', error);
        }
    }

    /**
     * Give initial motivational greeting when driver exits pits (Static to avoid LLM)
     */
    private async giveInitialGreeting(): Promise<void> {
        try {
            console.log('[AIService] 🏁 Giving initial motivational greeting (Static)...');

            const greetings = [
                "¡Dale dale! Te voy a estar mirando y te ayudo a mejorar.",
                "¡Vamos vamos! Estoy acá con vos, te voy dando consejos.",
                "¡Arrancamos! Concentrate en la pista que yo te voy guiando.",
                "¡Dale que podés! Vamos por ese tiempazo, estoy con vos."
            ];

            const greeting = greetings[Math.floor(Math.random() * greetings.length)];

            console.log('='.repeat(80));
            console.log('[AIService] 🎯 INITIAL GREETING:');
            console.log(greeting);
            console.log('─'.repeat(100));

            // Speak the greeting
            await this.tts.speak(greeting, 'normal');
            console.log('[AIService] ✅ Initial greeting spoken');
        } catch (error) {
            console.error('[AIService] Initial greeting failed:', error);
        }
    }

    /**
     * Set language
     */
    setLanguage(language: SupportedLanguage): void {
        this.config.language.stt = language;
        this.config.language.tts = language;

        this.llm.setLanguage(language);
        this.tts.setLanguage(language);

        console.log(`[AIService] Language changed to: ${language}`);
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            sessionActive: this.sessionContext !== null,
            mode: 'ai',
            language: this.config.language
        };
    }

    /**
     * Cleanup - stop child processes
     */
    async dispose(): Promise<void> {
        await this.llm.stop();
        await this.tts.dispose();

        this.initialized = false;
        console.log('[AIService] Disposed');
    }
}

export default AICoachingService;
