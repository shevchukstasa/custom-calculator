import React, { useState, useEffect } from 'react';
import { ProductDimensions, TileShape, ManagerName, Market, ProductType } from '../types';

interface ProductInputProps {
  formRef?: React.RefObject<HTMLFormElement>;
  onCalculate: (product: ProductDimensions) => void;
  tileShape?: TileShape;
  productType?: ProductType;
  showButton?: boolean;
  initialLength?: string;
  initialWidth?: string;
  initialThickness?: string;
  onDimensionsChange?: (dimensions: { length: string; width: string; thickness: string }) => void;
  selectedManager?: ManagerName | '';
  onManagerChange?: (manager: ManagerName | '') => void;
  selectedMarket?: Market | '';
  onMarketChange?: (market: Market | '') => void;
}

export const ProductInput: React.FC<ProductInputProps> = ({ 
  formRef,
  onCalculate, 
  tileShape,
  productType,
  showButton = true,
  initialLength = '',
  initialWidth = '',
  initialThickness = '',
  onDimensionsChange,
  selectedManager = '',
  onManagerChange,
  selectedMarket = '',
  onMarketChange
}) => {
  // Always start empty; sync from parent when they pass values (e.g. from history)
  const [length, setLength] = useState<string>(() => '');
  const [width, setWidth] = useState<string>(() => '');
  const [thickness, setThickness] = useState<string>(() => '');
  
  const isRound = tileShape === 'round';
  const isSink = productType === 'sink';
  const thicknessLabel = isSink ? 'Height' : 'Thickness';

  // Sync from parent when initial values change (e.g. user picked from history)
  useEffect(() => {
    setLength(initialLength ?? '');
    setWidth(initialWidth ?? '');
    setThickness(initialThickness ?? '');
  }, [initialLength, initialWidth, initialThickness]);

  // Notify parent of dimension changes
  useEffect(() => {
    if (onDimensionsChange) {
      onDimensionsChange({ length, width, thickness });
    }
  }, [length, width, thickness, onDimensionsChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const lengthNum = parseFloat(length);
    const widthNum = parseFloat(width);
    const thicknessNum = parseFloat(thickness);

    // Check minimum dimensions
    if (lengthNum < 3 || widthNum < 3) {
      alert('⚠️ Minimum product size: 3×3 cm\nSuch small sizes are not used in ceramics production.');
      return;
    }

    if (thicknessNum < 0.8) {
      alert('⚠️ Minimum product thickness: 0.8 cm (8 mm)\nSuch thin ceramics are not produced.');
      return;
    }

    if (lengthNum > 0 && widthNum > 0 && thicknessNum > 0) {
      onCalculate({
        length: lengthNum,
        width: widthNum,
        thickness: thicknessNum,
      });
    }
  };

  // For round shapes - automatically sync width with length (diameter)
  const handleDiameterChange = (value: string) => {
    setLength(value);
    setWidth(value); // automatically set width = length
  };

  return (
    <div className="product-input">
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="two-column-grid">
          <div className="column">
            <h3>Product Dimensions</h3>
            {isRound ? (
              <>
                <div className="input-group">
                  <label>
                    Diameter (cm): <span className="hint">min. 3 cm</span>
                    <input
                      type="number"
                      step="0.1"
                      min="3"
                      value={length}
                      onChange={(e) => handleDiameterChange(e.target.value)}
                      placeholder=""
                      required
                    />
                  </label>
                </div>

                <div className="input-group">
                  <label>
                    {thicknessLabel} (cm): <span className="hint">min. 0.8 cm</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.8"
                      value={thickness}
                      onChange={(e) => setThickness(e.target.value)}
                      placeholder=""
                      required
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="input-group">
                  <label>
                    Length (cm): <span className="hint">min. 3 cm</span>
                    <input
                      type="number"
                      step="0.1"
                      min="3"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder=""
                      required
                    />
                  </label>
                </div>

                <div className="input-group">
                  <label>
                    Width (cm): <span className="hint">min. 3 cm</span>
                    <input
                      type="number"
                      step="0.1"
                      min="3"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder=""
                      required
                    />
                  </label>
                </div>

                <div className="input-group">
                  <label>
                    {thicknessLabel} (cm): <span className="hint">min. 0.8 cm</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.8"
                      value={thickness}
                      onChange={(e) => setThickness(e.target.value)}
                      placeholder=""
                      required
                    />
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="column">
            <h3>Manager</h3>
            <div className="input-group manager-group">
              <label>
                <span className="hint">required</span>
                <select
                  value={selectedManager}
                  onChange={(e) => onManagerChange?.(e.target.value as ManagerName | '')}
                  className="manager-select"
                  required
                >
                  <option value="">Select Manager</option>
                  <option value="Stas">Stas</option>
                  <option value="Konstantin">Konstantin</option>
                  <option value="Febby">Febby</option>
                  <option value="Anna">Anna</option>
                </select>
              </label>
            </div>

            <h3 style={{marginTop: '1rem'}}>Market</h3>
            <div className="input-group market-group">
              <label>
                <span className="hint">required</span>
                <select
                  value={selectedMarket}
                  onChange={(e) => onMarketChange?.(e.target.value as Market | '')}
                  className="manager-select"
                  required
                >
                  <option value="">Select Market</option>
                  <option value="indonesia">🇮🇩 Indonesia</option>
                  <option value="abroad">🌍 Abroad</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        {showButton && (
          <button type="submit" className="calculate-loading-button">
            Calculate Loading
          </button>
        )}
      </form>
    </div>
  );
};
