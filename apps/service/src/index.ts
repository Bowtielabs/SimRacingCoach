import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { IracingAdapter } from '@simracing/adapters-iracing';
import { ApiClient } from '@simracing/api-client';
import {
  AppConfig,
  getConfigPath,
  loadConfig,
  updateConfig,
  watchConfig,
} from '@simracing/config';
import { LocalEventEngine, EventRouter, LocalEvent, Recommendation, TelemetryFrame } from '@simracing/core';
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

let adapter: IracingAdapter | null = null;
let eventEngine: LocalEventEngine | null = null;
let apiClient: ApiClient | null = null;
let telemetryBuffer: TelemetryFrame[] = [];
let latestFrameTime = 0;
let apiStatus: 'online' | 'offline' = 'offline';
let iracingStatus: 'connected' | 'disconnected' = 'disconnected';
let recentMessages: string[] = [];
let sessionId = 'local-session';

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

async function startService() {
  adapter = new IracingAdapter({
    debugDump: config.debug.telemetryDump,
    onLog: (message) => logger.info(message),
  });

  adapter.on('connected', () => {
    iracingStatus = 'connected';
    logger.info('iRacing connected');
  });
  adapter.on('disconnected', () => {
    iracingStatus = 'disconnected';
    logger.warn('iRacing disconnected');
  });
  adapter.on('session', (id) => {
    sessionId = id ?? sessionId;
    if (apiClient) {
      apiClient.disconnectRecommendations();
      apiClient.connectRecommendations(sessionId, handleRecommendation, setApiStatus);
    }
  });
  adapter.on('capabilities', (capabilities) => {
    eventEngine = new LocalEventEngine(capabilities, {
      waterTemp: config.temperatures.water,
      oilTemp: config.temperatures.oil,
    });
  });
  adapter.on('telemetry', (frame) => {
    latestFrameTime = frame.t;
    fpsTracker.tick();
    if (eventEngine) {
      const localEvents = eventEngine.update(frame).filter((event) => config.filters[event.category]);
      routeEvents(localEvents);
    }
    telemetryBuffer.push(frame);
  });

  try {
    await adapter.connect();
  } catch (error) {
    iracingStatus = 'disconnected';
    logger.error({ error }, 'failed to connect to iRacing adapter');
    pushRecent('iRacing adapter no disponible. El servicio continuará sin telemetría.');
    adapter = null;
  }

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

function controlServer() {
  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(404);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          iracingStatus,
          apiStatus,
          fps: fpsTracker.current,
          lastFrameAt: latestFrameTime,
          recentMessages,
        }),
      );
      return;
    }

    if (req.method === 'POST' && req.url === '/mute') {
      speechQueue.setMuted(true);
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/unmute') {
      speechQueue.setMuted(false);
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
