import type { CapacitorElectronConfig } from '@capacitor-community/electron';
import { getCapacitorElectronConfig, setupElectronDeepLinking } from '@capacitor-community/electron';
import type { MenuItemConstructorOptions } from 'electron';
import { app, MenuItem } from 'electron';
import electronIsDev from 'electron-is-dev';
import unhandled from 'electron-unhandled';
import { autoUpdater } from 'electron-updater';

import { ElectronCapacitorApp, setupContentSecurityPolicy, setupReloadWatcher } from './setup';

// Graceful handling of unhandled errors.
unhandled();

// Define our menu templates (these are optional)
const trayMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [new MenuItem({ label: 'Quit App', role: 'quit' })];
const appMenuBarMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [
  { role: process.platform === 'darwin' ? 'appMenu' : 'fileMenu' },
  { role: 'viewMenu' },
];

// Get Config options from capacitor.config
const capacitorFileConfig: CapacitorElectronConfig = getCapacitorElectronConfig();

// Initialize our app. You can pass menu templates into the app here.
// const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig);
const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig, trayMenuTemplate, appMenuBarMenuTemplate);

// If deeplinking is enabled then we will set it up here.
if (capacitorFileConfig.electron?.deepLinkingEnabled) {
  setupElectronDeepLinking(myCapacitorApp, {
    customProtocol: capacitorFileConfig.electron.deepLinkingCustomProtocol ?? 'mycapacitorapp',
  });
}

// If we are in Dev mode, use the file watcher components.
if (electronIsDev) {
  setupReloadWatcher(myCapacitorApp);
}

// Run Application
(async () => {
  // Wait for electron app to be ready.
  await app.whenReady();
  // Security - Set Content-Security-Policy based on whether or not we are in dev mode.
  setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme());
  // Initialize our app, build windows, and load content.
  await myCapacitorApp.init();
  // Check for updates if we are in a packaged app.
  autoUpdater.checkForUpdatesAndNotify();
})();

// Handle when all of our windows are close (platforms have their own expectations).
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// When the dock icon is clicked.
app.on('activate', async function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (myCapacitorApp.getMainWindow().isDestroyed()) {
    await myCapacitorApp.init();
  }
});

// Place all ipc or other electron api calls and custom functionality under this line
import { ipcMain, net } from 'electron';
import * as fs from 'fs';
import * as path from 'path';


ipcMain.handle('electron-s3-put', (_event, { url, method = 'PUT', headers, buffer }: { url: string; method?: string; headers: Record<string, string>; buffer: ArrayBuffer }) => {
  return new Promise<{ status: number; etag: string | null }>((resolve, reject) => {
    const req = net.request({ method, url });
    for (const [k, v] of Object.entries(headers)) {
      req.setHeader(k, v);
    }
    req.on('response', (res) => {
      const raw = res.headers['etag'];
      const etag = Array.isArray(raw) ? raw[0] : (raw as string) ?? null;
      res.on('data', () => {});
      res.on('end', () => resolve({ status: res.statusCode, etag }));
    });
    req.on('error', reject);
    req.write(Buffer.from(buffer));
    req.end();
  });
});

function uniqueDownloadPath(dir: string, filename: string): string {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let candidate = path.join(dir, filename);
  let counter = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base} (${counter})${ext}`);
    counter++;
  }
  return candidate;
}

ipcMain.handle('electron-download', (_event, { url, headers, filename }: { url: string; headers: Record<string, string>; filename: string }) => {
  return new Promise<{ status: number }>((resolve, reject) => {
    const req = net.request({ method: 'GET', url });
    for (const [k, v] of Object.entries(headers)) {
      req.setHeader(k, v);
    }
    req.on('response', (res) => {
      if (res.statusCode !== 200) {
        res.on('data', () => {});
        res.on('end', () => resolve({ status: res.statusCode }));
        return;
      }
      const downloadPath = uniqueDownloadPath(app.getPath('downloads'), filename);
      const fileStream = fs.createWriteStream(downloadPath);
      res.on('data', (chunk: Buffer) => fileStream.write(chunk));
      res.on('end', () => fileStream.end(() => resolve({ status: res.statusCode })));
      res.on('error', (err) => { fileStream.destroy(); reject(err); });
    });
    req.on('error', reject);
    req.end();
  });
});
