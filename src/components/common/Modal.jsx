import { useEffect, useId } from 'react';

/**
 * Accessible modal dialog.
 */
export default function Modal({ isOpen, onClose, title, children }) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
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
      <div className="modal">
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