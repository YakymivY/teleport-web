import toast from 'react-hot-toast';
import { TransferStatus } from '../../../../models/transfer-status.enum';
import { MULTIPART_THRESHOLD_BYTES } from '../../../configs/file-size.config';
import type { Provisional } from '../types/Provisional';
import type { StoreActions } from '../types/StoreActions';
import { createProvisionalTransfer } from './createProvisionalTransfer';
import { uploadLargeFile } from './uploadLargeFile';
import { uploadSmallBatch } from './uploadSmallBatch';
import { useUploadStore } from '../../../../../../store/upload/useUploadStore';

export async function processUploads(files: File[], actions: StoreActions): Promise<void> {
  const { upsertCurrentFile, updateCurrentFileStatus, setFileRef, removeFileRef } = actions;

  if (files.length === 0) {
    toast.error('No file selected.');
    return;
  }

  // remove any interrupted cross-session tiles that match the files being re-uploaded
  const { currentFiles, removeCurrentFile: storeRemoveCurrentFile } = useUploadStore.getState();
  for (const file of files) {
    const interrupted = currentFiles.find(
      (f) => f.status === TransferStatus.INTERRUPTED && f.filename === file.name && f.sizeBytes === file.size,
    );
    if (interrupted) {
      storeRemoveCurrentFile(interrupted.id);
    }
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
      setFileRef(p.provisional.id, p.file);
      try {
        await uploadLargeFile(p, actions);
        removeFileRef(p.provisional.id);
      } catch (err) {
        updateCurrentFileStatus(p.provisional.id, TransferStatus.INTERRUPTED);
        toast.error('Upload interrupted. You can resume it later.');
      }
    }

    toast.success('Upload finished.');
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to upload file.');
  }
}

