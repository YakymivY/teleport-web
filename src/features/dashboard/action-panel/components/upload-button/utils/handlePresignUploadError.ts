import toast from 'react-hot-toast';

export function handlePresignUploadError(error: unknown): void {
  if (error instanceof Error && error.message === 'ETAG_MISSING') {
    toast.error('Upload succeeded but ETag is missing.');
    return;
  }
  toast.error('Failed to upload file.');
}
