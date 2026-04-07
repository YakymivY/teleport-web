import { apiClient } from '../../../../../../api/apiClient';
import type { FileTransferResponse } from '../../../../models/FileTransferResponse.ts';

export async function fetchDestinationFileTransfers(): Promise<FileTransferResponse[]> {
  const response = await apiClient.get<FileTransferResponse[]>('/files/file-transfers/destination');
  return response.data;
}

