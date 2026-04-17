import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { TransferStatus } from '../../../../models/transfer-status.enum.ts';
import type { FileTransferResponse } from '../../../../models/FileTransferResponse.ts';
import { deleteFileTransfer, fetchSourceFileTransfers } from '../api/workspace-upload.api';
import { useUploadStore } from '../../../../../../store/upload/useUploadStore';
import { useFileDeletedEvent } from '../../../hooks/useFileDeletedEvent';

export function useWorkspaceUpload() {
  const [transfers, setTransfers] = useState<FileTransferResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingTransferId, setDeletingTransferId] = useState<string | null>(null);
  const currentFiles = useUploadStore((state) => state.currentFiles);
  const removeCurrentFile = useUploadStore((state) => state.removeCurrentFile);

  const visibleTransfers =
    currentFiles.length > 0
      ? [...currentFiles, ...transfers.filter((t) => !currentFiles.some((c) => c.id === t.id))]
      : transfers;

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
  }, []);

  useFileDeletedEvent(handleFileDeleted);

  useEffect(() => {
    const available = currentFiles.filter((f) => f.status === TransferStatus.AVAILABLE);
    if (available.length === 0) return;

    setTransfers((prev) => {
      const next = [...prev];
      for (const file of available) {
        if (!next.some((t) => t.id === file.id)) {
          next.unshift(file);
        }
      }
      return next;
    });

    for (const file of available) {
      removeCurrentFile(file.id);
    }
  }, [currentFiles, removeCurrentFile]);

  return { visibleTransfers, loading, deletingTransferId, handleDeleteTransfer };
}
