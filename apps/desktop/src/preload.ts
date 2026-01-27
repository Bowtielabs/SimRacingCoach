import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getStatus: () => ipcRenderer.invoke('status'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  updateConfig: (partial: unknown) => ipcRenderer.invoke('config:update', partial),
  startService: (payload: unknown) => ipcRenderer.invoke('service:start', payload),
  stopService: () => ipcRenderer.invoke('service:stop'),
  testVoice: (text: string) => ipcRenderer.invoke('voice:test', text),
  getConfigPath: () => ipcRenderer.invoke('config:path'),
});
