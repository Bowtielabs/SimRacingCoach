import { app, BrowserWindow, ipcMain, globalShortcut, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, ChildProcess } from 'node:child_process';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { getConfigPath, loadConfig, updateConfig } from '@simracing/config';

const serviceUrl = process.env.SERVICE_URL ?? 'http://127.0.0.1:7878';
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let serviceProcess: ChildProcess | null = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const appPath = app.getAppPath();
  splashWindow.loadFile(path.join(appPath, 'public/splash.html'));
  splashWindow.center();
}

function updateSplashProgress(progress: number, message: string) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash-progress', { progress, message });
  }
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    show: false,  // Don't show until ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    },
  });

  // Use app.getAppPath() to work in both dev and production
  const appPath = app.getAppPath();
  mainWindow.loadFile(path.join(appPath, 'public/index.html'));


  // Show main window when ready
  mainWindow.once('ready-to-show', () => {
    closeSplash();
    mainWindow?.show();
  });
}

async function controlService(endpoint: string, body?: unknown) {
  try {
    console.log(`[Main] Calling service: ${endpoint}`, body);
    const res = await fetch(`${serviceUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    console.log(`[Main] Service responded to ${endpoint}: ${res.status}`);
    if (!res.ok) {
      throw new Error(`Service responded with status: ${res.status}`);
    }
  } catch (err: any) {
    console.error(`[Main] Error calling service ${endpoint}:`, err);
    dialog.showErrorBox('Error de Servicio', `No se pudo conectar con el servicio (${endpoint}): ${err.message}`);
    throw err;
  }
}

async function getStatus() {
  try {
    const res = await fetch(`${serviceUrl}/status`);
    if (!res.ok) {
      return { state: 'disconnected' };
    }
    const data = await res.json();
    return {
      state: data.state || 'disconnected',
      sim: data.sim || 'unknown',
      details: data.details,
      buffer: data.buffer // Pass through buffer data if available
    };
  } catch (err) {
    console.error('[Main] getStatus failed:', err);
    return { state: 'disconnected' };
  }
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

async function getVoices() {
  const res = await fetch(`${serviceUrl}/voices`);
  if (!res.ok) {
    throw new Error('Could not fetch voices');
  }
  return res.json();
}

async function startService() {
  if (isDev) {
    console.log('[Main] Running in dev mode, expecting external service');
    return;
  }

  return new Promise<void>((resolve, reject) => {
    console.log('[Main] Starting bundled service...');

    const resourcesPath = process.resourcesPath;
    const servicePath = path.join(resourcesPath, 'service', 'index.js');
    const adapterPath = path.join(resourcesPath, 'adapters');

    console.log('[Main] Service path:', servicePath);
    console.log('[Main] Adapters path:', adapterPath);
    console.log('[Main] Resources path:', resourcesPath);

    // Set environment variables for service
    const env = {
      ...process.env,
      ADAPTER_PATH: adapterPath,
      NODE_ENV: 'production',
      // Performance optimization: Use more cores for I/O operations
      UV_THREADPOOL_SIZE: '8'
    };

    // Use spawn instead of fork for packaged app
    // process.execPath is electron.exe which has node embedded
    console.log('[Main] Using node from:', process.execPath);

    const proc = spawn(process.execPath, [servicePath], {
      env: {
        ...env,
        ELECTRON_RUN_AS_NODE: '1'
      },
      cwd: path.join(resourcesPath, 'service'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    serviceProcess = proc;

    proc.stdout?.on('data', (data) => {
      console.log('[Service]', data.toString().trim());
    });

    proc.stderr?.on('data', (data) => {
      console.error('[Service Error]', data.toString().trim());
    });

    proc.on('error', (err) => {
      console.error('[Main] Failed to start service:', err);
      reject(err);
    });

    proc.on('exit', (code) => {
      console.log(`[Main] Service exited with code ${code}`);
      serviceProcess = null;
    });

    // Wait for service to be ready
    console.log('[Main] Waiting for service to be ready...');
    const maxRetries = 30;
    let retries = 0;

    const checkService = setInterval(async () => {
      try {
        const res = await fetch(`${serviceUrl}/status`);
        if (res.ok) {
          console.log('[Main] Service is ready!');
          clearInterval(checkService);
          resolve();
        }
      } catch (err) {
        retries++;
        if (retries >= maxRetries) {
          clearInterval(checkService);
          console.error('[Main] Service failed to start in time');
          reject(new Error('Service timeout'));
        }
      }
    }, 1000);
  });
}

function stopService() {
  if (serviceProcess) {
    console.log('[Main] Stopping service...');
    serviceProcess.kill();
    serviceProcess = null;
  }
}

app.whenReady().then(async () => {
  // Show splash immediately
  createSplashWindow();
  updateSplashProgress(10, 'Iniciando servicios...');

  try {
    await startService();
    updateSplashProgress(60, 'Servicios iniciados');
  } catch (err) {
    console.error('[Main] Service failed to start:', err);
    updateSplashProgress(60, 'Advertencia: Servicios no disponibles');
    dialog.showErrorBox(
      'Error al iniciar el servicio',
      'No se pudo iniciar el servicio de SimRacing Coach. La aplicación puede no funcionar correctamente.'
    );
  }

  updateSplashProgress(80, 'Cargando interfaz...');
  createWindow();
  registerHotkeys();

  ipcMain.handle('status', async () => getStatus());
  ipcMain.handle('config:get', async () => loadConfig(getConfigPath()));
  ipcMain.handle('voice:list', async () => getVoices());
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
  ipcMain.handle('service:mute', async () => controlService('/mute'));
  ipcMain.handle('service:unmute', async () => controlService('/unmute'));
  ipcMain.handle('service:repeat', async () => controlService('/repeat'));
  ipcMain.handle('service:focus', async () => controlService('/focus'));
  ipcMain.handle('voice:test', async (_event, text: string, options?: any) => {
    console.log(`[Main] IPC voice:test received: "${text}"`, options);

    // If AI TTS is requested, use service test-voice endpoint
    if (options?.voice === 'ai-tts') {
      await controlService('/test-voice', { text, useAI: true });
    } else {
      // Use Windows TTS from service
      await controlService('/test-voice', { text });
    }
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
  stopService();
});
