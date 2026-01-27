import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import path from 'node:path';
import { getConfigPath, loadConfig, updateConfig } from '@simracing/config';

const serviceUrl = process.env.SERVICE_URL ?? 'http://127.0.0.1:7878';
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../public/index.html'));
}

async function controlService(endpoint: string, body?: unknown) {
  await fetch(`${serviceUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function getStatus() {
  const res = await fetch(`${serviceUrl}/status`);
  if (!res.ok) {
    throw new Error('Service offline');
  }
  return res.json();
}

function registerHotkeys() {
  globalShortcut.unregisterAll();
  const config = loadConfig(getConfigPath());

  globalShortcut.register(config.hotkeys.muteToggle, () => {
    void controlService('/mute-toggle');
  });
  globalShortcut.register(config.hotkeys.volumeUp, () => {
    void controlService('/volume/up');
  });
  globalShortcut.register(config.hotkeys.volumeDown, () => {
    void controlService('/volume/down');
  });
  if (config.hotkeys.repeatLast) {
    globalShortcut.register(config.hotkeys.repeatLast, () => {
      void controlService('/repeat');
    });
  }
}

app.whenReady().then(() => {
  createWindow();
  registerHotkeys();

  ipcMain.handle('status', async () => getStatus());
  ipcMain.handle('config:get', async () => loadConfig(getConfigPath()));
  ipcMain.handle('config:update', async (_event, partial) => {
    const updated = updateConfig(partial, getConfigPath());
    await controlService('/config', partial);
    registerHotkeys();
    return updated;
  });
  ipcMain.handle('service:start', async (_event, payload) => {
    await controlService('/start', payload);
  });
  ipcMain.handle('service:stop', async () => controlService('/stop'));
  ipcMain.handle('voice:test', async (_event, text: string) => {
    await controlService('/test-voice', { text });
  });
  ipcMain.handle('config:path', () => getConfigPath());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
