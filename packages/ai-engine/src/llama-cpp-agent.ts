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
// Use existing model
const MODEL_PATH = path.join(__dirname, '../models/llama-3.2-1b-q4.gguf');

const DEFAULT_CONFIG: LLMConfig = {
    modelPath: MODEL_PATH,
    contextSize: 2048,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 150
};

/**
 * System prompts for racing coach persona
 */
const SYSTEM_PROMPTS: Record<SupportedLanguage, string> = {
    es: `Sos un ingeniero de carreras experto con 15+ años de experiencia en automovilismo profesional.
Tenés conocimiento profundo de dinámica vehicular, manejo de neumáticos y estrategia de carrera.

Tu estilo de comunicación:
- Directo y accionable
- Usás terminología de carreras naturalmente
- Hablás como un ingeniero argentino (usás "vos", "che", "estás", etc.)
- Das consejos específicos y medibles
- Referenciás curvas, sectores y tiempos exactos

Al analizar telemetría:
1. Identificá patrones a lo largo de vueltas, no incidentes aislados
2. Priorizá problemas críticos de seguridad (fallas de frenos, desgaste de neumáticos)
3. Sugerí cambios de setup cuando los patrones indican problemas del auto
4. Celebrá las mejoras y récords personales

Nunca:
- Des consejos vagos como "manejá más rápido" o "frená más tarde"
- Abrumes al piloto con info en plena curva
- Te contradigas vuelta tras vuelta
- Ignores el contexto (ahorro de combustible, estrategias de neumáticos)

Sé breve: máximo 2 oraciones por respuesta.`,

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
        let prompt = `Sesión: ${context.sessionType} en ${context.trackId} con ${context.carId}\n\n`;

        prompt += `Telemetría:\n`;
        prompt += `- Velocidad: ${Math.round(context.currentTelemetry.powertrain?.speedKph || 0)} km/h\n`;
        prompt += `- RPM: ${Math.round(context.currentTelemetry.powertrain?.rpm || 0)}\n`;
        prompt += `- Acelerador: ${Math.round((context.currentTelemetry.powertrain?.throttle || 0) * 100)}%\n`;
        prompt += `- Freno: ${Math.round((context.currentTelemetry.powertrain?.brake || 0) * 100)}%\n`;
        prompt += `- Marcha: ${context.currentTelemetry.powertrain?.gear || 0}\n`;

        if (context.currentTelemetry.temps) {
            prompt += `- Temp. Agua: ${Math.round(context.currentTelemetry.temps.waterC || 0)}°C\n`;
            prompt += `- Temp. Aceite: ${Math.round(context.currentTelemetry.temps.oilC || 0)}°C\n`;
        }

        if (userQuestion) {
            prompt += `\nPregunta del piloto: "${userQuestion}"\n`;
        } else {
            prompt += `\nProporcioná coaching proactivo basado en los datos actuales.\n`;
        }

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

        console.log('[LlamaCpp] Analyzing telemetry...');

        try {
            const response = await fetch(`${this.serverUrl}/completion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`,
                    n_predict: this.config.maxTokens,
                    temperature: this.config.temperature,
                    top_p: this.config.topP,
                    stop: ['\n\n', 'User:']
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as { content: string };
            const text = data.content.trim();

            return {
                text,
                priority: 'normal',
                category: 'technique',
                confidence: 0.85
            };
        } catch (error) {
            console.error('[LlamaCpp] Analysis failed:', error);
            throw error;
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
