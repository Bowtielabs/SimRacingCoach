import http from 'node:http';
import path from 'node:path';
import { AdapterSupervisor, getAdapterSpec, } from '@simracing/adapters-runtime';
import { getConfigPath, loadConfig, updateConfig, watchConfig, } from '@simracing/config';
import { createLogger, FpsTracker } from '@simracing/diagnostics';
import { AICoachingService } from '@simracing/ai-engine';
const configPath = getConfigPath();
let config = loadConfig(configPath);
const logger = createLogger({
    logDir: './logs',
    name: 'service',
    level: 'debug',
});
const fpsTracker = new FpsTracker();
let adapterSupervisor = null;
let adapterStatus = {
    type: 'status',
    state: 'disconnected',
    sim: config.adapter.id,
    details: 'Not running',
};
let adapterRunning = false;
let telemetryBuffer = [];
let latestFrameTime = 0;
let sessionId = 'local-session';
let aiService = null;
let aiInitialized = false;
let llamaAgent = null;
let piperAgent = null;
function applyConfig(next) {
    const adapterChanged = next.adapter.id !== config.adapter.id;
    config = next;
    logger.info({ config }, 'config updated');
    if (adapterChanged && adapterRunning) {
        logger.info({ from: config.adapter.id, to: next.adapter.id }, 'adapter changed, restarting...');
        startAdapter(next.adapter.id);
    }
}
function handleAdapterFrame(message) {
    latestFrameTime = message.ts;
    fpsTracker.tick();
    const data = message.data;
    // Initialize AI if not already done, adapter is connected, AND piperAgent is ready
    // DEBUG: Log para ver por qué no se inicializa
    if (Math.random() < 0.01) {
        console.log(`[Service] AI init check: aiService=${!!aiService}, adapterConnected=${adapterStatus?.state === 'connected'}, piperAgent=${!!piperAgent}`);
    }
    if (!aiService && adapterStatus?.state === 'connected' && piperAgent) {
        console.log('[Service] 🤖 Initializing AI Coaching Service (from frame handler)...');
        // Pass external agents to avoid duplicate server initialization
        aiService = new AICoachingService({
            enabled: true,
            mode: 'ai',
            language: {
                stt: 'es',
                tts: 'es'
            }
        }, piperAgent);
        aiService.initialize()
            .then(() => {
            aiInitialized = true;
            console.log('[Service] ✓ AI Coaching Service ready');
            // Start AI session
            aiService.startSession({
                simName: 'iracing',
                trackId: 'unknown',
                carId: 'unknown',
                sessionType: 'practice',
                sessionId: sessionId,
                startTime: Date.now(),
                totalLaps: 0,
                currentLap: 0,
                bestLapTime: null,
                averageLapTime: null,
                consistency: 0
            });
        })
            .catch((err) => {
            console.error('[Service] ✗ AI initialization failed:', err);
        });
    }
    // Normalize sim name
    const rawSim = adapterStatus?.sim || 'generic';
    const simMap = {
        'iRacing': 'iracing',
        'Assetto Corsa Competizione': 'acc',
        'Assetto Corsa': 'assetto_corsa',
        'rFactor': 'rfactor',
        'rFactor 2': 'rfactor2',
        'Automobilista 2': 'automobilista2',
        'SimuTC': 'actc', // Mapping SimuTC to actc for Turismo Carretera
        'Other': 'generic'
    };
    const normalizedSim = simMap[rawSim] || 'generic';
    // Build telemetry frame for AI
    const frame = {
        t: message.ts,
        sim: normalizedSim,
        sessionId,
        player: {
            position: typeof data.position === 'number' ? data.position : undefined,
            classPosition: typeof data.class_position === 'number' ? data.class_position : undefined,
        },
        traffic: {
            carLeftRight: typeof data.traffic === 'number' ? data.traffic : undefined,
        },
        flags: {
            sessionFlags: typeof data.session_flags_raw === 'number' ? data.session_flags_raw : undefined,
        },
        powertrain: {
            speedKph: typeof data.speed_mps === 'number' ? data.speed_mps * 3.6 : undefined,
            rpm: typeof data.rpm === 'number' ? data.rpm : undefined,
            gear: typeof data.gear === 'number' ? data.gear : undefined,
            throttle: typeof data.throttle_pct === 'number' ? data.throttle_pct / 100 : undefined,
            brake: typeof data.brake_pct === 'number' ? data.brake_pct / 100 : undefined,
            clutch: typeof data.clutch_pct === 'number' ? data.clutch_pct / 100 : undefined,
        },
        temps: {
            waterC: typeof data.temps?.water_c === 'number' ? data.temps.water_c : undefined,
            oilC: typeof data.temps?.oil_c === 'number' ? data.temps.oil_c : undefined,
            trackC: typeof data.temps?.track_c === 'number' ? data.temps.track_c : undefined,
            airC: typeof data.temps?.air_c === 'number' ? data.temps.air_c : undefined,
            tyreC: Array.isArray(data.temps?.tyre_c) ? data.temps.tyre_c.filter(v => typeof v === 'number') : undefined,
            brakeC: Array.isArray(data.temps?.brake_c) ? data.temps.brake_c.filter(v => typeof v === 'number') : undefined,
        },
        fuel: {
            level: typeof data.fuel_level === 'number' ? data.fuel_level : undefined,
            levelPct: typeof data.fuel_level_pct === 'number' ? data.fuel_level_pct : undefined,
            usePerHour: typeof data.fuel_use_per_hour === 'number' ? data.fuel_use_per_hour : undefined,
        },
        session: {
            // iRacing returns 0/1 as numbers, not booleans
            onPitRoad: data.on_pit_road !== undefined ? Boolean(data.on_pit_road) : undefined,
            inGarage: data.in_garage !== undefined ? Boolean(data.in_garage) : undefined,
            isOnTrack: data.is_on_track !== undefined ? Boolean(data.is_on_track) : undefined,
            incidents: typeof data.incidents === 'number' ? data.incidents : undefined,
            lap: typeof data.lap === 'number' ? data.lap : undefined,
            lapsCompleted: typeof data.laps_completed === 'number' ? data.laps_completed : undefined,
            sessionTime: typeof data.session_time === 'number' ? data.session_time : undefined,
            sessionLapsRemain: typeof data.session_laps_remain === 'number' ? data.session_laps_remain : undefined,
            sessionTimeRemain: typeof data.session_time_remain === 'number' ? data.session_time_remain : undefined,
        },
        lapTimes: {
            best: typeof data.lap_times?.best === 'number' ? data.lap_times.best : undefined,
            last: typeof data.lap_times?.last === 'number' ? data.lap_times.last : undefined,
            current: typeof data.lap_times?.current === 'number' ? data.lap_times.current : undefined,
        },
        engineWarnings: typeof data.engine_warnings === 'number' ? data.engine_warnings : undefined,
    };
    // Send to AI service
    if (aiService && aiInitialized) {
        aiService.processFrame(frame).catch((err) => {
            logger.error({ err }, 'AI processing failed');
            console.error('[Service] ❌ AI processing error:', err);
        });
    }
    else if (aiService && !aiInitialized) {
        // Log ocasional para debug
        if (Math.random() < 0.01) {
            console.log('[Service] ⏳ aiService exists but not initialized yet');
        }
    }
    telemetryBuffer.push(frame);
    if (telemetryBuffer.length > 1000) {
        telemetryBuffer.shift();
    }
}
function handleAdapterStatus(message) {
    console.log('[Service] handleAdapterStatus called:', message); // DEBUG
    const wasConnected = adapterStatus?.state === 'connected';
    adapterStatus = message;
    if (message.state === 'connected' && !wasConnected) {
        console.log('[Service] Adapter connected - initializing AI');
        // Announce connection via Piper
        console.log('[Service] *** ATTEMPTING TO ANNOUNCE CONNECTION ***');
        console.log('[Service] piperAgent exists:', !!piperAgent);
        if (piperAgent) {
            console.log('[Service] Calling piperAgent.speak...');
            piperAgent.speak('Entrenador virtual conectado', 'normal')
                .then(() => console.log('[Service] ✓ Connection announcement complete'))
                .catch((err) => console.error('[Service] Failed to speak connection message:', err));
        }
        else {
            console.error('[Service] ERROR: piperAgent is null!');
        }
        // Initialize AI Service
        if (!aiService) {
            console.log('[Service] 🤖 Initializing AI Coaching Service...');
            // Pass external agents to avoid duplicate server initialization
            aiService = new AICoachingService({
                enabled: true,
                mode: 'ai',
                language: {
                    stt: 'es',
                    tts: 'es'
                }
            }, piperAgent);
            aiService.initialize()
                .then(() => {
                aiInitialized = true;
                console.log('[Service] ✓ AI Coaching Service ready');
                // Start AI session
                aiService.startSession({
                    simName: 'iracing',
                    trackId: 'unknown',
                    carId: 'unknown',
                    sessionType: 'practice',
                    sessionId: sessionId,
                    startTime: Date.now(),
                    totalLaps: 0,
                    currentLap: 0,
                    bestLapTime: null,
                    averageLapTime: null,
                    consistency: 0
                });
            })
                .catch((err) => {
                console.error('[Service] ✗ AI initialization failed:', err);
            });
        }
        else {
            console.log('[Service] AI Service already exists, restarting session');
            aiService.startSession({
                simName: 'iracing',
                trackId: 'unknown',
                carId: 'unknown',
                sessionType: 'practice',
                sessionId: sessionId,
                startTime: Date.now(),
                totalLaps: 0,
                currentLap: 0,
                bestLapTime: null,
                averageLapTime: null,
                consistency: 0
            });
        }
    }
    if (message.state === 'disconnected' && wasConnected) {
        console.log('[Service] Adapter disconnected');
        if (aiService) {
            aiService.endSession();
        }
    }
    logger.info({ adapterStatus: message });
}
function handleAdapterLog(message) {
    logger.info({ from: 'adapter', text: message.message });
}
function startAdapter(which) {
    if (adapterSupervisor) {
        adapterSupervisor.stop();
    }
    const spec = getAdapterSpec(which);
    if (!spec) {
        logger.error({ which }, 'unknown adapter');
        return;
    }
    // Determinar el path del adapter basado en el ID
    const adapterPath = which === 'mock-iracing'
        ? path.join(process.cwd(), '../adapters/mock-iracing/adapter.js')
        : path.join(process.cwd(), '../adapters/iracing-node/adapter.mjs');
    console.log(`[Service] 🔌 Starting adapter: ${which} from ${adapterPath}`);
    adapterSupervisor = new AdapterSupervisor({
        adapterId: which,
        resolveCommand: async () => ({
            command: 'node',
            args: [adapterPath],
            env: {},
            cwd: process.cwd()
        })
    });
    adapterSupervisor.on('status', handleAdapterStatus);
    adapterSupervisor.on('frame', handleAdapterFrame);
    adapterSupervisor.on('log', handleAdapterLog);
    adapterSupervisor.start();
    adapterRunning = true;
    logger.info({ adapter: which }, 'adapter started');
}
function stopAdapter() {
    if (adapterSupervisor) {
        adapterSupervisor.stop();
        adapterSupervisor = null;
        adapterRunning = false;
        logger.info('adapter stopped');
    }
}
// HTTP Control Server
const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    logger.info({ method: req.method, url: req.url }, 'Incoming request');
    // POST /config - Update configuration
    if (req.method === 'POST' && req.url === '/config') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const partial = JSON.parse(body);
                // Manual deep merge to avoid updateConfig bug with undefined nested props
                const updated = {
                    ...config,
                    ...partial,
                    adapter: partial.adapter ? { ...config.adapter, ...partial.adapter } : config.adapter,
                    voice: partial.voice ? { ...config.voice, ...partial.voice } : config.voice,
                    hotkeys: partial.hotkeys ? { ...config.hotkeys, ...partial.hotkeys } : config.hotkeys,
                    filters: partial.filters ? { ...config.filters, ...partial.filters } : config.filters,
                    ai: partial.ai ? { ...config.ai, ...partial.ai } : config.ai,
                };
                applyConfig(updated);
                res.writeHead(200);
                res.end();
            }
            catch (err) {
                logger.error({ error: err }, 'failed to update config');
                res.writeHead(400);
                res.end();
            }
        });
        return;
    }
    // GET /status
    if (req.method === 'GET' && req.url === '/status') {
        // Log the adapter status for debugging 
        logger.info({ currentAdapterStatus: adapterStatus }, 'Status requested');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            state: adapterStatus.state,
            sim: adapterStatus.sim,
            details: adapterStatus.details,
            adapter: adapterStatus,
            ai: aiService?.getStatus() || { initialized: false },
            fps: 0,
            bufferSize: telemetryBuffer.length,
        }));
        return;
    }
    // POST /start
    if (req.method === 'POST' && req.url === '/start') {
        startAdapter(config.adapter.id);
        res.writeHead(200);
        res.end();
        return;
    }
    // POST /stop
    if (req.method === 'POST' && req.url === '/stop') {
        stopAdapter();
        res.writeHead(200);
        res.end();
        return;
    }
    // POST /test-voice
    if (req.method === 'POST' && req.url === '/test-voice') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const params = body ? JSON.parse(body) : {};
                const testText = params.text || "Hola!! te voy a ayudar para que puedas mejorar y te conviertas en el mejor piloto de Simuladores.";
                logger.info({ testText }, 'Voice test - direct to Piper');
                if (!piperAgent) {
                    throw new Error('Piper not ready');
                }
                await piperAgent.speak(testText, 'normal', (config.voice.rate / 10) + 1.0);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
            }
            catch (error) {
                logger.error({ error }, 'Voice test failed');
                res.writeHead(500);
                res.end(JSON.stringify({ error: String(error) }));
            }
        });
        return;
    }
    // GET /config
    if (req.method === 'GET' && req.url === '/config') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(config));
        return;
    }
    // POST /config
    if (req.method === 'POST' && req.url === '/config') {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const updates = JSON.parse(body);
                updateConfig(configPath, updates);
                applyConfig(loadConfig(configPath));
                res.writeHead(200);
                res.end();
            }
            catch (error) {
                logger.error({ error }, 'failed to update config');
                res.writeHead(400);
                res.end();
            }
        });
        return;
    }
    // 404
    res.writeHead(404);
    res.end();
});
const PORT = 7878;
server.listen(PORT, () => {
    logger.info({ port: PORT }, 'control server listening');
    console.log(`[${new Date().toLocaleTimeString()}] INFO (service): control server listening on ${PORT}`);
});
// Watch config changes
watchConfig(applyConfig);
// Cleanup on exit
process.on('SIGINT', async () => {
    console.log('\n[Service] Shutting down...');
    stopAdapter();
    if (aiService) {
        await aiService.dispose();
    }
    server.close();
    process.exit(0);
});
console.log('[Service] SimRacing Coach Service started');
console.log('[Service] Waiting for adapter connection...');
// Initialize LLM and Piper services
(async () => {
    try {
        const { LlamaCppAgent, PiperAgent } = await import('@simracing/ai-engine');
        // Start LLM (Disabled per user request - using Rules Engine only)
        /*
        console.log('[Service] Starting LLM (async)...');
        llamaAgent = new LlamaCppAgent();
        llamaAgent.start().catch((e: Error) => console.error('[Service] LLM start error:', e));
        llamaAgent.setLanguage('es');
        */
        console.log('[Service] ℹ️ LLM is disabled. Rules Engine will handle all coaching.');
        // Initialize Piper (keep instance alive)
        console.log('[Service] Starting Piper...');
        piperAgent = new PiperAgent();
        await piperAgent.initialize();
        console.log('[Service] ✓ Piper ready');
        // Check if adapter is already connected and initialize AI if needed
        if (adapterStatus?.state === 'connected' && !aiService) {
            console.log('[Service] Adapter already connected on startup - initializing AI');
            aiService = new AICoachingService({
                enabled: true,
                mode: 'ai',
                language: {
                    stt: 'es',
                    tts: 'es'
                }
            }, piperAgent);
            await aiService.initialize();
            aiInitialized = true;
            console.log('[Service] ✓ AI Coaching Service ready on startup');
            // Start AI session
            aiService.startSession({
                simName: 'iracing',
                trackId: 'unknown',
                carId: 'unknown',
                sessionType: 'practice',
                sessionId: sessionId,
                startTime: Date.now(),
                totalLaps: 0,
                currentLap: 0,
                bestLapTime: null,
                averageLapTime: null,
                consistency: 0
            });
        }
    }
    catch (error) {
        console.error('[Service] Failed to initialize AI services:', error);
    }
})();
//# sourceMappingURL=index.js.map