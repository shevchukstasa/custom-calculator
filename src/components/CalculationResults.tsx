import React from 'react';
import { CalculationResult, ProductWithType } from '../types';

interface CalculationResultsProps {
  result: CalculationResult | null;
}

export const CalculationResults: React.FC<CalculationResultsProps> = ({
  result,
}) => {
  if (!result) {
    return (
      <div className="calculation-results empty">
        <p>Enter product dimensions and click "Calculate Loading"</p>
      </div>
    );
  }

  const { kiln, product, optimalLoading, alternativeLoading } = result;

  return (
    <div className="calculation-results">
      <h2>Calculation Results</h2>

      <div className="result-section">
        <div className="result-header">
          <span className="checkmark">✓</span>
          <strong>Optimal method: {optimalLoading.methodName}</strong>
        </div>

        <div className="result-stats">
          <div className="stat-item">
            <span className="stat-icon">📦</span>
            <div className="stat-content">
              <div className="stat-label">Number of pieces</div>
              <div className="stat-value">{optimalLoading.totalPieces} pcs</div>
            </div>
          </div>

          <div className="stat-item">
            <span className="stat-icon">📐</span>
            <div className="stat-content">
              <div className="stat-label">Loading area</div>
              <div className="stat-value">
                {optimalLoading.totalArea.toFixed(2)} m²
              </div>
            </div>
          </div>

          {kiln.multiLevel && (
            <div className="stat-item">
              <span className="stat-icon">📊</span>
              <div className="stat-content">
                <div className="stat-label">Number of levels</div>
                <div className="stat-value">{optimalLoading.levels}</div>
              </div>
            </div>
          )}
        </div>

        {optimalLoading.method === 'combined' && (
          <div className="distribution">
            <h3>Distribution:</h3>
            <ul>
              <li>
                On edge: {optimalLoading.edgePieces} pcs (
                {optimalLoading.edgeArea?.toFixed(2)} m²)
              </li>
              <li>
                Flat on top: {optimalLoading.flatPieces} pcs (
                {optimalLoading.flatArea?.toFixed(2)} m²)
              </li>
            </ul>
          </div>
        )}
      </div>

      {alternativeLoading && (
        <div className="alternative-section">
          <h3>Alternative method: {alternativeLoading.methodName}</h3>
          <div className="alternative-stats">
            <p>
              <strong>Quantity:</strong> {alternativeLoading.totalPieces} pcs
            </p>
            <p>
              <strong>Area:</strong>{' '}
              {alternativeLoading.totalArea.toFixed(2)} m²
            </p>
            {kiln.multiLevel && (
              <p>
                <strong>Levels:</strong> {alternativeLoading.levels}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="product-info">
        <h3>Information</h3>
        <p>
          <strong>Kiln:</strong> {kiln.name}
        </p>
        <p>
          <strong>Product size:</strong>{' '}
          {(product as ProductWithType).shape === 'round'
            ? `Diameter: ${product.length} × thickness: ${product.thickness} cm`
            : `${product.length} × ${product.width} × ${product.thickness} cm`
          }
        </p>
        <p>
          <strong>Kiln coefficient:</strong> {kiln.coefficient}
        </p>
      </div>
    </div>
  );
};
