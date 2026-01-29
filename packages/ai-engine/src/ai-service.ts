/**
 * AI Coaching Service - Standalone Binary Architecture
 * Orchestrates Llama.cpp, Piper TTS via child processes
 */

import type { TelemetryFrame } from '@simracing/core';
import { LlamaCppAgent } from './llama-cpp-agent.js';
import { PiperAgent } from './piper-agent.js';
import type {
    AIServiceConfig,
    CoachingContext,
    SessionContext,
    SupportedLanguage
} from './types.js';

const DEFAULT_CONFIG: AIServiceConfig = {
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
        maxTokens: 150
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
    analysisInterval: 5, // Analyze every 5 seconds
    voiceInputMode: 'push-to-talk'
};

export class AICoachingService {
    private config: AIServiceConfig;
    private llm: LlamaCppAgent;
    private tts: PiperAgent;

    private sessionContext: SessionContext | null = null;
    private lastAnalysisTime: number = 0;
    private frameBuffer: TelemetryFrame[] = [];

    private initialized: boolean = false;
    private externalAgents: boolean = false;

    constructor(config: Partial<AIServiceConfig> = {}, externalLlm?: LlamaCppAgent, externalTts?: PiperAgent) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Use external agents if provided, otherwise create new ones
        if (externalLlm && externalTts) {
            console.log('[AIService] Using external LLM and TTS agents');
            this.llm = externalLlm;
            this.tts = externalTts;
            this.externalAgents = true;
        } else {
            console.log('[AIService] Creating new LLM and TTS agents');
            this.llm = new LlamaCppAgent(this.config.llm);
            this.tts = new PiperAgent(this.config.tts);
            this.externalAgents = false;
        }
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
                this.llm.setLanguage(this.config.language.stt);
            } else {
                // Start Llama.cpp server
                console.log('[AIService] Starting Llama.cpp server...');
                await this.llm.start();
                this.llm.setLanguage(this.config.language.stt);

                // Initialize Piper
                console.log('[AIService] Initializing Piper TTS...');
                await this.tts.initialize();
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
    startSession(context: SessionContext): void {
        this.sessionContext = context;
        this.frameBuffer = [];
        this.lastAnalysisTime = 0;

        console.log(`[AIService] Started AI coaching session: ${context.simName} at ${context.trackId}`);
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

        // Add to buffer
        this.frameBuffer.push(frame);
        if (this.frameBuffer.length > 200) { // ~10 seconds at 20fps
            this.frameBuffer.shift();
        }

        // Check if it's time for AI analysis
        const now = Date.now();
        const timeSinceLastAnalysis = (now - this.lastAnalysisTime) / 1000;

        if (timeSinceLastAnalysis >= this.config.analysisInterval) {
            await this.runAIAnalysis(frame);
            this.lastAnalysisTime = now;
        }
    }

    /**
     * Run AI analysis on current telemetry
     */
    private async runAIAnalysis(frame: TelemetryFrame): Promise<void> {
        if (!this.sessionContext) return;

        const context: CoachingContext = {
            simName: this.sessionContext.simName,
            trackId: this.sessionContext.trackId,
            carId: this.sessionContext.carId,
            sessionType: this.sessionContext.sessionType,
            currentTelemetry: frame,
            detectedPatterns: [], // AI does its own pattern detection
            conversationHistory: [],
            language: this.config.language.stt
        };

        try {
            console.log('[AIService] Running AI analysis...');
            const insight = await this.llm.analyze(context);

            // Speak the insight
            console.log('[AIService] AI says:', insight.text);
            await this.tts.speak(insight.text, 'normal');
        } catch (error) {
            console.error('[AIService] AI analysis failed:', error);
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
