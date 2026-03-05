import { useRef, useState } from 'react';
import plusIcon from '../../../assets/plus-icon.png';
import { Modal } from '../../../ui/Modal';
import './ActionPanel.css';

export function ActionPanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const plusButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="action-panel-container">
      <button
        ref={plusButtonRef}
        className="action-panel-button"
        onClick={() => setIsModalOpen(true)}
      >
        <img src={plusIcon} alt="plus" className="action-panel-button-icon" />
      </button>
      <button className="action-panel-button"></button>
      <button className="action-panel-button">
        <span className="action-panel-button-letter">L</span>
      </button>
      <Modal anchorRef={plusButtonRef} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        Modal content
      </Modal>
    </div>
  );
}
