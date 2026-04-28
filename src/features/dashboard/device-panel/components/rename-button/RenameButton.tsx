import { Pen } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { Device } from '../../types/types';
import { renameDevice } from '../../api/device-panel.api';
import './RenameButton.css';

interface Props {
  device: Device;
  onRenamed: (device: Device) => void;
  children: ReactNode;
}

export function RenameButton({ device, onRenamed, children }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const skipBlurCommitRef = useRef(false);
  const commitLockRef = useRef(false);

  const startEditing = () => {
    setIsEditing(true);
    setEditingName(device.name);
  };

  const exitEditing = () => {
    setIsEditing(false);
    setEditingName('');
  };

  const commitRename = async () => {
    if (commitLockRef.current) return;
    const nextName = editingName.trim();
    if (!nextName) {
      toast.error('Device name cannot be empty.');
      exitEditing();
      return;
    }
    if (nextName === device.name) {
      exitEditing();
      return;
    }

    commitLockRef.current = true;
    setIsLoading(true);
    try {
      const renamedDevice = await renameDevice({ id: device.id, name: nextName });
      onRenamed(renamedDevice);
      exitEditing();
      toast.success('Device renamed successfully.');
    } catch {
      toast.error('Failed to rename device.');
      exitEditing();
    } finally {
      setIsLoading(false);
      commitLockRef.current = false;
    }
  };

  if (isEditing) {
    return (
      <div className="device-panel-rename-editing-wrap">
        <input
          className="device-panel-rename-input"
          type="text"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          disabled={isLoading}
          onBlur={() => {
            if (skipBlurCommitRef.current) {
              skipBlurCommitRef.current = false;
              return;
            }
            void commitRename();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              skipBlurCommitRef.current = true;
              exitEditing();
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="device-panel-device-name">{device.name}</div>
      <div className="device-panel-actions">
        <button
          className="device-panel-rename-button"
          type="button"
          aria-label={`Rename ${device.name}`}
          onClick={(e) => {
            e.stopPropagation();
            startEditing();
          }}
        >
          <Pen size={18} />
        </button>
        {children}
      </div>
    </>
  );
}
