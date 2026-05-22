const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printImage: (imageUrl, options) => ipcRenderer.invoke('print-image', imageUrl, options)
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Electron Preload Script: DOM is fully loaded.');
});
