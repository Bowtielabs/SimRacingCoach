import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getStatus: () => ipcRenderer.invoke('status'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  updateConfig: (partial: unknown) => ipcRenderer.invoke('config:update', partial),
  testVoice: (text: string) => ipcRenderer.invoke('voice:test', text),
  mute: () => ipcRenderer.invoke('service:mute'),
  unmute: () => ipcRenderer.invoke('service:unmute'),
  repeat: () => ipcRenderer.invoke('service:repeat'),
  focus: () => ipcRenderer.invoke('service:focus'),
  getConfigPath: () => ipcRenderer.invoke('config:path'),
});
