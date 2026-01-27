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
import { SpeechQueue } from '@simracing/speech';

const configPath = getConfigPath();
let config = loadConfig(configPath);

const logger = createLogger({
  logDir: './logs',
  name: 'service',
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

function pushRecent(message: string) {
  recentMessages.unshift(message);
  recentMessages = recentMessages.slice(0, 10);
}

function applyConfig(next: AppConfig) {
  config = next;
  speechQueue.updateOptions({
    voice: config.voice.voice,
    volume: config.voice.volume,
    rate: config.voice.rate,
  });
  speechQueue.setFocusMode(config.focusMode);
  router.updateOptions({ focusMode: config.focusMode });
  logger.info({ config }, 'config updated');
}

function buildCapabilities(frame: NormalizedFrame): CapabilityMap {
  return {
    hasCarLeftRight: typeof frame.traffic === 'number',
    hasSessionFlags: typeof frame.session_flags_raw === 'number',
    hasWaterTemp: typeof frame.temps?.water_c === 'number',
    hasOilTemp: typeof frame.temps?.oil_c === 'number',
    hasFuelLevel: false,
    hasEngineWarnings: false,
    hasTyreTemps: false,
    hasBrakeTemps: false,
  };
}

function handleAdapterFrame(message: AdapterFrameMessage) {
  latestFrameTime = message.ts;
  fpsTracker.tick();

  const data = message.data;
  if (!eventEngine) {
    eventEngine = new LocalEventEngine(buildCapabilities(data), {
      waterTemp: config.temperatures.water,
      oilTemp: config.temperatures.oil,
    });
  }

  const frame: TelemetryFrame = {
    t: message.ts,
    sim: 'iracing',
    sessionId,
    player: {},
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
    },
    temps: {
      waterC: typeof data.temps?.water_c === 'number' ? data.temps.water_c : undefined,
      oilC: typeof data.temps?.oil_c === 'number' ? data.temps.oil_c : undefined,
    },
  };

  if (eventEngine) {
    const localEvents = eventEngine
      .update(frame)
      .filter((event) => config.filters[event.category]);
    routeEvents(localEvents);
  }

  telemetryBuffer.push(frame);
}

function handleAdapterStatus(message: AdapterStatusMessage) {
  adapterStatus = message;
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
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  if (adapterId === 'iracing') {
    const pythonCommand = resolvePythonCommand();
    if (!pythonCommand) {
      return null;
    }
    return {
      command: pythonCommand,
      args: pythonCommand === 'py'
        ? ['-3', path.join(rootDir, 'apps/adapters/iracing-ctypes/adapter.py')]
        : [path.join(rootDir, 'apps/adapters/iracing-ctypes/adapter.py')],
    };
  }

  return {
    command: process.execPath,
    args: [path.join(rootDir, 'apps/adapters/stub/adapter.js'), adapterId],
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
  const routed = router.route(events);
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
  while (true) {
    const buffer = telemetryBuffer;
    telemetryBuffer = [];
    if (apiClient && buffer.length > 0) {
      await apiClient.sendTelemetry(buffer);
    }
    await sleep(100);
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
  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(404);
      res.end();
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
          const payload = JSON.parse(body) as { text?: string };
          const text = payload.text ?? 'Prueba de voz';
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
