import { CostCalculationResult, Market, ProductType, TileShape, GlazePlacement } from '../types';
import { formatIDR, formatNumber } from '../utils/costCalculations';

type StonePriceDisplayMode = 'perSqM' | 'perPcs';

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  tile: 'Tile',
  countertop: 'Countertop',
  sink: 'Sink',
  '3d': '3D',
};

const SHAPE_LABELS: Record<TileShape, string> = {
  square: 'Square',
  rectangle: 'Rectangle',
  round: 'Round',
  freeform: 'Freeform',
  triangle: 'Triangle',
};

const GLAZE_LABELS: Record<GlazePlacement, string> = {
  'face-only': 'Face only',
  'face-1-2-edges': 'Face + 1–2 edges',
  'face-3-4-edges': 'Face + 3–4 edges',
  'face-with-back': 'Face with back',
};

interface CostResultsProps {
  result: CostCalculationResult;
  selectedMarket: Market | '';
  priceDisplayMode?: StonePriceDisplayMode;
}

export function CostResults({ result, selectedMarket, priceDisplayMode = 'perSqM' }: CostResultsProps) {
  const actualMarket = selectedMarket || 'indonesia';
  const marketData = actualMarket === 'indonesia' ? result.indonesia : result.abroad;
  const marketFlag = actualMarket === 'indonesia' ? '🇮🇩' : '🌍';
  const marketName = actualMarket === 'indonesia' ? 'Indonesia' : 'Abroad';

  const showPerSqM = priceDisplayMode === 'perSqM';
  const priceValue = showPerSqM ? marketData.pricePerSqM : marketData.pricePerPcs;
  const priceLabel = showPerSqM ? 'Price per 1 m²' : 'Price per 1 piece';
  const priceSecondary = showPerSqM
    ? formatNumber(marketData.pricePerSqM / 1000000, 2) + ' mil Rp'
    : formatNumber(marketData.pricePerPcs / 1000000, 3) + ' mil Rp';

  const productTypeLabel = result.product.type ? PRODUCT_TYPE_LABELS[result.product.type] : '—';
  const shapeLabel = result.product.shape ? SHAPE_LABELS[result.product.shape] : '—';
  const glazeLabel = result.product.glaze ? GLAZE_LABELS[result.product.glaze] : '—';
  const sizeStr =
    result.product.shape === 'round'
      ? `Diameter: ${result.product.length} × thickness: ${result.product.thickness} cm`
      : `${result.product.length} × ${result.product.width} × ${result.product.thickness} cm`;
  const stoneCostPerSqMIdr = (result.parameters.stoneCost || 0) * 1e6;
  const stoneCostPerPcsIdr = stoneCostPerSqMIdr * result.productArea;
  const quantityStr = showPerSqM
    ? `${(result.orderQuantity * result.productArea).toFixed(2)} m²`
    : `${result.orderQuantity} pcs`;
  const stonePriceLabel = showPerSqM ? 'Stone price per m² (entered):' : 'Stone price per piece (entered):';
  const stonePriceValue = showPerSqM ? stoneCostPerSqMIdr : stoneCostPerPcsIdr;

  return (
    <div className="cost-results">
      <div className="result-header">
        <h2>{marketFlag} Cost Calculation Results ({marketName})</h2>
      </div>

      <div className="results-single-price-layout">
        <div className="results-left-column">
          <div className="price-item highlight">
            <div className="price-label">{priceLabel}</div>
            <div className="price-value main">{formatIDR(priceValue)}</div>
            <div className="price-secondary">{priceSecondary}</div>
          </div>

          <div className="order-summary-block">
            <h4>Order summary</h4>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Quantity:</span>
                <span className="summary-value">{quantityStr}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Product:</span>
                <span className="summary-value">{productTypeLabel}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Shape:</span>
                <span className="summary-value">{shapeLabel}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Glaze:</span>
                <span className="summary-value">{glazeLabel}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Size:</span>
                <span className="summary-value">{sizeStr}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">{stonePriceLabel}</span>
                <span className="summary-value">{formatIDR(stonePriceValue)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Custom glaze color:</span>
                <span className="summary-value">{result.product.customGlazeColor ? 'Yes' : 'No'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Use brush:</span>
                <span className="summary-value">{result.product.useBrush ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
