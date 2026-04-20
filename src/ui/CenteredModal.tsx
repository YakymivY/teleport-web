import type { ReactNode } from 'react';
import './CenteredModal.css';

type CenteredModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function CenteredModal({ isOpen, onClose, children }: CenteredModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="centered-modal-backdrop" onClick={onClose}>
      <div className="centered-modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
