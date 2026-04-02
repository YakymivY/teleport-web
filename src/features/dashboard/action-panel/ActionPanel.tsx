import { type ChangeEvent, useRef, useState } from 'react';
import { LogOut, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../ui/Modal';
import { calculateTotalParts } from '../../../utils/fileUtils';
import {
  completeMultipartUpload,
  confirmUpload,
  getMultipartPartUrl,
  initMultipartUpload,
  logout,
  requestUploadSingle,
  uploadChunkToPresignedUrl,
  uploadFileToPresignedUrl,
} from './api/action-panel.api';
import { useUploadStore } from '../../../store/upload/useUploadStore';
import { TransferStatus } from '../models/transfer-status.enum.ts';
import type { UploadedPart } from './types/UploadedPart.ts';
import './ActionPanel.css';
import { MULTIPART_THRESHOLD_BYTES, PART_SIZE_BYTES } from './configs/file-size.config.ts';

export function ActionPanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const logoutButtonRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const setCurrentFile = useUploadStore((state) => state.setCurrentFile);
  const setCurrentFileStatus = useUploadStore((state) => state.setCurrentFileStatus);

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

    const contentType = file.type || 'application/octet-stream';

    // persist the file in the store
    setCurrentFile({
      name: file.name,
      type: contentType,
      size: file.size,
      lastModified: file.lastModified,
      status: TransferStatus.INITIALIZED,
    });

    const handlePresignUploadError = (error: unknown) => {
      if (error instanceof Error && error.message === 'ETAG_MISSING') {
        toast.error('Upload succeeded but ETag is missing.');
        return;
      }

      toast.error('Failed to upload file.');
    };

    try {
      if (file.size > MULTIPART_THRESHOLD_BYTES) {
        // request multipart upload init
        const totalParts = calculateTotalParts(file.size, PART_SIZE_BYTES);
        const { s3UploadId, id: fileTransferId } = await initMultipartUpload({
          filename: file.name,
          contentType,
          sizeBytes: file.size,
          totalParts,
        });

        // update the file status to pending
        setCurrentFileStatus(TransferStatus.PENDING);

        const uploadedParts: UploadedPart[] = [];
        for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
          const start = (partNumber - 1) * PART_SIZE_BYTES;
          const end = Math.min(start + PART_SIZE_BYTES, file.size);
          const chunk = file.slice(start, end);

          const { method, url } = await getMultipartPartUrl({
            fileTransferId,
            s3UploadId,
            partNumber,
          });

          // upload the part to the presigned url
          let etag = '';
          try {
            etag = await uploadChunkToPresignedUrl(url, method ?? 'PUT', undefined, chunk);
          } catch (error) {
            handlePresignUploadError(error);
            setCurrentFileStatus(TransferStatus.ABORTED);
            return;
          }

          uploadedParts.push({ partNumber, etag });
        }

        // confirm the multipart upload
        await completeMultipartUpload({
          fileTransferId,
          s3UploadId,
          parts: uploadedParts,
        });
      } else {
        // request the upload single url
        const { url, id, headers } = await requestUploadSingle({
          filename: file.name,
          contentType,
          sizeBytes: file.size,
        });

        // update the file status to pending
        setCurrentFileStatus(TransferStatus.PENDING);

        // upload the file to the presigned url
        let etag = '';
        try {
          etag = await uploadFileToPresignedUrl(url, headers, file);
        } catch (error) {
          handlePresignUploadError(error);
          setCurrentFileStatus(TransferStatus.ABORTED);
          return;
        }

        // confirm the upload
        await confirmUpload(id, etag);
      }

      // update the file status to available
      setCurrentFileStatus(TransferStatus.AVAILABLE);
      toast.success('File uploaded successfully.');
    } catch {
      setCurrentFileStatus(TransferStatus.ABORTED);
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
