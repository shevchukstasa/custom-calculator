import { GlazePlacement, TileShape, ProductType } from '../types';

interface GlazePlacementSelectorProps {
  glazePlacement?: GlazePlacement;
  onGlazePlacementChange: (glaze: GlazePlacement) => void;
  tileShape?: TileShape; // Add for selection restriction
  productType?: ProductType; // Add for filtering options
  customGlazeColor?: boolean;
  onCustomGlazeColorChange?: (value: boolean) => void;
  useBrush?: boolean;
  onUseBrushChange?: (value: boolean) => void;
}

export function GlazePlacementSelector({
  glazePlacement,
  onGlazePlacementChange,
  tileShape,
  productType,
  customGlazeColor = false,
  onCustomGlazeColorChange,
  useBrush = false,
  onUseBrushChange,
}: GlazePlacementSelectorProps) {
  // Determine available options depending on product type
  const getAvailableOptions = (): GlazePlacement[] => {
    if (productType === 'sink') {
      // For sinks: only face-only and face-3-4-edges (edges)
      return ['face-only', 'face-3-4-edges'];
    } else if (productType === 'countertop') {
      // For countertops: face-only, face-3-4-edges, face-with-back
      return ['face-only', 'face-3-4-edges', 'face-with-back'];
    } else if (productType === '3d') {
      // For 3D: face-only and face-3-4-edges (all edges)
      return ['face-only', 'face-3-4-edges'];
    } else {
      // For tiles: all options except face-1-2-edges for round
      if (tileShape === 'round') {
        return ['face-only', 'face-3-4-edges', 'face-with-back'];
      }
      return ['face-only', 'face-1-2-edges', 'face-3-4-edges', 'face-with-back'];
    }
  };

  const availableOptions = getAvailableOptions();
  const isRound = tileShape === 'round';
  const isSinkOrCountertop = productType === 'sink' || productType === 'countertop';

  const getGlazeLabel = (option: GlazePlacement): string => {
    if (option === 'face-only') return 'Face only';
    if (option === 'face-1-2-edges') return 'Face + 1-2 edges';
    if (option === 'face-3-4-edges') {
      if (productType === '3d') return 'Face + all edges';
      if (isSinkOrCountertop || isRound) return 'Face + edges';
      return 'Face + 3-4 edges';
    }
    if (option === 'face-with-back') return 'Face with back';
    return option;
  };

  return (
    <div className="glaze-placement-selector">
      <div className="two-column-grid">
        <div className="column">
          <h3>Glaze Placement</h3>
          <select 
            value={glazePlacement} 
            onChange={(e) => onGlazePlacementChange(e.target.value as GlazePlacement)}
            className="select-field"
          >
            {availableOptions.map(option => (
              <option key={option} value={option}>
                {getGlazeLabel(option)}
              </option>
            ))}
          </select>
        </div>

        <div className="column">
          {/* Custom color checkbox */}
          {onCustomGlazeColorChange && (
            <div className="custom-glaze-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={customGlazeColor}
                  onChange={(e) => onCustomGlazeColorChange(e.target.checked)}
                />
                <span>Custom glaze color <span className="price-hint">(150,000 IDR/m²)</span></span>
              </label>
            </div>
          )}

          {/* Brush application checkbox */}
          {onUseBrushChange && (
            <div className="custom-glaze-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useBrush}
                  onChange={(e) => onUseBrushChange(e.target.checked)}
                />
                <span>Brush application <span className="price-hint">(100,000 IDR/m²)</span></span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
