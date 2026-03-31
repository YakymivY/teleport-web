import { create } from 'zustand';
import type { UploadFileMetadata } from './types/UploadFileMetadata';

interface UploadStoreState {
  currentFile: UploadFileMetadata | null;
  setCurrentFile: (file: UploadFileMetadata) => void;
  clearCurrentFile: () => void;
}

export const useUploadStore = create<UploadStoreState>((set) => ({
  currentFile: null,
  setCurrentFile: (file) => set({ currentFile: file }),
  clearCurrentFile: () => set({ currentFile: null }),
}));
