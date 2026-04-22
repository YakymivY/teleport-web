import { useState } from 'react';
import { ActionPanel } from './action-panel/ActionPanel';
import { Workspace } from './workspace/Workspace';
import { DevicePanel } from './device-panel/DevicePanel';
import { useSocketConnection } from './hooks/useSocketConnection';
import './Dashboard.css';

export function Dashboard() {
  useSocketConnection();
  const [showDevices, setShowDevices] = useState(false);

  return (
    <div className={`dashboard-container${showDevices ? ' dashboard--show-devices' : ''}`}>
      <ActionPanel showDevices={showDevices} onToggleDevices={() => setShowDevices((v) => !v)} />
      <Workspace />
      <DevicePanel />
    </div>
  );
}