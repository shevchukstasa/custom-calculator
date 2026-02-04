import { TileShape } from '../types';
import './ApprovalWarningModal.css';

interface ApprovalWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  dimensions: {
    length: number;
    width: number;
    shape: TileShape;
  };
}

export function ApprovalWarningModal({ isOpen, onClose, dimensions }: ApprovalWarningModalProps) {
  if (!isOpen) return null;
  
  // Format dimensions based on shape
  const formatDimensions = () => {
    if (dimensions.shape === 'round') {
      return `Diameter: ${dimensions.length} cm`;
    }
    return `${dimensions.length} × ${dimensions.width} cm`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content approval-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="approval-modal-header">
          <h2>⚠️ Approval Required!</h2>
        </div>
        
        <div className="approval-modal-body">
          <div className="warning-icon">⚠️</div>
          
          <div className="warning-text">
            <p className="warning-main">
              <strong>Product size: {formatDimensions()}</strong>
            </p>
            
            <p className="warning-detail">
              Products larger than <strong>60 × 80 cm</strong> require final price approval.
            </p>
            
            <div className="approval-notice">
              <h3>📋 Please consult with Stanislav</h3>
              <p>
                During program debugging, all calculations for large products 
                require additional verification.
              </p>
            </div>
          </div>
        </div>

        <div className="approval-modal-footer">
          <button className="button button-primary" onClick={onClose}>
            ✓ Understood, I will consult with Stanislav
          </button>
        </div>
      </div>
    </div>
  );
}
