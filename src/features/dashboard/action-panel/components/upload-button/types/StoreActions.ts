import type { FileTransferResponse } from '../../../../models/FileTransferResponse';
import type { TransferStatus } from '../../../../models/transfer-status.enum';

export interface StoreActions {
  upsertCurrentFile: (file: FileTransferResponse) => void;
  updateCurrentFileStatus: (id: string, status: TransferStatus) => void;
  removeCurrentFile: (id: string) => void;
  setFileRef: (id: string, file: File) => void;
  removeFileRef: (id: string) => void;
}
