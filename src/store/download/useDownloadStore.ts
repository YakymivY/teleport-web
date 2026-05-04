import { create } from 'zustand';
import type { FileTransferResponse } from '../../features/dashboard/models/FileTransferResponse.ts';
import type { TransferStatus } from '../../features/dashboard/models/transfer-status.enum.ts';

interface DownloadStoreState {
  currentFiles: FileTransferResponse[];
  upsertCurrentFile: (file: FileTransferResponse) => void;
  updateCurrentFileStatus: (id: string, status: TransferStatus) => void;
  removeCurrentFile: (id: string) => void;
}

export const useDownloadStore = create<DownloadStoreState>((set) => ({
  currentFiles: [],
  upsertCurrentFile: (file) =>
    set((state) => ({
      currentFiles: [file, ...state.currentFiles.filter((f) => f.id !== file.id)],
    })),
  updateCurrentFileStatus: (id, status) =>
    set((state) => ({
      currentFiles: state.currentFiles.map((f) => (f.id === id ? { ...f, status } : f)),
    })),
  removeCurrentFile: (id) =>
    set((state) => ({
      currentFiles: state.currentFiles.filter((f) => f.id !== id),
    })),
}));
