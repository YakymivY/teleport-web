import { Download, File, Trash } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Tooltip } from '../../../../../ui/Tooltip';
import type { FileTransferResponse } from '../../../models/FileTransferResponse.ts';
import { deleteFileTransfer, downloadFileTransfer, fetchDestinationFileTransfers } from './api/workspace-download.api';
import { useFileAvailableEvent } from './hooks/useFileAvailableEvent';
import { useFileDeletedEvent } from '../../hooks/useFileDeletedEvent';
import type { DeleteFileRequest } from './types/DeleteFileRequest';
import { WorkspaceUploadFileDetailModal } from '../workspace-upload/WorkspaceUploadFileDetailModal';
import './WorkspaceDownload.css';

export function WorkspaceDownload() {
  const [transfers, setTransfers] = useState<FileTransferResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingTransferId, setDownloadingTransferId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedTransferIds, setDownloadedTransferIds] = useState<Set<string>>(() => new Set());
  const [deletingTransferId, setDeletingTransferId] = useState<string | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<FileTransferResponse | null>(null);

  const handleFileAvailable = useCallback((file: FileTransferResponse) => {
    setTransfers((prev) => [file, ...prev]);
  }, []);

  useFileAvailableEvent(handleFileAvailable);

  const handleFileDeleted = useCallback((id: string) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useFileDeletedEvent(handleFileDeleted);

  const handleDownload = async (transfer: FileTransferResponse) => {
    setDownloadingTransferId(transfer.id);
    setDownloadProgress(0);
    try {
      const ok = await downloadFileTransfer({
        fileTransferId: transfer.id,
        fallbackFilename: transfer.filename,
        fallbackTotalBytes: transfer.sizeBytes,
        onProgress: setDownloadProgress,
      });
      if (!ok) {
        toast.error('File is not available (maybe already downloaded).');
        return;
      }
      setDownloadedTransferIds((prev) => {
        const next = new Set(prev);
        next.add(transfer.id);
        return next;
      });
    } catch {
      toast.error('Failed to start download.');
    } finally {
      setDownloadingTransferId((prev) => (prev === transfer.id ? null : prev));
    }
  };

  const pendingTransfers = transfers.filter((t) => !downloadedTransferIds.has(t.id));

  const handleDownloadAll = async () => {
    for (const transfer of pendingTransfers) {
      await handleDownload(transfer);
    }
  };

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

  return (
    <section className="workspace-section workspace-section--download">
      <span className="workspace-download-title" aria-hidden="true">DOWNLOAD</span>
      <div className="workspace-section__content workspace-download-content">
        {loading ? <i className="workspace-download-state">Loading…</i> : null}

        <div className="workspace-download-list">
          {transfers.map((transfer) => (
            <div key={transfer.id} className="workspace-download-file" onClick={() => setSelectedTransfer(transfer)}>
              <div className="workspace-download-file-preview" aria-hidden="true">
                <File size={50} />
              </div>
              <div className="workspace-download-file-actions">
                {downloadedTransferIds.has(transfer.id) ? (
                  <div className="workspace-download-file-progress" aria-hidden="true">
                    <div className="workspace-download-file-progress-fill workspace-download-file-progress-fill--downloaded" />
                  </div>
                ) : downloadingTransferId === transfer.id ? (
                  <div className="workspace-download-file-progress" aria-hidden="true">
                    <div
                      className="workspace-download-file-progress-fill"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                ) : (
                  <>
                    <button
                      className="workspace-download-file-action"
                      type="button"
                      aria-label="Download file"
                      onClick={(e) => { e.stopPropagation(); void handleDownload(transfer); }}
                      disabled={deletingTransferId === transfer.id || downloadingTransferId === transfer.id}
                    >
                      <Download size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      className="workspace-download-file-action"
                      type="button"
                      aria-label="Delete file transfer"
                      onClick={(e) => { e.stopPropagation(); void handleDeleteTransfer(transfer.id); }}
                      disabled={downloadingTransferId === transfer.id || deletingTransferId === transfer.id}
                    >
                      <Trash size={14} strokeWidth={2.5} />
                    </button>
                  </>
                )}
              </div>
              <Tooltip content={transfer.filename} side="bottom" delayDuration={1000}>
                <div className="workspace-download-file-name">{transfer.filename}</div>
              </Tooltip>
            </div>
          ))}
        </div>
      </div>

      <div className="workspace-download-footer">
        <button
          className="workspace-download-all-btn"
          type="button"
          onClick={() => void handleDownloadAll()}
          disabled={pendingTransfers.length === 0 || downloadingTransferId !== null}
        >
          <Download size={13} strokeWidth={2.5} />
          Download all
        </button>
      </div>

      <WorkspaceUploadFileDetailModal
        transfer={selectedTransfer}
        onClose={() => setSelectedTransfer(null)}
      />
    </section>
  );
}
