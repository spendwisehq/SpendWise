import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

const Modal = ({
  open,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  className = '',
}) => {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div className="ui-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        className={`ui-modal ui-modal--${size} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && (
          <div className="ui-modal__header">
            <h2 className="ui-modal__title">{title}</h2>
            <button className="ui-modal__close" onClick={onClose} aria-label="Close">
              &#x2715;
            </button>
          </div>
        )}
        <div className="ui-modal__body">{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
