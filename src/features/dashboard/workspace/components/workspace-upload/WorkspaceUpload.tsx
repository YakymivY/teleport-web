import { File, RotateCcw, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Tooltip } from '../../../../../ui/Tooltip';
import { TransferStatus } from '../../../models/transfer-status.enum';
import { getStatusClass } from './utils/getStatusClass';
import { useWorkspaceDropzone } from './hooks/useWorkspaceDropzone';
import { useWorkspaceUpload } from './hooks/useWorkspaceUpload';
import { WorkspaceUploadFileDetailModal } from './WorkspaceUploadFileDetailModal';
import type { FileTransferResponse } from '../../../models/FileTransferResponse';
import './WorkspaceUpload.css';

const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export function WorkspaceUpload() {
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const { visibleTransfers, loading, deletingTransferId, fileProgress, uploadControllers, handleDeleteTransfer, handleCancelUpload, handleResumeUpload, handleResumeFileChange } =
    useWorkspaceUpload();
  const { getRootProps, getInputProps, isDragActive } = useWorkspaceDropzone();
  const [selectedTransfer, setSelectedTransfer] = useState<FileTransferResponse | null>(null);

  return (
    <section
      {...(!isNativeAndroid
        ? getRootProps({ className: 'workspace-section workspace-section--upload' })
        : { className: 'workspace-section workspace-section--upload' })}
    >
      {!isNativeAndroid && <input {...getInputProps()} />}
      <input
        ref={resumeInputRef}
        type="file"
        hidden
        onChange={handleResumeFileChange}
      />
      <span className="workspace-upload-title" aria-hidden="true">UPLOAD</span>
      {isDragActive ? (
        <div className="workspace-upload-drag-overlay" aria-hidden="true">
          <div className="workspace-upload-drag-overlay__inner">Drop files to upload</div>
        </div>
      ) : null}
      <div className="workspace-section__content workspace-upload-content">
        {loading ? <i className="workspace-upload-state">Loading…</i> : null}

        <div className="workspace-upload-list">
          {visibleTransfers.map((transfer) => {
            const statusClass = getStatusClass(transfer.status);
            const isInterrupted = transfer.status === TransferStatus.INTERRUPTED;
            const isUploading = uploadControllers[transfer.id] != null;
            const canDelete = !isUploading && !transfer.id.startsWith('local-') && !transfer.id.startsWith('interrupted-');
            const isDeleting = deletingTransferId === transfer.id;

            const uploadPct = fileProgress[transfer.id];

            return (
              <div
                key={transfer.id}
                className={`workspace-upload-file ${isDeleting ? 'workspace-upload-file--deleting' : ''}`}
                onClick={() => setSelectedTransfer(transfer)}
              >
                {isDeleting ? (
                  <div className="workspace-upload-file-deleting-overlay" aria-hidden="true" />
                ) : null}
                {isInterrupted ? (
                  <button
                    className="workspace-upload-file-resume"
                    type="button"
                    aria-label="Resume upload"
                    onClick={(e) => { e.stopPropagation(); handleResumeUpload(transfer, resumeInputRef); }}
                  >
                    <RotateCcw size={14} strokeWidth={2.5} />
                  </button>
                ) : isUploading ? (
                  <button
                    className="workspace-upload-file-cancel"
                    type="button"
                    aria-label="Cancel upload"
                    onClick={(e) => { e.stopPropagation(); handleCancelUpload(transfer.id); }}
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                ) : canDelete ? (
                  <button
                    className="workspace-upload-file-cancel"
                    type="button"
                    aria-label="Delete file transfer"
                    onClick={(e) => { e.stopPropagation(); void handleDeleteTransfer(transfer.id); }}
                    disabled={isDeleting}
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                ) : null}
                <div className="workspace-upload-file-preview" aria-hidden="true">
                  <File size={50} />
                </div>
                <div className="workspace-upload-file-status" aria-hidden="true">
                  {uploadPct !== undefined ? (
                    <div className="workspace-upload-file-status-fill" style={{ width: `${uploadPct}%`, backgroundColor: '#0bb0ad' }} />
                  ) : (
                    <div className={`workspace-upload-file-status-fill ${statusClass}`} />
                  )}
                </div>
                <Tooltip content={transfer.filename} side="bottom" delayDuration={1000}>
                  <div className="workspace-upload-file-name">{transfer.filename}</div>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>

      <WorkspaceUploadFileDetailModal
        transfer={selectedTransfer}
        onClose={() => setSelectedTransfer(null)}
      />
    </section>
  );
}
