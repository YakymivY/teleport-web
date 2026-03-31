import { create } from 'zustand';
import type { UploadFileMetadata } from './types/UploadFileMetadata';
import type { TransferStatus } from '../../features/dashboard/models/transfer-status.enum.ts';

interface UploadStoreState {
  currentFile: UploadFileMetadata | null;
  setCurrentFile: (file: UploadFileMetadata) => void;
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
