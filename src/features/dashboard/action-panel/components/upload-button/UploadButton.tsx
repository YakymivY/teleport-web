import { useRef } from 'react';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFileUpload } from './hooks/useFileUpload';
import { useSelectedDeviceStore } from '../../../../../store/device/useSelectedDeviceStore';
import './UploadButton.css';

export function UploadButton() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { handleUploadChange } = useFileUpload();
  const selectedDeviceId = useSelectedDeviceStore((s) => s.selectedDeviceId);

  function handleClick() {
    if (!selectedDeviceId) {
      toast.error('Select a destination device before uploading.');
      return;
    }
    inputRef.current?.click();
  }

  return (
    <>
      <input ref={inputRef} type="file" multiple onChange={handleUploadChange} hidden />
      <button
        className="action-panel-button"
        type="button"
        aria-label="Upload file"
        onClick={handleClick}
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