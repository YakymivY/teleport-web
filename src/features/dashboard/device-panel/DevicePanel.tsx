import axios from 'axios';
import { useEffect, useState } from 'react';
import type { Device } from './types/types';
import { AddButton } from './add-button/AddButton';
import './DevicePanel.css';

export function DevicePanel() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    let isMounted = true;

    const fetchDevices = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        const response = await axios.get<Device[]>(`${API_URL}/devices`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!isMounted) return;
        setDevices(response.data);
      } catch {
        if (!isMounted) return;
        setError('Failed to load devices.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDevices();

    return () => {
      isMounted = false;
    };
  }, [API_URL]);

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