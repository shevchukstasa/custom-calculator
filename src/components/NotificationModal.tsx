import './NotificationModal.css';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'warning' | 'error' | 'success' | 'info';
}

export function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
}: NotificationModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="notification-modal-overlay" onClick={onClose}>
      <div 
        className={`notification-modal-content notification-${type}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notification-icon">{getIcon()}</div>
        <h2 className="notification-title">{title}</h2>
        <p className="notification-message">{message}</p>
        <button className="notification-button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
