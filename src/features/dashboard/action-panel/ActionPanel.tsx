import { UploadButton } from './components/upload-button/UploadButton';
import { LogoutButton } from './components/logout-button/LogoutButton';
import { TrafficButton } from './components/traffic-button/TrafficButton';
import { DeviceButton } from './components/device-button/DeviceButton';
import './ActionPanel.css';

interface ActionPanelProps {
  showDevices: boolean;
  onToggleDevices: () => void;
}

export function ActionPanel({ showDevices, onToggleDevices }: ActionPanelProps) {
  return (
    <div className="action-panel-container">
      <div className="action-panel-buttons">
        <UploadButton />
        <TrafficButton />
        <LogoutButton />
      </div>
      <DeviceButton showDevices={showDevices} onClick={onToggleDevices} />
    </div>
  );
}
