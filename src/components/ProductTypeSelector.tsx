import { ProductType, TileShape } from '../types';

interface ProductTypeSelectorProps {
  productType: ProductType;
  tileShape?: TileShape;
  onProductTypeChange: (type: ProductType) => void;
  onTileShapeChange?: (shape: TileShape) => void;
  showShapeForAllTypes?: boolean; // Show shape selection for all types
}

export function ProductTypeSelector({
  productType,
  tileShape,
  onProductTypeChange,
  onTileShapeChange,
  showShapeForAllTypes = true,
}: ProductTypeSelectorProps) {
  // Show shape for tiles, countertops and sinks
  const shouldShowShape = showShapeForAllTypes && 
    (productType === 'tile' || productType === 'countertop' || productType === 'sink') && 
    onTileShapeChange;

  return (
    <div className="product-type-selector">
      <div className="two-column-grid">
        <div className="column">
          <h3>Product Type</h3>
          <select 
            value={productType} 
            onChange={(e) => onProductTypeChange(e.target.value as ProductType)}
            className="select-field"
          >
            <option value="tile">Tile</option>
            <option value="countertop">Countertop</option>
            <option value="sink">Sink</option>
            <option value="3d">3D</option>
          </select>
        </div>

        {shouldShowShape && (
          <div className="column">
            <h3>Product Shape</h3>
            <select 
              value={tileShape} 
              onChange={(e) => onTileShapeChange!(e.target.value as TileShape)}
              className="select-field"
            >
              <option value="rectangle">Square / Rectangular</option>
              <option value="round">Round</option>
              <option value="freeform">Freeform</option>
              <option value="triangle">Triangular</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
