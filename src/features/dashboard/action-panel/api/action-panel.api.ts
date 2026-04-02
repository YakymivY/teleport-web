import { apiClient } from '../../../../api/apiClient';
import type { CompleteMultipartUploadParams } from '../types/CompleteMultipartUploadParams.ts';
import type { GetMultipartPartUrlParams } from '../types/GetMultipartPartUrlParams.ts';
import type { GetMultipartPartUrlResponse } from '../types/GetMultipartPartUrlResponse.ts';
import type { InitMultipartUploadParams } from '../types/InitMultipartUploadParams.ts';
import type { InitMultipartUploadResponse } from '../types/InitMultipartUploadResponse.ts';
import type { UploadSingleParams } from '../types/UploadSingleParams.ts';
import type { UploadSingleResponse } from '../types/UploadSingleResponse.ts';

export async function logout(endpoint: '/auth/logout' | '/auth/logout-all') {
  const response = await apiClient.post(endpoint, {});
  return response.data;
}

export async function requestUploadSingle(params: UploadSingleParams) {
  const response = await apiClient.get<UploadSingleResponse>('/files/upload/single', { params });
  return response.data;
}

export async function initMultipartUpload(params: InitMultipartUploadParams) {
  const response = await apiClient.get<InitMultipartUploadResponse>('/files/upload/multipart', {
    params,
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
  const response = await apiClient.post('/files/upload/multipart/complete', body);
  return response.data;
}

export async function confirmUpload(id: string, etag: string) {
  const response = await apiClient.post('/files/upload/confirm', { id, etag });
  return response.data;
}

export async function uploadFileToPresignedUrl(url: string, headers: Record<string, string>, file: File) {
  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: file,
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
) {
  const response = await fetch(url, {
    method: method || 'PUT',
    headers,
    body: chunk,
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
