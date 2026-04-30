import { useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadStore } from '../../../../../../store/upload/useUploadStore';
import type { StoreActions } from '../../../../action-panel/components/upload-button/types/StoreActions';
import { processUploads } from '../../../../action-panel/components/upload-button/utils/processUploads';

export function useWorkspaceDropzone() {
  const upsertCurrentFile = useUploadStore((state) => state.upsertCurrentFile);
  const updateCurrentFileStatus = useUploadStore((state) => state.updateCurrentFileStatus);
  const removeCurrentFile = useUploadStore((state) => state.removeCurrentFile);
  const setFileRef = useUploadStore((state) => state.setFileRef);
  const removeFileRef = useUploadStore((state) => state.removeFileRef);

  const actions: StoreActions = useMemo(
    () => ({ upsertCurrentFile, updateCurrentFileStatus, removeCurrentFile, setFileRef, removeFileRef }),
    [upsertCurrentFile, updateCurrentFileStatus, removeCurrentFile, setFileRef, removeFileRef],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      await processUploads(acceptedFiles, actions);
    },
    [actions],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: true,
    noKeyboard: true,
  });

  return { getRootProps, getInputProps, isDragActive };
}

