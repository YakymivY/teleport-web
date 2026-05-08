import { Download, File, RotateCcw, Trash, X } from 'lucide-react';
import { useState } from 'react';
import { Tooltip } from '../../../../../ui/Tooltip';
import { TransferStatus } from '../../../models/transfer-status.enum';
import type { FileTransferResponse } from '../../../models/FileTransferResponse.ts';
import { WorkspaceUploadFileDetailModal } from '../workspace-upload/WorkspaceUploadFileDetailModal';
import { useWorkspaceDownload } from './hooks/useWorkspaceDownload';
import './WorkspaceDownload.css';

export function WorkspaceDownload() {
  const {
    visibleTransfers,
    loading,
    downloadingTransferId,
    downloadProgress,
    downloadedTransferIds,
    deletingTransferId,
    handleDownload,
    handleResumeDownload,
    handleDownloadAll,
    handleDeleteTransfer,
  } = useWorkspaceDownload();

  const [selectedTransfer, setSelectedTransfer] = useState<FileTransferResponse | null>(null);

  const pendingTransfers = visibleTransfers.filter(
    (t) => !downloadedTransferIds.has(t.id) && t.status !== TransferStatus.INTERRUPTED,
  );

  return (
    <section className="workspace-section workspace-section--download">
      <span className="workspace-download-title" aria-hidden="true">DOWNLOAD</span>
      <div className="workspace-section__content workspace-download-content">
        {loading ? <i className="workspace-download-state">Loading…</i> : null}

        <div className="workspace-download-list">
          {visibleTransfers.map((transfer) => {
            const isInterrupted = transfer.status === TransferStatus.INTERRUPTED;
            const isDownloading = downloadingTransferId === transfer.id;
            const isDownloaded = downloadedTransferIds.has(transfer.id);
            const isDeleting = deletingTransferId === transfer.id;

            return (
              <div
                key={transfer.id}
                className="workspace-download-file"
                onClick={() => setSelectedTransfer(transfer)}
              >
                {isInterrupted ? (
                  <>
                    <button
                      className="workspace-download-file-dismiss"
                      type="button"
                      aria-label="Dismiss download"
                      onClick={(e) => { e.stopPropagation(); void handleDeleteTransfer(transfer); }}
                      disabled={isDeleting}
                    >
                      <X size={14} strokeWidth={3} />
                    </button>
                    <button
                      className="workspace-download-file-resume"
                      type="button"
                      aria-label="Resume download"
                      onClick={(e) => { e.stopPropagation(); void handleResumeDownload(transfer); }}
                      disabled={isDownloading}
                    >
                      <RotateCcw size={14} strokeWidth={2.5} />
                    </button>
                  </>
                ) : null}

                <div className="workspace-download-file-preview" aria-hidden="true">
                  <File size={50} />
                </div>

                <div className="workspace-download-file-actions">
                  {isDownloaded ? (
                    <div className="workspace-download-file-progress" aria-hidden="true">
                      <div className="workspace-download-file-progress-fill workspace-download-file-progress-fill--downloaded" />
                    </div>
                  ) : isDownloading ? (
                    <div className="workspace-download-file-progress" aria-hidden="true">
                      <div
                        className="workspace-download-file-progress-fill"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  ) : isInterrupted ? (
                    <div className="workspace-download-file-progress" aria-hidden="true">
                      <div className="workspace-download-file-progress-fill workspace-download-file-progress-fill--interrupted" />
                    </div>
                  ) : (
                    <>
                      <button
                        className="workspace-download-file-action"
                        type="button"
                        aria-label="Download file"
                        onClick={(e) => { e.stopPropagation(); void handleDownload(transfer); }}
                        disabled={isDeleting || downloadingTransferId !== null}
                      >
                        <Download size={14} strokeWidth={2.5} />
                      </button>
                      <button
                        className="workspace-download-file-action"
                        type="button"
                        aria-label="Delete file transfer"
                        onClick={(e) => { e.stopPropagation(); void handleDeleteTransfer(transfer); }}
                        disabled={downloadingTransferId !== null || isDeleting}
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
            );
          })}
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
