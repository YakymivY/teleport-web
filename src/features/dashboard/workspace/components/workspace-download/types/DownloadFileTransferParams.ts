export type DownloadFileTransferParams = {
  fileTransferId: string;
  fallbackFilename?: string;
  fallbackTotalBytes?: number;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
};
