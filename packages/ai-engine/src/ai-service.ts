/**
 * AI Coaching Service
 * Main service that orchestrates LLM, STT, TTS, and Pattern Analysis
 */

import type { TelemetryFrame } from '@simracing/core';
import { LLMAgent } from './llm-agent.js';
import { STTAgent } from './stt-agent.js';
import { TTSAgent } from './tts-agent.js';
import { PatternAnalyzer } from './pattern-analyzer.js';
import { ModelManager } from './model-manager.js';
import type {
    AIServiceConfig,
    CoachingContext,
    SessionContext,
    SupportedLanguage,
    DrivingPattern
} from './types.js';

const DEFAULT_CONFIG: AIServiceConfig = {
    enabled: true,
    mode: 'hybrid', // Use both rules and AI
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
        vadEnabled: true
    },
    tts: {
        modelPath: '',
        language: 'es',
        voice: 'es_AR-tux-medium',
        speed: 1.0,
        volume: 0.8
    },
    analysisInterval: 10, // seconds
    voiceInputMode: 'vad' // Always listening with VAD
};

export class AICoachingService {
    private config: AIServiceConfig;
    private llm: LLMAgent;
    private stt: STTAgent;
    private tts: TTSAgent;
    private analyzer: PatternAnalyzer;
    private modelManager: ModelManager;

    private sessionContext: SessionContext | null = null;
    private lastAnalysisTime: number = 0;
    private frameBuffer: TelemetryFrame[] = [];
    private conversationHistory: any[] = [];

    private initialized: boolean = false;

    constructor(config: Partial<AIServiceConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        this.llm = new LLMAgent(this.config.llm);
        this.stt = new STTAgent(this.config.stt);
        this.tts = new TTSAgent(this.config.tts);
        this.analyzer = new PatternAnalyzer();
        this.modelManager = new ModelManager();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for agents
     */
    private setupEventListeners(): void {
        // STT events
        this.stt.on('event', async (event) => {
            if (event.type === 'transcription') {
                await this.handleVoiceInput(event.result.text);
            }
        });

        // TTS events
        this.tts.on('event', (event) => {
            console.log('[AIService] TTS Event:', event.type);
        });
    }

    /**
     * Initialize the service - download models if needed
     */
    async initialize(onProgress?: (progress: any) => void): Promise<void> {
        console.log('[AIService] Initializing AI Coaching Service...');

        // Check and download models
        const statuses = await this.modelManager.checkModels();
        const missing = statuses.filter(s => !s.installed || !s.verified);

        if (missing.length > 0) {
            console.log(`[AIService] Downloading ${missing.length} missing models...`);
            await this.modelManager.downloadMissing(onProgress);
        }

        // Get model paths
        const llmPath = await this.modelManager.getModelPathIfInstalled('llama-3.2-1b-q4');
        const sttPath = await this.modelManager.getModelPathIfInstalled('whisper-tiny-multilingual');
        const ttsPath = await this.modelManager.getModelPathIfInstalled('piper-es-ar');

        if (!llmPath || !sttPath || !ttsPath) {
            throw new Error('Required models not found after download');
        }

        // Initialize agents
        console.log('[AIService] Loading LLM...');
        await this.llm.load(llmPath);
        this.llm.setLanguage(this.config.language.stt);

        console.log('[AIService] Loading STT...');
        await this.stt.initialize(sttPath);

        console.log('[AIService] Loading TTS...');
        await this.tts.initialize(ttsPath);

        this.initialized = true;
        console.log('[AIService] AI Coaching Service initialized successfully');
    }

    /**
     * Start session with context
     */
    startSession(context: SessionContext): void {
        this.sessionContext = context;
        this.analyzer.setSessionContext(context);
        this.frameBuffer = [];
        this.conversationHistory = [];
        this.lastAnalysisTime = 0;

        console.log(`[AIService] Started session: ${context.simName} at ${context.trackId}`);

        // Start voice input if enabled
        if (this.config.voiceInputMode === 'vad') {
            this.stt.startListening();
        }
    }

    /**
     * End current session
     */
    endSession(): void {
        this.stt.stopListening();
        this.sessionContext = null;
        this.analyzer.reset();
        this.llm.resetSession();

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
        if (this.frameBuffer.length > 600) { // ~30 seconds at 20fps
            this.frameBuffer.shift();
        }

        // Analyze patterns in real-time
        const patterns = this.analyzer.analyzeFrame(frame);

        // Check if it's time for AI analysis
        const now = Date.now();
        const timeSinceLastAnalysis = (now - this.lastAnalysisTime) / 1000;

        if (timeSinceLastAnalysis >= this.config.analysisInterval) {
            await this.runAIAnalysis(frame, patterns);
            this.lastAnalysisTime = now;
        }

        // Check for urgent patterns that need immediate alert
        const urgentPattern = patterns.find(p => p.severity === 'high');
        if (urgentPattern) {
            await this.provideUrgentCoaching(urgentPattern, frame);
        }
    }

    /**
     * Run AI analysis on current state
     */
    private async runAIAnalysis(frame: TelemetryFrame, patterns: DrivingPattern[]): Promise<void> {
        if (!this.sessionContext) return;

        const context: CoachingContext = {
            simName: this.sessionContext.simName,
            trackId: this.sessionContext.trackId,
            carId: this.sessionContext.carId,
            sessionType: this.sessionContext.sessionType,
            currentTelemetry: frame,
            detectedPatterns: patterns,
            conversationHistory: this.conversationHistory,
            language: this.config.language.stt
        };

        try {
            const insight = await this.llm.analyze(context);

            // Speak the insight
            await this.tts.speak(insight.text, insight.priority === 'urgent' ? 'urgent' : 'normal');

            // Add to conversation history
            this.conversationHistory.push({
                role: 'assistant',
                content: insight.text,
                timestamp: Date.now()
            });

            // Keep history limited
            if (this.conversationHistory.length > 20) {
                this.conversationHistory.shift();
            }
        } catch (error) {
            console.error('[AIService] Analysis failed:', error);
        }
    }

    /**
     * Provide urgent coaching without AI (faster)
     */
    private async provideUrgentCoaching(pattern: DrivingPattern, frame: TelemetryFrame): Promise<void> {
        // Interrupt current speech for urgent alerts
        await this.tts.interrupt();
        await this.tts.speak(pattern.recommendation, 'urgent');
    }

    /**
     * Handle voice input from driver
     */
    private async handleVoiceInput(text: string): Promise<void> {
        if (!this.sessionContext) {
            console.log('[AIService] No active session, ignoring voice input');
            return;
        }

        console.log(`[AIService] Voice input: "${text}"`);

        // Add to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: text,
            timestamp: Date.now()
        });

        // Get current frame
        const currentFrame = this.frameBuffer[this.frameBuffer.length - 1];
        if (!currentFrame) return;

        // Build context
        const context: CoachingContext = {
            simName: this.sessionContext.simName,
            trackId: this.sessionContext.trackId,
            carId: this.sessionContext.carId,
            sessionType: this.sessionContext.sessionType,
            currentTelemetry: currentFrame,
            detectedPatterns: this.analyzer.getActivePatterns(),
            conversationHistory: this.conversationHistory,
            language: this.config.language.stt
        };

        try {
            // Get LLM response
            const response = await this.llm.answerQuestion(text, context);

            // Speak response
            await this.tts.speak(response, 'normal');

            // Add to history
            this.conversationHistory.push({
                role: 'assistant',
                content: response,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('[AIService] Voice input handling failed:', error);
        }
    }

    /**
     * Manually trigger push-to-talk
     */
    async startPushToTalk(): Promise<void> {
        if (this.config.voiceInputMode === 'push-to-talk') {
            await this.stt.startListening();
        }
    }

    /**
     * Stop push-to-talk
     */
    async stopPushToTalk(): Promise<void> {
        if (this.config.voiceInputMode === 'push-to-talk') {
            await this.stt.stopListening();
        }
    }

    /**
     * Change language
     */
    setLanguage(language: SupportedLanguage): void {
        this.config.language.stt = language;
        this.config.language.tts = language;

        this.llm.setLanguage(language);
        this.stt.setLanguage(language);
        this.tts.setLanguage(language);

        console.log(`[AIService] Language changed to: ${language}`);
    }

    /**
     * Set coaching mode
     */
    setMode(mode: 'rules' | 'ai' | 'hybrid'): void {
        this.config.mode = mode;
        console.log(`[AIService] Mode changed to: ${mode}`);
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            sessionActive: this.sessionContext !== null,
            mode: this.config.mode,
            language: this.config.language,
            queueLength: this.tts.getQueueLength(),
            isSpeaking: this.tts.isSpeaking()
        };
    }

    /**
     * Cleanup
     */
    async dispose(): Promise<void> {
        await this.stt.dispose();
        await this.tts.dispose();
        await this.llm.unload();

        this.initialized = false;
        console.log('[AIService] Disposed');
    }
}

export default AICoachingService;
