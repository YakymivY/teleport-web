import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Media } from '@capacitor-community/media';

interface MediaScanPlugin {
  scanFile(options: { path: string }): Promise<void>;
}
const MediaScan = registerPlugin<MediaScanPlugin>('MediaScan');
import { apiClient, getApiBaseUrl } from '../../../../../../api/apiClient';
import type { FileTransferResponse } from '../../../../models/FileTransferResponse.ts';
import type { DeleteFileRequest } from '../types/DeleteFileRequest.ts';
import type { DownloadFileTransferParams } from '../types/DownloadFileTransferParams';
import { getMediaType } from '../utils/get-media-type.ts';
import { uint8ToBase64 } from '../utils/uint8-to-base64.ts';
import {
  getDownloadCheckpoint,
  saveDownloadCheckpoint,
  removeDownloadCheckpoint,
  CHECKPOINT_KEY_PREFIX,
} from '../utils/downloadCheckpoint';

declare global {
  interface Window {
    electronDownload?: {
      download: (params: { url: string; headers: Record<string, string>; filename: string; fileTransferId: string }) => Promise<{ status: number; wasRangeRequest: boolean }>;
      removePartialFile: (fileTransferId: string) => Promise<void>;
      onProgress: (callback: (data: { fileTransferId: string; downloadedBytes: number; totalBytes: number }) => void) => () => void;
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

export async function removeCapacitorPartialFile(fileTransferId: string): Promise<void> {
  try {
    await Filesystem.deleteFile({
      path: `${PARTIAL_DOWNLOADS_DIR}/${fileTransferId}`,
      directory: Directory.Cache,
    });
  } catch {
    // file may not exist — safe to ignore
  }
}

/** @deprecated use removeCapacitorPartialFile */
export const removeIosPartialFile = removeCapacitorPartialFile;

export async function removeElectronPartialFile(fileTransferId: string): Promise<void> {
  try {
    await window.electronDownload?.removePartialFile(fileTransferId);
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


// On Android, @capacitor-community/media saves to Android/media/<appId>/ which Google
// Photos does not watch, and its scanPhoto() uses a deprecated broadcast ignored on
// API 29+.
//
// Copy directly to the standard public Movies/ or Pictures/ folder on external
// storage, then notify MediaStore via MediaScanPlugin (MediaScannerConnection.scanFile)
// so Google Photos sees the file immediately.
async function saveAndroidMediaToGallery(
  partialPath: string,
  filename: string,
  mediaType: 'image' | 'video',
): Promise<void> {
  const subDir = mediaType === 'video' ? 'Movies' : 'Pictures';
  const destPath = `${subDir}/${filename}`;

  await Filesystem.mkdir({ path: subDir, directory: Directory.ExternalStorage, recursive: true }).catch(() => {});
  await Filesystem.deleteFile({ path: destPath, directory: Directory.ExternalStorage }).catch(() => {});

  await Filesystem.copy({
    from: partialPath,
    directory: Directory.Cache,
    to: destPath,
    toDirectory: Directory.ExternalStorage,
  });

  // notify MediaStore so Google Photos sees the file immediately.
  // Filesystem.getUri returns a URL-encoded URI (e.g. spaces become %20); decode it
  // back to a plain filesystem path before passing to MediaScannerConnection, which
  // expects a real path and would silently skip files with %20 in the name.
  const { uri: destUri } = await Filesystem.getUri({ path: destPath, directory: Directory.ExternalStorage });
  await MediaScan.scanFile({ path: decodeURIComponent(destUri) });
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

// download a file from the backend to the native filesystem (iOS and Android)
async function downloadFileCapacitorNative(params: {
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

    let response: Response;
    try {
      response = await fetch(url, { method: 'GET', headers: requestHeaders });
    } catch (fetchErr) {
      // The Range header is not CORS-safe and triggers a preflight OPTIONS request.
      // If the server's Access-Control-Allow-Headers does not include Range, the
      // preflight fails and fetch throws TypeError. Fall back to a full re-download
      // from byte 0 so the download still completes (losing resume progress).
      // The permanent fix is to add Range to Access-Control-Allow-Headers on the backend.
      if (resumeFrom > 0) {
        await Filesystem.deleteFile({ path: partialPath, directory: Directory.Cache }).catch(() => {});
        delete requestHeaders['Range'];
        resumeFrom = 0;
        response = await fetch(url, { method: 'GET', headers: requestHeaders });
      } else {
        throw fetchErr;
      }
    }

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
  if (Capacitor.getPlatform() === 'android' && mediaType) {
    // Android: copy to standard Movies/ or Pictures/ on external storage, then notify
    // MediaStore via MediaScannerConnection so Google Photos sees the file immediately
    try {
      await saveAndroidMediaToGallery(partialPath, filename, mediaType);
    } catch {
      await copyToDocuments(partialPath, filename);
    }
  } else if (mediaType === 'image') {
    // iOS
    try {
      await Media.savePhoto({ path: partialUri });
    } catch {
      await copyToDocuments(partialPath, filename);
    }
  } else if (mediaType === 'video') {
    // iOS
    try {
      await Media.saveVideo({ path: partialUri });
    } catch {
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
  const url = new URL('/files/download', getApiBaseUrl());
  url.searchParams.set('fileTransferId', fileTransferId);

  const filename = fallbackFilename ?? 'download.bin';

  // ── Electron ────────────────────────────────────────────────────────────────
  if (window.electronDownload) {
    const checkpointKey = `${CHECKPOINT_KEY_PREFIX}${fileTransferId}`;

    // create an initial checkpoint only if none exists yet, so resumes keep their real progress
    if (!getDownloadCheckpoint(checkpointKey)) {
      saveDownloadCheckpoint(checkpointKey, {
        fileTransferId,
        filename,
        sizeBytes: fallbackTotalBytes ?? 0,
        downloadedBytes: 0,
      });
    }

    // listen to progress events emitted by the main process during streaming
    const removeProgressListener = window.electronDownload.onProgress((data) => {
      if (data.fileTransferId !== fileTransferId) return;

      saveDownloadCheckpoint(checkpointKey, {
        fileTransferId,
        filename,
        sizeBytes: data.totalBytes,
        downloadedBytes: data.downloadedBytes,
      });

      if (onProgress && data.totalBytes > 0) {
        onProgress(Math.min(100, Math.floor((data.downloadedBytes / data.totalBytes) * 100)));
      }
    });

    try {
      const result = await window.electronDownload.download({
        url: url.toString(),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        filename,
        fileTransferId,
      });

      if (result.status === 404) return false;
      if (result.status === 409) throw Object.assign(new Error('Download already in progress'), { code: 'DOWNLOAD_IN_PROGRESS' as const });
      if (result.status === 401) handleUnauthorized();
      if (result.status < 200 || result.status >= 300) {
        throw new Error('Failed to start download.');
      }

      removeDownloadCheckpoint(checkpointKey);
      if (onProgress) onProgress(100);

      if (result.wasRangeRequest) {
        try {
          await markDownloadComplete(fileTransferId);
        } catch (err: unknown) {
          const httpStatus = (err as { response?: { status?: number } }).response?.status;
          if (httpStatus !== 409) throw err;
        }
      }

      return true;
    } finally {
      removeProgressListener();
    }
  }

  // ── Capacitor iOS / Android (resumable via fetch + Filesystem) ─────────────
  if (Capacitor.isNativePlatform()) {
    return downloadFileCapacitorNative({ url, token, fileTransferId, filename, fallbackTotalBytes, onProgress });
  }

  // ── Web browser (OPFS + native download trigger) ─────────────────────────────
  return downloadFileWeb({ url, token, fileTransferId, filename, fallbackTotalBytes, onProgress });
}
