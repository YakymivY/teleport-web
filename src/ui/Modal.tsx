import type { ReactNode } from 'react';
import { useLayoutEffect, useState } from 'react';
import './Modal.css';

type ModalProps = {
  anchorRef: { current: HTMLElement | null };
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

type Position = {
  top: number;
  left: number;
};

export function Modal({ anchorRef, isOpen, onClose, children }: ModalProps) {
  const [position, setPosition] = useState<Position | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) {
      return;
    }

    const rect = anchorRef.current.getBoundingClientRect();
    const verticalOffset = 8;
    const left = rect.left + rect.width / 2;
    const top = rect.bottom + verticalOffset;

    setPosition({ top, left });
  }, [anchorRef, isOpen]);

  if (!isOpen || !position) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{
          top: position.top,
          left: position.left,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

