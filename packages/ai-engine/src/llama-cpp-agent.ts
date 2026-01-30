/**
 * Llama.cpp Agent - Local LLM via child_process
 * Spawns llama-server.exe as a separate process and communicates via HTTP
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
    LLMConfig,
    CoachingContext,
    CoachingInsight,
    SupportedLanguage
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to llama-server binary (will need to download separately)
const LLAMA_SERVER_PATH = path.join(__dirname, '../../../core/ai_engines/llama-cpp/llama-server.exe');
// Qwen2.5-0.5B: SMALLEST and FASTEST (500M params, ~300MB, multilingual Spanish support)
const MODEL_PATH = path.join(__dirname, '../models/qwen2.5-0.5b-q4.gguf');

const DEFAULT_CONFIG: LLMConfig = {
    modelPath: MODEL_PATH,
    contextSize: 2048,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 80 // Short for max speed
};

/**
 * System prompts for racing coach persona
 */
const SYSTEM_PROMPTS: Record<SupportedLanguage, string> = {
    es: `Sos un ingeniero de carreras argentino profesional.

ANALIZA los datos y da UN consejo específico.

FORMATO:
- Máximo 20 palabras
- Menciona QUÉ detectaste + QUÉ hacer
- Directo, sin saludos ni charla

RESPONDE: [QUÉ DETECTASTE] + [QUÉ HACER]`,

    en: `You are an expert motorsport race engineer with 15+ years of experience in professional racing.
You have deep knowledge of vehicle dynamics, tire management, and racecraft.

Your communication style:
- Direct and actionable
- Uses racing terminology naturally
- Speaks like a professional engineer
- Provides specific, measurable advice
- References exact corners, sectors, and timing

When analyzing telemetry:
1. Identify patterns across laps, not single incidents
2. Prioritize safety-critical issues (brake failures, tire wear)
3. Suggest setup changes when patterns indicate car issues
4. Celebrate improvements and personal bests

Never:
- Give vague advice like "drive faster" or "brake later"
- Overwhelm the driver with info mid-corner
- Contradict yourself lap-to-lap
- Ignore context (fuel saving, tire management strategies)

Be concise: maximum 2 sentences per response.`,

    pt: `Você é um engenheiro de corridas especialista com mais de 15 anos de experiência.
Você tem conhecimento profundo de dinâmica veicular, gerenciamento de pneus e estratégia.

Seu estilo de comunicação:
- Direto e acionável
- Usa terminologia de corridas naturalmente
- Fala como um engenheiro profissional
- Fornece conselhos específicos e mensuráveis

Ao analisar telemetria:
1. Identifique padrões ao longo das voltas
2. Priorize problemas críticos de segurança
3. Sugira mudanças de setup quando necessário
4. Celebre melhorias e recordes

Seja conciso: máximo 2 frases por resposta.`,

    fr: `Vous êtes un ingénieur de course expert avec plus de 15 ans d'expérience.

Votre style de communication:
- Direct et actionnable
- Utilise la terminologie naturellement
- Parle comme un ingénieur professionnel
- Fournit des conseils spécifiques

Soyez concis: maximum 2 phrases par réponse.`,

    it: `Sei un ingegnere di gara esperto con oltre 15 anni di esperienza.

Il tuo stile:
- Diretto e attuabile
- Usa terminologia da corsa
- Parla come un professionista
- Fornisce consigli specifici

Sii conciso: massimo 2 frasi per risposta.`
};

export class LlamaCppAgent {
    private process: ChildProcess | null = null;
    private config: LLMConfig;
    private language: SupportedLanguage = 'es';
    private serverUrl = 'http://localhost:8080';
    private ready = false;

    constructor(config: Partial<LLMConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Start llama-server as child process
     */
    async start(): Promise<void> {
        console.log('[LlamaCpp] Starting llama-server...');
        console.log('[LlamaCpp] Binary:', LLAMA_SERVER_PATH);
        console.log('[LlamaCpp] Model:', this.config.modelPath);

        const args = [
            '--model', this.config.modelPath,
            '--ctx-size', this.config.contextSize.toString(),
            '--port', '8080',
            '--threads', '4', // Use 4 threads for balance
            '--n-gpu-layers', '0', // CPU only (can enable GPU if available)
            '--temp', this.config.temperature.toString(),
            '--top-p', this.config.topP.toString()
        ];

        this.process = spawn(LLAMA_SERVER_PATH, args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        this.process.stdout?.on('data', (data) => {
            const output = data.toString();
            console.log('[LlamaCpp]', output.trim());

            // Detect when server is ready - look for "server is listening"
            if (output.includes('server is listening')) {
                this.ready = true;
                console.log('[LlamaCpp] ✓ Server ready');
            }
        });

        this.process.stderr?.on('data', (data) => {
            const output = data.toString();
            console.error('[LlamaCpp ERROR]', output.trim());

            // Check stderr too - llama.cpp outputs here
            if (output.includes('server is listening')) {
                this.ready = true;
                console.log('[LlamaCpp] ✓ Server ready');
            }
        });

        this.process.on('exit', (code) => {
            console.log(`[LlamaCpp] Process exited with code ${code}`);
            this.ready = false;
        });

        // Wait for server to be ready
        await this.waitForReady();
    }

    /**
     * Wait for server to be ready
     */
    private async waitForReady(timeout = 60000): Promise<void> {
        const start = Date.now();
        while (!this.ready && Date.now() - start < timeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!this.ready) {
            throw new Error('Llama server failed to start within timeout');
        }
    }

    /**
     * Set language for prompts
     */
    setLanguage(language: SupportedLanguage): void {
        this.language = language;
    }

    /**
     * Build prompt from telemetry context
     */
    private buildPrompt(context: CoachingContext, userQuestion?: string): string {
        const current = context.currentTelemetry;

        // Analyze last 30 seconds of telemetry from context
        const recentFrames = context.recentFrames || [];

        if (recentFrames.length === 0) {
            return "No hay datos de telemetría disponibles.";
        }

        // Calculate averages and patterns
        const avgSpeed = recentFrames.reduce((sum: number, f: any) => sum + (f.powertrain?.speedKph || 0), 0) / recentFrames.length;
        const maxSpeed = Math.max(...recentFrames.map((f: any) => f.powertrain?.speedKph || 0));
        const avgRPM = recentFrames.reduce((sum: number, f: any) => sum + (f.powertrain?.rpm || 0), 0) / recentFrames.length;
        const avgThrottle = recentFrames.reduce((sum: number, f: any) => sum + ((f.powertrain?.throttle || 0) * 100), 0) / recentFrames.length;
        const avgBrake = recentFrames.reduce((sum: number, f: any) => sum + ((f.powertrain?.brake || 0) * 100), 0) / recentFrames.length;
        const avgClutch = recentFrames.reduce((sum: number, f: any) => sum + ((f.powertrain?.clutch || 0) * 100), 0) / recentFrames.length;

        // Physics analysis
        const avgLateralG = recentFrames.reduce((sum: number, f: any) => sum + Math.abs(f.physics?.lateralG || 0), 0) / recentFrames.length;
        const maxLateralG = Math.max(...recentFrames.map((f: any) => Math.abs(f.physics?.lateralG || 0)));
        const avgLongG = recentFrames.reduce((sum: number, f: any) => sum + (f.physics?.longitudinalG || 0), 0) / recentFrames.length;
        const avgSteering = recentFrames.reduce((sum: number, f: any) => sum + Math.abs(f.physics?.steeringAngle || 0), 0) / recentFrames.length;

        // Braking analysis
        const brakingEvents = recentFrames.filter((f: any) => (f.powertrain?.brake || 0) > 0.5).length;
        const hardBraking = recentFrames.filter((f: any) => (f.physics?.longitudinalG || 0) < -1.0).length;

        let prompt = `=== ANÁLISIS COMPLETO DE TELEMETRÍA (últimos 30 segundos) ===\n\n`;

        // SESSION INFO
        prompt += `📍 SESIÓN:\n`;
        prompt += `- Tipo: ${context.sessionType}\n`;
        prompt += `- Pista: ${context.trackId}\n`;
        if (current.session) {
            if (current.session.lap) prompt += `- Vuelta actual: ${current.session.lap}\n`;
            if (current.session.lapsCompleted !== undefined) prompt += `- Vueltas completadas: ${current.session.lapsCompleted}\n`;
            if (current.session.sessionLapsRemain !== undefined) prompt += `- Vueltas restantes: ${current.session.sessionLapsRemain}\n`;
            if (current.session.sessionTimeRemain !== undefined) {
                const minsRemain = Math.floor(current.session.sessionTimeRemain / 60);
                prompt += `- Tiempo restante: ${minsRemain} min\n`;
            }
            if (current.session.incidents !== undefined) prompt += `- Incidentes: ${current.session.incidents}\n`;
            if (current.session.onPitRoad) prompt += `- ⚠️ EN PIT LANE\n`;
            if (current.session.inGarage) prompt += `- ⚠️ EN GARAGE\n`;
        }

        // RACE POSITION
        if (current.player) {
            prompt += `\n🏁 POSICIÓN:\n`;
            if (current.player.position) prompt += `- Posición general: ${current.player.position}\n`;
            if (current.player.classPosition) prompt += `- Posición en clase: ${current.player.classPosition}\n`;
        }

        // LAP TIMES
        if (current.lapTimes) {
            prompt += `\n⏱️ TIEMPOS:\n`;
            if (current.lapTimes.best) prompt += `- Mejor vuelta: ${(current.lapTimes.best / 60).toFixed(2)} min\n`;
            if (current.lapTimes.last) prompt += `- Última vuelta: ${(current.lapTimes.last / 60).toFixed(2)} min\n`;
            if (current.lapTimes.current) prompt += `- Vuelta actual: ${(current.lapTimes.current / 60).toFixed(2)} min\n`;
        }

        // FLAGS
        if (current.flags?.sessionFlags !== undefined) {
            prompt += `\n🚩 BANDERAS:\n`;
            const flags = current.flags.sessionFlags;
            if (flags & 0x00000001) prompt += `- ⚠️ BANDERA AMARILLA\n`;
            if (flags & 0x00000002) prompt += `- ⚠️ BANDERA AMARILLA AGITADA\n`;
            if (flags & 0x00000004) prompt += `- ✅ BANDERA VERDE\n`;
            if (flags & 0x00000008) prompt += `- ✅ BANDERA VERDE SOSTENIDA\n`;
            if (flags & 0x00000010) prompt += `- ❌ BANDERA ROJA\n`;
            if (flags & 0x00000020) prompt += `- 🏁 BANDERA A CUADROS\n`;
            if (flags & 0x00000040) prompt += `- ⚪ BANDERA BLANCA (última vuelta)\n`;
            if (flags & 0x00000080) prompt += `- ⚫ BANDERA NEGRA (descalificación)\n`;
        }

        // TRAFFIC
        if (current.traffic?.carLeftRight !== undefined) {
            prompt += `\n🚗 TRÁFICO:\n`;
            const lr = current.traffic.carLeftRight;
            if (lr < -0.5) prompt += `- ⚠️ AUTO A LA IZQUIERDA\n`;
            else if (lr > 0.5) prompt += `- ⚠️ AUTO A LA DERECHA\n`;
            else if (Math.abs(lr) < 0.1) prompt += `- ⚠️ AUTO MUY CERCA\n`;
            else prompt += `- Pista despejada\n`;
        }

        // CURRENT STATE
        prompt += `\n🎮 ESTADO ACTUAL:\n`;
        prompt += `- Velocidad: ${Math.round(current.powertrain?.speedKph || 0)} km/h\n`;
        prompt += `- RPM: ${Math.round(current.powertrain?.rpm || 0)}\n`;
        prompt += `- Marcha: ${current.powertrain?.gear || 0}\n`;
        prompt += `- Acelerador: ${Math.round((current.powertrain?.throttle || 0) * 100)}%\n`;
        prompt += `- Freno: ${Math.round((current.powertrain?.brake || 0) * 100)}%\n`;
        prompt += `- Clutch: ${Math.round((current.powertrain?.clutch || 0) * 100)}%\n`;

        // ENGINE WARNINGS
        if (current.engineWarnings) {
            prompt += `\n⚠️ ADVERTENCIAS MOTOR:\n`;
            prompt += `- Código: ${current.engineWarnings}\n`;
        }

        // PHYSICS
        if (current.physics) {
            prompt += `\n⚡ FÍSICA:\n`;
            if (current.physics.steeringAngle !== undefined) {
                prompt += `- Ángulo volante: ${Math.round(current.physics.steeringAngle)}°\n`;
            }
            if (current.physics.lateralG !== undefined) {
                prompt += `- G lateral: ${current.physics.lateralG.toFixed(2)}g\n`;
            }
            if (current.physics.longitudinalG !== undefined) {
                prompt += `- G longitudinal: ${current.physics.longitudinalG.toFixed(2)}g\n`;
            }
        }

        // AVERAGES
        prompt += `\n📊 PROMEDIOS (30 seg):\n`;
        prompt += `- Velocidad: ${Math.round(avgSpeed)} km/h (máx: ${Math.round(maxSpeed)})\n`;
        prompt += `- RPM: ${Math.round(avgRPM)}\n`;
        prompt += `- Acelerador: ${Math.round(avgThrottle)}%\n`;
        prompt += `- Freno: ${Math.round(avgBrake)}%\n`;
        prompt += `- Clutch: ${Math.round(avgClutch)}%\n`;
        prompt += `- Volante: ${Math.round(avgSteering)}° promedio\n`;
        prompt += `- G lateral: ${avgLateralG.toFixed(2)}g promedio (máx: ${maxLateralG.toFixed(2)}g)\n`;
        prompt += `- G longitudinal: ${avgLongG.toFixed(2)}g promedio\n`;
        prompt += `- Frenadas: ${brakingEvents} eventos\n`;
        prompt += `- Frenadas fuertes (>1g): ${hardBraking}\n`;

        // TEMPERATURES
        if (current.temps) {
            prompt += `\n🌡️ TEMPERATURAS:\n`;
            if (current.temps.waterC) prompt += `- Agua: ${Math.round(current.temps.waterC)}°C\n`;
            if (current.temps.oilC) prompt += `- Aceite: ${Math.round(current.temps.oilC)}°C\n`;
            if (current.temps.trackC) prompt += `- Pista: ${Math.round(current.temps.trackC)}°C\n`;
            if (current.temps.airC) prompt += `- Aire: ${Math.round(current.temps.airC)}°C\n`;
            if (current.temps.tyreC && current.temps.tyreC.length > 0) {
                const avgTyre = current.temps.tyreC.reduce((a, b) => a + b, 0) / current.temps.tyreC.length;
                prompt += `- Neumáticos promedio: ${Math.round(avgTyre)}°C\n`;
                prompt += `- Neumáticos (FL/FR/RL/RR): ${current.temps.tyreC.map(t => Math.round(t)).join('/')}\n`;
            }
            if (current.temps.brakeC && current.temps.brakeC.length > 0) {
                const avgBrake = current.temps.brakeC.reduce((a, b) => a + b, 0) / current.temps.brakeC.length;
                prompt += `- Frenos promedio: ${Math.round(avgBrake)}°C\n`;
            }
        }

        // FUEL
        if (current.fuel) {
            prompt += `\n⛽ COMBUSTIBLE:\n`;
            if (current.fuel.level !== undefined) {
                prompt += `- Nivel: ${current.fuel.level.toFixed(1)} L\n`;
            }
            if (current.fuel.levelPct !== undefined) {
                prompt += `- Porcentaje: ${Math.round(current.fuel.levelPct * 100)}%\n`;
            }
            if (current.fuel.usePerHour !== undefined) {
                prompt += `- Consumo: ${current.fuel.usePerHour.toFixed(1)} L/h\n`;
            }
        }

        // TASK
        if (userQuestion) {
            prompt += `\n❓ PREGUNTA DEL PILOTO:\n"${userQuestion}"\n`;
        } else {
            prompt += `\n🎯 DA UN CONSEJO ESPECÍFICO PARA MEJORAR AHORA (máximo 8 palabras):\n`;
        }

        prompt += `\n[IMPORTANTE: Respondé SOLAMENTE en español argentino. NO uses inglés.]`;

        return prompt;
    }

    /**
     * Analyze telemetry and generate coaching
     */
    async analyze(context: CoachingContext): Promise<CoachingInsight> {
        if (!this.ready) {
            throw new Error('Llama server not ready');
        }

        const prompt = this.buildPrompt(context);
        const systemPrompt = SYSTEM_PROMPTS[this.language];

        console.log('\n' + '📤'.repeat(50));
        console.log('[LlamaCpp] 📝 PROMPT ENVIADO AL LLM:');
        console.log('─'.repeat(100));
        console.log(prompt);
        console.log('─'.repeat(100));
        console.log('[LlamaCpp] ⏳ Esperando respuesta del LLM...\n');

        try {
            const response = await fetch(`${this.serverUrl}/completion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `${systemPrompt}\n\n${prompt}`,
                    n_predict: this.config.maxTokens,
                    temperature: this.config.temperature,
                    stop: ['\n\n', 'User:', 'Piloto:']
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as { content: string };
            const text = data.content.trim();

            console.log('\n' + '📥'.repeat(50));
            console.log('[LlamaCpp] 💬 RESPUESTA DEL LLM:');
            console.log('─'.repeat(100));
            console.log(text);
            console.log('─'.repeat(100) + '\n');

            return {
                text,
                category: 'technique' as const,
                priority: 'normal' as const,
                confidence: 0.85
            };
        } catch (error) {
            const err = error as Error;
            console.error('[LlamaCpp] ❌ Error:', err.message);
            throw err;
        }
    }

    /**
     * Answer driver's question
     */
    async answerQuestion(question: string, context: CoachingContext): Promise<string> {
        const insight = await this.analyze({ ...context });
        return insight.text;
    }

    /**
     * Generate response for a generic prompt (used for motivational messages, translations, etc.)
     */
    async generateResponse(prompt: string, maxTokens: number = 50): Promise<string> {
        if (!this.ready) {
            throw new Error('Llama server not ready');
        }

        console.log('\n' + '📤'.repeat(50));
        console.log('[LlamaCpp] 📝 GENERIC PROMPT:');
        console.log(prompt);
        console.log('─'.repeat(100));

        try {
            const response = await fetch(`${this.serverUrl}/completion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    n_predict: maxTokens,
                    temperature: 0.9, // Higher temperature for creativity
                    stop: ['\n\n', '.', '!', 'User:']
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as { content: string };
            const text = data.content.trim();

            console.log('\n' + '📥'.repeat(50));
            console.log('[LlamaCpp] 💬 LLM GENERIC RESPONSE:');
            console.log(text);
            console.log('─'.repeat(100) + '\n');

            return text;
        } catch (error) {
            const err = error as Error;
            console.error('[LlamaCpp] ❌ Generic Generation Error:', err.message);
            throw err;
        }
    }

    /**
     * Stop llama-server process
     */
    async stop(): Promise<void> {
        if (this.process) {
            console.log('[LlamaCpp] Stopping server...');
            this.process.kill();
            this.process = null;
            this.ready = false;
        }
    }
}

export default LlamaCppAgent;
