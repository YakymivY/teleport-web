import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { useFileUpload } from './hooks/useFileUpload';
import './UploadButton.css';

export function UploadButton() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { handleUploadChange } = useFileUpload();

  return (
    <>
      <input ref={inputRef} type="file" multiple onChange={handleUploadChange} hidden />
      <button
        className="action-panel-button"
        type="button"
        aria-label="Upload file"
        onClick={() => inputRef.current?.click()}
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