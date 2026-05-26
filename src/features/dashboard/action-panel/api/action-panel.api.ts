import { Capacitor } from '@capacitor/core';
import { apiClient } from '../../../../api/apiClient';
import type { CompleteMultipartUploadParams } from '../types/CompleteMultipartUploadParams.ts';
import type { GetMultipartPartUrlParams } from '../types/GetMultipartPartUrlParams.ts';
import type { GetMultipartPartUrlResponse } from '../types/GetMultipartPartUrlResponse.ts';
import type { InitMultipartUploadParams } from '../types/InitMultipartUploadParams.ts';
import type { InitMultipartUploadResponse } from '../types/InitMultipartUploadResponse.ts';
import type { UploadSingleParams } from '../types/UploadSingleParams.ts';
import type { UploadSingleResponse } from '../types/UploadSingleResponse.ts';
import type { ConfirmSingleUploadParams } from '../types/ConfirmSingleUploadParams.ts';
import type { FileTransferResponse } from '../../models/FileTransferResponse.ts';
import type { UserTrafficResponse } from '../types/UserTrafficResponse.ts';
import { useSelectedDeviceStore } from '../../../../store/device/useSelectedDeviceStore.ts';

// this function is used to add the destination device id to the request
function addDestinationDeviceId() {
  const destinationDeviceId = useSelectedDeviceStore.getState().selectedDeviceId;
  if (!destinationDeviceId) {
    throw new Error('No destination device selected.');
  }
  return destinationDeviceId;
}

export async function getUserTraffic() {
  const response = await apiClient.get<UserTrafficResponse>('/users/traffic');
  return response.data;
}

export async function logout(endpoint: '/auth/logout' | '/auth/logout-all') {
  const response = await apiClient.post(endpoint, {});
  return response.data;
}

export async function requestUploadSingle(params: UploadSingleParams) {
  const destinationDeviceId = addDestinationDeviceId();
  const response = await apiClient.post<UploadSingleResponse[]>('/files/upload/single', {
    ...params,
    destinationDeviceId,
  });
  return response.data;
}

export async function initMultipartUpload(params: InitMultipartUploadParams) {
  const destinationDeviceId = addDestinationDeviceId();
  const response = await apiClient.get<InitMultipartUploadResponse>('/files/upload/multipart', {
    params: { ...params, destinationDeviceId },
  });
  return response.data;
}

export async function getMultipartPartUrl(body: GetMultipartPartUrlParams) {
  const response = await apiClient.post<GetMultipartPartUrlResponse>(
    '/files/upload/multipart/part-url',
    body,
  );
  return response.data;
}

export async function completeMultipartUpload(body: CompleteMultipartUploadParams) {
  const response = await apiClient.post<FileTransferResponse>('/files/upload/multipart/complete', body);
  return response.data;
}

export async function confirmUpload(params: ConfirmSingleUploadParams) {
  const response = await apiClient.post<FileTransferResponse[]>('/files/upload/confirm', params);
  return response.data;
}

export async function abortMultipartUpload(body: { fileTransferId: string; s3UploadId: string }): Promise<void> {
  await apiClient.delete('/files/upload/multipart', { data: body });
}

export async function cancelSingleUpload(params: { fileTransferId: string }): Promise<void> {
  await apiClient.delete('/files/upload/single', { params });
}

declare global {
  interface Window {
    electronS3?: {
      put: (params: { requestId: string; url: string; method?: string; headers: Record<string, string>; buffer: ArrayBuffer }) => Promise<{ status: number; etag: string | null }>;
      abort: (requestId: string) => Promise<void>;
    };
  }
}

async function electronS3Put(
  url: string,
  method: string,
  headers: Record<string, string>,
  buffer: ArrayBuffer,
  signal?: AbortSignal,
): Promise<{ status: number; etag: string | null }> {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  const requestId = crypto.randomUUID();
  signal?.addEventListener('abort', () => void window.electronS3?.abort(requestId), { once: true });
  const putPromise = window.electronS3!.put({ requestId, url, method, headers, buffer });
  if (!signal) return putPromise;
  const abortPromise = new Promise<never>((_, reject) =>
    signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true }),
  );
  return Promise.race([putPromise, abortPromise]);
}

export async function uploadFileToPresignedUrl(url: string, headers: Record<string, string>, file: File, signal?: AbortSignal) {
  if (window.electronS3) {
    const buffer = await file.arrayBuffer();
    const result = await electronS3Put(url, 'PUT', headers, buffer, signal);
    if (result.status < 200 || result.status >= 300) throw new Error('UPLOAD_FAILED');
    if (!result.etag) throw new Error('ETAG_MISSING');
    return result.etag;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: file,
    signal,
  });

  if (!response.ok) {
    throw new Error('UPLOAD_FAILED');
  }

  const etag = response.headers.get('ETag') ?? response.headers.get('Etag');
  if (!etag) {
    throw new Error('ETAG_MISSING');
  }

  return etag;
}

export async function uploadChunkToPresignedUrl(
  url: string,
  method: string,
  headers: Record<string, string> | undefined,
  chunk: Blob,
  signal?: AbortSignal,
) {
  if (window.electronS3) {
    const buffer = await chunk.arrayBuffer();
    const result = await electronS3Put(url, method || 'PUT', headers ?? {}, buffer, signal);
    if (result.status < 200 || result.status >= 300) throw new Error('UPLOAD_FAILED');
    if (!result.etag) throw new Error('ETAG_MISSING');
    return result.etag;
  }

  // CapacitorHttp (enabled in capacitor.config.ts) patches fetch for all non-GET requests.
  // Its convertBody() path for Uint8Array runs new TextDecoder().decode() on the raw bytes,
  // which corrupts binary data by replacing invalid UTF-8 sequences with U+FFFD (3 bytes each).
  // The only path that correctly preserves binary is body instanceof File: readFileAsBase64 →
  // native Base64.decode → raw bytes to S3. Wrap the chunk in a File on native to use that path.
  const contentTypeHeader = headers?.['Content-Type'] ?? headers?.['content-type'] ?? 'application/octet-stream';
  const fetchBody: File | Blob = Capacitor.isNativePlatform()
    ? new File([chunk], 'chunk', { type: contentTypeHeader })
    : chunk;

  const response = await fetch(url, { method: method || 'PUT', headers, body: fetchBody as BodyInit, signal });

  if (!response.ok) {
    throw new Error('UPLOAD_FAILED');
  }

  const etag = response.headers.get('ETag') ?? response.headers.get('Etag');
  if (!etag) {
    throw new Error('ETAG_MISSING');
  }

  return etag;
}
