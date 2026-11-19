const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  init: () => ipcRenderer.invoke('init'),
  info: (url) => ipcRenderer.invoke('info', url),
  download: (opts) => ipcRenderer.invoke('download', opts),
  cancel: () => ipcRenderer.invoke('cancel'),
  pickDir: () => ipcRenderer.invoke('pickDir'),
  openDir: (d) => ipcRenderer.invoke('openDir', d),
  update: () => ipcRenderer.invoke('update'),
  onProgress: (cb) => ipcRenderer.on('progress', (_e, p) => cb(p)),
});
