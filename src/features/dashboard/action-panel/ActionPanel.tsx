import { type ChangeEvent, useRef, useState } from 'react';
import { LogOut, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../ui/Modal';
import { confirmUpload, logout, requestUploadSingle, uploadFileToPresignedUrl } from './api/action-panel.api';
import { useUploadStore } from '../../../store/upload/useUploadStore';
import './ActionPanel.css';

export function ActionPanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const logoutButtonRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const setCurrentFile = useUploadStore((state) => state.setCurrentFile);

  const cleanupAndRedirect = () => {
    localStorage.removeItem('token');
    setIsModalOpen(false);
    navigate('/login', { replace: true });
  };

  const handleLogout = async (endpoint: '/auth/logout' | '/auth/logout-all') => {
    try {
      await logout(endpoint);
    } catch {
      cleanupAndRedirect();
      return;
    }

    cleanupAndRedirect();
  };

  const logoutCurrentSession = () => void handleLogout('/auth/logout');
  const logoutAllSessions = () => void handleLogout('/auth/logout-all');
  const openUploadFilePicker = () => uploadInputRef.current?.click();

  const handleUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    // get the file from the event
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      toast.error('No file selected.');
      return;
    }

    // persist the file in the store
    setCurrentFile({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      lastModified: file.lastModified,
    });

    try {
      // request the upload single url
      const { url, id, headers } = await requestUploadSingle({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });

      // upload the file to the presigned url
      let etag = '';
      try {
        etag = await uploadFileToPresignedUrl(url, headers, file);
      } catch (error) {
        if (error instanceof Error && error.message === 'ETAG_MISSING') {
          toast.error('Upload succeeded but ETag is missing.');
          return;
        }

        toast.error('Failed to upload file.');
        return;
      }

      // confirm the upload
      await confirmUpload(id, etag);
      toast.success('File uploaded successfully.');
    } catch {
      toast.error('Failed to upload file.');
    }
  };

  return (
    <div className="action-panel-container">
      <input ref={uploadInputRef} type="file" onChange={handleUploadChange} hidden />
      <button
        className="action-panel-button"
        type="button"
        aria-label="Upload file"
        onClick={openUploadFilePicker}
      >
        <Upload
          className="action-panel-button-icon"
          size={20}
          strokeWidth={2.3}
          absoluteStrokeWidth
          aria-hidden="true"
        />
      </button>
      <button className="action-panel-button"></button>
      <button ref={logoutButtonRef} className="action-panel-button" onClick={() => setIsModalOpen(true)}>
        <LogOut
          className="action-panel-button-icon"
          size={20}
          strokeWidth={2.3}
          absoluteStrokeWidth
          aria-hidden="true"
        />
      </button>
      <Modal anchorRef={logoutButtonRef} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="action-panel-modal-buttons">
          <button
            className="action-panel-button action-panel-modal-button action-panel-modal-button--primary"
            type="button"
            onClick={logoutCurrentSession}
          >
            <span className="action-panel-button-letter">log out</span>
          </button>
          <button
            className="action-panel-button action-panel-modal-button action-panel-modal-button--secondary"
            type="button"
            onClick={logoutAllSessions}
          >
            <span className="action-panel-button-letter">log out everywhere</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
