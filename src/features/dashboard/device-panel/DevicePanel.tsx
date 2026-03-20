import { useEffect, useState } from 'react';
import type { Device } from './types/types';
import { AddButton } from './components/add-button/AddButton';
import { fetchDevices } from './api/device-panel.api';
import './DevicePanel.css';

export function DevicePanel() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="device-panel-container">
      <div className="device-panel-title">your devices</div>
      {loading ? <div className="device-panel-state"><i>Loading…</i></div> : null}
      {error ? <div className="device-panel-state"><i>{error}</i></div> : null}
      <div className="device-panel-list">
        {devices.map((device) => (
          <div key={device.id} className="device-panel-device">
            {device.name}
          </div>
        ))}
        <AddButton />
      </div>
    </div>
  );
}