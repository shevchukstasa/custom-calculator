import { useState, useEffect } from 'react';
import { CalculationHistoryEntry } from '../types';
import { getRecentCalculations, deleteCalculationFromHistory } from '../utils/calculationHistory';

export function CalculationHistory() {
  const [history, setHistory] = useState<CalculationHistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<CalculationHistoryEntry | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const data = getRecentCalculations(50);
    setHistory(data);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this calculation?')) {
      deleteCalculationFromHistory(id);
      setSelectedEntry(null);
      loadHistory();
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="calculation-history">
      <div className="history-header">
        <h2>Calculation History</h2>
        <p className="subtitle">View all saved calculations ({history.length} total)</p>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <p>No calculations saved yet</p>
          <p className="hint-text">Complete a cost calculation to save it here</p>
        </div>
      ) : (
        <div className="history-layout">
          <div className="history-list">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Manager</th>
                  <th>Product</th>
                  <th>Dimensions (cm)</th>
                  <th>Quantity</th>
                  <th>Price/pcs (IDR)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr 
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={selectedEntry?.id === entry.id ? 'selected' : ''}
                  >
                    <td>{formatDate(entry.dateCreated)}</td>
                    <td><strong>{entry.manager}</strong></td>
                    <td>
                      {entry.productType}
                      {entry.tileShape && ` (${entry.tileShape})`}
                    </td>
                    <td>
                      {entry.dimensions.length}×{entry.dimensions.width}×{entry.dimensions.thickness}
                    </td>
                    <td>{entry.orderQuantity.toLocaleString()}</td>
                    <td>{entry.costResult.indonesia.pricePerPcs.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                    <td>
                      <button
                        className="button-small button-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(entry.id);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedEntry && (
            <div className="history-details">
              <h3>Calculation Details</h3>
              
              <div className="detail-section">
                <h4>General Info</h4>
                <p><strong>Manager:</strong> {selectedEntry.manager}</p>
                <p><strong>Date:</strong> {formatDate(selectedEntry.dateCreated)}</p>
                <p><strong>Product Type:</strong> {selectedEntry.productType}</p>
                {selectedEntry.tileShape && <p><strong>Shape:</strong> {selectedEntry.tileShape}</p>}
                <p><strong>Kiln Used:</strong> {selectedEntry.kilnUsed}</p>
              </div>
              
              <div className="detail-section">
                <h4>Product Details</h4>
                <p><strong>Dimensions:</strong> {selectedEntry.dimensions.length}×{selectedEntry.dimensions.width}×{selectedEntry.dimensions.thickness} cm</p>
                <p><strong>Glaze:</strong> {selectedEntry.glazePlacement}</p>
                <p><strong>Order Quantity:</strong> {selectedEntry.orderQuantity.toLocaleString()} pcs</p>
                <p><strong>Stone Cost:</strong> {selectedEntry.stoneCost.toFixed(3)} mil Rp/m²</p>
              </div>
              
              <div className="detail-section">
                <h4>Kiln Loading</h4>
                <p><strong>Total Pieces:</strong> {selectedEntry.loadingPieces} pcs</p>
                <p><strong>Total Area:</strong> {selectedEntry.loadingArea.toFixed(2)} m²</p>
              </div>
              
              <div className="detail-section">
                <h4>Price Results</h4>
                <div className="price-results">
                  <div className="price-market">
                    <h5>Indonesia Market</h5>
                    <p>Per m²: <strong>{selectedEntry.costResult.indonesia.pricePerSqM.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} IDR</strong></p>
                    <p>Per piece: <strong>{selectedEntry.costResult.indonesia.pricePerPcs.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} IDR</strong></p>
                    <p>Margin: <strong>{selectedEntry.costResult.indonesia.marginPercent.toFixed(1)}%</strong></p>
                  </div>
                  
                  <div className="price-market">
                    <h5>Abroad Market</h5>
                    <p>Per m²: <strong>{selectedEntry.costResult.abroad.pricePerSqM.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} IDR</strong></p>
                    <p>Per piece: <strong>{selectedEntry.costResult.abroad.pricePerPcs.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} IDR</strong></p>
                    <p>Margin: <strong>{selectedEntry.costResult.abroad.marginPercent.toFixed(1)}%</strong></p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
