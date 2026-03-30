import './WorkspaceUpload.css';

import { File } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { FileTransferResponse } from './types/FileTransferResponse.ts';
import { fetchSourceFileTransfers } from './api/workspace-upload.api';

export function WorkspaceUpload() {
  const [transfers, setTransfers] = useState<FileTransferResponse[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <section className="workspace-section workspace-section--upload">
      <div className="workspace-section__content workspace-upload-content">
        {loading ? <i className="workspace-upload-state">Loading…</i> : null}

        <div className="workspace-upload-list">
          {transfers.map((transfer) => (
            <div
              key={transfer.id}
              className="workspace-upload-file"
            >
              <div className="workspace-upload-file-preview" aria-hidden="true">
                <File size={28} />
              </div>
              <div className="workspace-upload-file-name">{transfer.filename}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
