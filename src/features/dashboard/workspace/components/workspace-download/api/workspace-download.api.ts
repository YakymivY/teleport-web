import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileTransfer } from '@capacitor/file-transfer';
import type { FileTransferError } from '@capacitor/file-transfer';
import { Media } from '@capacitor-community/media';
import { apiClient } from '../../../../../../api/apiClient';
import type { FileTransferResponse } from '../../../../models/FileTransferResponse.ts';
import type { DeleteFileRequest } from '../types/DeleteFileRequest.ts';
import type { DownloadFileTransferParams } from '../types/DownloadFileTransferParams';
import { getMediaType } from '../utils/get-media-type.ts';
import {
  saveDownloadCheckpoint,
  removeDownloadCheckpoint,
  CHECKPOINT_KEY_PREFIX,
} from '../utils/downloadCheckpoint';

declare global {
  interface Window {
    electronDownload?: {
      download: (params: { url: string; headers: Record<string, string>; filename: string }) => Promise<{ status: number }>;
    };
  }
}

// commit data to OPFS every 5 MB
const COMMIT_INTERVAL_BYTES = 5 * 1024 * 1024;

function handleUnauthorized(): never {
  localStorage.removeItem('token');
  window.location.assign('/login');
  throw new Error('Unauthorized');
}

export async function fetchDestinationFileTransfers(): Promise<FileTransferResponse[]> {
  const response = await apiClient.get<FileTransferResponse[]>('/files/file-transfers/destination');
  return response.data;
}

export async function deleteFileTransfer(params: DeleteFileRequest): Promise<void> {
  await apiClient.delete('/files', { params });
}

export async function markDownloadComplete(fileTransferId: string): Promise<void> {
  await apiClient.post('/files/download/complete', { fileTransferId });
}

export async function removeOPFSEntry(fileTransferId: string): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(fileTransferId);
  } catch {
    // entry may not exist — safe to ignore
  }
}

async function streamToOPFSWithPeriodicCommits(params: {
  readable: ReadableStream<Uint8Array>;
  fileHandle: FileSystemFileHandle;
  startBytes: number;
  totalBytes?: number;
  onProgress?: (percent: number) => void;
  onCommit?: (committedBytes: number) => void;
}): Promise<void> {
  const { readable, fileHandle, startBytes, totalBytes, onProgress, onCommit } = params;

  const reader = readable.getReader();
  let writtenBytes = startBytes;
  let bytesInThisTransaction = 0;
  let lastPercent = -1;

  // open the initial writable
  let writable = await fileHandle.createWritable({ keepExistingData: startBytes > 0 });
  if (startBytes > 0) await writable.seek(startBytes);
  let writer = writable.getWriter();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      await writer.write(value);
      writtenBytes += value.byteLength;
      bytesInThisTransaction += value.byteLength;

      if (totalBytes && onProgress) {
        const percent = Math.max(0, Math.min(100, Math.floor((writtenBytes / totalBytes) * 100)));
        if (percent !== lastPercent) {
          lastPercent = percent;
          onProgress(percent);
        }
      }

      // periodic commit: close (atomically replaces OPFS file with swap copy) then reopen.
      // this makes progress durable so tab closure / browser crash only loses the last interval.
      if (bytesInThisTransaction >= COMMIT_INTERVAL_BYTES) {
        await writer.close();
        onCommit?.(writtenBytes);
        writable = await fileHandle.createWritable({ keepExistingData: true });
        await writable.seek(writtenBytes);
        writer = writable.getWriter();
        bytesInThisTransaction = 0;
      }
    }

    // final commit for the remaining bytes
    await writer.close();
    if (onProgress) onProgress(100);
  } catch (e) {
    // commit whatever was written in this transaction
    try { await writer.close(); } catch { /* data up to last periodic commit is safe */ }
    throw e;
  } finally {
    reader.releaseLock();
  }
}

async function downloadFileNative(params: {
  url: string;
  token: string | null;
  filename: string;
  onProgress?: (percent: number) => void;
}): Promise<boolean> {
  const { url, token, filename, onProgress } = params;

  const mediaType = getMediaType(filename);
  const directory = mediaType ? Directory.Cache : Directory.Documents;
  const { uri } = await Filesystem.getUri({ path: filename, directory });

  const listenerHandle = onProgress
    ? await FileTransfer.addListener('progress', (status) => {
        if (status.url === url && status.type === 'download' && status.lengthComputable && status.contentLength > 0) {
          onProgress(Math.floor((status.bytes / status.contentLength) * 100));
        }
      })
    : null;

  try {
    await FileTransfer.downloadFile({
      url,
      path: uri,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      progress: !!onProgress,
    });

    if (onProgress) onProgress(100);

    if (mediaType === 'image') {
      await Media.savePhoto({ path: uri });
    } else if (mediaType === 'video') {
      await Media.saveVideo({ path: uri });
    }

    return true;
  } catch (err: unknown) {
    const ftError = (err as { data?: FileTransferError }).data;
    if (ftError?.httpStatus === 404) return false;
    if (ftError?.httpStatus === 401) handleUnauthorized();
    throw err;
  } finally {
    if (mediaType) {
      try { await Filesystem.deleteFile({ path: filename, directory: Directory.Cache }); } catch { /* ignore */ }
    }
    await listenerHandle?.remove();
  }
}

async function downloadFileWeb(params: {
  url: URL;
  token: string | null;
  fileTransferId: string;
  filename: string;
  fallbackTotalBytes?: number;
  onProgress?: (percent: number) => void;
}): Promise<boolean> {
  const { url, token, fileTransferId, filename, fallbackTotalBytes, onProgress } = params;

  const checkpointKey = `${CHECKPOINT_KEY_PREFIX}${fileTransferId}`;

  // use OPFS as the intermediate store
  const opfsRoot = await navigator.storage.getDirectory();
  const fileHandle = await opfsRoot.getFileHandle(fileTransferId, { create: true });

  // derive resume position from the actual bytes already on disk
  const existingFile = await fileHandle.getFile();
  const actualResumeFrom = existingFile.size;

  // add the Authorization header if the token is present
  const requestHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (actualResumeFrom > 0) {
    requestHeaders['Range'] = `bytes=${actualResumeFrom}-`;
  }

  // fetch the file from the backend
  const response = await fetch(url, { method: 'GET', headers: requestHeaders });

  // handle the response
  if (response.status === 404) return false;
  if (response.status === 401) handleUnauthorized();

  if (response.status !== 200 && response.status !== 206) {
    throw new Error('Failed to start download.');
  }

  if (!response.body) {
    throw new Error('Download stream is not available.');
  }

  // get the content length from the response headers
  const contentLengthHeader = response.headers.get('content-length');
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;
  const totalBytes =
    Number.isFinite(contentLength) && (contentLength ?? 0) > 0
      ? actualResumeFrom + (contentLength ?? 0)
      : fallbackTotalBytes;

  // save the checkpoint
  saveDownloadCheckpoint(checkpointKey, {
    fileTransferId,
    filename,
    sizeBytes: totalBytes ?? 0,
    downloadedBytes: actualResumeFrom,
  });

  if (onProgress) onProgress(
    totalBytes && totalBytes > 0 ? Math.floor((actualResumeFrom / totalBytes) * 100) : 0,
  );

  // streams response body into OPFS with periodic commits so a tab close only loses the last interval
  await streamToOPFSWithPeriodicCommits({
    readable: response.body,
    fileHandle,
    startBytes: actualResumeFrom,
    totalBytes,
    onProgress,
    onCommit: (committedBytes) => {
      saveDownloadCheckpoint(checkpointKey, {
        fileTransferId,
        filename,
        sizeBytes: totalBytes ?? 0,
        downloadedBytes: committedBytes,
      });
    },
  });

  // trigger the native browser download from the completed OPFS file
  const completedFile = await fileHandle.getFile();
  const objectUrl = URL.createObjectURL(completedFile);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // keep the object URL and OPFS entry alive until the browser finishes copying the file
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
    void opfsRoot.removeEntry(fileTransferId).catch(() => { /* already removed */ });
  }, 60_000);

  removeDownloadCheckpoint(checkpointKey);

  // signal completion explicitly
  if (response.status === 206) {
    await markDownloadComplete(fileTransferId);
  }

  return true;
}

export async function downloadFileTransfer(params: DownloadFileTransferParams): Promise<boolean> {
  const { fileTransferId, fallbackFilename, fallbackTotalBytes, onProgress } = params;
  const token = localStorage.getItem('token');
  const url = new URL('/files/download', import.meta.env.VITE_API_URL);
  url.searchParams.set('fileTransferId', fileTransferId);

  if (onProgress) onProgress(0);

  const filename = fallbackFilename ?? 'download.bin';

  // ── Electron ────────────────────────────────────────────────────────────────
  if (window.electronDownload) {
    const result = await window.electronDownload.download({
      url: url.toString(),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      filename,
    });
    if (result.status === 404) return false;
    if (result.status === 401) handleUnauthorized();
    if (result.status < 200 || result.status >= 300) {
      throw new Error('Failed to start download.');
    }
    if (onProgress) onProgress(100);
    return true;
  }

  // ── Capacitor native ────────────────────────────────────────────────────────
  if (Capacitor.isNativePlatform()) {
    return downloadFileNative({ url: url.toString(), token, filename, onProgress });
  }

  // ── Web browser (OPFS + native download trigger) ─────────────────────────────
  return downloadFileWeb({ url, token, fileTransferId, filename, fallbackTotalBytes, onProgress });
}
