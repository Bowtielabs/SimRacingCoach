/**
 * AI Engine - Main Export
 * Exports all AI components and services
 */

// Types
export * from './types.js';

// Agents
export { LLMAgent } from './llm-agent.js';
export { STTAgent } from './stt-agent.js';
export { TTSAgent } from './tts-agent.js';
export { LlamaCppAgent } from './llama-cpp-agent.js';
export { PrerenderedAudioAgent } from './prerendered-audio-agent.js';

// Pattern Analysis
export { PatternAnalyzer } from './pattern-analyzer.js';

// Model Management
export { ModelManager, AVAILABLE_MODELS } from './model-manager.js';

// Telemetry Analysis
export { TelemetryBuffer } from './telemetry-buffer.js';
export { TelemetryRulesEngine, TelemetryRulesEngine as RulesEngine } from './telemetry-rules-engine.js';
export { AdvancedTelemetryAnalyzer } from './advanced-analyzer.js';
export type { TelemetryWindow, WindowSummary, TelemetryBufferConfig } from './telemetry-buffer.js';
export type { TelemetryAnalysis, TelemetryRule, AnalysisResult } from './telemetry-rules-engine.js';
export type {
    CornerAnalysis, TrafficAnalysis, TimingAnalysis, CarStateAnalysis,
    DrivingStyleAnalysis, AdvancedAnalysisResult, Recommendation
} from './advanced-analyzer.js';

// Main service
export { AICoachingService } from './ai-service.js';
