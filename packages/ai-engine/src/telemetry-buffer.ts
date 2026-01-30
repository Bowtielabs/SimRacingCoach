/**
 * TelemetryBuffer - Acumula telemetría en ventanas de tiempo (30 segundos)
 * 
 * Cada 30 segundos:
 * 1. Envía el buffer al motor de reglas
 * 2. Limpia el buffer
 * 3. Vuelve a capturar
 */

import { TelemetryFrame } from '@simracing/core';

export interface TelemetryWindow {
    frames: TelemetryFrame[];
    startTime: number;
    endTime: number;
    summary: WindowSummary;
}

export interface WindowSummary {
    // Velocidades
    avgSpeedKph: number;
    maxSpeedKph: number;
    minSpeedKph: number;

    // RPM
    avgRpm: number;
    maxRpm: number;
    overRevSeconds: number;

    // Frenos
    avgBrakePct: number;
    maxBrakePct: number;
    hardBrakingEvents: number;

    // Acelerador
    avgThrottlePct: number;
    fullThrottlePct: number;
    liftCount: number;

    // Dirección
    avgSteeringAngle: number;
    maxSteeringAngle: number;
    correctionCount: number;

    // G-forces
    avgLateralG: number;
    maxLateralG: number;
    avgLongG: number;
    maxLongG: number;

    // Neumáticos
    avgTyreTemps: number[];
    maxTyreTemps: number[];

    // Motor
    avgWaterTemp: number;
    maxWaterTemp: number;
    avgOilTemp: number;
    maxOilTemp: number;

    // Combustible
    fuelUsed: number;
    fuelAtEnd: number;

    // Incidentes
    incidentsDelta: number;

    // Lap info
    lapNumber: number;
    lapDistPctStart: number;
    lapDistPctEnd: number;
}

export interface TelemetryBufferConfig {
    windowDurationMs: number;  // Duración de la ventana (default: 30000 = 30 seg)
    framesPerSecond: number;   // FPS esperado (default: 60)
    onWindowComplete?: (window: TelemetryWindow) => void;  // Callback cuando la ventana está lista
}

/**
 * Buffer de telemetría por ventana de tiempo
 */
export class TelemetryBuffer {
    private config: TelemetryBufferConfig;
    private frames: TelemetryFrame[] = [];
    private windowStartTime: number = 0;
    private isCapturing: boolean = false;

    constructor(config: Partial<TelemetryBufferConfig> = {}) {
        this.config = {
            windowDurationMs: config.windowDurationMs ?? 30000,  // 30 segundos
            framesPerSecond: config.framesPerSecond ?? 60,
            onWindowComplete: config.onWindowComplete,
        };
    }

    /**
     * Inicia la captura de telemetría
     */
    startCapture(): void {
        this.frames = [];
        this.windowStartTime = Date.now();
        this.isCapturing = true;
        console.log(`[TelemetryBuffer] ▶ Iniciando captura de ${this.config.windowDurationMs / 1000}s...`);
    }

    /**
     * Agrega un frame de telemetría al buffer
     * Devuelve true si la ventana se completó y fue procesada
     */
    addFrame(frame: TelemetryFrame): boolean {
        if (!this.isCapturing) {
            console.log('[TelemetryBuffer] ▶ Iniciando captura de ventana...');
            this.startCapture();
        }

        this.frames.push(frame);

        // ¿Se completó la ventana de tiempo?
        const elapsed = Date.now() - this.windowStartTime;

        // Log de progreso cada ~5 segundos (300 frames a 60fps)
        if (this.frames.length % 300 === 0) {
            console.log(`[TelemetryBuffer] 📊 frames=${this.frames.length}, elapsed=${(elapsed / 1000).toFixed(1)}s/${(this.config.windowDurationMs / 1000)}s (${Math.round(elapsed / this.config.windowDurationMs * 100)}%)`);
        }

        if (elapsed >= this.config.windowDurationMs) {
            this.completeWindow();
            return true;
        }

        return false;
    }

    /**
     * Fuerza completar la ventana actual (para testing o cuando termina la sesión)
     */
    forceComplete(): TelemetryWindow | null {
        if (this.frames.length === 0) return null;
        return this.completeWindow();
    }

    /**
     * Completa la ventana actual, genera resumen y reinicia
     */
    private completeWindow(): TelemetryWindow {
        const window: TelemetryWindow = {
            frames: [...this.frames],
            startTime: this.windowStartTime,
            endTime: Date.now(),
            summary: this.calculateSummary(),
        };

        console.log(`[TelemetryBuffer] ✓ Ventana completada: ${this.frames.length} frames, ${((window.endTime - window.startTime) / 1000).toFixed(1)}s`);

        // Callback si está configurado
        if (this.config.onWindowComplete) {
            this.config.onWindowComplete(window);
        }

        // Reiniciar para nueva ventana
        this.frames = [];
        this.windowStartTime = Date.now();

        return window;
    }

    /**
     * Calcula resumen de la ventana actual
     */
    private calculateSummary(): WindowSummary {
        const frames = this.frames;
        const count = frames.length;

        if (count === 0) {
            return this.emptySummary();
        }

        const fps = this.config.framesPerSecond;

        // Velocidades
        const speeds = frames.map(f => f.powertrain?.speedKph ?? 0);
        const avgSpeedKph = speeds.reduce((a, b) => a + b, 0) / count;
        const maxSpeedKph = Math.max(...speeds);
        const minSpeedKph = Math.min(...speeds.filter(s => s > 0)) || 0;

        // RPM
        const rpms = frames.map(f => f.powertrain?.rpm ?? 0);
        const avgRpm = rpms.reduce((a, b) => a + b, 0) / count;
        const maxRpm = Math.max(...rpms);
        const overRevFrames = frames.filter(f => (f.powertrain?.rpm ?? 0) > 7500).length;
        const overRevSeconds = overRevFrames / fps;

        // Frenos
        const brakes = frames.map(f => (f.powertrain?.brake ?? 0) * 100);
        const avgBrakePct = brakes.reduce((a, b) => a + b, 0) / count;
        const maxBrakePct = Math.max(...brakes);
        const hardBrakingEvents = this.countBrakingEvents(frames);

        // Acelerador
        const throttles = frames.map(f => (f.powertrain?.throttle ?? 0) * 100);
        const avgThrottlePct = throttles.reduce((a, b) => a + b, 0) / count;
        const fullThrottleFrames = throttles.filter(t => t > 95).length;
        const fullThrottlePct = (fullThrottleFrames / count) * 100;
        const liftCount = this.countThrottleLifts(frames);

        // Dirección
        const steerings = frames.map(f => Math.abs(f.physics?.steeringAngle ?? 0));
        const avgSteeringAngle = steerings.reduce((a, b) => a + b, 0) / count;
        const maxSteeringAngle = Math.max(...steerings);
        const correctionCount = this.countSteeringCorrections(frames);

        // G-forces
        const latGs = frames.map(f => Math.abs(f.physics?.lateralG ?? 0));
        const longGs = frames.map(f => f.physics?.longitudinalG ?? 0);
        const avgLateralG = latGs.reduce((a, b) => a + b, 0) / count;
        const maxLateralG = Math.max(...latGs);
        const avgLongG = longGs.reduce((a, b) => a + b, 0) / count;
        const maxLongG = Math.min(...longGs);

        // Neumáticos
        const avgTyreTemps = [0, 1, 2, 3].map(i =>
            frames.reduce((sum, f) => sum + (f.temps?.tyreC?.[i] ?? 0), 0) / count
        );
        const maxTyreTemps = [0, 1, 2, 3].map(i =>
            Math.max(...frames.map(f => f.temps?.tyreC?.[i] ?? 0))
        );

        // Motor
        const waters = frames.map(f => f.temps?.waterC ?? 0);
        const oils = frames.map(f => f.temps?.oilC ?? 0);
        const avgWaterTemp = waters.reduce((a, b) => a + b, 0) / count;
        const maxWaterTemp = Math.max(...waters);
        const avgOilTemp = oils.reduce((a, b) => a + b, 0) / count;
        const maxOilTemp = Math.max(...oils);

        // Combustible
        const firstFuel = frames[0].fuel?.level ?? 0;
        const lastFuel = frames[frames.length - 1].fuel?.level ?? 0;
        const fuelUsed = Math.max(0, firstFuel - lastFuel);
        const fuelAtEnd = lastFuel;

        // Incidentes
        const firstIncidents = frames[0].session?.incidents ?? 0;
        const lastIncidents = frames[frames.length - 1].session?.incidents ?? 0;
        const incidentsDelta = lastIncidents - firstIncidents;

        // Lap info
        const lapNumber = frames[frames.length - 1].session?.lap ?? 0;
        const lapDistPctStart = (frames[0] as any).session?.lapDistPct ?? 0;
        const lapDistPctEnd = (frames[frames.length - 1] as any).session?.lapDistPct ?? 0;

        return {
            avgSpeedKph,
            maxSpeedKph,
            minSpeedKph,
            avgRpm,
            maxRpm,
            overRevSeconds,
            avgBrakePct,
            maxBrakePct,
            hardBrakingEvents,
            avgThrottlePct,
            fullThrottlePct,
            liftCount,
            avgSteeringAngle,
            maxSteeringAngle,
            correctionCount,
            avgLateralG,
            maxLateralG,
            avgLongG,
            maxLongG,
            avgTyreTemps,
            maxTyreTemps,
            avgWaterTemp,
            maxWaterTemp,
            avgOilTemp,
            maxOilTemp,
            fuelUsed,
            fuelAtEnd,
            incidentsDelta,
            lapNumber,
            lapDistPctStart,
            lapDistPctEnd,
        };
    }

    private emptySummary(): WindowSummary {
        return {
            avgSpeedKph: 0, maxSpeedKph: 0, minSpeedKph: 0,
            avgRpm: 0, maxRpm: 0, overRevSeconds: 0,
            avgBrakePct: 0, maxBrakePct: 0, hardBrakingEvents: 0,
            avgThrottlePct: 0, fullThrottlePct: 0, liftCount: 0,
            avgSteeringAngle: 0, maxSteeringAngle: 0, correctionCount: 0,
            avgLateralG: 0, maxLateralG: 0, avgLongG: 0, maxLongG: 0,
            avgTyreTemps: [0, 0, 0, 0], maxTyreTemps: [0, 0, 0, 0],
            avgWaterTemp: 0, maxWaterTemp: 0, avgOilTemp: 0, maxOilTemp: 0,
            fuelUsed: 0, fuelAtEnd: 0,
            incidentsDelta: 0,
            lapNumber: 0, lapDistPctStart: 0, lapDistPctEnd: 0,
        };
    }

    private countBrakingEvents(frames: TelemetryFrame[]): number {
        let events = 0;
        let inBraking = false;
        for (const f of frames) {
            const brake = (f.powertrain?.brake ?? 0) * 100;
            if (brake > 80 && !inBraking) {
                events++;
                inBraking = true;
            } else if (brake < 20) {
                inBraking = false;
            }
        }
        return events;
    }

    private countThrottleLifts(frames: TelemetryFrame[]): number {
        let lifts = 0;
        let wasFullThrottle = false;
        for (const f of frames) {
            const throttle = (f.powertrain?.throttle ?? 0) * 100;
            if (throttle > 95) {
                wasFullThrottle = true;
            } else if (throttle < 50 && wasFullThrottle) {
                lifts++;
                wasFullThrottle = false;
            }
        }
        return lifts;
    }

    private countSteeringCorrections(frames: TelemetryFrame[]): number {
        let corrections = 0;
        for (let i = 2; i < frames.length; i++) {
            const prev = frames[i - 1].physics?.steeringAngle ?? 0;
            const curr = frames[i].physics?.steeringAngle ?? 0;
            if (Math.sign(prev) !== Math.sign(curr) && Math.abs(prev) > 0.1 && Math.abs(curr) > 0.1) {
                corrections++;
            }
        }
        return corrections;
    }

    // ============================================
    // GETTERS
    // ============================================

    /**
     * Obtiene los frames actuales (ventana en progreso)
     */
    getCurrentFrames(): TelemetryFrame[] {
        return [...this.frames];
    }

    /**
     * Obtiene el frame más reciente
     */
    getLastFrame(): TelemetryFrame | null {
        return this.frames[this.frames.length - 1] ?? null;
    }

    /**
     * Tiempo restante para completar la ventana (ms)
     */
    getRemainingTimeMs(): number {
        const elapsed = Date.now() - this.windowStartTime;
        return Math.max(0, this.config.windowDurationMs - elapsed);
    }

    /**
     * Progreso de la ventana actual (0-100)
     */
    getProgress(): number {
        const elapsed = Date.now() - this.windowStartTime;
        return Math.min(100, (elapsed / this.config.windowDurationMs) * 100);
    }

    /**
     * Estadísticas del buffer
     */
    getStats(): { frameCount: number; durationMs: number; progress: number } {
        return {
            frameCount: this.frames.length,
            durationMs: Date.now() - this.windowStartTime,
            progress: this.getProgress(),
        };
    }

    /**
     * Está capturando?
     */
    isActive(): boolean {
        return this.isCapturing;
    }

    /**
     * Detiene la captura
     */
    stop(): void {
        this.isCapturing = false;
        this.frames = [];
        console.log(`[TelemetryBuffer] ⏹ Captura detenida`);
    }

    /**
     * Exporta los frames actuales a JSON
     */
    exportToJSON(): string {
        return JSON.stringify({
            frames: this.frames,
            summary: this.calculateSummary(),
            startTime: this.windowStartTime,
            exportTime: Date.now(),
        }, null, 2);
    }
}
