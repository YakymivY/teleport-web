import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
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
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) {
      return;
    }

    const rect = anchorRef.current.getBoundingClientRect();
    const left = rect.left + rect.width / 2;
    const top = rect.bottom + 8;

    setPosition({ top, left });
  }, [anchorRef, isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !position || !contentRef.current) {
      return;
    }

    const { width } = contentRef.current.getBoundingClientRect();
    const margin = 8;
    const minLeft = margin + width / 2;
    const maxLeft = window.innerWidth - margin - width / 2;
    const clampedLeft = Math.min(Math.max(position.left, minLeft), maxLeft);

    if (clampedLeft !== position.left) {
      setPosition((prev) => (prev ? { ...prev, left: clampedLeft } : prev));
    }
  }, [position, isOpen]);

  if (!isOpen || !position) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={contentRef}
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

