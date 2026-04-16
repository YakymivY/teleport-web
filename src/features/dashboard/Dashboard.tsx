import { ActionPanel } from './action-panel/ActionPanel';
import { Workspace } from './workspace/Workspace';
import { DevicePanel } from './device-panel/DevicePanel';
import { useSocketConnection } from './hooks/useSocketConnection';
import './Dashboard.css';

export function Dashboard() {
  useSocketConnection();

  return (
    <div className="dashboard-container">
      <ActionPanel />
      <Workspace />
      <DevicePanel />
    </div>
  );
}