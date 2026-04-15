import { type ChangeEvent } from 'react';
import { useUploadStore } from '../../../../../../store/upload/useUploadStore';
import type { StoreActions } from '../types/StoreActions';
import { processUploads } from '../utils/processUploads';

export function useFileUpload() {
  const upsertCurrentFile = useUploadStore((state) => state.upsertCurrentFile);
  const updateCurrentFileStatus = useUploadStore((state) => state.updateCurrentFileStatus);
  const removeCurrentFile = useUploadStore((state) => state.removeCurrentFile);

  const actions: StoreActions = { upsertCurrentFile, updateCurrentFileStatus, removeCurrentFile };

  const handleUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    await processUploads(files, actions);
  };

  return { handleUploadChange };
}
