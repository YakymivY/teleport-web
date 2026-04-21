import { ArrowRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSelectedDeviceStore } from '../../../store/device/useSelectedDeviceStore';
import type { Device } from './types/types';
import type { UserDeviceDto } from './types/types';
import { AddButton } from './components/add-button/AddButton';
import { DeleteButton } from './components/delete-button/DeleteButton';
import { RenameButton } from './components/rename-button/RenameButton';
import { fetchDevices } from './api/device-panel.api';
import { useDeviceConnectedEvent } from './hooks/useDeviceConnectedEvent';
import { useDeviceDisconnectedEvent } from './hooks/useDeviceDisconnectedEvent';
import './DevicePanel.css';

export function DevicePanel() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedDeviceId = useSelectedDeviceStore((state) => state.selectedDeviceId);
  const setSelectedDeviceId = useSelectedDeviceStore((state) => state.setSelectedDeviceId);

  useEffect(() => {
    let cancelled = false;

    const loadDevices = async () => {
      setLoading(true);
      setError(null);

      try {
        const devices = await fetchDevices();
        if (cancelled) return;
        setDevices(devices);
        const currentSelectedDeviceId = useSelectedDeviceStore.getState().selectedDeviceId;
        if (!currentSelectedDeviceId && devices[0]) {
          useSelectedDeviceStore.getState().setSelectedDeviceId(devices[0].id);
        }
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

  const handleDeviceConnected = useCallback((dto: UserDeviceDto) => {
    const device: Device = {
      id: dto.id,
      name: dto.name,
      createdAt: new Date(dto.createdAt),
      lastSeenAt: dto.lastSeenAt ? new Date(dto.lastSeenAt) : null,
    };
    setDevices((prev) => {
      if (prev.some((d) => d.id === device.id)) return prev;
      const next = [...prev, device];
      if (next.length === 1) setSelectedDeviceId(device.id);
      return next;
    });
  }, []);

  useDeviceConnectedEvent(handleDeviceConnected);

  const handleDeviceDisconnected = useCallback((id: string) => {
    setDevices((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (selectedDeviceId === id) setSelectedDeviceId(next[0]?.id ?? null);
      return next;
    });
  }, [selectedDeviceId, setSelectedDeviceId]);

  useDeviceDisconnectedEvent(handleDeviceDisconnected);

  const handleRenamed = (renamedDevice: Device) => {
    setDevices((prev) =>
      prev.map((device) => (device.id === renamedDevice.id ? renamedDevice : device))
    );
  };

  const handleDeleted = (deviceId: string) => {
    setDevices((prev) => {
      const nextDevices = prev.filter((device) => device.id !== deviceId);
      if (selectedDeviceId === deviceId) {
        setSelectedDeviceId(nextDevices[0]?.id ?? null);
      }
      return nextDevices;
    });
  };

  return (
    <div className="device-panel-container">
      <div className="device-panel-title">your devices</div>
      {loading ? <div className="device-panel-state"><i>Loading…</i></div> : null}
      {error ? <div className="device-panel-state"><i>{error}</i></div> : null}
      {!loading && !error && devices.length === 0 ? (
        <div className="device-panel-state"><i>No devices connected.</i></div>
      ) : null}
      <div className="device-panel-list">
        {devices.map((device) => {
          const isActive = selectedDeviceId === device.id;

          return (
            <div
              key={device.id}
              className={`device-panel-device${isActive ? ' device-panel-device--active' : ''}`}
              onClick={() => setSelectedDeviceId(device.id)}
              role="button"
              tabIndex={0}
            >
              <div className="device-panel-device-indicator" aria-hidden="true">
                {isActive ? <ArrowRight size={18} /> : null}
              </div>
              <RenameButton device={device} onRenamed={handleRenamed}>
                <DeleteButton
                  deviceId={device.id}
                  deviceName={device.name}
                  onDeleted={handleDeleted}
                />
              </RenameButton>
            </div>
          );
        })}
        <AddButton />
      </div>
    </div>
  );
}