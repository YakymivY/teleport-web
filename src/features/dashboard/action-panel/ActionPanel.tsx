import { useRef, useState } from 'react';
import { Modal } from '../../../ui/Modal';
import plusIcon from '../../../assets/plus-icon.png';
import './ActionPanel.css';

export function ActionPanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const logoutButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="action-panel-container">
      <button className="action-panel-button">
        <img src={plusIcon} alt="plus" className="action-panel-button-icon" />
      </button>
      <button className="action-panel-button"></button>
      <button ref={logoutButtonRef} className="action-panel-button" onClick={() => setIsModalOpen(true)}>
        <span className="action-panel-button-letter">L</span>
      </button>
      <Modal anchorRef={logoutButtonRef} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="action-panel-modal-buttons">
          <button className="action-panel-button action-panel-modal-button action-panel-modal-button--primary">
            <span className="action-panel-button-letter">log out</span>
          </button>
          <button className="action-panel-button action-panel-modal-button action-panel-modal-button--secondary">
            <span className="action-panel-button-letter">log out everywhere</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
