import { TransferStatus } from '../../../../models/transfer-status.enum';
import { PART_SIZE_BYTES } from '../../../configs/file-size.config';
import { calculateTotalParts } from '../../../../../../utils/fileUtils';
import {
  initMultipartUpload,
  getMultipartPartUrl,
  uploadChunkToPresignedUrl,
  completeMultipartUpload,
} from '../../../api/action-panel.api';
import type { UploadedPart } from '../../../types/UploadedPart';
import type { Provisional } from '../types/Provisional';
import type { StoreActions } from '../types/StoreActions';
import { handlePresignUploadError } from './handlePresignUploadError';
import { getUploadCheckpoint, removeUploadCheckpoint, saveUploadCheckpoint } from './uploadCheckpoint';

export async function uploadLargeFile(p: Provisional, actions: StoreActions): Promise<void> {
  const { upsertCurrentFile, updateCurrentFileStatus, removeCurrentFile } = actions;

  // mark file as actively uploading
  updateCurrentFileStatus(p.provisional.id, TransferStatus.PENDING);

  // restore persisted multipart state (if any) using deterministic file key
  const totalParts = calculateTotalParts(p.file.size, PART_SIZE_BYTES);
  const uploadKey = `upload_${p.file.size}_${p.file.name}`;
  const checkpoint = getUploadCheckpoint(uploadKey);

  let s3UploadId = checkpoint?.s3UploadId ?? '';
  let fileTransferId = checkpoint?.fileTransferId ?? '';
  const uploadedParts: UploadedPart[] = [...(checkpoint?.uploadedParts ?? [])];
  const uploadedPartNumbers = new Set(uploadedParts.map((part) => part.partNumber));

  // start new multipart session only when resume data is missing
  if (!checkpoint) {
    const initResponse = await initMultipartUpload({
      filename: p.file.name,
      contentType: p.contentType,
      sizeBytes: p.file.size,
      totalParts,
    });

    s3UploadId = initResponse.s3UploadId;
    fileTransferId = initResponse.id;

    saveUploadCheckpoint(uploadKey, {
      s3UploadId,
      fileTransferId,
      uploadedParts,
    });
  }

  // upload only missing parts, skipping those already confirmed
  for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
    if (uploadedPartNumbers.has(partNumber)) {
      continue;
    }

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
    uploadedPartNumbers.add(partNumber);

    // persist progress right after each successful part upload
    saveUploadCheckpoint(uploadKey, {
      s3UploadId,
      fileTransferId,
      uploadedParts,
    });
  }

  // finalize multipart upload with all collected part etags
  const completedTransfer = await completeMultipartUpload({
    fileTransferId,
    s3UploadId,
    parts: uploadedParts,
  });

  // cleanup persisted checkpoint and replace provisional entry
  removeUploadCheckpoint(uploadKey);
  upsertCurrentFile(completedTransfer);
  removeCurrentFile(p.provisional.id);
}
