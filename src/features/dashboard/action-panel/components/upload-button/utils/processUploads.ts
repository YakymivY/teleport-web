import toast from 'react-hot-toast';
import { TransferStatus } from '../../../../models/transfer-status.enum';
import { MULTIPART_THRESHOLD_BYTES } from '../../../configs/file-size.config';
import type { Provisional } from '../types/Provisional';
import type { StoreActions } from '../types/StoreActions';
import { createProvisionalTransfer } from './createProvisionalTransfer';
import { uploadLargeFile } from './uploadLargeFile';
import { uploadSmallBatch } from './uploadSmallBatch';

export async function processUploads(files: File[], actions: StoreActions): Promise<void> {
  const { upsertCurrentFile, updateCurrentFileStatus } = actions;

  if (files.length === 0) {
    toast.error('No file selected.');
    return;
  }

  const provisionals: Provisional[] = files.map((file) => {
    const contentType = file.type || 'application/octet-stream';
    const provisional = createProvisionalTransfer(file);
    upsertCurrentFile(provisional);
    return { file, contentType, provisional };
  });

  const large = provisionals.filter((p) => p.file.size > MULTIPART_THRESHOLD_BYTES);
  const small = provisionals.filter((p) => p.file.size <= MULTIPART_THRESHOLD_BYTES);

  try {
    if (small.length > 0) {
      await uploadSmallBatch(small, actions);
    }

    for (const p of large) {
      try {
        await uploadLargeFile(p, actions);
      } catch {
        updateCurrentFileStatus(p.provisional.id, TransferStatus.ABORTED);
        toast.error('Failed to upload file.');
      }
    }

    toast.success('Upload finished.');
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to upload file.');
  }
}

