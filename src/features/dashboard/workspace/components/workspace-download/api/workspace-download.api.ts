import { apiClient } from '../../../../../../api/apiClient';
import type { FileTransferResponse } from '../../../../models/FileTransferResponse.ts';
import type { DownloadUrlParams } from '../types/DownloadUrlParams';
import type { DownloadUrlResponse } from '../types/DownloadUrlResponse';
import type { DeleteFileRequest } from '../types/DeleteFileRequest.ts';

export async function fetchDestinationFileTransfers(): Promise<FileTransferResponse[]> {
  const response = await apiClient.get<FileTransferResponse[]>('/files/file-transfers/destination');
  return response.data;
}

export async function fetchDownloadUrl(params: DownloadUrlParams): Promise<DownloadUrlResponse> {
  const response = await apiClient.get<DownloadUrlResponse>('/files/download', { params });
  return response.data;
}

export async function deleteFileTransfer(params: DeleteFileRequest): Promise<void> {
  await apiClient.delete('/files', { params });
}

