import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

const hotkeySchema = z.object({
  muteToggle: z.string(),
  volumeUp: z.string(),
  volumeDown: z.string(),
  repeatLast: z.string().optional(),
});

const thresholdsSchema = z.object({
  warning: z.number(),
  critical: z.number(),
});

export const configSchema = z.object({
  adapter: z.object({
    id: z.string(),
  }),
  language: z.string(),
  api: z.object({
    url: z.string().url(),
    token: z.string().optional(),
    useRemoteApi: z.boolean(),
  }),
  voice: z.object({
    voice: z.string().optional(),
    volume: z.number().min(0).max(100),
    rate: z.number().min(-10).max(10),
  }),
  hotkeys: hotkeySchema,
  filters: z.object({
    TRAFFIC: z.boolean(),
    FLAGS: z.boolean(),
    ENGINE: z.boolean(),
    COACHING: z.boolean(),
    SYSTEM: z.boolean(),
  }),
  focusMode: z.boolean(),
  temperatures: z.object({
    water: thresholdsSchema,
    oil: thresholdsSchema,
  }),
  debug: z.object({
    telemetryDump: z.boolean(),
  }),
});

export type AppConfig = z.infer<typeof configSchema>;

export const defaultConfig: AppConfig = {
  adapter: {
    id: 'iracing',
  },
  language: 'es-AR',
  api: {
    url: 'http://localhost:8080',
    token: '',
    useRemoteApi: false,  // Disabled by default - local coaching only
  },
  voice: {
    voice: 'Microsoft Sabina Desktop',
    volume: 80,
    rate: 0,
  },
  hotkeys: {
    muteToggle: 'Ctrl+Shift+M',
    volumeUp: 'Ctrl+Shift+Up',
    volumeDown: 'Ctrl+Shift+Down',
    repeatLast: 'Ctrl+Shift+R',
  },
  filters: {
    TRAFFIC: true,
    FLAGS: true,
    ENGINE: true,
    COACHING: true,
    SYSTEM: true,
  },
  focusMode: false,
  temperatures: {
    water: { warning: 110, critical: 120 },
    oil: { warning: 110, critical: 120 },
  },
  debug: {
    telemetryDump: true,
  },
};

export function getConfigPath(appName = 'SimRacingCoach'): string {
  const baseDir = process.env.APPDATA
    ? path.join(process.env.APPDATA, appName)
    : path.join(os.homedir(), `.${appName}`);
  return path.join(baseDir, 'config.json');
}

export function loadConfig(configPath = getConfigPath()): AppConfig {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = configSchema.parse(JSON.parse(raw));
    return { ...defaultConfig, ...parsed };
  } catch {
    return { ...defaultConfig };
  }
}

export function saveConfig(config: AppConfig, configPath = getConfigPath()): void {
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function updateConfig(partial: any, configPath = getConfigPath()): AppConfig {
  const current = loadConfig(configPath);
  const next = {
    ...current,
    ...partial,
    adapter: { ...current.adapter, ...partial.adapter },
    language: partial.language ?? current.language,
    api: { ...current.api, ...partial.api },
    voice: { ...current.voice, ...partial.voice },
    hotkeys: { ...current.hotkeys, ...partial.hotkeys },
    filters: { ...current.filters, ...partial.filters },
    temperatures: {
      ...current.temperatures,
      ...partial.temperatures,
      water: { ...current.temperatures.water, ...partial.temperatures?.water },
      oil: { ...current.temperatures.oil, ...partial.temperatures?.oil },
    },
    debug: { ...current.debug, ...partial.debug },
  };

  const validated = configSchema.parse(next);
  saveConfig(validated, configPath);
  return validated;
}

export function watchConfig(
  callback: (config: AppConfig) => void,
  configPath = getConfigPath(),
): fs.FSWatcher {
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(configPath)) {
    saveConfig(defaultConfig, configPath);
  }

  return fs.watch(configPath, () => {
    callback(loadConfig(configPath));
  });
}
