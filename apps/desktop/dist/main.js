import { app, BrowserWindow, ipcMain, globalShortcut, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { getConfigPath, loadConfig, updateConfig } from '@simracing/config';
const serviceUrl = process.env.SERVICE_URL ?? 'http://127.0.0.1:7878';
let mainWindow = null;
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
        },
    });
    mainWindow.loadFile(path.join(__dirname, '../public/index.html'));
}
async function controlService(endpoint, body) {
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
    }
    catch (err) {
        console.error(`[Main] Error calling service ${endpoint}:`, err);
        dialog.showErrorBox('Error de Servicio', `No se pudo conectar con el servicio (${endpoint}): ${err.message}`);
        throw err;
    }
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
async function getVoices() {
    const res = await fetch(`${serviceUrl}/voices`);
    if (!res.ok) {
        throw new Error('Could not fetch voices');
    }
    return res.json();
}
app.whenReady().then(() => {
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
    ipcMain.handle('voice:test', async (_event, text, options) => {
        console.log(`[Main] IPC voice:test received: "${text}"`, options);
        await controlService('/test-voice', { text, ...options });
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
//# sourceMappingURL=main.js.map