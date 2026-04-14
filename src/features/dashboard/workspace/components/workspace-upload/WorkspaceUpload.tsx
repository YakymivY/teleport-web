import { File, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Tooltip } from '../../../../../ui/Tooltip';
import { TransferStatus } from '../../../models/transfer-status.enum.ts';
import type { FileTransferResponse } from '../../../models/FileTransferResponse.ts';
import { deleteFileTransfer, fetchSourceFileTransfers } from './api/workspace-upload.api';
import { useUploadStore } from '../../../../../store/upload/useUploadStore';
import type { DeleteFileRequest } from './types/DeleteFileRequest';
import './WorkspaceUpload.css';

function getStatusClass(status: TransferStatus): string {
  switch (status) {
    case TransferStatus.AVAILABLE:
      return 'workspace-upload-file-status-fill--available';
    case TransferStatus.ABORTED:
      return 'workspace-upload-file-status-fill--aborted';
    case TransferStatus.PENDING:
      return 'workspace-upload-file-status-fill--pending';
    case TransferStatus.INITIALIZED:
    default:
      return 'workspace-upload-file-status-fill--initialized';
  }
}

export function WorkspaceUpload() {
  const [transfers, setTransfers] = useState<FileTransferResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingTransferId, setDeletingTransferId] = useState<string | null>(null);
  const currentFiles = useUploadStore((state) => state.currentFiles);
  const removeCurrentFile = useUploadStore((state) => state.removeCurrentFile);

  // adding persisted file to the list of transfers
  const visibleTransfers =
    currentFiles.length > 0
      ? [...currentFiles, ...transfers.filter((t) => !currentFiles.some((c) => c.id === t.id))]
      : transfers;

  const handleDeleteTransfer = async (fileTransferId: string) => {
    const params: DeleteFileRequest = { fileTransferId };
    setDeletingTransferId(fileTransferId);
    try {
      await deleteFileTransfer(params);
      setTransfers((prev) => prev.filter((t) => t.id !== fileTransferId));
    } catch {
      toast.error('Failed to delete file transfer.');
    } finally {
      setDeletingTransferId((prev) => (prev === fileTransferId ? null : prev));
    }
  };

  // loading the transfers from the server
  useEffect(() => {
    let cancelled = false;

    const loadTransfers = async () => {
      setLoading(true);

      try {
        // fetch the transfers from the server
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

  // adding current files to the list of transfers
  useEffect(() => {
    const available = currentFiles.filter((f) => f.status === TransferStatus.AVAILABLE);
    if (available.length === 0) return;

    // add available files to the list of transfers
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

  return (
    <section className="workspace-section workspace-section--upload">
      <div className="workspace-section__content workspace-upload-content">
        {loading ? <i className="workspace-upload-state">Loading…</i> : null}

        <div className="workspace-upload-list">
          {visibleTransfers.map((transfer) => {
            const statusClass = getStatusClass(transfer.status);
            const canDelete = !transfer.id.startsWith('local-');
            const isDeleting = deletingTransferId === transfer.id;

            return (
              <div
                key={transfer.id}
                className={`workspace-upload-file ${isDeleting ? 'workspace-upload-file--deleting' : ''}`}
              >
                {isDeleting ? (
                  <div className="workspace-upload-file-deleting-overlay" aria-hidden="true" />
                ) : null}
                {canDelete ? (
                  <button
                    className="workspace-upload-file-cancel"
                    type="button"
                    aria-label="Delete file transfer"
                    onClick={() => handleDeleteTransfer(transfer.id)}
                    disabled={isDeleting}
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                ) : null}
                <div className="workspace-upload-file-preview" aria-hidden="true">
                  <File size={50} />
                </div>
                <div className="workspace-upload-file-status" aria-hidden="true">
                  <div className={`workspace-upload-file-status-fill ${statusClass}`} />
                </div>
                <Tooltip content={transfer.filename} side="bottom" delayDuration={1000}>
                  <div className="workspace-upload-file-name">{transfer.filename}</div>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
