import { File, X } from 'lucide-react';
import { Tooltip } from '../../../../../ui/Tooltip';
import { getStatusClass } from './utils/getStatusClass';
import { useWorkspaceUpload } from './hooks/useWorkspaceUpload';
import './WorkspaceUpload.css';

export function WorkspaceUpload() {
  const { visibleTransfers, loading, deletingTransferId, handleDeleteTransfer } =
    useWorkspaceUpload();

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
                    onClick={() => void handleDeleteTransfer(transfer.id)}
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
