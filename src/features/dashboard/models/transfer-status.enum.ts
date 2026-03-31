export const TransferStatus = {
  INITIALIZED: 'initialized',
  PENDING: 'pending',
  AVAILABLE: 'available',
  ABORTED: 'aborted',
} as const;

export type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];
