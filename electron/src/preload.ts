require('./rt/electron-rt');
//////////////////////////////
// User Defined Preload scripts below
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronS3', {
  put: (params: { requestId: string; url: string; method?: string; headers: Record<string, string>; buffer: ArrayBuffer }) =>
    ipcRenderer.invoke('electron-s3-put', params),
  abort: (requestId: string) =>
    ipcRenderer.invoke('electron-s3-abort', requestId),
});

contextBridge.exposeInMainWorld('electronDownload', {
  download: (params: { url: string; headers: Record<string, string>; filename: string; fileTransferId: string }) =>
    ipcRenderer.invoke('electron-download', params),
  removePartialFile: (fileTransferId: string) =>
    ipcRenderer.invoke('electron-download-remove-partial', fileTransferId),
  onProgress: (callback: (data: { fileTransferId: string; downloadedBytes: number; totalBytes: number }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: { fileTransferId: string; downloadedBytes: number; totalBytes: number }) =>
      callback(data);
    ipcRenderer.on('electron-download-progress', handler);
    return () => ipcRenderer.removeListener('electron-download-progress', handler);
  },
});
