export interface DownloadCheckpoint {
  fileTransferId: string;
  filename: string;
  sizeBytes: number;
  downloadedBytes: number;
}
