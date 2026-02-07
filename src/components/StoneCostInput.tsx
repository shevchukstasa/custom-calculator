import { useState, useEffect } from 'react';
import { formatIDR } from '../utils/costCalculations';

export type StonePriceDisplayMode = 'perSqM' | 'perPcs';

interface StoneCostInputProps {
  productArea: number; // m² of one product (length × width / 10000)
  onStoneCostChange: (costPerSqM: number) => void; // parent expects mil Rp per m²
  initialCostPerSqM?: number; // mil Rp per m² from parent
  onShowDB: () => void;
  onAutoFind: () => void;
  showDB: boolean;
  showBothInputs: boolean; // if false, show only "per piece"
  hideButtons?: boolean;
  hideProductArea?: boolean;
  onStonePriceModeChange?: (mode: StonePriceDisplayMode) => void; // for result popup: show price per m² or per piece
}

const IDR_PER_MIL = 1e6;

export function StoneCostInput({ 
  productArea,
  onStoneCostChange,
  initialCostPerSqM = 0,
  onShowDB,
  onAutoFind,
  showDB,
  showBothInputs,
  hideButtons = false,
  hideProductArea = false,
  onStonePriceModeChange
}: StoneCostInputProps) {
  const [inputMode, setInputMode] = useState<'perSqM' | 'perPcs'>('perSqM');

  // Report current mode to parent (for cost result: show price per m² or per piece)
  useEffect(() => {
    if (!onStonePriceModeChange) return;
    onStonePriceModeChange(showBothInputs ? inputMode : 'perPcs');
  }, [showBothInputs, inputMode, onStonePriceModeChange]);

  // All amounts in IDR (rupiah) for display and internal state
  const [pricePerSqMIdr, setPricePerSqMIdr] = useState<number>(0);
  const [pricePerPcsIdr, setPricePerPcsIdr] = useState<number>(0);
  const [pricePerSqMStr, setPricePerSqMStr] = useState<string>('');
  const [pricePerPcsStr, setPricePerPcsStr] = useState<string>('');

  // Sync from parent: initialCostPerSqM is in mil Rp → convert to IDR for display
  useEffect(() => {
    if (initialCostPerSqM > 0) {
      const idrPerSqM = initialCostPerSqM * IDR_PER_MIL;
      setPricePerSqMIdr(idrPerSqM);
      setPricePerPcsIdr(idrPerSqM * productArea);
      setPricePerSqMStr(idrPerSqM % 1 === 0 ? String(Math.round(idrPerSqM)) : String(idrPerSqM));
      setPricePerPcsStr(idrPerSqM * productArea % 1 === 0 ? String(Math.round(idrPerSqM * productArea)) : String((idrPerSqM * productArea).toFixed(2)));
    } else {
      setPricePerSqMIdr(0);
      setPricePerPcsIdr(0);
      setPricePerSqMStr('');
      setPricePerPcsStr('');
    }
  }, [initialCostPerSqM, productArea]);

  const handlePerSqMInputChange = (raw: string) => {
    const commaCount = (raw.match(/,/g) || []).length;
    const dotCount = (raw.match(/\./g) || []).length;
    if (commaCount > 1 || dotCount > 1 || (commaCount > 0 && dotCount > 0)) return;
    if (!/^\d*[,.]?\d*$/.test(raw) && raw !== '') return;

    const normalized = raw.replace(',', '.');
    setPricePerSqMStr(raw);

    if (raw === '') {
      setPricePerSqMIdr(0);
      setPricePerPcsIdr(0);
      setPricePerPcsStr('');
      onStoneCostChange(0);
    } else {
      const valueIdr = parseFloat(normalized) || 0;
      setPricePerSqMIdr(valueIdr);
      const calculatedPcsIdr = valueIdr * productArea;
      setPricePerPcsIdr(calculatedPcsIdr);
      setPricePerPcsStr(calculatedPcsIdr % 1 === 0 ? String(Math.round(calculatedPcsIdr)) : calculatedPcsIdr.toFixed(2));
      onStoneCostChange(valueIdr / IDR_PER_MIL);
    }
  };

  const handlePerPcsInputChange = (raw: string) => {
    const commaCount = (raw.match(/,/g) || []).length;
    const dotCount = (raw.match(/\./g) || []).length;
    if (commaCount > 1 || dotCount > 1 || (commaCount > 0 && dotCount > 0)) return;
    if (!/^\d*[,.]?\d*$/.test(raw) && raw !== '') return;

    const normalized = raw.replace(',', '.');
    setPricePerPcsStr(raw);

    if (raw === '') {
      setPricePerPcsIdr(0);
      setPricePerSqMIdr(0);
      setPricePerSqMStr('');
      onStoneCostChange(0);
    } else {
      const valueIdr = parseFloat(normalized) || 0;
      setPricePerPcsIdr(valueIdr);
      const calculatedSqMIdr = productArea > 0 ? valueIdr / productArea : 0;
      setPricePerSqMIdr(calculatedSqMIdr);
      setPricePerSqMStr(calculatedSqMIdr % 1 === 0 ? String(Math.round(calculatedSqMIdr)) : calculatedSqMIdr.toFixed(2));
      onStoneCostChange(calculatedSqMIdr / IDR_PER_MIL);
    }
  };

  return (
    <div className="stone-cost-input">
      <h3>Stone Price</h3>
      
      {showBothInputs ? (
        <>
          {/* Mode toggle */}
          <div className="price-mode-toggle">
            <label className="price-mode-label">
              <input
                type="radio"
                name="stonePriceMode"
                checked={inputMode === 'perSqM'}
                onChange={() => {
                  setInputMode('perSqM');
                  onStonePriceModeChange?.('perSqM');
                }}
              />
              <span>Per 1 m² (Rp)</span>
            </label>
            <label className="price-mode-label">
              <input
                type="radio"
                name="stonePriceMode"
                checked={inputMode === 'perPcs'}
                onChange={() => {
                  setInputMode('perPcs');
                  onStonePriceModeChange?.('perPcs');
                }}
              />
              <span>Per 1 piece (Rp)</span>
            </label>
          </div>

          <div className="input-with-buttons">
            {inputMode === 'perSqM' ? (
              <div className="input-group">
                <label>Price per 1 m² (Rp)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={pricePerSqMStr}
                  onChange={(e) => handlePerSqMInputChange(e.target.value)}
                  onBlur={() => {}}
                  placeholder=""
                />
                <div className="calculated-info">
                  Per 1 pcs: <strong>{formatIDR(pricePerPcsIdr)}</strong>
                </div>
              </div>
            ) : (
              <div className="input-group">
                <label>Price per 1 piece (Rp)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={pricePerPcsStr}
                  onChange={(e) => handlePerPcsInputChange(e.target.value)}
                  onBlur={() => {}}
                  placeholder=""
                />
                <div className="calculated-info">
                  Per 1 m²: <strong>{formatIDR(pricePerSqMIdr)}</strong>
                </div>
              </div>
            )}
            
            {!hideButtons && (
              <>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={onShowDB}
                >
                  {showDB ? 'Hide database' : 'Database'}
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={onAutoFind}
                >
                  Auto-select
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="input-with-buttons">
          {/* "Per piece only" mode */}
          <div className="input-group">
            <label>Price per 1 piece (Rp)</label>
            <input
              type="text"
              inputMode="decimal"
              value={pricePerPcsStr}
              onChange={(e) => handlePerPcsInputChange(e.target.value)}
              onBlur={() => {}}
              placeholder=""
            />
            <div className="calculated-info">
              Per 1 m²: <strong>{formatIDR(pricePerSqMIdr)}</strong>
            </div>
          </div>
          
          {!hideButtons && (
            <>
              <button
                type="button"
                className="button-secondary"
                onClick={onShowDB}
              >
                {showDB ? 'Hide database' : 'Database'}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={onAutoFind}
              >
                Auto-select
              </button>
            </>
          )}
        </div>
      )}
      
      {!hideProductArea && (
        <div className="product-info">
          <small>Product area: {productArea.toFixed(4)} m²</small>
        </div>
      )}
    </div>
  );
}
