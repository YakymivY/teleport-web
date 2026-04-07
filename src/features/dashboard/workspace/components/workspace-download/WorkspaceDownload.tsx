import { Download, File, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Tooltip } from '../../../../../ui/Tooltip';
import type { FileTransferResponse } from '../../../models/FileTransferResponse.ts';
import { fetchDestinationFileTransfers, fetchDownloadUrl } from './api/workspace-download.api';
import './WorkspaceDownload.css';

export function WorkspaceDownload() {
  const [transfers, setTransfers] = useState<FileTransferResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingTransferId, setDownloadingTransferId] = useState<string | null>(null);

  const handleDownload = async (transfer: FileTransferResponse) => {
    setDownloadingTransferId(transfer.id);
    try {
      const { url } = await fetchDownloadUrl({ fileTransferId: transfer.id });
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = transfer.filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch {
      toast.error('Failed to start download.');
    } finally {
      setDownloadingTransferId((prev) => (prev === transfer.id ? null : prev));
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
      <div className="workspace-section__content workspace-download-content">
        {loading ? <i className="workspace-download-state">Loading…</i> : null}

        <div className="workspace-download-list">
          {transfers.map((transfer) => (
            <div key={transfer.id} className="workspace-download-file">
              <div className="workspace-download-file-preview" aria-hidden="true">
                <File size={50} />
              </div>
              <div className="workspace-download-file-actions">
                <button
                  className="workspace-download-file-action"
                  type="button"
                  aria-label="Download file"
                  onClick={() => void handleDownload(transfer)}
                  disabled={downloadingTransferId === transfer.id}
                >
                  <Download size={14} strokeWidth={2.5} />
                </button>
                <button className="workspace-download-file-action" type="button" aria-label="Delete file transfer">
                  <Trash size={14} strokeWidth={2.5} />
                </button>
              </div>
              <Tooltip content={transfer.filename} side="bottom" delayDuration={1000}>
                <div className="workspace-download-file-name">{transfer.filename}</div>
              </Tooltip>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
