import { useRef, useState } from 'react';
import axios from 'axios';
import { Modal } from '../../../../ui/Modal';
import type { DevicePairingResponse } from '../types/types';
import './AddButton.css';

export function AddButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const API_URL = import.meta.env.VITE_API_URL;

  const closeModal = () => {
    setIsModalOpen(false);
    setPairingCode(null);
    setPairingError(null);
    setPairingLoading(false);
  };

  const startPairing = async () => {
    setPairingLoading(true);
    setPairingError(null);
    setPairingCode(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/devices/pairing/start`,
        { method: 'digit_code' },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      const data: DevicePairingResponse = response.data;
      const code = data.code.trim().toUpperCase();
      if (!code || code.length !== 6) {
        throw new Error('Invalid pairing code received.');
      }

      setPairingCode(code);
    } catch {
      setPairingError('Failed to generate code.');
    } finally {
      setPairingLoading(false);
    }
  };

  return (
    <>
      <button
        ref={addButtonRef}
        className="device-panel-add-button"
        type="button"
        onClick={() => {
          setIsModalOpen(true);
          void startPairing();
        }}
      >
        + add
      </button>
      <Modal anchorRef={addButtonRef} isOpen={isModalOpen} onClose={closeModal}>
        <div className="device-panel-modal">
          {pairingLoading ? (
            <div className="device-panel-modal-state">
              <i>Generating…</i>
            </div>
          ) : null}
          {pairingError ? (
            <div className="device-panel-modal-state">
              <i>{pairingError}</i>
            </div>
          ) : null}
          {pairingCode ? <div className="device-panel-pairing-code">{pairingCode}</div> : null}
        </div>
      </Modal>
    </>
  );
}