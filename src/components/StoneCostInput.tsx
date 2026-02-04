import { useState, useEffect } from 'react';

interface StoneCostInputProps {
  productArea: number; // m² of one product (length × width / 10000)
  onStoneCostChange: (costPerSqM: number) => void;
  initialCostPerSqM?: number;
  onShowDB: () => void;
  onAutoFind: () => void;
  showDB: boolean;
  showBothInputs: boolean; // if false, show only "per piece"
  hideButtons?: boolean; // if true, don't render Database/Auto-select buttons
  hideProductArea?: boolean; // if true, don't render product area text
}

export function StoneCostInput({ 
  productArea,
  onStoneCostChange,
  initialCostPerSqM = 0,
  onShowDB,
  onAutoFind,
  showDB,
  showBothInputs,
  hideButtons = false,
  hideProductArea = false
}: StoneCostInputProps) {
  const [inputMode, setInputMode] = useState<'perSqM' | 'perPcs'>('perSqM');
  const [pricePerSqM, setPricePerSqM] = useState<number>(0);
  const [pricePerPcs, setPricePerPcs] = useState<number>(0);
  // String state so "0" and "0.0000" display correctly (number input with value 0 showed empty)
  const [pricePerSqMStr, setPricePerSqMStr] = useState<string>('');
  const [pricePerPcsStr, setPricePerPcsStr] = useState<string>('');

  // Sync from parent when initial value or productArea changes
  useEffect(() => {
    if (initialCostPerSqM > 0) {
      setPricePerSqM(initialCostPerSqM);
      setPricePerPcs(initialCostPerSqM * productArea);
      setPricePerSqMStr(String(initialCostPerSqM));
      setPricePerPcsStr(String(initialCostPerSqM * productArea));
    } else {
      setPricePerSqM(0);
      setPricePerPcs(0);
      setPricePerSqMStr('');
      setPricePerPcsStr('');
    }
  }, [initialCostPerSqM, productArea]);

  const handlePerSqMInputChange = (raw: string) => {
    // Validate: only digits and max one separator (comma or dot)
    const commaCount = (raw.match(/,/g) || []).length;
    const dotCount = (raw.match(/\./g) || []).length;
    
    // Allow only if: no separators, OR one comma, OR one dot (not both)
    if (commaCount > 1 || dotCount > 1 || (commaCount > 0 && dotCount > 0)) {
      return; // Invalid - multiple separators or both comma and dot
    }
    
    // Allow only numbers with optional single comma or dot
    if (!/^\d*[,.]?\d*$/.test(raw) && raw !== '') {
      return; // Invalid characters
    }
    
    // Replace comma with dot for calculation
    const normalized = raw.replace(',', '.');
    setPricePerSqMStr(raw); // Keep original input (with comma if user typed comma)
    
    // Parse and update values
    if (raw === '') {
      setPricePerSqM(0);
      setPricePerPcs(0);
      setPricePerPcsStr('');
      onStoneCostChange(0);
    } else {
      const value = parseFloat(normalized) || 0;
      setPricePerSqM(value);
      const calculatedPricePerPcs = value * productArea;
      setPricePerPcs(calculatedPricePerPcs);
      setPricePerPcsStr(calculatedPricePerPcs > 0 ? calculatedPricePerPcs.toFixed(4) : '');
      onStoneCostChange(value);
    }
  };

  const handlePerPcsInputChange = (raw: string) => {
    // Validate: only digits and max one separator (comma or dot)
    const commaCount = (raw.match(/,/g) || []).length;
    const dotCount = (raw.match(/\./g) || []).length;
    
    // Allow only if: no separators, OR one comma, OR one dot (not both)
    if (commaCount > 1 || dotCount > 1 || (commaCount > 0 && dotCount > 0)) {
      return; // Invalid - multiple separators or both comma and dot
    }
    
    // Allow only numbers with optional single comma or dot
    if (!/^\d*[,.]?\d*$/.test(raw) && raw !== '') {
      return; // Invalid characters
    }
    
    // Replace comma with dot for calculation
    const normalized = raw.replace(',', '.');
    setPricePerPcsStr(raw); // Keep original input (with comma if user typed comma)
    
    // Parse and update values
    if (raw === '') {
      setPricePerPcs(0);
      setPricePerSqM(0);
      setPricePerSqMStr('');
      onStoneCostChange(0);
    } else {
      const value = parseFloat(normalized) || 0;
      setPricePerPcs(value);
      const calculatedPricePerSqM = productArea > 0 ? value / productArea : 0;
      setPricePerSqM(calculatedPricePerSqM);
      // Don't update the other field's string - keep it as user typed
      onStoneCostChange(calculatedPricePerSqM);
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
                onChange={() => setInputMode('perSqM')}
              />
              <span>Per 1 m² (mil Rp)</span>
            </label>
            <label className="price-mode-label">
              <input
                type="radio"
                name="stonePriceMode"
                checked={inputMode === 'perPcs'}
                onChange={() => setInputMode('perPcs')}
              />
              <span>Per 1 piece (mil Rp)</span>
            </label>
          </div>

          <div className="input-with-buttons">
            {/* Input depending on mode */}
            {inputMode === 'perSqM' ? (
              <div className="input-group">
                <label>Price per 1 m² (mil Rp)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={pricePerSqMStr}
                  onChange={(e) => handlePerSqMInputChange(e.target.value)}
                  onBlur={() => {
                    // Keep user input as is - no auto-formatting
                  }}
                  placeholder=""
                />
                <div className="calculated-info">
                  Per 1 pcs: <strong>{pricePerPcs.toFixed(4)} mil Rp</strong>
                </div>
              </div>
            ) : (
              <div className="input-group">
                <label>Price per 1 piece (mil Rp)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={pricePerPcsStr}
                  onChange={(e) => handlePerPcsInputChange(e.target.value)}
                  onBlur={() => {
                    // Keep user input as is - no auto-formatting
                  }}
                  placeholder=""
                />
                <div className="calculated-info">
                  Per 1 m²: <strong>{pricePerSqM.toFixed(4)} mil Rp</strong>
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
            <label>Price per 1 piece (mil Rp)</label>
            <input
              type="text"
              inputMode="decimal"
              value={pricePerPcsStr}
              onChange={(e) => handlePerPcsInputChange(e.target.value)}
              onBlur={() => setPricePerPcsStr(pricePerPcs > 0 ? pricePerPcs.toFixed(4) : '')}
              placeholder=""
            />
            <div className="calculated-info">
              Per 1 m²: <strong>{pricePerSqM.toFixed(4)} mil Rp</strong>
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
