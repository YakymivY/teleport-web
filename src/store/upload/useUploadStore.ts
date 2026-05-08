import { create } from 'zustand';
import type { FileTransferResponse } from '../../features/dashboard/models/FileTransferResponse.ts';
import type { TransferStatus } from '../../features/dashboard/models/transfer-status.enum.ts';

interface UploadStoreState {
  currentFiles: FileTransferResponse[];
  fileRefs: Record<string, File>;
  fileProgress: Record<string, number>;
  uploadControllers: Record<string, AbortController>;
  upsertCurrentFile: (file: FileTransferResponse) => void;
  updateCurrentFileStatus: (id: string, status: TransferStatus) => void;
  removeCurrentFile: (id: string) => void;
  setFileRef: (id: string, file: File) => void;
  removeFileRef: (id: string) => void;
  setFileProgress: (id: string, pct: number) => void;
  removeFileProgress: (id: string) => void;
  setUploadController: (id: string, controller: AbortController) => void;
  removeUploadController: (id: string) => void;
}

export const useUploadStore = create<UploadStoreState>((set) => ({
  currentFiles: [],
  fileRefs: {},
  fileProgress: {},
  uploadControllers: {},
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
  setFileProgress: (id, pct) =>
    set((state) => ({ fileProgress: { ...state.fileProgress, [id]: pct } })),
  removeFileProgress: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.fileProgress;
      return { fileProgress: rest };
    }),
  setUploadController: (id, controller) =>
    set((state) => ({ uploadControllers: { ...state.uploadControllers, [id]: controller } })),
  removeUploadController: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.uploadControllers;
      return { uploadControllers: rest };
    }),
}));
