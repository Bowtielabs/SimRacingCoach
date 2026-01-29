import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AdapterSupervisor,
  AdapterId,
  AdapterStatusMessage,
  AdapterFrameMessage,
  AdapterLogMessage,
  AdapterSessionInfoMessage,
  getAdapterSpec,
  NormalizedFrame,
} from '@simracing/adapters-runtime';
import {
  AppConfig,
  getConfigPath,
  loadConfig,
  updateConfig,
  watchConfig,
} from '@simracing/config';
import { TelemetryFrame } from '@simracing/core';
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

let adapterSupervisor: AdapterSupervisor | null = null;
let adapterStatus: AdapterStatusMessage = {
  type: 'status',
  state: 'disconnected',
  sim: config.adapter.id,
  details: 'Not running',
};
let adapterRunning = false;
let telemetryBuffer: TelemetryFrame[] = [];
let latestFrameTime = 0;
let sessionId = 'local-session';
let aiService: AICoachingService | null = null;
let aiInitialized = false;
let llamaAgent: any | null = null;
let piperAgent: any | null = null;

function applyConfig(next: AppConfig) {
  const adapterChanged = next.adapter.id !== config.adapter.id;
  config = next;
  logger.info({ config }, 'config updated');

  if (adapterChanged && adapterRunning) {
    logger.info({ from: config.adapter.id, to: next.adapter.id }, 'adapter changed, restarting...');
    startAdapter(next.adapter.id as AdapterId);
  }
}

function handleAdapterFrame(message: AdapterFrameMessage) {
  latestFrameTime = message.ts;
  fpsTracker.tick();

  const data = message.data;

  // Build telemetry frame for AI
  const frame: TelemetryFrame = {
    t: message.ts,
    sim: 'iracing',
    sessionId,
    player: {
      position: typeof data.position === 'number' ? data.position : undefined,
      classPosition: typeof data.class_position === 'number' ? data.class_position : undefined,
    },
    traffic: {
      carLeftRight: typeof data.traffic === 'number' ? data.traffic : undefined,
    },
    flags: {
      sessionFlags:
        typeof data.session_flags_raw === 'number' ? data.session_flags_raw : undefined,
    },
    powertrain: {
      speedKph:
        typeof data.speed_mps === 'number' ? data.speed_mps * 3.6 : undefined,
      rpm: typeof data.rpm === 'number' ? data.rpm : undefined,
      gear: typeof data.gear === 'number' ? data.gear : undefined,
      throttle:
        typeof data.throttle_pct === 'number' ? data.throttle_pct / 100 : undefined,
      brake: typeof data.brake_pct === 'number' ? data.brake_pct / 100 : undefined,
      clutch: typeof data.clutch_pct === 'number' ? data.clutch_pct / 100 : undefined,
    },
    temps: {
      waterC: typeof data.temps?.water_c === 'number' ? data.temps.water_c : undefined,
      oilC: typeof data.temps?.oil_c === 'number' ? data.temps.oil_c : undefined,
      trackC: typeof data.temps?.track_c === 'number' ? data.temps.track_c : undefined,
      airC: typeof data.temps?.air_c === 'number' ? data.temps.air_c : undefined,
    },
    fuel: {
      level: typeof data.fuel_level === 'number' ? data.fuel_level : undefined,
      levelPct: typeof data.fuel_level_pct === 'number' ? data.fuel_level_pct : undefined,
      usePerHour: typeof data.fuel_use_per_hour === 'number' ? data.fuel_use_per_hour : undefined,
    },
    session: {
      onPitRoad: typeof data.on_pit_road === 'boolean' ? data.on_pit_road : undefined,
      inGarage: typeof data.in_garage === 'boolean' ? data.in_garage : undefined,
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
    aiService.processFrame(frame).catch((err: Error) => {
      logger.error({ err }, 'AI processing failed');
    });
  }

  telemetryBuffer.push(frame);
  if (telemetryBuffer.length > 1000) {
    telemetryBuffer.shift();
  }
}

function handleAdapterStatus(message: AdapterStatusMessage) {
  const wasConnected = adapterStatus?.state === 'connected';
  adapterStatus = message;

  if (message.state === 'connected' && !wasConnected) {
    console.log('[Service] Adapter connected - initializing AI');

    // Initialize AI Service
    if (!aiService) {
      console.log('[Service] 🤖 Initializing AI Coaching Service...');
      aiService = new AICoachingService({
        enabled: true,
        mode: 'ai',
        language: {
          stt: 'es',
          tts: 'es'
        }
      });

      aiService.initialize()
        .then(() => {
          aiInitialized = true;
          console.log('[Service] ✓ AI Coaching Service ready');

          // Start AI session
          aiService!.startSession({
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
  }

  if (message.state === 'disconnected' && wasConnected) {
    console.log('[Service] Adapter disconnected');
    if (aiService) {
      aiService.endSession();
    }
  }

  logger.info({ adapterStatus: message });
}

function handleAdapterLog(message: AdapterLogMessage) {
  logger.info({ from: 'adapter', text: message.message });
}

function startAdapter(which: AdapterId) {
  if (adapterSupervisor) {
    adapterSupervisor.stop();
  }

  const spec = getAdapterSpec(which);
  if (!spec) {
    logger.error({ which }, 'unknown adapter');
    return;
  }

  const resolveCommand = (id: AdapterId) => spec;

  adapterSupervisor = new AdapterSupervisor({
    adapterId: which,
    resolveCommand: async () => ({
      command: 'node',
      args: [spec.id],
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

  // GET /status
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        adapter: adapterStatus,
        ai: aiService?.getStatus() || { initialized: false },
        fps: 0, // FpsTracker private property
        bufferSize: telemetryBuffer.length,
      })
    );
    return;
  }

  // POST /start
  if (req.method === 'POST' && req.url === '/start') {
    startAdapter(config.adapter.id as AdapterId);
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
    try {
      logger.info('Voice test - using AI + Piper');

      // LLM is running externally on port 8080

      const systemPrompt = 'Sos un piloto profesional argentino. Usás jerga racing: "mandale", "che", "clavale los changos". Hablás con vos.';
      const userPrompt = 'Decime algo original sobre esta prueba de voz. Máximo 2 frases. Sé energético.';

      const response = await fetch('http://localhost:8080/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
          n_predict: 80,
          temperature: 0.9,
          top_p: 0.95,
          stop: ['\n\n', 'User:']
        })
      });

      const data = await response.json() as { content: string };
      const aiResponse = data.content.trim();

      logger.info({ aiResponse }, 'AI generated');

      // Use persistent Piper
      if (!piperAgent) {
        throw new Error('Piper not ready');
      }

      await piperAgent.speak(aiResponse);

      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      logger.error({ error }, 'Voice test failed');
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(error) }));
    }
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
      } catch (error) {
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

    // Start LLM
    console.log('[Service] Starting LLM (async)...');
    llamaAgent = new LlamaCppAgent();
    llamaAgent.start().catch(e => console.error('[Service] LLM start error:', e));
    llamaAgent.setLanguage('es');
    // Give LLM time to start
    setTimeout(() => {
      console.log('[Service] ✓ LLM should be ready now');
    }, 20000);

    // Initialize Piper (keep instance alive)
    console.log('[Service] Starting Piper...');
    piperAgent = new PiperAgent();
    await piperAgent.initialize();
    console.log('[Service] ✓ Piper ready');
  } catch (error) {
    console.error('[Service] Failed to initialize AI services:', error);
  }
})();
