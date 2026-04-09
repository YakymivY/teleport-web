import { apiClient } from '../../../../../../api/apiClient';
import type { FileTransferResponse } from '../../../../models/FileTransferResponse.ts';
import type { DeleteFileRequest } from '../types/DeleteFileRequest.ts';
import type { DownloadFileTransferParams } from '../types/DownloadFileTransferParams';
import streamSaver from 'streamsaver';

export async function fetchDestinationFileTransfers(): Promise<FileTransferResponse[]> {
  const response = await apiClient.get<FileTransferResponse[]>('/files/file-transfers/destination');
  return response.data;
}

export async function deleteFileTransfer(params: DeleteFileRequest): Promise<void> {
  await apiClient.delete('/files', { params });
}

async function pipeReadableToWritableWithProgress(params: {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  totalBytes?: number;
  onProgress?: (percent: number) => void;
}): Promise<void> {
  const { readable, writable, totalBytes, onProgress } = params;

  const reader = readable.getReader();
  const writer = writable.getWriter();
  let writtenBytes = 0;
  let lastPercent = -1;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        await writer.write(value);
        if (totalBytes && onProgress) {
          writtenBytes += value.byteLength;
          const percent = Math.max(0, Math.min(100, Math.floor((writtenBytes / totalBytes) * 100)));
          if (percent !== lastPercent) {
            lastPercent = percent;
            onProgress(percent);
          }
        }
      }
    }
    await writer.close();
    if (onProgress) onProgress(100);
  } catch (e) {
    try {
      await writer.abort(e);
    } catch {
      // ignore
    }
    throw e;
  } finally {
    reader.releaseLock();
  }
}

export async function downloadFileTransfer(params: DownloadFileTransferParams): Promise<boolean> {
  const { fileTransferId, fallbackFilename, fallbackTotalBytes, onProgress } = params;
  const token = localStorage.getItem('token');
  const url = new URL('/files/download', import.meta.env.VITE_API_URL);
  url.searchParams.set('fileTransferId', fileTransferId);

  if (onProgress) onProgress(0);

  // send request to download the file
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  // handle request errors
  if (response.status === 404) return false;

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.assign('/login');
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error('Failed to start download.');
  }

  if (!response.body) {
    throw new Error('Download stream is not available.');
  }

  // create a writable stream to write the file to the disk
  const filename = fallbackFilename ?? 'download.bin';
  const contentLengthHeader = response.headers.get('content-length');
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;
  const totalBytes = Number.isFinite(contentLength) && (contentLength ?? 0) > 0 ? contentLength : fallbackTotalBytes;

  const streamSaverWritable = streamSaver.createWriteStream(filename);
  await pipeReadableToWritableWithProgress({
    readable: response.body,
    writable: streamSaverWritable,
    totalBytes,
    onProgress,
  });
  return true;
}
