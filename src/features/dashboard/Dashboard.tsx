import { ActionPanel } from './action-panel/ActionPanel';
import { Workspace } from './workspace/Workspace';
import { DevicePanel } from './device-panel/DevicePanel';
import './Dashboard.css';

export function Dashboard() {
  return (
    <div className="dashboard-container">
      <ActionPanel />
      <Workspace />
      <DevicePanel />
    </div>
  );
}