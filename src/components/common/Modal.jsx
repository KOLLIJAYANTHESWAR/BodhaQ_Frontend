import { useEffect, useId, useRef } from 'react';

/**
 * Accessible modal dialog.
 */
export default function Modal({ isOpen, onClose, title, children }) {
  const titleId = useId();
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousActiveElementRef.current = document.activeElement;

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKey);

    // Move focus into the dialog for keyboard accessibility.
    requestAnimationFrame(() => {
      modalRef.current?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKey);

      // Restore focus to the element that opened the modal.
      previousActiveElementRef.current?.focus?.();
      previousActiveElementRef.current = null;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="modal"
        tabIndex={-1}
      >
        {title && (
          <h2
            id={titleId}
            style={{
              marginBottom: 16,
              fontSize: 'var(--font-size-xl)',
            }}
          >
            {title}
          </h2>
        )}

        {children}
      </div>
    </div>
  );
}