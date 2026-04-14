import { type ChangeEvent, useRef } from "react";
import toast from 'react-hot-toast';
import { useUploadStore } from "../../../../../store/upload/useUploadStore";
import { TransferStatus } from "../../../models/transfer-status.enum";
import { MULTIPART_THRESHOLD_BYTES, PART_SIZE_BYTES } from "../../configs/file-size.config";
import { calculateTotalParts } from "../../../../../utils/fileUtils";
import { initMultipartUpload, getMultipartPartUrl, uploadChunkToPresignedUrl, completeMultipartUpload, requestUploadSingle, uploadFileToPresignedUrl, confirmUpload } from "../../api/action-panel.api";
import type { UploadedPart } from "../../types/UploadedPart";
import type { FileTransferResponse } from "../../../models/FileTransferResponse.ts";
import { Upload } from "lucide-react";
import './UploadButton.css';

export function UploadButton() {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const upsertCurrentFile = useUploadStore((state) => state.upsertCurrentFile);
  const updateCurrentFileStatus = useUploadStore((state) => state.updateCurrentFileStatus);
  const removeCurrentFile = useUploadStore((state) => state.removeCurrentFile);
  
  const openUploadFilePicker = () => uploadInputRef.current?.click();

  const handleUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';

    if (files.length === 0) {
      toast.error('No file selected.');
      return;
    }

    const nowIso = new Date().toISOString();

    // create temporary file transfers for each file
    const provisionals = files.map((file) => {
      const contentType = file.type || 'application/octet-stream';

      const provisional: FileTransferResponse = {
        id: `local-${file.name}-${file.lastModified}-${file.size}`, // temporary id
        sourceDeviceId: '',
        filename: file.name,
        mimeType: contentType,
        sizeBytes: file.size,
        status: TransferStatus.INITIALIZED,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      upsertCurrentFile(provisional);
      return { file, contentType, provisional };
    });

    const handlePresignUploadError = (error: unknown) => {
      if (error instanceof Error && error.message === 'ETAG_MISSING') {
        toast.error('Upload succeeded but ETag is missing.');
        return;
      }

      toast.error('Failed to upload file.');
    };

    try {
      // separate files into large and small
      const large = provisionals.filter((p) => p.file.size > MULTIPART_THRESHOLD_BYTES);
      const small = provisionals.filter((p) => p.file.size <= MULTIPART_THRESHOLD_BYTES);

      // process small files first
      if (small.length > 0) {
        for (const p of small) updateCurrentFileStatus(p.provisional.id, TransferStatus.PENDING);

        // init (presign): server allocates transfer ids for each file
        const presigned = await requestUploadSingle({
          files: small.map((p) => ({
            filename: p.file.name,
            contentType: p.contentType,
            sizeBytes: p.file.size,
          })),
        });

        if (presigned.length !== small.length) {
          throw new Error('UPLOAD_INIT_FAILED');
        }

        const batch = small.map((p, idx) => {
          const presign = presigned[idx];
          // replace local provisional ids with server ids.
          removeCurrentFile(p.provisional.id);
          upsertCurrentFile({ ...p.provisional, id: presign.id, status: TransferStatus.PENDING });
          return { file: p.file, transferId: presign.id, url: presign.url, headers: presign.headers };
        });

        // PUT uploads: run concurrently; if any fails, the whole batch is aborted
        const uploadTasks = batch.map((b) => async () => {
          const etag = await uploadFileToPresignedUrl(b.url, b.headers, b.file);
          return { id: b.transferId, etag };
        });

        // upload files concurrently
        let uploaded: Array<{ id: string; etag: string }> = [];
        try {
          uploaded = await Promise.all(uploadTasks.map((t) => t()));
        } catch (error) {
          for (const b of batch) updateCurrentFileStatus(b.transferId, TransferStatus.ABORTED);
          handlePresignUploadError(error);
          throw error;
        }

        try {
          // confirm: on failure assume none of the batch becomes available
          const completedTransfers = await confirmUpload({ files: uploaded });
          for (const transfer of completedTransfers) upsertCurrentFile(transfer);
        } catch (error) {
          for (const b of batch) updateCurrentFileStatus(b.transferId, TransferStatus.ABORTED);
          throw error;
        }
      }

      // process large files
      for (const p of large) {
        updateCurrentFileStatus(p.provisional.id, TransferStatus.PENDING);

        try {
          const totalParts = calculateTotalParts(p.file.size, PART_SIZE_BYTES);
          const { s3UploadId, id: fileTransferId } = await initMultipartUpload({
            filename: p.file.name,
            contentType: p.contentType,
            sizeBytes: p.file.size,
            totalParts,
          });

          // upload parts concurrently
          const uploadedParts: UploadedPart[] = [];
          for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
            const start = (partNumber - 1) * PART_SIZE_BYTES;
            const end = Math.min(start + PART_SIZE_BYTES, p.file.size);
            const chunk = p.file.slice(start, end);

            const { method, url, headers } = await getMultipartPartUrl({
              fileTransferId,
              s3UploadId,
              partNumber,
            });

            let etag = '';
            try {
              etag = await uploadChunkToPresignedUrl(url, method ?? 'PUT', headers, chunk);
            } catch (error) {
              handlePresignUploadError(error);
              throw error;
            }

            uploadedParts.push({ partNumber, etag });
          }

          // complete multipart upload
          const completedTransfer = await completeMultipartUpload({
            fileTransferId,
            s3UploadId,
            parts: uploadedParts,
          });

          upsertCurrentFile(completedTransfer);
          removeCurrentFile(p.provisional.id);
        } catch (error) {
          updateCurrentFileStatus(p.provisional.id, TransferStatus.ABORTED);
          toast.error(error instanceof Error ? error.message : 'Failed to upload file.');
        }
      }

      toast.success('Upload finished.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file.');
    }
  };

  return (
    <>
      <input ref={uploadInputRef} type="file" multiple onChange={handleUploadChange} hidden />
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