const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appInfo', {
  platform: process.platform,
  versions: process.versions
});

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizeChanged: (callback) => ipcRenderer.on('window:maximize-changed', (_e, maximized) => callback(maximized))
});

// Expose file system and dialog APIs for Firemark
contextBridge.exposeInMainWorld('api', {
  openImages: () => ipcRenderer.invoke('dialog:openImages'),
  selectOutputDir: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveFile: ({ dataUrl, directory, originalName }) => ipcRenderer.invoke('file:save', { dataUrl, directory, originalName }),
});
