import { CostCalculationResult, Market } from '../types';
import { formatIDR, formatNumber } from '../utils/costCalculations';

interface CostResultsProps {
  result: CostCalculationResult;
  selectedMarket: Market | '';
}

export function CostResults({ result, selectedMarket }: CostResultsProps) {
  const isAverage = result.kiln.name.includes('Average');
  
  // Get market-specific data (default to indonesia if not selected)
  const actualMarket = selectedMarket || 'indonesia';
  const marketData = actualMarket === 'indonesia' ? result.indonesia : result.abroad;
  const marketFlag = actualMarket === 'indonesia' ? '🇮🇩' : '🌍';
  const marketName = actualMarket === 'indonesia' ? 'Indonesia' : 'Abroad';
  
  return (
    <div className="cost-results">
      <div className="result-header">
        <h2>{marketFlag} Cost Calculation Results ({marketName})</h2>
      </div>

      <div className="results-two-column-layout">
        {/* Left column: Prices */}
        <div className="results-left-column">
          <div className="price-item">
            <div className="price-label">Price per 1 m²</div>
            <div className="price-value">{formatIDR(marketData.pricePerSqM)}</div>
            <div className="price-secondary">
              {formatNumber(marketData.pricePerSqM / 1000000, 2)} mil Rp
            </div>
          </div>

          <div className="price-item highlight">
            <div className="price-label">Price per 1 piece</div>
            <div className="price-value main">{formatIDR(marketData.pricePerPcs)}</div>
            <div className="price-secondary">
              {formatNumber(marketData.pricePerPcs / 1000000, 3)} mil Rp
            </div>
          </div>

          {/* Kiln info - IN CAPITAL LETTERS for non-tiles */}
          {!isAverage && (
            <div className="kiln-notice">
              <h3>KILN ONLY {result.kiln.name.toUpperCase()}</h3>
            </div>
          )}
        </div>

        {/* Right column: Detailed placement information */}
        <div className="results-right-column">
          <h4>Detailed Kiln Placement Description</h4>
          <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Kiln:</span>
            <span className="summary-value">{result.kiln.name}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Loading method:</span>
            <span className="summary-value">{result.kilnLoading.methodName}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Pieces in kiln:</span>
            <span className="summary-value">{result.kilnLoading.totalPieces} pcs</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Loading area:</span>
            <span className="summary-value">{result.kilnLoading.totalArea.toFixed(2)} m²</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Levels:</span>
            <span className="summary-value">{result.kilnLoading.levels}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Product size:</span>
            <span className="summary-value">
              {result.product.shape === 'round' 
                ? `Diameter: ${result.product.length} × thickness: ${result.product.thickness} cm`
                : `${result.product.length} × ${result.product.width} × ${result.product.thickness} cm`
              }
            </span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
