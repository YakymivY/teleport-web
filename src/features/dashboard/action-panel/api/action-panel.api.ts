import { apiClient } from '../../../../api/apiClient';
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
