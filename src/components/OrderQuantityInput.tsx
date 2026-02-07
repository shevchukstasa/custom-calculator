import { useState, useEffect } from 'react';

/** Format m² to 2 decimals, avoid float noise (e.g. 98.99999999999999 → 99.00) */
function m2ToStr(m2: number): string {
  return (Math.round(m2 * 100) / 100).toFixed(2);
}

interface OrderQuantityInputProps {
  productArea: number; // m²
  onQuantityChange: (quantityPcs: number) => void;
  initialQuantityPcs?: number;
  showBothModes?: boolean; // if false, show only "per piece" input (default: true)
}

/** Allow digits, optional one comma or dot, up to 2 digits after separator */
function isValidM2Input(raw: string): boolean {
  if (raw === '') return true;
  return /^\d*[,.]?\d{0,2}$/.test(raw);
}

export function OrderQuantityInput({
  productArea,
  onQuantityChange,
  initialQuantityPcs = 0,
  showBothModes = true,
}: OrderQuantityInputProps) {
  const [quantityPcs, setQuantityPcs] = useState<number>(initialQuantityPcs);
  const [m2InputStr, setM2InputStr] = useState<string>('');

  // Sync when initial value or product area changes (e.g. product dimensions changed)
  useEffect(() => {
    setQuantityPcs(initialQuantityPcs);
    setM2InputStr(initialQuantityPcs === 0 ? '' : m2ToStr(initialQuantityPcs * productArea));
  }, [initialQuantityPcs, productArea]);

  const handlePcsChange = (value: string) => {
    const pcs = Math.round(parseFloat(value) || 0);
    setQuantityPcs(pcs);
    setM2InputStr(pcs === 0 ? '' : m2ToStr(pcs * productArea));
    onQuantityChange(pcs);
  };

  const handleM2Change = (raw: string) => {
    if (raw === '') {
      setM2InputStr('');
      setQuantityPcs(0);
      onQuantityChange(0);
      return;
    }
    if (!isValidM2Input(raw)) return;

    const normalized = raw.replace(',', '.');
    const m2 = parseFloat(normalized) || 0;
    setM2InputStr(raw);
    const pcs = productArea > 0 ? Math.round(m2 / productArea) : 0;
    setQuantityPcs(pcs);
    onQuantityChange(pcs);
  };

  const handleM2Blur = () => {
    if (m2InputStr === '') return;
    const normalized = m2InputStr.replace(',', '.');
    const m2 = parseFloat(normalized) || 0;
    setM2InputStr(m2ToStr(m2));
  };

  return (
    <div className="order-quantity-input">
      <h3>Order Quantity</h3>
      {showBothModes ? (
        <div className="dual-input-group">
          <div className="input-field">
            <label>Quantity (pcs)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={quantityPcs === 0 ? '' : Math.round(quantityPcs)}
              onChange={(e) => handlePcsChange(e.target.value)}
              placeholder=""
            />
          </div>

          <div className="input-separator">or</div>

          <div className="input-field">
            <label>Quantity (m²)</label>
            <input
              type="text"
              inputMode="decimal"
              value={m2InputStr}
              onChange={(e) => handleM2Change(e.target.value)}
              onBlur={handleM2Blur}
              placeholder=""
            />
          </div>
        </div>
      ) : (
        <div className="single-input-group">
          <div className="input-field">
            <label>Quantity (pcs)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={quantityPcs === 0 ? '' : Math.round(quantityPcs)}
              onChange={(e) => handlePcsChange(e.target.value)}
              placeholder=""
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
