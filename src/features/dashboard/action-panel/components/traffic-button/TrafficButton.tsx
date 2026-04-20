import { useRef, useState } from 'react';
import { ChartNoAxesColumn, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../../../../../ui/Modal';
import { getUserTraffic } from '../../api/action-panel.api';
import type { UserTrafficResponse } from '../../types/UserTrafficResponse';
import './TrafficButton.css';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function TrafficButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [traffic, setTraffic] = useState<UserTrafficResponse | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleClick = async () => {
    try {
      const data = await getUserTraffic();
      setTraffic(data);
      setIsModalOpen(true);
    } catch {
      toast.error('Failed to load traffic data.');
    }
  };

  return (
    <>
      <button ref={buttonRef} className="action-panel-button" onClick={() => void handleClick()}>
        <ChartNoAxesColumn
          className="action-panel-button-icon"
          size={20}
          strokeWidth={2.3}
          absoluteStrokeWidth
          aria-hidden="true"
        />
      </button>
      <Modal anchorRef={buttonRef} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {traffic && (
          <div className="traffic-modal">
            <p className="traffic-modal-title">Traffic usage</p>
            <div className="traffic-modal-grid">
              <div className="traffic-card">
                <Upload className="traffic-card-icon traffic-card-icon--upload" size={16} strokeWidth={2.3} absoluteStrokeWidth aria-hidden="true" />
                <span className="traffic-card-value">{formatBytes(traffic.uploadedBytes)}</span>
                <span className="traffic-card-label">Uploaded</span>
              </div>
              <div className="traffic-card">
                <Download className="traffic-card-icon traffic-card-icon--download" size={16} strokeWidth={2.3} absoluteStrokeWidth aria-hidden="true" />
                <span className="traffic-card-value">{formatBytes(traffic.downloadedBytes)}</span>
                <span className="traffic-card-label">Downloaded</span>
              </div>
              <div className="traffic-card">
                <Upload className="traffic-card-icon traffic-card-icon--upload" size={16} strokeWidth={2.3} absoluteStrokeWidth aria-hidden="true" />
                <span className="traffic-card-value">{traffic.uploadedFiles}</span>
                <span className="traffic-card-label">Files uploaded</span>
              </div>
              <div className="traffic-card">
                <Download className="traffic-card-icon traffic-card-icon--download" size={16} strokeWidth={2.3} absoluteStrokeWidth aria-hidden="true" />
                <span className="traffic-card-value">{traffic.downloadedFiles}</span>
                <span className="traffic-card-label">Files downloaded</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
