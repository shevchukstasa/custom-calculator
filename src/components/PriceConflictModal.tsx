import { StoneEntry, ProductType } from '../types';
import './PriceConflictModal.css';

interface PriceConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  prices: number[]; // mil Rp (per m² for tiles, per piece for others)
  entries: StoneEntry[];
  productType: ProductType; // to determine price unit display
  onSelectPrice: (price: number) => void;
  onManualEntry: () => void;
}

export function PriceConflictModal({
  isOpen,
  onClose,
  prices,
  entries,
  productType,
  onSelectPrice,
  onManualEntry
}: PriceConflictModalProps) {
  if (!isOpen) return null;

  const priceUnit = productType === 'tile' ? 'mil Rp/m²' : 'mil Rp/piece';
  const priceField = productType === 'tile' ? 'pricePerM2' : 'pricePerUnit';

  // Sort entries by date (oldest first, newest last)
  const sortedEntries = [...entries].sort((a, b) => 
    a.dateAdded.getTime() - b.dateAdded.getTime()
  );

  const oldestEntry = sortedEntries[0];
  const newestEntry = sortedEntries[sortedEntries.length - 1];
  const oldestPrice = oldestEntry[priceField];
  const newestPrice = newestEntry[priceField];

  return (
    <div className="price-conflict-modal-overlay" onClick={onClose}>
      <div className="price-conflict-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="conflict-icon">⚠️</div>
        
        <h2 className="conflict-title">
          Price Conflict Detected
        </h2>
        
        <div className="conflict-message">
          <p>
            Found <strong>{entries.length} entries</strong> for this product with{' '}
            <strong>{prices.length} different prices</strong>:
          </p>
        </div>

        <div className="conflict-prices-list">
          {sortedEntries.map((entry, index) => (
            <div key={entry.id} className="price-entry">
              <div className="price-entry-info">
                <span className="price-value">
                  {entry[priceField].toFixed(3)} {priceUnit}
                </span>
                <span className="price-date">
                  {entry.dateAdded.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {index === 0 && <span className="price-badge oldest">Oldest</span>}
                {index === sortedEntries.length - 1 && <span className="price-badge newest">Newest</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="conflict-question">
          <p>Which price would you like to use?</p>
        </div>

        <div className="conflict-buttons">
          <button
            className="conflict-button use-oldest"
            onClick={() => onSelectPrice(oldestPrice)}
          >
            Use Oldest ({oldestPrice.toFixed(3)})
          </button>
          
          <button
            className="conflict-button use-newest"
            onClick={() => onSelectPrice(newestPrice)}
          >
            Use Newest ({newestPrice.toFixed(3)})
          </button>
          
          <button
            className="conflict-button manual-entry"
            onClick={onManualEntry}
          >
            Enter Manually
          </button>
          
          <button
            className="conflict-button cancel"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
