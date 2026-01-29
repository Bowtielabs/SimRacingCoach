/**
 * AI Engine Types
 * Core types for AI-powered coaching system
 */

import type { TelemetryFrame } from '@simracing/core';

// ============================================================================
// Language Support
// ============================================================================

export type SupportedLanguage = 'es' | 'en' | 'pt' | 'fr' | 'it';

export interface LanguageConfig {
    stt: SupportedLanguage;
    tts: SupportedLanguage;
    ttsVoice?: string; // Specific voice model
}

// ============================================================================
// LLM Agent Types
// ============================================================================

export interface LLMConfig {
    modelPath: string;
    contextSize: number;
    temperature: number;
    topP: number;
    maxTokens: number;
    seed?: number;
}

export interface CoachingContext {
    simName: string;
    trackId: string;
    carId: string;
    sessionType: 'practice' | 'qualify' | 'race';
    currentTelemetry: TelemetryFrame;
    detectedPatterns: DrivingPattern[];
    conversationHistory: ConversationMessage[];
    language: SupportedLanguage;
}

export interface ConversationMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface CoachingInsight {
    text: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    category: 'technique' | 'setup' | 'strategy' | 'safety';
    confidence: number; // 0-1
}

// ============================================================================
// Pattern Analysis Types
// ============================================================================

export type PatternType =
    | 'brake_lock'
    | 'inconsistent_pace'
    | 'tire_wear'
    | 'fuel_usage'
    | 'corner_speed'
    | 'throttle_control'
    | 'racing_line';

export interface DrivingPattern {
    type: PatternType;
    severity: 'low' | 'medium' | 'high';
    occurrences: number;
    location?: string; // corner name, sector, etc.
    recommendation: string;
    detectedAt: number; // timestamp
    frames: number[]; // frame indices where pattern detected
}

export interface Anomaly {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    telemetrySnapshot: Partial<TelemetryFrame>;
    timestamp: number;
}

// ============================================================================
// STT Agent Types
// ============================================================================

export interface STTConfig {
    modelPath: string;
    language: SupportedLanguage;
    vadEnabled: boolean;
    vadThreshold?: number;
    silenceDuration?: number; // ms
}

export interface TranscriptionResult {
    text: string;
    confidence: number;
    language: SupportedLanguage;
    duration: number; // ms
}

export type STTEvent =
    | { type: 'listening' }
    | { type: 'processing' }
    | { type: 'transcription'; result: TranscriptionResult }
    | { type: 'error'; error: Error };

// ============================================================================
// TTS Agent Types
// ============================================================================

export interface TTSConfig {
    modelPath: string;
    language: SupportedLanguage;
    voice: string;
    speed: number; // 0.5 - 2.0
    volume: number; // 0.0 - 1.0
}

export interface TTSQueueItem {
    text: string;
    priority: 'normal' | 'urgent';
    id: string;
    createdAt: number;
}

export type TTSEvent =
    | { type: 'started'; id: string }
    | { type: 'completed'; id: string }
    | { type: 'interrupted'; id: string }
    | { type: 'error'; id: string; error: Error };

// ============================================================================
// Model Manager Types
// ============================================================================

export interface ModelSpec {
    name: string;
    url: string;
    size: number; // MB
    checksum: string;
    required: boolean;
    type: 'llm' | 'stt' | 'tts';
}

export interface ModelStatus {
    name: string;
    installed: boolean;
    verified: boolean;
    size?: number;
    path?: string;
}

export interface DownloadProgress {
    modelName: string;
    downloaded: number; // MB
    total: number; // MB
    percentage: number;
    speed: number; // MB/s
}

// ============================================================================
// AI Service Configuration
// ============================================================================

export interface AIServiceConfig {
    enabled: boolean;
    mode: 'rules' | 'ai' | 'hybrid';
    language: LanguageConfig;
    llm: LLMConfig;
    stt: STTConfig;
    tts: TTSConfig;
    analysisInterval: number; // seconds
    voiceInputMode: 'push-to-talk' | 'vad';
}

// ============================================================================
// Session Context for Pattern Analysis
// ============================================================================

export interface SessionContext {
    sessionId: string;
    startTime: number;
    simName: string;
    trackId: string;
    carId: string;
    sessionType: 'practice' | 'qualify' | 'race';
    totalLaps: number;
    currentLap: number;
    bestLapTime: number | null;
    averageLapTime: number | null;
    consistency: number; // 0-100, calculated from lap time variance
}

// ============================================================================
// Exports
// ============================================================================

export * from './llm-agent.js';
export * from './stt-agent.js';
export * from './tts-agent.js';
export * from './pattern-analyzer.js';
export * from './model-manager.js';
