import { TransferStatus } from '../../../../models/transfer-status.enum.ts';

export function getStatusClass(status: TransferStatus): string {
  switch (status) {
    case TransferStatus.AVAILABLE:
      return 'workspace-upload-file-status-fill--available';
    case TransferStatus.ABORTED:
      return 'workspace-upload-file-status-fill--aborted';
    case TransferStatus.INTERRUPTED:
      return 'workspace-upload-file-status-fill--interrupted';
    case TransferStatus.PENDING:
      return 'workspace-upload-file-status-fill--pending';
    case TransferStatus.INITIALIZED:
    default:
      return 'workspace-upload-file-status-fill--initialized';
  }
}
