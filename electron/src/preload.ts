require('./rt/electron-rt');
//////////////////////////////
// User Defined Preload scripts below
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronS3', {
  put: (params: { url: string; headers: Record<string, string>; buffer: ArrayBuffer }) =>
    ipcRenderer.invoke('electron-s3-put', params),
});
