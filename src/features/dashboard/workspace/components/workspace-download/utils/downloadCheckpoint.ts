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
