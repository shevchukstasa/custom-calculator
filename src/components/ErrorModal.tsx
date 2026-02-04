import './ErrorModal.css';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: string;
}

export function ErrorModal({ isOpen, onClose, reason }: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="error-modal-overlay" onClick={onClose}>
      <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="error-icon">✗</div>
        <h2 className="error-title">Product doesn't fit<br/>in any kiln</h2>
        <div className="error-reason">{reason}</div>
        <button className="error-ok-button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
