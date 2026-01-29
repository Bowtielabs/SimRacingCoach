import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { spawnSync } from 'node:child_process';
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
import { ApiClient } from '@simracing/api-client';
import {
  AppConfig,
  getConfigPath,
  loadConfig,
  updateConfig,
  watchConfig,
} from '@simracing/config';
import {
  LocalEventEngine,
  EventRouter,
  LocalEvent,
  Recommendation,
  TelemetryFrame,
  CapabilityMap,
} from '@simracing/core';
import { createLogger, FpsTracker } from '@simracing/diagnostics';
import { SpeechQueue, SpeechOptions } from '@simracing/speech';
import { AICoachingService } from '@simracing/ai-engine';

const configPath = getConfigPath();
let config = loadConfig(configPath);

const logger = createLogger({
  logDir: './logs',
  name: 'service',
  level: 'debug',
});

const fpsTracker = new FpsTracker();
const speechQueue = new SpeechQueue({
  voice: config.voice.voice,
  volume: config.voice.volume,
  rate: config.voice.rate,
});

const router = new EventRouter({ focusMode: config.focusMode });

let adapterSupervisor: AdapterSupervisor | null = null;
let adapterStatus: AdapterStatusMessage = {
  type: 'status',
  state: 'disconnected',
  sim: config.adapter.id,
  details: 'Not running',
};
let adapterRunning = false;
let eventEngine: LocalEventEngine | null = null;
let apiClient: ApiClient | null = null;
let telemetryBuffer: TelemetryFrame[] = [];
let latestFrameTime = 0;
let apiStatus: 'online' | 'offline' = 'offline';
let recentMessages: string[] = [];
let sessionId = 'local-session';
let isMuted = false;
let aiService: AICoachingService | null = null;

function pushRecent(message: string) {
  recentMessages.unshift(message);
  recentMessages = recentMessages.slice(0, 10);
}

function applyConfig(next: AppConfig) {
  const adapterChanged = next.adapter.id !== config.adapter.id;
  config = next;
  speechQueue.updateOptions({
    voice: config.voice.voice,
    volume: config.voice.volume,
    rate: config.voice.rate,
  });
  speechQueue.setFocusMode(config.focusMode);
  router.updateOptions({ focusMode: config.focusMode });
  logger.info({ config }, 'config updated');

  if (adapterChanged && adapterRunning) {
    logger.info({ from: config.adapter.id, to: next.adapter.id }, 'adapter changed, restarting...');
    startAdapter(next.adapter.id as AdapterId);
  }
}

function buildCapabilities(frame: NormalizedFrame): CapabilityMap {
  return {
    hasCarLeftRight: frame.traffic !== undefined && frame.traffic !== null,
    hasSessionFlags: typeof frame.session_flags_raw === 'number',
    hasWaterTemp: typeof frame.temps?.water_c === 'number',
    hasOilTemp: typeof frame.temps?.oil_c === 'number',
    hasFuelLevel: typeof frame.fuel_level === 'number',
    hasEngineWarnings: typeof frame.engine_warnings === 'number',
    hasTyreTemps: false,
    hasBrakeTemps: false,
    hasSteeringAngle: true,  // iRacing always provides steering data
    hasLateralG: true,       // iRacing always provides G-force data
  };
}

function handleAdapterFrame(message: AdapterFrameMessage) {
  latestFrameTime = message.ts;
  fpsTracker.tick();

  const data = message.data;

  // Log telemetry data for debugging
  console.log('[Telemetry]', {
    traffic: data.traffic,
    sessionFlags: data.session_flags_raw,
    engineWarnings: data.engine_warnings,
    onPitRoad: data.on_pit_road,
    incidents: data.incidents,
    waterTemp: data.temps?.water_c,
    oilTemp: data.temps?.oil_c,
    fuelLevel: data.fuel_level,
    speed: data.speed_mps ? data.speed_mps * 3.6 : 0,
    rpm: data.rpm,
  });

  // Only initialize event engine when car is actually moving
  if (!eventEngine) {
    const speedKph = data.speed_mps ? data.speed_mps * 3.6 : 0;
    const rpm = data.rpm ?? 0;

    // Wait until car is moving (speed > 5 kph OR rpm > 500)
    if (speedKph > 5 || rpm > 500) {
      console.log('[Service] 🚗 Car is moving (speed: ' + speedKph.toFixed(1) + ' kph, rpm: ' + rpm + ') - initializing EventEngine');
      eventEngine = new LocalEventEngine(buildCapabilities(data), {
        waterTemp: config.temperatures.water,
        oilTemp: config.temperatures.oil,
      });
      console.log('[Service] ✅ EventEngine initialized - now processing events');
    } else {
      // Skip processing until car starts (no logging to avoid spam)
      return;
    }
  }

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

  // Process with rule-based engine if enabled
  if (config.ai?.mode !== 'ai') { // rules or hybrid mode
    if (eventEngine) {
      const localEvents = eventEngine
        .update(frame)
        .filter((event) => config.filters[event.category]);
      routeEvents(localEvents);
    }
  }

  // Process with AI if enabled  
  if (config.ai?.enabled && aiService) {
    aiService.processFrame(frame).catch((err: Error) => {
      logger.error({ err }, 'AI processing failed');
    });
  }

  telemetryBuffer.push(frame);
}

function handleAdapterStatus(message: AdapterStatusMessage) {
  const wasConnected = adapterStatus?.state === 'connected';
  adapterStatus = message;

  // Reset event engine and clear messages when connecting
  if (message.state === 'connected' && !wasConnected) {
    console.log('[Service] Adapter connected - resetting state');
    // Reset the event engine to start fresh (will be initialized when car moves)
    eventEngine = null;
    recentMessages = [];
    router.reset(); // Clear cooldown cache

    // Start AI session if enabled
    if (config.ai?.enabled && aiService) {
      try {
        aiService.startSession({
          sessionId,
          startTime: Date.now(),
          simName: config.adapter.id,
          trackId: 'unknown', // TODO: Get from adapter
          carId: 'unknown', // TODO: Get from adapter
          sessionType: 'practice',
          totalLaps: 0,
          currentLap: 0,
          bestLapTime: null,
          averageLapTime: null,
          consistency: 0
        });
        console.log('[Service] AI session started');
      } catch (err) {
        logger.error({ err }, 'Failed to start AI session');
      }
    }

    // Only emit connection message once
    routeEvents([{
      id: 'system.connected',
      t: Date.now(),
      category: 'SYSTEM',
      severity: 'INFO',
      priority: 5,
      cooldownMs: 30000,
      text: 'Entrenador Virtual conectado',
      source: 'local',
    }]);

    console.log('[Service] Connection message emitted - waiting for car to move before processing events');
  }

  if (message.state === 'error') {
    logger.error({ message }, 'adapter error');
  } else {
    logger.info({ message }, 'adapter status');
  }
}

function handleAdapterLog(message: AdapterLogMessage) {
  if (message.level === 'error') {
    logger.error(message.message);
  } else if (message.level === 'warn') {
    logger.warn(message.message);
  } else {
    logger.info(message.message);
  }
}

function handleSessionInfo(message: AdapterSessionInfoMessage) {
  logger.info({ bytes: message.yaml.length }, 'session info updated');
}

function stopAdapter() {
  adapterSupervisor?.stop();
  adapterSupervisor = null;
  adapterRunning = false;
}

function resolvePythonCommand(): string | null {
  const candidates: { command: string; args: string[] }[] = [
    { command: 'py', args: ['-3'] },
    { command: 'python', args: [] },
  ];

  for (const candidate of candidates) {
    const checkArgs = [...candidate.args, '--version'];
    const result = spawnSync(candidate.command, checkArgs, { encoding: 'utf-8' });
    if (!result.error && result.status === 0) {
      return candidate.command;
    }
  }

  return null;
}

function resolveAdapterCommand(adapterId: AdapterId) {
  // In production (packaged with Electron), use ADAPTER_PATH from environment
  const adapterBasePath = process.env.ADAPTER_PATH
    ? process.env.ADAPTER_PATH
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../apps/adapters');

  console.log('[Service] Adapter base path:', adapterBasePath);
  console.log('[Service] NODE_ENV:', process.env.NODE_ENV);
  console.log('[Service] process.execPath:', process.execPath);

  if (adapterId === 'iracing') {
    return {
      command: process.execPath,
      args: [path.join(adapterBasePath, 'iracing-node/adapter.mjs')],
    };
  }

  if (adapterId === 'mock-iracing') {
    return {
      command: process.execPath,
      args: [path.join(adapterBasePath, 'mock-iracing/adapter.js')],
    };
  }

  return {
    command: process.execPath,
    args: [path.join(adapterBasePath, 'stub/adapter.js'), adapterId],
  };
}

function startAdapter(adapterId: AdapterId) {
  stopAdapter();
  eventEngine = null;
  telemetryBuffer = [];

  const command = resolveAdapterCommand(adapterId);
  if (!command) {
    adapterStatus = {
      type: 'status',
      state: 'error',
      sim: adapterId,
      details: 'Python 3.11+ no está disponible. Instala Python y asegúrate de que py -3 o python esté en el PATH.',
    };
    adapterRunning = false;
    return;
  }

  adapterSupervisor = new AdapterSupervisor({
    adapterId,
    resolveCommand: () => command,
  });
  adapterSupervisor.on('status', handleAdapterStatus);
  adapterSupervisor.on('frame', handleAdapterFrame);
  adapterSupervisor.on('log', handleAdapterLog);
  adapterSupervisor.on('sessionInfo', handleSessionInfo);
  adapterSupervisor.start();
  adapterRunning = true;
}

async function startService() {
  apiClient = new ApiClient({ baseUrl: config.api.url, token: config.api.token });
  apiClient.connectRecommendations(sessionId, handleRecommendation, setApiStatus);
  void telemetryLoop();
}

function routeEvents(events: LocalEvent[]) {
  console.log('[RouteEvents] Routing', events.length, 'events:', events.map(e => e.text));
  const routed = router.route(events);
  console.log('[RouteEvents] After router filter:', routed.length, 'events');
  for (const { event, shouldBarge } of routed) {
    speechQueue.enqueue(event, shouldBarge);
    pushRecent(event.text);
  }
}

function handleRecommendation(message: Recommendation) {
  if (!config.filters[message.category]) {
    return;
  }
  routeEvents([message]);
}

function setApiStatus(status: 'online' | 'offline') {
  apiStatus = status;
}

async function telemetryLoop() {
  const MAX_RETRY_BUFFER = 1000;
  let retryBuffer: TelemetryFrame[] = [];

  while (true) {
    const current = telemetryBuffer;
    telemetryBuffer = [];

    // Only send to remote API if enabled
    if (config.api.useRemoteApi) {
      const toSend = [...retryBuffer, ...current];
      if (apiClient && toSend.length > 0) {
        const ok = await apiClient.sendTelemetry(toSend);
        if (ok) {
          retryBuffer = [];
        } else {
          // Keep in retry buffer if failed, but cap it
          retryBuffer = toSend.slice(-MAX_RETRY_BUFFER);
          logger.warn({ count: retryBuffer.length }, 'telemetry send failed, buffering for retry');
        }
      }
    }
    await sleep(250); // Slightly slower loop to save CPU and handle batches better
  }
}

function adjustVolume(delta: number) {
  const nextVolume = Math.max(0, Math.min(100, config.voice.volume + delta));
  if (nextVolume === config.voice.volume) {
    return;
  }
  const updated = updateConfig({ voice: { volume: nextVolume } }, configPath);
  applyConfig(updated);
}

function controlServer() {
  const server = http.createServer(async (req, res) => {
    console.log(`[Service] ${req.method} ${req.url}`);
    logger.info({ method: req.method, url: req.url }, 'Incoming request');

    if (!req.url) {
      res.writeHead(404);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/voices') {
      try {
        const voices = await SpeechQueue.getAvailableVoices();
        console.log(`[Service] Returning ${voices.length} voices to UI:`, voices);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(voices));
      } catch (err) {
        logger.error({ err }, 'failed to get voices');
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to get voices' }));
      }
      return;
    }

    if (req.method === 'GET' && req.url === '/status') {
      const adapterSpec = getAdapterSpec(config.adapter.id as AdapterId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          adapter: {
            id: config.adapter.id,
            label: adapterSpec.label,
            simName: adapterSpec.simName,
          },
          adapterStatus,
          adapterRunning,
          apiStatus,
          fps: fpsTracker.current,
          lastFrameAt: latestFrameTime,
          recentMessages,
          muted: isMuted,
          focusMode: config.focusMode,
        }),
      );
      return;
    }

    if (req.method === 'POST' && req.url === '/start') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body) as {
            adapterId: AdapterId;
            language?: string;
            hotkeys?: AppConfig['hotkeys'];
          };
          if (payload.adapterId) {
            const updated = updateConfig(
              {
                adapter: { id: payload.adapterId },
                language: payload.language ?? config.language,
                hotkeys: payload.hotkeys ?? config.hotkeys,
              },
              configPath,
            );
            applyConfig(updated);
            startAdapter(payload.adapterId);
          }
          res.writeHead(200);
          res.end();
        } catch (error) {
          logger.error({ error }, 'failed to start adapter');
          res.writeHead(400);
          res.end();
        }
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/stop') {
      stopAdapter();
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/mute') {
      isMuted = true;
      speechQueue.setMuted(true);
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/unmute') {
      isMuted = false;
      speechQueue.setMuted(false);
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/mute-toggle') {
      isMuted = !isMuted;
      speechQueue.setMuted(isMuted);
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/volume/up') {
      adjustVolume(5);
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/volume/down') {
      adjustVolume(-5);
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/repeat') {
      speechQueue.repeatLast();
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/focus') {
      config.focusMode = !config.focusMode;
      router.updateOptions({ focusMode: config.focusMode });
      speechQueue.setFocusMode(config.focusMode);
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/test-voice') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body) as {
            text?: string;
            voice?: string;
            volume?: number;
            rate?: number
          };
          const text = payload.text ?? 'Prueba de voz';

          if (payload.voice || payload.volume !== undefined || payload.rate !== undefined) {
            console.log(`[Service] Overriding speech options for test: voice="${payload.voice}", volume=${payload.volume}, rate=${payload.rate}`);
            speechQueue.updateOptions({
              voice: payload.voice,
              volume: payload.volume,
              rate: payload.rate
            });
          }

          logger.info({ text, voice: payload.voice }, 'Received test-voice request');
          speechQueue.enqueue(
            {
              id: `voice.test.${Date.now()}`,
              t: Date.now(),
              category: 'SYSTEM',
              severity: 'INFO',
              priority: 1,
              cooldownMs: 0,
              text,
              source: 'local',
            },
            true,
          );
          res.writeHead(200);
          res.end();
        } catch (error) {
          logger.error({ error }, 'failed to test voice');
          res.writeHead(400);
          res.end();
        }
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/config') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const partial = JSON.parse(body) as Partial<AppConfig>;
          const updated = updateConfig(partial, configPath);
          applyConfig(updated);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updated));
        } catch (error) {
          logger.error({ error }, 'failed to update config');
          res.writeHead(400);
          res.end();
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(7878, () => {
    logger.info('control server listening on 7878');
  });
}

watchConfig((next) => {
  applyConfig(next);
}, configPath);

void startService();
controlServer();
