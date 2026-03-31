export const TransferStatus = {
  INITIALIZED: 'initialized',
  PENDING: 'pending',
  AVAILABLE: 'available',
} as const;

export type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];
