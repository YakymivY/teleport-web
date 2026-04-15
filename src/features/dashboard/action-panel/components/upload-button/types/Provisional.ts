import type { FileTransferResponse } from '../../../../models/FileTransferResponse';

export interface Provisional {
  file: File;
  contentType: string;
  provisional: FileTransferResponse;
}
