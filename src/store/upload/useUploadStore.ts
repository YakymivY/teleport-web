import { create } from 'zustand';
import type { FileTransferResponse } from '../../features/dashboard/models/FileTransferResponse.ts';
import type { TransferStatus } from '../../features/dashboard/models/transfer-status.enum.ts';

interface UploadStoreState {
  currentFiles: FileTransferResponse[];
  fileRefs: Record<string, File>;
  upsertCurrentFile: (file: FileTransferResponse) => void;
  updateCurrentFileStatus: (id: string, status: TransferStatus) => void;
  removeCurrentFile: (id: string) => void;
  setFileRef: (id: string, file: File) => void;
  removeFileRef: (id: string) => void;
}

export const useUploadStore = create<UploadStoreState>((set) => ({
  currentFiles: [],
  fileRefs: {},
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
  setFileRef: (id, file) =>
    set((state) => ({
      fileRefs: { ...state.fileRefs, [id]: file },
    })),
  removeFileRef: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.fileRefs;
      return { fileRefs: rest };
    }),
}));
