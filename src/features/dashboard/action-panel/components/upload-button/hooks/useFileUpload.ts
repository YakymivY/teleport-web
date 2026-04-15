import { type ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { useUploadStore } from '../../../../../../store/upload/useUploadStore';
import { TransferStatus } from '../../../../models/transfer-status.enum';
import { MULTIPART_THRESHOLD_BYTES } from '../../../configs/file-size.config';
import type { StoreActions } from '../types/StoreActions';
import type { Provisional } from '../types/Provisional';
import { createProvisionalTransfer } from '../utils/createProvisionalTransfer';
import { uploadSmallBatch } from '../utils/uploadSmallBatch';
import { uploadLargeFile } from '../utils/uploadLargeFile';

export function useFileUpload() {
  const upsertCurrentFile = useUploadStore((state) => state.upsertCurrentFile);
  const updateCurrentFileStatus = useUploadStore((state) => state.updateCurrentFileStatus);
  const removeCurrentFile = useUploadStore((state) => state.removeCurrentFile);

  const actions: StoreActions = { upsertCurrentFile, updateCurrentFileStatus, removeCurrentFile };

  const handleUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';

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
  };

  return { handleUploadChange };
}
