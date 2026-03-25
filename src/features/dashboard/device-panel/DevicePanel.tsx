import { Pen, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { Device } from './types/types';
import { AddButton } from './components/add-button/AddButton';
import { deleteDevice, fetchDevices, renameDevice } from './api/device-panel.api';
import './DevicePanel.css';

export function DevicePanel() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteLoadingDeviceId, setDeleteLoadingDeviceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDevices = async () => {
      setLoading(true);
      setError(null);

      try {
        const devices = await fetchDevices();
        if (cancelled) return;
        setDevices(devices);
      } catch {
        if (cancelled) return;
        setError('Failed to load devices.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDevices();

    return () => {
      cancelled = true;
    };
  }, []);

  const startEditing = (device: Device) => {
    setEditingDeviceId(device.id);
    setEditingName(device.name);
  };

  const handleRename = async () => {
    if (!editingDeviceId) return;

    const nextName = editingName.trim();
    if (!nextName) {
      toast.error('Device name cannot be empty.');
      return;
    }

    setRenameLoading(true);
    setError(null);

    try {
      const renamedDevice = await renameDevice({ id: editingDeviceId, name: nextName });
      setDevices((prev) =>
        prev.map((device) => (device.id === renamedDevice.id ? renamedDevice : device))
      );
      setEditingDeviceId(null);
      setEditingName('');
      toast.success('Device renamed successfully.');
    } catch {
      toast.error('Failed to rename device.');
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDelete = async (deviceId: string) => {
    setDeleteLoadingDeviceId(deviceId);

    try {
      await deleteDevice({ id: deviceId });
      setDevices((prev) => prev.filter((device) => device.id !== deviceId));

      if (editingDeviceId === deviceId) {
        setEditingDeviceId(null);
        setEditingName('');
      }
      toast.success('Device deleted successfully.');
    } catch {
      toast.error('Failed to delete device.');
    } finally {
      setDeleteLoadingDeviceId(null);
    }
  };

  return (
    <div className="device-panel-container">
      <div className="device-panel-title">your devices</div>
      {loading ? <div className="device-panel-state"><i>Loading…</i></div> : null}
      {error ? <div className="device-panel-state"><i>{error}</i></div> : null}
      <div className="device-panel-list">
        {devices.map((device) => {
          const isEditing = editingDeviceId === device.id;

          return (
            <div key={device.id} className="device-panel-device">
              {isEditing ? (
                <>
                  <input
                    className="device-panel-rename-input"
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditingDeviceId(null);
                    }}
                  />
                  <button
                    className="device-panel-rename-action-button"
                    type="button"
                    onClick={() => {
                      void handleRename();
                    }}
                    disabled={renameLoading}
                  >
                    {renameLoading ? 'renaming…' : 'rename'}
                  </button>
                </>
              ) : (
                <>
                  <div className="device-panel-device-name">{device.name}</div>
                  <div className="device-panel-actions">
                    <button
                      className="device-panel-rename-button"
                      type="button"
                      aria-label={`Rename ${device.name}`}
                      onClick={() => startEditing(device)}
                    >
                      <Pen size={18} />
                    </button>
                    <button
                      className="device-panel-delete-button"
                      type="button"
                      aria-label={`Delete ${device.name}`}
                      aria-busy={deleteLoadingDeviceId === device.id}
                      disabled={deleteLoadingDeviceId === device.id}
                      onClick={() => {
                        void handleDelete(device.id);
                      }}
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        <AddButton />
      </div>
    </div>
  );
}