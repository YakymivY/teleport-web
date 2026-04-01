import { File, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Tooltip } from '../../../../../ui/Tooltip';
import { TransferStatus } from '../../../models/transfer-status.enum.ts';
import type { FileTransferResponse } from './types/FileTransferResponse.ts';
import { fetchSourceFileTransfers } from './api/workspace-upload.api';
import { useUploadStore } from '../../../../../store/upload/useUploadStore';
import { mapUploadFileToTransfer } from './utils/mapUploadFileToTransfer';
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
  const currentFile = useUploadStore((state) => state.currentFile);

  // adding persisted file to the list of transfers
  const optimisticTransfer = currentFile ? mapUploadFileToTransfer(currentFile) : null;
  const visibleTransfers = optimisticTransfer ? [optimisticTransfer, ...transfers] : transfers;

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

  return (
    <section className="workspace-section workspace-section--upload">
      <div className="workspace-section__content workspace-upload-content">
        {loading ? <i className="workspace-upload-state">Loading…</i> : null}

        <div className="workspace-upload-list">
          {visibleTransfers.map((transfer) => {
            const statusClass = getStatusClass(transfer.status);

            return (
              <div
                key={transfer.id}
                className="workspace-upload-file"
              >
                <button
                  className="workspace-upload-file-cancel"
                  type="button"
                  aria-label="Cancel upload"
                >
                  <X size={14} strokeWidth={3} />
                </button>
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
