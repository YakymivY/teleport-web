import { CenteredModal } from '../../../../../ui/CenteredModal';
import type { FileTransferResponse } from '../../../models/FileTransferResponse';
import { formatBytes } from '../../../../../utils/fileUtils';
import './WorkspaceUploadFileDetailModal.css';

type Props = {
  transfer: FileTransferResponse | null;
  onClose: () => void;
};

export function WorkspaceUploadFileDetailModal({ transfer, onClose }: Props) {
  if (!transfer) return null;

  const rows: [string, string][] = [
    ['Name', transfer.filename],
    ['Type', transfer.mimeType],
    ['Size', formatBytes(transfer.sizeBytes)],
    ['Source', transfer.sourceDeviceName],
    ['Destination', transfer.destinationDeviceName ?? '—'],
    ['Status', transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)],
    ['Created', new Date(transfer.createdAt).toLocaleString()],
  ];

  return (
    <CenteredModal isOpen onClose={onClose}>
      <div className="file-detail-modal">
        <p className="file-detail-modal__title">{transfer.filename}</p>
        <table className="file-detail-modal__table">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="file-detail-modal__row">
                <td className="file-detail-modal__label">{label}</td>
                <td className="file-detail-modal__value">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CenteredModal>
  );
}
