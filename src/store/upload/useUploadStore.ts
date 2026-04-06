import { create } from 'zustand';
import type { FileTransferResponse } from '../../features/dashboard/models/FileTransferResponse.ts';
import type { TransferStatus } from '../../features/dashboard/models/transfer-status.enum.ts';

interface UploadStoreState {
  currentFile: FileTransferResponse | null;
  setCurrentFile: (file: FileTransferResponse) => void;
  setCurrentFileStatus: (status: TransferStatus) => void;
  clearCurrentFile: () => void;
}

export const useUploadStore = create<UploadStoreState>((set) => ({
  currentFile: null,
  setCurrentFile: (file) => set({ currentFile: file }),
  setCurrentFileStatus: (status) =>
    set((state) => ({
      currentFile: state.currentFile ? { ...state.currentFile, status } : state.currentFile,
    })),
  clearCurrentFile: () => set({ currentFile: null }),
}));
