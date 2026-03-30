import { apiClient } from '../../../../../../api/apiClient';
import type { FileTransferResponse } from '../types/FileTransferResponse';

export async function fetchSourceFileTransfers(): Promise<FileTransferResponse[]> {
  const response = await apiClient.get<FileTransferResponse[]>(
    '/files/file-transfers/source'
  );
  return response.data;
}

