import { UploadButton } from './components/upload-button/UploadButton';
import { LogoutButton } from './components/logout-button/LogoutButton';
import { TrafficButton } from './components/traffice-button/TrafficButton';
import './ActionPanel.css';

export function ActionPanel() {

  return (
    <div className="action-panel-container">
      <UploadButton />
      <TrafficButton />
      <LogoutButton />
    </div>
  );
}
