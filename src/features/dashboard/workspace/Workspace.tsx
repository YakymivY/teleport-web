import './Workspace.css';

import { WorkspaceDownload } from './components/workspace-download/WorkspaceDownload.tsx';
import { WorkspaceUpload } from './components/workspace-upload/WorkspaceUpload.tsx';

export function Workspace() {
  return (
    <div className="workspace-container">
      <WorkspaceUpload />
      <div className="workspace-divider" />
      <WorkspaceDownload />
    </div>
  );
}