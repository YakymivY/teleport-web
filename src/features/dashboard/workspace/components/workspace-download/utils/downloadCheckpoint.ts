import type { DownloadCheckpoint } from '../types/DownloadCheckpoint';

export const CHECKPOINT_KEY_PREFIX = 'download_';

export function getDownloadCheckpoint(key: string): DownloadCheckpoint | null {
  const value = localStorage.getItem(key);
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isDownloadCheckpoint(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveDownloadCheckpoint(key: string, checkpoint: DownloadCheckpoint): void {
  localStorage.setItem(key, JSON.stringify(checkpoint));
}

export function removeDownloadCheckpoint(key: string): void {
  localStorage.removeItem(key);
}

export function clearAllDownloadCheckpoints(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CHECKPOINT_KEY_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}

function isDownloadCheckpoint(value: unknown): value is DownloadCheckpoint {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<DownloadCheckpoint>;
  return (
    typeof candidate.fileTransferId === 'string' &&
    typeof candidate.filename === 'string' &&
    typeof candidate.sizeBytes === 'number' &&
    typeof candidate.downloadedBytes === 'number'
  );
}
