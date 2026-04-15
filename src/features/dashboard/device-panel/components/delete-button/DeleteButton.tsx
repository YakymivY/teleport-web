import { Trash } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { deleteDevice } from '../../api/device-panel.api';
import './DeleteButton.css';

interface Props {
  deviceId: string;
  deviceName: string;
  onDeleted: (deviceId: string) => void;
}

export function DeleteButton({ deviceId, deviceName, onDeleted }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await deleteDevice({ id: deviceId });
      onDeleted(deviceId);
      toast.success('Device removed successfully.');
    } catch {
      toast.error('Failed to remove device.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className="device-panel-delete-button"
      type="button"
      aria-label={`Delete ${deviceName}`}
      aria-busy={isLoading}
      disabled={isLoading}
      onClick={(e) => {
        e.stopPropagation();
        void handleClick();
      }}
    >
      <Trash size={18} />
    </button>
  );
}
