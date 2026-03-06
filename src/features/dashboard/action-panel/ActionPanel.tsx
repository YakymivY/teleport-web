import axios from 'axios';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../ui/Modal';
import plusIcon from '../../../assets/plus-icon.png';
import './ActionPanel.css';

export function ActionPanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const logoutButtonRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const handleLogout = async () => {
    const token = localStorage.getItem('token');

    const cleanupAndRedirect = () => {
      localStorage.removeItem('token');
      setIsModalOpen(false);
      navigate('/login', { replace: true });
    };

    // Best-effort server logout: even if this fails, we still clear local auth and redirect.
    try {
      await axios.post(
        `${API_URL}/auth/logout`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
    } catch {
      cleanupAndRedirect();
      return;
    }

    cleanupAndRedirect();
  };

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
          <button
            className="action-panel-button action-panel-modal-button action-panel-modal-button--primary"
            type="button"
            onClick={handleLogout}
          >
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
