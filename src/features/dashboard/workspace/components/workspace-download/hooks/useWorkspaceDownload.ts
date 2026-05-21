import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { TransferStatus } from '../../../../models/transfer-status.enum';
import type { FileTransferResponse } from '../../../../models/FileTransferResponse';
import {
  fetchDestinationFileTransfers,
  deleteFileTransfer,
  downloadFileTransfer,
  removeOPFSEntry,
  removeCapacitorPartialFile,
  removeElectronPartialFile,
} from '../api/workspace-download.api';
import { useDownloadStore } from '../../../../../../store/download/useDownloadStore';
import { useFileAvailableEvent } from './useFileAvailableEvent';
import { useFileDeletedEvent } from '../../../hooks/useFileDeletedEvent';
import { getInterruptedDownloadCheckpoints } from '../utils/getInterruptedDownloadCheckpoints';
import {
  getDownloadCheckpoint,
  removeDownloadCheckpoint,
  CHECKPOINT_KEY_PREFIX,
} from '../utils/downloadCheckpoint';

const INTERRUPTED_ID_PREFIX = `interrupted-${CHECKPOINT_KEY_PREFIX}`;

function getRealFileTransferId(transferId: string): string {
  if (transferId.startsWith(INTERRUPTED_ID_PREFIX)) {
    return transferId.slice(INTERRUPTED_ID_PREFIX.length);
  }
  return transferId;
}

export function useWorkspaceDownload() {
  const [transfers, setTransfers] = useState<FileTransferResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingTransferId, setDownloadingTransferId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedTransferIds, setDownloadedTransferIds] = useState<Set<string>>(() => new Set());
  const [deletingTransferId, setDeletingTransferId] = useState<string | null>(null);
  const downloadControllerRef = useRef<AbortController | null>(null);

  const currentFiles = useDownloadStore((state) => state.currentFiles);
  const upsertCurrentFile = useDownloadStore((state) => state.upsertCurrentFile);
  const updateCurrentFileStatus = useDownloadStore((state) => state.updateCurrentFileStatus);
  const removeCurrentFile = useDownloadStore((state) => state.removeCurrentFile);

  // real fileTransferIds currently tracked in the store
  const storeRealIds = useMemo(
    () => new Set(currentFiles.map((f) => getRealFileTransferId(f.id))),
    [currentFiles],
  );

  // exclude server-fetched entries already represented by any store entry
  const dedupedServerTransfers = useMemo(
    () => transfers.filter((t) => !storeRealIds.has(t.id)),
    [transfers, storeRealIds],
  );

  // store entries always lead the list, server entries not yet in the store follow
  const visibleTransfers = useMemo(
    () => [...currentFiles, ...dedupedServerTransfers],
    [currentFiles, dedupedServerTransfers],
  );

  // hydrate interrupted checkpoints from localStorage on mount
  useEffect(() => {
    const { currentFiles: stored, upsertCurrentFile: upsert } = useDownloadStore.getState();
    for (const entry of getInterruptedDownloadCheckpoints()) {
      const alreadyTracked = stored.some(
        (f) => getRealFileTransferId(f.id) === getRealFileTransferId(entry.id),
      );
      if (!alreadyTracked) upsert(entry);
    }
  }, []);

  // load transfers from the server on mount
  useEffect(() => {
    let cancelled = false;

    const loadTransfers = async () => {
      setLoading(true);
      try {
        const data = await fetchDestinationFileTransfers();
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

  // handle file available event from the ws server
  const handleFileAvailable = useCallback((file: FileTransferResponse) => {
    setTransfers((prev) => [file, ...prev]);
  }, []);

  useFileAvailableEvent(handleFileAvailable);

  // handle file deleted event from the ws server
  const handleFileDeleted = useCallback((id: string) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id));
    removeDownloadCheckpoint(`${CHECKPOINT_KEY_PREFIX}${id}`);
    removeCurrentFile(`${INTERRUPTED_ID_PREFIX}${id}`);
    void removeOPFSEntry(id);
    void removeCapacitorPartialFile(id);
    void removeElectronPartialFile(id);
  }, [removeCurrentFile]);

  useFileDeletedEvent(handleFileDeleted);

  // download a file
  const runDownload = useCallback(
    async (transfer: FileTransferResponse) => {
      const storeId = transfer.id;
      const fileTransferId = getRealFileTransferId(storeId);

      // show initial progress from checkpoint so the bar doesn't jump from 0
      const checkpoint = getDownloadCheckpoint(`${CHECKPOINT_KEY_PREFIX}${fileTransferId}`);
      const initialProgress = checkpoint && transfer.sizeBytes > 0
        ? Math.floor((checkpoint.downloadedBytes / transfer.sizeBytes) * 100)
        : 0;

      const controller = new AbortController();
      downloadControllerRef.current = controller;

      setDownloadingTransferId(storeId);
      setDownloadProgress(initialProgress);
      upsertCurrentFile({ ...transfer, status: TransferStatus.PENDING });

      try {
        const ok = await downloadFileTransfer({
          fileTransferId,
          fallbackFilename: transfer.filename,
          fallbackTotalBytes: transfer.sizeBytes,
          onProgress: setDownloadProgress,
          signal: controller.signal,
        });

        if (!ok) {
          toast.error('File is not available (maybe already downloaded).');
          removeCurrentFile(storeId);
          return;
        }

        removeCurrentFile(storeId);
        setTransfers((prev) => prev.filter((t) => t.id !== fileTransferId));
        setDownloadedTransferIds((prev) => new Set([...prev, storeId]));
        toast.success(`Downloaded ${transfer.filename}`);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          removeCurrentFile(storeId);
          return;
        }
        if ((err as { code?: string }).code === 'DOWNLOAD_IN_PROGRESS') {
          removeCurrentFile(storeId);
          return;
        }
        updateCurrentFileStatus(storeId, TransferStatus.INTERRUPTED);
        toast.error('Download interrupted. You can resume it later.');
      } finally {
        downloadControllerRef.current = null;
        setDownloadingTransferId((prev) => (prev === storeId ? null : prev));
      }
    },
    [upsertCurrentFile, removeCurrentFile, updateCurrentFileStatus],
  );

  const handleCancelDownload = useCallback(() => {
    downloadControllerRef.current?.abort();
  }, []);

  // download all files
  const handleDownloadAll = useCallback(async () => {
    const pending = visibleTransfers.filter((t) => !downloadedTransferIds.has(t.id));
    for (const transfer of pending) {
      await runDownload(transfer);
    }
  }, [visibleTransfers, downloadedTransferIds, runDownload]);

  // delete a file
  const handleDeleteTransfer = useCallback(
    async (transfer: FileTransferResponse) => {
      const fileTransferId = getRealFileTransferId(transfer.id);
      setDeletingTransferId(transfer.id);
      try {
        await deleteFileTransfer({ fileTransferId });
        setTransfers((prev) => prev.filter((t) => t.id !== fileTransferId));
        removeCurrentFile(transfer.id);
        removeDownloadCheckpoint(`${CHECKPOINT_KEY_PREFIX}${fileTransferId}`);
        await removeOPFSEntry(fileTransferId);
        await removeCapacitorPartialFile(fileTransferId);
        await removeElectronPartialFile(fileTransferId);
      } catch {
        toast.error('Failed to delete file transfer.');
      } finally {
        setDeletingTransferId((prev) => (prev === transfer.id ? null : prev));
      }
    },
    [removeCurrentFile],
  );

  return {
    visibleTransfers,
    loading,
    downloadingTransferId,
    downloadProgress,
    downloadedTransferIds,
    deletingTransferId,
    handleDownload: runDownload,
    handleResumeDownload: runDownload,
    handleCancelDownload,
    handleDownloadAll,
    handleDeleteTransfer,
  };
}
