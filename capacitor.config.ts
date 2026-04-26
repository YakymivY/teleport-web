import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.teleport.app',
  appName: 'teleport',
  webDir: 'dist',
  server: {
    url: "http://localhost:5173"
  }
};

export default config;
