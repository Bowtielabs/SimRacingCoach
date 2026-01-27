const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getStatus: () => ipcRenderer.invoke('status'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  updateConfig: (partial: any) => ipcRenderer.invoke('config:update', partial),
  testVoice: (text: string) => ipcRenderer.invoke('voice:test', text),
  getConfigPath: () => ipcRenderer.invoke('config:path'),
  mute: () => ipcRenderer.invoke('service:mute'),
  unmute: () => ipcRenderer.invoke('service:unmute'),
  repeat: () => ipcRenderer.invoke('service:repeat'),
  focus: () => ipcRenderer.invoke('service:focus'),
  startService: (payload: any) => ipcRenderer.invoke('service:start', payload),
  stopService: () => ipcRenderer.invoke('service:stop'),
  getVoices: () => ipcRenderer.invoke('voice:list'),
  onSpeech: (callback: any) =>
    ipcRenderer.on('speech:play', (_event: any, data: any) => callback(data)),
});
