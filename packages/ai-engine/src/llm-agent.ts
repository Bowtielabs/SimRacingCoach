/**
 * LLM Agent - Llama 3.2 1B Integration
 * Provides intelligent coaching analysis using local LLM
 */

import { LlamaModel, LlamaContext, LlamaChatSession } from 'node-llama-cpp';
import type {
    LLMConfig,
    CoachingContext,
    CoachingInsight,
    ConversationMessage,
    SupportedLanguage
} from './types.js';

const DEFAULT_CONFIG: LLMConfig = {
    modelPath: '',
    contextSize: 2048,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 150,
    seed: 42
};

/**
 * System prompts for different languages
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

    pt: `Você é um engenheiro de corridas especialista com mais de 15 anos de experiência em corridas profissionais.
Você tem conhecimento profundo de dinâmica veicular, gerenciamento de pneus e estratégia de corrida.

Seu estilo de comunicação:
- Direto e acionável
- Usa terminologia de corridas naturalmente
- Fala como um engenheiro profissional
- Fornece conselhos específicos e mensuráveis
- Referencia curvas, setores e tempos exatos

Ao analisar telemetria:
1. Identifique padrões ao longo das voltas, não incidentes isolados
2. Priorize problemas críticos de segurança (falhas de freio, desgaste de pneus)
3. Sugira mudanças de setup quando padrões indicam problemas do carro
4. Celebre melhorias e recordes pessoais

Nunca:
- Dê conselhos vagos como "dirija mais rápido" ou " freie mais tarde"
- Sobrecarregue o piloto com informações no meio da curva
- Se contradiga volta após volta
- Ignore o contexto (economia de combustível, estratégias de pneus)

Seja conciso: máximo 2 frases por resposta.`,

    fr: `Vous êtes un ingénieur de course expert avec plus de 15 ans d'expérience en course professionnelle.
Vous avez une connaissance approfondie de la dynamique du véhicule, de la gestion des pneus et de la stratégie de course.

Votre style de communication:
- Direct et actionnable
- Utilise la terminologie de course naturellement
- Parle comme un ingénieur professionnel
- Fournit des conseils spécifiques et mesurables
- Référence des virages, secteurs et chronométrage exacts

Lors de l'analyse de la télémétrie:
1. Identifiez les modèles sur les tours, pas les incidents isolés
2. Priorisez les problèmes critiques de sécurité (défaillances de frein, usure des pneus)
3. Suggérez des changements de réglage lorsque les modèles indiquent des problèmes de voiture
4. Célébrez les améliorations et les records personnels

Jamais:
- Donnez des conseils vagues comme "conduisez plus vite" ou "freinez plus tard"
- Submergez le pilote d'informations en plein virage
- Vous contredisez tour après tour
- Ignorez le contexte (économie de carburant, stratégies de pneus)

Soyez concis: maximum 2 phrases par réponse.`,

    it: `Sei un ingegnere di gara esperto con oltre 15 anni di esperienza nelle corse professionistiche.
Hai una profonda conoscenza della dinamica del veicolo, della gestione degli pneumatici e della strategia di gara.

Il tuo stile di comunicazione:
- Diretto e attuabile
- Usa terminologia da corsa naturalmente
- Parla come un ingegnere professionista
- Fornisce consigli specifici e misurabili
- Fa riferimento a curve, settori e tempi esatti

Quando analizzi la telemetria:
1. Identifica i pattern attraverso i giri, non incidenti singoli
2. Dai priorità a problemi critici per la sicurezza (guasti ai freni, usura pneumatici)
3. Suggerisci modifiche al setup quando i pattern indicano problemi della vettura
4. Celebra i miglioramenti e i record personali

Mai:
- Dare consigli vaghi come "guida più veloce" o "frena più tardi"
- Sopraffare il pilota con informazioni a metà curva
- Contraddirtilap dopo lap
- Ignorare il contesto (risparmio carburante, strategie pneumatici)

Sii conciso: massimo 2 frasi per risposta.`
};

/**
 * Sim-specific terminology
 */
const SIM_GLOSSARY = {
    iracing: {
        safetyRating: 'Safety Rating',
        incident: 'incident points',
        split: 'split'
    },
    acc: {
        safetyRating: 'SA',
        incident: 'contact',
        split: 'slot'
    },
    rf2: {
        safetyRating: 'reputation',
        incident: 'penalty',
        split: 'server'
    },
    ac: {
        safetyRating: 'rating',
        incident: 'collision',
        split: 'lobby'
    }
};

export class LLMAgent {
    private model: LlamaModel | null = null;
    private context: LlamaContext | null = null;
    private session: LlamaChatSession | null = null;
    private config: LLMConfig;
    private language: SupportedLanguage = 'es';

    constructor(config: Partial<LLMConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Load the model
     */
    async load(modelPath?: string): Promise<void> {
        const path = modelPath || this.config.modelPath;
        if (!path) {
            throw new Error('Model path not specified');
        }

        console.log(`[LLMAgent] Loading model from ${path}...`);

        try {
            this.model = new LlamaModel({ modelPath: path });
            this.context = new LlamaContext({
                model: this.model,
                contextSize: this.config.contextSize
            });

            console.log('[LLMAgent] Model loaded successfully');
        } catch (error) {
            console.error('[LLMAgent] Failed to load model:', error);
            throw error;
        }
    }

    /**
     * Set language for prompts
     */
    setLanguage(language: SupportedLanguage): void {
        this.language = language;
        // Reset session when language changes
        this.session = null;
    }

    /**
     * Get or create chat session
     */
    private getSession(): LlamaChatSession {
        if (!this.context) {
            throw new Error('Model not loaded. Call load() first.');
        }

        if (!this.session) {
            this.session = new LlamaChatSession({
                context: this.context,
                systemPrompt: SYSTEM_PROMPTS[this.language]
            });
        }

        return this.session;
    }

    /**
     * Build dynamic prompt from context
     */
    private buildPrompt(context: CoachingContext, userQuestion?: string): string {
        const glossary = SIM_GLOSSARY[context.simName.toLowerCase()] || SIM_GLOSSARY.iracing;

        let prompt = `Session: ${context.sessionType} at ${context.trackId} with ${context.carId}\n\n`;

        prompt += `Telemetry:\n`;
        prompt += `- Speed: ${Math.round(context.currentTelemetry.powertrain?.speedKph || 0)} km/h\n`;
        prompt += `- RPM: ${Math.round(context.currentTelemetry.powertrain?.rpm || 0)}\n`;
        prompt += `- Throttle: ${Math.round((context.currentTelemetry.powertrain?.throttle || 0) * 100)}%\n`;
        prompt += `- Brake: ${Math.round((context.currentTelemetry.powertrain?.brake || 0) * 100)}%\n`;
        prompt += `- Gear: ${context.currentTelemetry.powertrain?.gear || 0}\n`;

        if (context.detectedPatterns.length > 0) {
            prompt += `\nDetected Patterns:\n`;
            context.detectedPatterns.forEach(p => {
                prompt += `- ${p.type} (${p.severity}): ${p.recommendation}\n`;
            });
        }

        if (userQuestion) {
            prompt += `\nDriver Question: "${userQuestion}"\n`;
        } else {
            prompt += `\nProvide proactive coaching based on current data.\n`;
        }

        return prompt;
    }

    /**
     * Analyze telemetry and provide coaching
     */
    async analyze(context: CoachingContext): Promise<CoachingInsight> {
        const session = this.getSession();
        const prompt = this.buildPrompt(context);

        console.log('[LLMAgent] Analyzing telemetry...');

        try {
            const response = await session.prompt(prompt, {
                temperature: this.config.temperature,
                topP: this.config.topP,
                maxTokens: this.config.maxTokens
            });

            // Determine priority based on patterns
            const hasCriticalPattern = context.detectedPatterns.some(p => p.severity === 'high');
            const priority = hasCriticalPattern ? 'high' : 'normal';

            // Determine category
            const category = this.inferCategory(context.detectedPatterns);

            return {
                text: response.trim(),
                priority,
                category,
                confidence: 0.85 // Could be calculated based on model confidence
            };
        } catch (error) {
            console.error('[LLMAgent] Analysis failed:', error);
            throw error;
        }
    }

    /**
     * Answer a driver's question
     */
    async answerQuestion(question: string, context: CoachingContext): Promise<string> {
        const session = this.getSession();
        const prompt = this.buildPrompt(context, question);

        console.log(`[LLMAgent] Answering question: "${question}"`);

        try {
            const response = await session.prompt(prompt, {
                temperature: this.config.temperature,
                topP: this.config.topP,
                maxTokens: this.config.maxTokens
            });

            return response.trim();
        } catch (error) {
            console.error('[LLMAgent] Question answering failed:', error);
            throw error;
        }
    }

    /**
     * Infer category from patterns
     */
    private inferCategory(patterns: any[]): CoachingInsight['category'] {
        if (patterns.some(p => p.type === 'brake_lock')) return 'safety';
        if (patterns.some(p => p.type === 'tire_wear')) return 'setup';
        if (patterns.some(p => p.type === 'fuel_usage')) return 'strategy';
        return 'technique';
    }

    /**
     * Reset conversation history
     */
    resetSession(): void {
        this.session = null;
        console.log('[LLMAgent] Session reset');
    }

    /**
     * Unload model and free resources
     */
    async unload(): Promise<void> {
        this.session = null;
        this.context = null;
        this.model = null;
        console.log('[LLMAgent] Model unloaded');
    }
}

export default LLMAgent;
