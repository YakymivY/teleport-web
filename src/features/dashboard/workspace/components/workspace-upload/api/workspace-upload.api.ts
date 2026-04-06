import { apiClient } from '../../../../../../api/apiClient';
import type { FileTransferResponse } from '../../../../models/FileTransferResponse.ts';
import type { DeleteFileRequest } from '../types/DeleteFileRequest.ts';

export async function fetchSourceFileTransfers(): Promise<FileTransferResponse[]> {
  const response = await apiClient.get<FileTransferResponse[]>(
    '/files/file-transfers/source'
  );
  return response.data;
}

export async function deleteFileTransfer(params: DeleteFileRequest): Promise<void> {
  await apiClient.delete('/files', { params });
}

