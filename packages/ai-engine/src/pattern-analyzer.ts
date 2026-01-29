/**
 * Pattern Analyzer
 * Detects driving patterns and anomalies from telemetry data
 */

import type { TelemetryFrame } from '@simracing/core';
import type { DrivingPattern, Anomaly, PatternType, SessionContext } from './types.js';

interface PatternHistory {
    type: PatternType;
    occurrences: {
        frame: number;
        timestamp: number;
        location?: string;
    }[];
    lastDetected: number;
}

/**
 * Configuration for pattern detection thresholds
 */
const DETECTION_THRESHOLDS = {
    brakeLock: {
        minSpeed: 50, // km/h
        brakePressure: 0.9,
        wheelSpeedDrop: 0.3 // 30% drop
    },
    cornerSpeed: {
        minSteeringAngle: 0.08,
        minLateralG: 0.9,
        speedVariance: 0.1 // 10% between laps
    },
    throttleControl: {
        maxOscillation: 0.2, // 20% oscillation
        windowSize: 10 // frames
    },
    lapConsistency: {
        maxVariance: 0.02 // 2% lap time variance for "consistent"
    }
};

export class PatternAnalyzer {
    private patterns: Map<PatternType, PatternHistory> = new Map();
    private frameHistory: TelemetryFrame[] = [];
    private maxHistorySize: number = 300; // ~15 seconds at 20fps
    private sessionContext: SessionContext | null = null;

    /**
     * Set session context
     */
    setSessionContext(context: SessionContext): void {
        this.sessionContext = context;
        this.reset();
    }

    /**
     * Analyze a new frame and detect patterns
     */
    analyzeFrame(frame: TelemetryFrame): DrivingPattern[] {
        // Add to history
        this.frameHistory.push(frame);
        if (this.frameHistory.length > this.maxHistorySize) {
            this.frameHistory.shift();
        }

        const detectedPatterns: DrivingPattern[] = [];

        // Run detection algorithms
        const brakeLock = this.detectBrakeLocking(frame);
        if (brakeLock) detectedPatterns.push(brakeLock);

        const cornerSpeed = this.detectCornerSpeed(frame);
        if (cornerSpeed) detectedPatterns.push(cornerSpeed);

        const throttleIssue = this.detectThrottleControl(frame);
        if (throttleIssue) detectedPatterns.push(throttleIssue);

        // Update pattern history
        detectedPatterns.forEach(pattern => {
            this.recordPattern(pattern.type, frame);
        });

        return detectedPatterns;
    }

    /**
     * Analyze session for consistency patterns
     */
    analyzeSession(frames: TelemetryFrame[]): DrivingPattern[] {
        const patterns: DrivingPattern[] = [];

        // Consistency analysis
        const consistency = this.analyzeLapConsistency(frames);
        if (consistency) patterns.push(consistency);

        // Tire wear analysis
        const tireWear = this.analyzeTireWear(frames);
        if (tireWear) patterns.push(tireWear);

        // Fuel usage analysis
        const fuelUsage = this.analyzeFuelUsage(frames);
        if (fuelUsage) patterns.push(fuelUsage);

        return patterns;
    }

    /**
     * Detect brake locking
     */
    private detectBrakeLocking(frame: TelemetryFrame): DrivingPattern | null {
        const speed = frame.powertrain?.speedKph || 0;
        const brake = frame.powertrain?.brake || 0;

        // Too slow to lock brakes meaningfully
        if (speed < DETECTION_THRESHOLDS.brakeLock.minSpeed) {
            return null;
        }

        // Not braking hard enough
        if (brake < DETECTION_THRESHOLDS.brakeLock.brakePressure) {
            return null;
        }

        // TODO: Check wheel speed sensors if available
        // For now, use deceleration rate as proxy
        if (this.frameHistory.length < 5) {
            return null;
        }

        const recentFrames = this.frameHistory.slice(-5);
        const decelRate = this.calculateDeceleration(recentFrames);

        // High deceleration with hard braking suggests lock
        if (decelRate > 15) { // m/s²
            const history = this.patterns.get('brake_lock');
            const occurrences = history ? history.occurrences.length : 0;

            // Only report if this is a pattern (3+ times)
            if (occurrences >= 2) {
                return {
                    type: 'brake_lock',
                    severity: 'high',
                    occurrences: occurrences + 1,
                    location: this.estimateLocation(),
                    recommendation: 'Reducí la presión inicial del freno o retrasá un poco el punto de frenado',
                    detectedAt: frame.t,
                    frames: [...(history?.occurrences.map(o => o.frame) || []), this.frameHistory.length]
                };
            }
        }

        return null;
    }

    /**
     * Detect corner speed issues
     */
    private detectCornerSpeed(frame: TelemetryFrame): DrivingPattern | null {
        const speed = frame.powertrain?.speedKph || 0;
        const steeringAngle = frame.physics?.steeringAngle || 0;
        const lateralG = frame.physics?.lateralG || 0;

        // Not in a corner
        if (Math.abs(steeringAngle) < DETECTION_THRESHOLDS.cornerSpeed.minSteeringAngle) {
            return null;
        }

        // Not generating enough lateral G for the steering input suggests understeer or too fast
        const expectedG = Math.abs(steeringAngle) * 10; // Rough estimate
        if (lateralG < expectedG * 0.7) {
            const history = this.patterns.get('corner_speed');
            const occurrences = history ? history.occurrences.length : 0;

            if (occurrences >= 2) {
                return {
                    type: 'corner_speed',
                    severity: 'medium',
                    occurrences: occurrences + 1,
                    location: this.estimateLocation(),
                    recommendation: 'Probá entrar un poco más despacio y acelerar más temprano en la salida',
                    detectedAt: frame.t,
                    frames: [...(history?.occurrences.map(o => o.frame) || []), this.frameHistory.length]
                };
            }
        }

        return null;
    }

    /**
     * Detect throttle control issues
     */
    private detectThrottleControl(frame: TelemetryFrame): DrivingPattern | null {
        if (this.frameHistory.length < DETECTION_THRESHOLDS.throttleControl.windowSize) {
            return null;
        }

        const recentFrames = this.frameHistory.slice(-DETECTION_THRESHOLDS.throttleControl.windowSize);
        const throttles = recentFrames.map(f => f.powertrain?.throttle || 0);

        // Calculate oscillation (variance)
        const mean = throttles.reduce((sum, t) => sum + t, 0) / throttles.length;
        const variance = throttles.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / throttles.length;
        const oscillation = Math.sqrt(variance);

        if (oscillation > DETECTION_THRESHOLDS.throttleControl.maxOscillation) {
            return {
                type: 'throttle_control',
                severity: 'low',
                occurrences: 1,
                recommendation: 'Suavizá las entradas del acelerador, estás oscilando mucho',
                detectedAt: frame.t,
                frames: [this.frameHistory.length]
            };
        }

        return null;
    }

    /**
     * Analyze lap time consistency
     */
    private analyzeLapConsistency(frames: TelemetryFrame[]): DrivingPattern | null {
        if (!this.sessionContext) return null;

        const avgLapTime = this.sessionContext.averageLapTime;
        const bestLapTime = this.sessionContext.bestLapTime;

        if (!avgLapTime || !bestLapTime || this.sessionContext.totalLaps < 3) {
            return null;
        }

        const variance = (avgLapTime - bestLapTime) / bestLapTime;

        if (variance > DETECTION_THRESHOLDS.lapConsistency.maxVariance) {
            return {
                type: 'inconsistent_pace',
                severity: 'medium',
                occurrences: this.sessionContext.totalLaps,
                recommendation: `Tu variación de tiempos es del ${(variance * 100).toFixed(1)}%. Enfocate en consistencia antes que en velocidad pura`,
                detectedAt: frames[frames.length - 1]?.t || 0,
                frames: []
            };
        }

        return null;
    }

    /**
     * Analyze tire wear patterns
     */
    private analyzeTireWear(frames: TelemetryFrame[]): DrivingPattern | null {
        // TODO: Implement tire wear analysis
        // Requires tire temperature/pressure telemetry
        return null;
    }

    /**
     * Analyze fuel usage
     */
    private analyzeFuelUsage(frames: TelemetryFrame[]): DrivingPattern | null {
        // TODO: Implement fuel usage analysis
        // Requires fuel level telemetry
        return null;
    }

    /**
     * Detect anomalies (sudden changes)
     */
    detectAnomalies(currentFrame: TelemetryFrame, history: TelemetryFrame[]): Anomaly[] {
        const anomalies: Anomaly[] = [];

        if (history.length < 10) return anomalies;

        const recentFrames = history.slice(-10);

        // Sudden speed drop (possible collision)
        const speedDropAnomaly = this.detectSuddenSpeedDrop(currentFrame, recentFrames);
        if (speedDropAnomaly) anomalies.push(speedDropAnomaly);

        // Temperature spike
        const tempAnomaly = this.detectTemperatureSpike(currentFrame, recentFrames);
        if (tempAnomaly) anomalies.push(tempAnomaly);

        return anomalies;
    }

    /**
     * Detect sudden speed drop
     */
    private detectSuddenSpeedDrop(current: TelemetryFrame, recent: TelemetryFrame[]): Anomaly | null {
        const currentSpeed = current.powertrain?.speedKph || 0;
        const avgRecentSpeed = recent.reduce((sum, f) => sum + (f.powertrain?.speedKph || 0), 0) / recent.length;

        const speedDrop = avgRecentSpeed - currentSpeed;
        const dropPercentage = speedDrop / avgRecentSpeed;

        // >30% speed drop in less than 0.5 seconds
        if (dropPercentage > 0.3 && avgRecentSpeed > 50) {
            return {
                type: 'sudden_deceleration',
                severity: 'critical',
                description: `Caída brusca de velocidad: ${speedDrop.toFixed(0)} km/h`,
                telemetrySnapshot: {
                    powertrain: current.powertrain,
                    t: current.t
                },
                timestamp: current.t
            };
        }

        return null;
    }

    /**
     * Detect temperature spike
     */
    private detectTemperatureSpike(current: TelemetryFrame, recent: TelemetryFrame[]): Anomaly | null {
        const currentWaterTemp = current.temps?.waterC || 0;
        const avgWaterTemp = recent.reduce((sum, f) => sum + (f.temps?.waterC || 0), 0) / recent.length;

        const tempIncrease = currentWaterTemp - avgWaterTemp;

        // >10°C increase in short time
        if (tempIncrease > 10) {
            return {
                type: 'temperature_spike',
                severity: 'high',
                description: `Temperatura del agua subió ${tempIncrease.toFixed(1)}°C`,
                telemetrySnapshot: {
                    temps: current.temps,
                    t: current.t
                },
                timestamp: current.t
            };
        }

        return null;
    }

    /**
     * Helper: Calculate deceleration rate
     */
    private calculateDeceleration(frames: TelemetryFrame[]): number {
        if (frames.length < 2) return 0;

        const first = frames[0];
        const last = frames[frames.length - 1];

        const speedDiff = (first.powertrain?.speedKph || 0) - (last.powertrain?.speedKph || 0);
        const timeDiff = (last.t - first.t) / 1000; // seconds

        // Convert km/h to m/s and divide by time
        return (speedDiff / 3.6) / timeDiff;
    }

    /**
     * Helper: Estimate current location (corner, sector)
     */
    private estimateLocation(): string {
        // TODO: Implement track position detection
        // For now, return generic
        return 'curva actual';
    }

    /**
     * Record pattern occurrence
     */
    private recordPattern(type: PatternType, frame: TelemetryFrame): void {
        let history = this.patterns.get(type);

        if (!history) {
            history = {
                type,
                occurrences: [],
                lastDetected: 0
            };
            this.patterns.set(type, history);
        }

        history.occurrences.push({
            frame: this.frameHistory.length - 1,
            timestamp: frame.t,
            location: this.estimateLocation()
        });

        history.lastDetected = frame.t;

        // Keep only last 10 occurrences
        if (history.occurrences.length > 10) {
            history.occurrences.shift();
        }
    }

    /**
     * Get pattern history
     */
    getPatternHistory(type: PatternType): PatternHistory | null {
        return this.patterns.get(type) || null;
    }

    /**
     * Get all active patterns
     */
    getActivePatterns(): DrivingPattern[] {
        const patterns: DrivingPattern[] = [];
        const now = Date.now();

        this.patterns.forEach((history, type) => {
            // Only include patterns detected in last 30 seconds
            if (now - history.lastDetected < 30000 && history.occurrences.length >= 2) {
                patterns.push({
                    type,
                    severity: 'medium',
                    occurrences: history.occurrences.length,
                    location: history.occurrences[history.occurrences.length - 1]?.location,
                    recommendation: 'Pattern detected - needs specific recommendation',
                    detectedAt: history.lastDetected,
                    frames: history.occurrences.map(o => o.frame)
                });
            }
        });

        return patterns;
    }

    /**
     * Reset analyzer
     */
    reset(): void {
        this.patterns.clear();
        this.frameHistory = [];
        console.log('[PatternAnalyzer] Reset');
    }
}

export default PatternAnalyzer;
