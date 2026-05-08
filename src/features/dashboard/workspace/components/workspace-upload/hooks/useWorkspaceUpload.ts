import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import toast from 'react-hot-toast';
import { TransferStatus } from '../../../../models/transfer-status.enum.ts';
import type { FileTransferResponse } from '../../../../models/FileTransferResponse.ts';
import { deleteFileTransfer, fetchSourceFileTransfers } from '../api/workspace-upload.api';
import { useUploadStore } from '../../../../../../store/upload/useUploadStore';
import { useFileDeletedEvent } from '../../../hooks/useFileDeletedEvent';
import { getInterruptedCheckpoints } from '../../../../action-panel/components/upload-button/utils/getInterruptedCheckpoints';
import { getUploadCheckpoint, removeUploadCheckpoint } from '../../../../action-panel/components/upload-button/utils/uploadCheckpoint';
import { uploadLargeFile } from '../../../../action-panel/components/upload-button/utils/uploadLargeFile';
import { processUploads } from '../../../../action-panel/components/upload-button/utils/processUploads';
import type { StoreActions } from '../../../../action-panel/components/upload-button/types/StoreActions';
import { abortMultipartUpload } from '../../../../action-panel/api/action-panel.api';

export function useWorkspaceUpload() {
  const [transfers, setTransfers] = useState<FileTransferResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingTransferId, setDeletingTransferId] = useState<string | null>(null);

  const currentFiles = useUploadStore((state) => state.currentFiles);
  const fileRefs = useUploadStore((state) => state.fileRefs);
  const fileProgress = useUploadStore((state) => state.fileProgress);
  const uploadControllers = useUploadStore((state) => state.uploadControllers);
  const upsertCurrentFile = useUploadStore((state) => state.upsertCurrentFile);
  const updateCurrentFileStatus = useUploadStore((state) => state.updateCurrentFileStatus);
  const removeCurrentFile = useUploadStore((state) => state.removeCurrentFile);
  const setFileRef = useUploadStore((state) => state.setFileRef);
  const removeFileRef = useUploadStore((state) => state.removeFileRef);
  const setFileProgress = useUploadStore((state) => state.setFileProgress);
  const removeFileProgress = useUploadStore((state) => state.removeFileProgress);
  const setUploadController = useUploadStore((state) => state.setUploadController);
  const removeUploadController = useUploadStore((state) => state.removeUploadController);

  const actions: StoreActions = useMemo(
    () => ({ upsertCurrentFile, updateCurrentFileStatus, removeCurrentFile, setFileRef, removeFileRef }),
    [upsertCurrentFile, updateCurrentFileStatus, removeCurrentFile, setFileRef, removeFileRef],
  );

  const resumingTransferRef = useRef<FileTransferResponse | null>(null);

  // exclude server-fetched pending entries that are already represented by any active currentFiles entry
  const dedupedTransfers = transfers.filter(
    (t) =>
      !(
        t.status === TransferStatus.PENDING &&
        currentFiles.some((f) => f.filename === t.filename && f.sizeBytes === t.sizeBytes)
      ),
  );

  const visibleTransfers =
    currentFiles.length > 0
      ? [...currentFiles, ...dedupedTransfers.filter((t) => !currentFiles.some((c) => c.id === t.id))]
      : dedupedTransfers;

  const handleDeleteTransfer = async (fileTransferId: string) => {
    setDeletingTransferId(fileTransferId);
    try {
      await deleteFileTransfer({ fileTransferId });
      setTransfers((prev) => prev.filter((t) => t.id !== fileTransferId));
    } catch {
      toast.error('Failed to delete file transfer.');
    } finally {
      setDeletingTransferId((prev) => (prev === fileTransferId ? null : prev));
    }
  };

  // hydrate interrupted uploads from localStorage on mount
  useEffect(() => {
    const interrupted = getInterruptedCheckpoints();
    for (const entry of interrupted) {
      const alreadyTracked = useUploadStore
        .getState()
        .currentFiles.some((f) => f.filename === entry.filename && f.sizeBytes === entry.sizeBytes);
      if (!alreadyTracked) {
        upsertCurrentFile(entry);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTransfers = async () => {
      setLoading(true);
      try {
        const data = await fetchSourceFileTransfers();
        if (!cancelled) setTransfers(data);
      } catch {
        if (!cancelled) toast.error('Failed to load transferred files.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadTransfers();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileDeleted = useCallback((id: string) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id));
    removeUploadCheckpoint(`upload_${id}`);
    removeCurrentFile(`interrupted-upload_${id}`);
  }, [removeCurrentFile]);

  useFileDeletedEvent(handleFileDeleted);

  useEffect(() => {
    const available = currentFiles.filter((f) => f.status === TransferStatus.AVAILABLE);
    if (available.length === 0) return;

    setTransfers((prev) => {
      const next = [...prev];
      for (const file of available) {
        const existingIdx = next.findIndex((t) => t.id === file.id);
        if (existingIdx >= 0) {
          next[existingIdx] = file;
        } else {
          next.unshift(file);
        }
      }
      return next;
    });

    for (const file of available) {
      removeCurrentFile(file.id);
    }
  }, [currentFiles, removeCurrentFile]);

  const handleCancelUpload = useCallback((transferId: string) => {
    uploadControllers[transferId]?.abort();
  }, [uploadControllers]);

  const handleDismissInterruptedUpload = useCallback((transfer: FileTransferResponse) => {
    const uploadKey = transfer.id.startsWith('interrupted-')
      ? transfer.id.slice('interrupted-'.length)
      : fileRefs[transfer.id]
        ? `upload_${fileRefs[transfer.id].size}_${fileRefs[transfer.id].name}`
        : null;

    if (uploadKey) {
      const checkpoint = getUploadCheckpoint(uploadKey);
      if (checkpoint) {
        removeUploadCheckpoint(uploadKey);
        void abortMultipartUpload({ fileTransferId: checkpoint.fileTransferId, s3UploadId: checkpoint.s3UploadId });
        setTransfers((prev) => prev.filter((t) => t.id !== checkpoint.fileTransferId));
      }
    }

    removeFileRef(transfer.id);
    removeCurrentFile(transfer.id);
  }, [fileRefs, removeCurrentFile, removeFileRef]);

  const handleResumeUpload = useCallback(
    (transfer: FileTransferResponse, inputRef: RefObject<HTMLInputElement | null>) => {
      const cachedFile = fileRefs[transfer.id];

      if (cachedFile) {
        // in-session: File object is still in memory, resume directly
        const controller = new AbortController();
        setUploadController(transfer.id, controller);
        updateCurrentFileStatus(transfer.id, TransferStatus.PENDING);
        setFileProgress(transfer.id, 0);
        void uploadLargeFile(
          { file: cachedFile, contentType: cachedFile.type || 'application/octet-stream', provisional: transfer },
          actions,
          (pct) => setFileProgress(transfer.id, pct),
          controller.signal,
        )
          .then(() => {
            removeFileRef(transfer.id);
          })
          .catch((err) => {
            if (err instanceof DOMException && err.name === 'AbortError') {
              const uploadKey = `upload_${cachedFile.size}_${cachedFile.name}`;
              const checkpoint = getUploadCheckpoint(uploadKey);
              if (checkpoint) {
                removeUploadCheckpoint(uploadKey);
                void abortMultipartUpload({ fileTransferId: checkpoint.fileTransferId, s3UploadId: checkpoint.s3UploadId });
              }
              removeCurrentFile(transfer.id);
            } else {
              updateCurrentFileStatus(transfer.id, TransferStatus.INTERRUPTED);
              toast.error('Upload interrupted. You can resume it later.');
            }
          })
          .finally(() => {
            removeUploadController(transfer.id);
            removeFileProgress(transfer.id);
          });
      } else {
        // cross-session: File is gone, ask user to re-select it
        resumingTransferRef.current = transfer;
        inputRef.current?.click();
      }
    },
    [fileRefs, actions, updateCurrentFileStatus, removeFileRef, setFileProgress, removeFileProgress, setUploadController, removeUploadController],
  );

  const handleResumeFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !resumingTransferRef.current) return;

      const target = resumingTransferRef.current;

      if (file.name !== target.filename || file.size !== target.sizeBytes) {
        toast.error(`Please select the original file "${target.filename}" to resume the upload.`);
        return;
      }

      resumingTransferRef.current = null;
      await processUploads([file], actions);
    },
    [actions],
  );

  return {
    visibleTransfers,
    loading,
    deletingTransferId,
    fileProgress,
    uploadControllers,
    handleDeleteTransfer,
    handleCancelUpload,
    handleDismissInterruptedUpload,
    handleResumeUpload,
    handleResumeFileChange,
  };
}
