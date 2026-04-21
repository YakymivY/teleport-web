import { useCallback, useRef, useState } from 'react';
import { Modal } from '../../../../../ui/Modal';
import { startPairing } from '../../api/device-panel.api';
import { useDeviceConnectedEvent } from '../../hooks/useDeviceConnectedEvent';
import './AddButton.css';

export function AddButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeModal = () => {
    setIsModalOpen(false);
    setPairingCode(null);
    setPairingError(null);
    setPairingLoading(false);
  };

  useDeviceConnectedEvent(useCallback(() => {
    if (isModalOpen) closeModal();
  }, [isModalOpen]));

  const handleStartPairing = async () => {
    setPairingLoading(true);
    setPairingError(null);
    setPairingCode(null);

    try {
      const data = await startPairing();
      setPairingCode(data.code);
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
          void handleStartPairing();
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