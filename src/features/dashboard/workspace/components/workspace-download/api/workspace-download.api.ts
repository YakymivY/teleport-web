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
import { uint8ToBase64 } from '../utils/uint8-to-base64.ts';
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

// commit data to disk every 5 MB (applies to both the web OPFS path and the iOS Filesystem path)
const COMMIT_INTERVAL_BYTES = 5 * 1024 * 1024;

// directory inside Directory.Cache used to store in-progress iOS partial downloads
const PARTIAL_DOWNLOADS_DIR = 'partial_downloads';

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

export async function removeIosPartialFile(fileTransferId: string): Promise<void> {
  try {
    await Filesystem.deleteFile({
      path: `${PARTIAL_DOWNLOADS_DIR}/${fileTransferId}`,
      directory: Directory.Cache,
    });
  } catch {
    // file may not exist — safe to ignore
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

async function streamToFilesystemWithPeriodicCommits(params: {
  readable: ReadableStream<Uint8Array>;
  partialPath: string;
  directory: Directory;
  startBytes: number;
  totalBytes?: number;
  onProgress?: (percent: number) => void;
  onCommit?: (committedBytes: number) => void;
}): Promise<void> {
  const { readable, partialPath, directory, startBytes, totalBytes, onProgress, onCommit } = params;

  const reader = readable.getReader();
  let writtenBytes = startBytes;
  let lastPercent = -1;

  // Buffer accumulates chunks until COMMIT_INTERVAL_BYTES, then flushes via appendFile.
  // This keeps bridge call overhead low (~20 calls for a 100 MB file).
  let buffer: Uint8Array[] = [];
  let bufferSize = 0;

  // flush the buffer to the filesystem
  const flush = async () => {
    if (bufferSize === 0) return;
    const combined = new Uint8Array(bufferSize);
    let offset = 0;
    for (const chunk of buffer) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const base64 = uint8ToBase64(combined);
    await Filesystem.appendFile({ path: partialPath, directory, data: base64 });
    writtenBytes += bufferSize;
    buffer = [];
    bufferSize = 0;
    onCommit?.(writtenBytes);
  };

  try {
    // read the stream in chunks and buffer them
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      buffer.push(value);
      bufferSize += value.byteLength;

      // update the progress
      if (totalBytes && onProgress) {
        const percent = Math.max(0, Math.min(100, Math.floor(((writtenBytes + bufferSize) / totalBytes) * 100)));
        if (percent !== lastPercent) {
          lastPercent = percent;
          onProgress(percent);
        }
      }

      if (bufferSize >= COMMIT_INTERVAL_BYTES) {
        await flush();
      }
    }

    // flush remaining bytes
    await flush();
    if (onProgress) onProgress(100);
  } catch (e) {
    // flush of whatever is buffered so the on-disk partial file is as complete as possible
    try { await flush(); } catch { /* data up to last periodic flush is safe */ }
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

// iOS FileManager.copyItem throws NSFileWriteFileExistsError if the destination already exists.
// delete first so retried finalizations always succeed.
async function copyToDocuments(fromPartialPath: string, toFilename: string): Promise<void> {
  await Filesystem.deleteFile({ path: toFilename, directory: Directory.Documents }).catch(() => {});
  await Filesystem.copy({
    from: fromPartialPath,
    directory: Directory.Cache,
    to: toFilename,
    toDirectory: Directory.Documents,
  });
}

// download a file from the backend to the iOS filesystem
async function downloadFileIos(params: {
  url: URL;
  token: string | null;
  fileTransferId: string;
  filename: string;
  fallbackTotalBytes?: number;
  onProgress?: (percent: number) => void;
}): Promise<boolean> {
  const { url, token, fileTransferId, filename, fallbackTotalBytes, onProgress } = params;

  // ensure the staging directory exists
  await Filesystem.mkdir({
    path: PARTIAL_DOWNLOADS_DIR,
    directory: Directory.Cache,
    recursive: true,
  }).catch(() => {});

  const partialPath = `${PARTIAL_DOWNLOADS_DIR}/${fileTransferId}`;
  const checkpointKey = `${CHECKPOINT_KEY_PREFIX}${fileTransferId}`;

  // derive resume position from actual bytes already on disk
  let resumeFrom = 0;
  try {
    const stat = await Filesystem.stat({ path: partialPath, directory: Directory.Cache });
    resumeFrom = stat.size;
  } catch {
    // start from byte 0
  }

  // if the partial file already holds all the bytes
  // skip the network request entirely and go straight to finalizing the file
  const partialFileIsComplete =
    resumeFrom > 0 && fallbackTotalBytes != null && resumeFrom >= fallbackTotalBytes;

  let wasRangeRequest = false;

  // if the partial file does not hold all the bytes
  if (!partialFileIsComplete) {
    const requestHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    if (resumeFrom > 0) {
      requestHeaders['Range'] = `bytes=${resumeFrom}-`;
    }

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

    wasRangeRequest = response.status === 206;

    // get the content length from the response headers
    const contentLengthHeader = response.headers.get('content-length');
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;
    const totalBytes =
      Number.isFinite(contentLength) && (contentLength ?? 0) > 0
        ? resumeFrom + (contentLength ?? 0)
        : fallbackTotalBytes;

    // save the checkpoint
    saveDownloadCheckpoint(checkpointKey, {
      fileTransferId,
      filename,
      sizeBytes: totalBytes ?? 0,
      downloadedBytes: resumeFrom,
    });

    // update the progress
    if (onProgress) {
      onProgress(totalBytes && totalBytes > 0 ? Math.floor((resumeFrom / totalBytes) * 100) : 0);
    }

    // stream the response body to the filesystem with periodic commits
    await streamToFilesystemWithPeriodicCommits({
      readable: response.body,
      partialPath,
      directory: Directory.Cache,
      startBytes: resumeFrom,
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
  } else {
    // partial file is complete
    wasRangeRequest = true;
    if (onProgress) onProgress(100);
  }

  // move the completed partial file to its final destination
  const mediaType = getMediaType(filename);
  const { uri: partialUri } = await Filesystem.getUri({ path: partialPath, directory: Directory.Cache });

  // save the file to the media library
  if (mediaType === 'image') {
    try {
      await Media.savePhoto({ path: partialUri });
    } catch {
      // photos save can fail on the simulator or for unsupported formats — fall back to Documents
      await copyToDocuments(partialPath, filename);
    }
  } else if (mediaType === 'video') {
    try {
      await Media.saveVideo({ path: partialUri });
    } catch {
      // photos save can fail on the simulator or for unsupported formats — fall back to Documents
      await copyToDocuments(partialPath, filename);
    }
  } else {
    // copy the partial file to the documents directory
    await copyToDocuments(partialPath, filename);
  }

  // delete the partial file
  await Filesystem.deleteFile({ path: partialPath, directory: Directory.Cache });

  // remove the checkpoint
  removeDownloadCheckpoint(checkpointKey);

  // mark the download as complete
  if (wasRangeRequest) {
    try {
      await markDownloadComplete(fileTransferId);
    } catch (err: unknown) {
      const httpStatus = (err as { response?: { status?: number } }).response?.status;
      if (httpStatus !== 409) throw err;
    }
  }

  return true;
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

  // ── Capacitor iOS (resumable via fetch + Filesystem) ────────────────────────
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
    return downloadFileIos({ url, token, fileTransferId, filename, fallbackTotalBytes, onProgress });
  }

  // ── Capacitor Android (single-shot via FileTransfer plugin) ─────────────────
  if (Capacitor.isNativePlatform()) {
    return downloadFileNative({ url: url.toString(), token, filename, onProgress });
  }

  // ── Web browser (OPFS + native download trigger) ─────────────────────────────
  return downloadFileWeb({ url, token, fileTransferId, filename, fallbackTotalBytes, onProgress });
}
