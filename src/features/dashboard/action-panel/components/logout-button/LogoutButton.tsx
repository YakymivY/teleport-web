import { useRef, useState } from "react";
import { logout } from "../../api/action-panel.api";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Modal } from "../../../../../ui/Modal";
import './LogoutButton.css';

export function LogoutButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const logoutButtonRef = useRef<HTMLButtonElement | null>(null);

  const navigate = useNavigate();

  const cleanupAndRedirect = () => {
    localStorage.removeItem('token');
    setIsModalOpen(false);
    navigate('/login', { replace: true });
  };
  
  const logoutCurrentSession = () => void handleLogout('/auth/logout');
  const logoutAllSessions = () => void handleLogout('/auth/logout-all');

  const handleLogout = async (endpoint: '/auth/logout' | '/auth/logout-all') => {
    try {
      await logout(endpoint);
    } catch {
      cleanupAndRedirect();
      return;
    }

    cleanupAndRedirect();
  };
  
  return (
    <>
      <button ref={logoutButtonRef} className="action-panel-button" onClick={() => setIsModalOpen(true)}>
        <LogOut
          className="action-panel-button-icon"
          size={20}
          strokeWidth={2.3}
          absoluteStrokeWidth
          aria-hidden="true"
        />
      </button>
      <Modal anchorRef={logoutButtonRef} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="action-panel-modal-buttons">
          <button
            className="action-panel-button action-panel-modal-button action-panel-modal-button--primary"
            type="button"
            onClick={logoutCurrentSession}
          >
            <span className="action-panel-button-letter">log out</span>
          </button>
          <button
            className="action-panel-button action-panel-modal-button action-panel-modal-button--secondary"
            type="button"
            onClick={logoutAllSessions}
          >
            <span className="action-panel-button-letter">log out everywhere</span>
          </button>
        </div>
      </Modal>
    </>
  );
}