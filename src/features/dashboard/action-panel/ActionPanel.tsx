import { UploadButton } from './components/upload-button/UploadButton';
import './ActionPanel.css';
import { LogoutButton } from './components/logout-button/LogoutButton';

export function ActionPanel() {

  return (
    <div className="action-panel-container">
      <UploadButton />
      <button className="action-panel-button"></button>
      <LogoutButton />
    </div>
  );
}
