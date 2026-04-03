import { type ChangeEvent, useRef } from "react";
import toast from 'react-hot-toast';
import { useUploadStore } from "../../../../../store/upload/useUploadStore";
import { TransferStatus } from "../../../models/transfer-status.enum";
import { MULTIPART_THRESHOLD_BYTES, PART_SIZE_BYTES } from "../../configs/file-size.config";
import { calculateTotalParts } from "../../../../../utils/fileUtils";
import { initMultipartUpload, getMultipartPartUrl, uploadChunkToPresignedUrl, completeMultipartUpload, requestUploadSingle, uploadFileToPresignedUrl, confirmUpload } from "../../api/action-panel.api";
import type { UploadedPart } from "../../types/UploadedPart";
import { Upload } from "lucide-react";
import './UploadButton.css';


export function UploadButton() {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const setCurrentFile = useUploadStore((state) => state.setCurrentFile);
  const setCurrentFileStatus = useUploadStore((state) => state.setCurrentFileStatus);
  
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

          const { method, url, headers } = await getMultipartPartUrl({
            fileTransferId,
            s3UploadId,
            partNumber,
          });

          // upload the part to the presigned url
          let etag = '';
          try {
            etag = await uploadChunkToPresignedUrl(url, method ?? 'PUT', headers, chunk);
          } catch (error) {
            handlePresignUploadError(error);
            throw error;
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
          throw error;
        }

        // confirm the upload
        await confirmUpload(id, etag);
      }

      // update the file status to available
      setCurrentFileStatus(TransferStatus.AVAILABLE);
      toast.success('File uploaded successfully.');
    } catch (error) {
      setCurrentFileStatus(TransferStatus.ABORTED);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file.');
    }
  };

  return (
    <>
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
    </>
  );
}