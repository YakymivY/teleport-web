export const TransferStatus = {
  INITIALIZED: 'initialized',
  PENDING: 'pending',
  AVAILABLE: 'available',
  ABORTED: 'aborted',
  INTERRUPTED: 'interrupted',
} as const;

export type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];
