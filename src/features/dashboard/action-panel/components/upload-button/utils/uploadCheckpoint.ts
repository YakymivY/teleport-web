import type { UploadCheckpoint } from '../types/UploadCheckpoint';

export function getUploadCheckpoint(key: string): UploadCheckpoint | null {
  const value = localStorage.getItem(key);
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isUploadCheckpoint(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveUploadCheckpoint(key: string, checkpoint: UploadCheckpoint): void {
  localStorage.setItem(key, JSON.stringify(checkpoint));
}

export function removeUploadCheckpoint(key: string): void {
  localStorage.removeItem(key);
}

export function clearAllUploadCheckpoints(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('upload_')) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}

function isUploadCheckpoint(value: unknown): value is UploadCheckpoint {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<UploadCheckpoint>;
  return (
    typeof candidate.s3UploadId === 'string' &&
    typeof candidate.fileTransferId === 'string' &&
    Array.isArray(candidate.uploadedParts) &&
    typeof candidate.filename === 'string' &&
    typeof candidate.sizeBytes === 'number'
  );
}
