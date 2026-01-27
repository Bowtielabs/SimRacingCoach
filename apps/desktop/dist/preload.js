import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('api', {
    getStatus: () => ipcRenderer.invoke('status'),
    getConfig: () => ipcRenderer.invoke('config:get'),
    updateConfig: (partial) => ipcRenderer.invoke('config:update', partial),
    testVoice: (text) => ipcRenderer.invoke('voice:test', text),
    getConfigPath: () => ipcRenderer.invoke('config:path'),
    mute: () => ipcRenderer.invoke('service:mute'),
    unmute: () => ipcRenderer.invoke('service:unmute'),
    repeat: () => ipcRenderer.invoke('service:repeat'),
    focus: () => ipcRenderer.invoke('service:focus'),
    startService: (payload) => ipcRenderer.invoke('service:start', payload),
    stopService: () => ipcRenderer.invoke('service:stop'),
    onSpeech: (callback) => ipcRenderer.on('speech:play', (_event, data) => callback(data)),
});
//# sourceMappingURL=preload.js.map