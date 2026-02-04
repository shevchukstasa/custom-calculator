import { useState, useEffect } from 'react';

interface OrderQuantityInputProps {
  productArea: number; // m²
  onQuantityChange: (quantityPcs: number) => void;
  initialQuantityPcs?: number;
  showBothModes?: boolean; // if false, show only "per piece" input (default: true)
}

export function OrderQuantityInput({
  productArea,
  onQuantityChange,
  initialQuantityPcs = 0,
  showBothModes = true, // default: show both inputs
}: OrderQuantityInputProps) {
  const [quantityPcs, setQuantityPcs] = useState<number>(initialQuantityPcs);
  const [quantityM2, setQuantityM2] = useState<number>(0);

  // Sync when initial value or area changes
  useEffect(() => {
    setQuantityPcs(initialQuantityPcs);
    setQuantityM2(initialQuantityPcs * productArea);
  }, [initialQuantityPcs, productArea]);

  const handlePcsChange = (value: string) => {
    // Only allow whole numbers for pieces
    const pcs = Math.round(parseFloat(value) || 0);
    setQuantityPcs(pcs);
    setQuantityM2(pcs * productArea);
    onQuantityChange(pcs);
  };

  const handleM2Change = (value: string) => {
    // Allow empty string for better UX
    if (value === '') {
      setQuantityM2(0);
      setQuantityPcs(0);
      onQuantityChange(0);
      return;
    }
    
    const m2 = parseFloat(value) || 0;
    setQuantityM2(m2);
    // Always round pieces to whole number
    const pcs = productArea > 0 ? Math.round(m2 / productArea) : 0;
    setQuantityPcs(pcs);
    onQuantityChange(pcs);
  };

  return (
    <div className="order-quantity-input">
      <h3>Order Quantity</h3>
      {showBothModes ? (
        // Mode 1: Both pieces and m² inputs (for tiles)
        <div className="dual-input-group">
          <div className="input-field">
            <label>Quantity (pcs)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={quantityPcs === 0 ? '' : Math.round(quantityPcs)}
              onChange={(e) => handlePcsChange(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="input-separator">or</div>

          <div className="input-field">
            <label>Quantity (m²)</label>
            <input
              type="number"
              min="0"
              max="1000"
              step="0.01"
              value={quantityM2 === 0 ? '' : quantityM2}
              onChange={(e) => handleM2Change(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      ) : (
        // Mode 2: Only pieces input (for countertops, sinks, 3D products)
        <div className="single-input-group">
          <div className="input-field">
            <label>Quantity (pcs)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={quantityPcs === 0 ? '' : Math.round(quantityPcs)}
              onChange={(e) => handlePcsChange(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      )}
      <p className="info-text">
        <small>
          {productArea > 0 && (
            <>
              1 piece = {productArea.toFixed(4)} m² • Affects stone defect calculation
            </>
          )}
          {productArea === 0 && 'Calculate kiln loading first'}
        </small>
      </p>
    </div>
  );
}
