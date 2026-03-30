export interface FileTransferResponse {
  id: string;
  sourceDeviceId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: 'pending' | 'available';
  createdAt: string;
  updatedAt: string;
}
