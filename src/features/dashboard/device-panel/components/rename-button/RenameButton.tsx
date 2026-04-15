import { Pen } from 'lucide-react';
import { type ReactNode, useState } from 'react';
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

  const startEditing = () => {
    setIsEditing(true);
    setEditingName(device.name);
  };

  const handleRename = async () => {
    const nextName = editingName.trim();
    if (!nextName) {
      toast.error('Device name cannot be empty.');
      return;
    }

    setIsLoading(true);
    try {
      const renamedDevice = await renameDevice({ id: device.id, name: nextName });
      onRenamed(renamedDevice);
      setIsEditing(false);
      setEditingName('');
      toast.success('Device renamed successfully.');
    } catch {
      toast.error('Failed to rename device.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing) {
    return (
      <>
        <input
          className="device-panel-rename-input"
          type="text"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsEditing(false);
          }}
        />
        <button
          className="device-panel-rename-action-button"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void handleRename();
          }}
          disabled={isLoading}
        >
          {isLoading ? 'renaming…' : 'rename'}
        </button>
      </>
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
