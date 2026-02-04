import React from 'react';
import { CalculationResult, KilnType } from '../types';

interface MultiKilnResultsProps {
  results: Record<KilnType, CalculationResult | null>;
  selectedKilns: KilnType[];
  bestKilnType?: KilnType | null;
}

export const MultiKilnResults: React.FC<MultiKilnResultsProps> = ({
  results,
}) => {
  const bigResult = results.big;
  const smallResult = results.small;

  // If no results
  if (!bigResult && !smallResult) {
    return (
      <div className="calculation-results empty">
        <p>Enter product dimensions and click "Calculate Loading"</p>
      </div>
    );
  }

  return (
    <div className="calculation-results">
      <h2>Kiln Loading Results</h2>

      {/* Show results for each kiln */}
      <div className="kilns-results-list">
        {bigResult && (
          <div className="kiln-result-item">
            <h3 className="kiln-name">🔥 Large kiln (54×84 cm)</h3>
            <div className="kiln-stats">
              <div className="stat-row">
                <span className="stat-label">Pieces:</span>
                <span className="stat-value">{bigResult.optimalLoading.totalPieces} pcs</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Area:</span>
                <span className="stat-value">{bigResult.optimalLoading.totalArea.toFixed(2)} m²</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Method:</span>
                <span className="stat-value">{bigResult.optimalLoading.methodName}</span>
              </div>
              {bigResult.optimalLoading.levels && (
                <div className="stat-row">
                  <span className="stat-label">Levels:</span>
                  <span className="stat-value">{bigResult.optimalLoading.levels}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {smallResult && (
          <div className="kiln-result-item">
            <h3 className="kiln-name">🔥 Small kiln (95×150 cm)</h3>
            <div className="kiln-stats">
              <div className="stat-row">
                <span className="stat-label">Pieces:</span>
                <span className="stat-value">{smallResult.optimalLoading.totalPieces} pcs</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Area:</span>
                <span className="stat-value">{smallResult.optimalLoading.totalArea.toFixed(2)} m²</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Method:</span>
                <span className="stat-value">{smallResult.optimalLoading.methodName}</span>
              </div>
              {smallResult.optimalLoading.levels && (
                <div className="stat-row">
                  <span className="stat-label">Levels:</span>
                  <span className="stat-value">{smallResult.optimalLoading.levels}</span>
                </div>
              )}
              
              {/* Filler for small kiln */}
              {smallResult.optimalLoading.filler && (
                <div className="filler-info">
                  <p className="note">
                    <strong>+ Filler:</strong> 10×10 cm tiles on edge
                  </p>
                  <p className="filler-breakdown">
                    • 10×10 tiles: <strong>{smallResult.optimalLoading.filler.fillerPieces} pcs</strong> 
                    ({smallResult.optimalLoading.filler.fillerArea.toFixed(4)} m²)
                  </p>
                  <p className="filler-details">
                    <small>Details: {smallResult.optimalLoading.filler.fillerDetails}</small>
                  </p>
                  <p className="total-with-filler">
                    <strong>Total (main + filler):</strong>
                    <br />
                    Pieces: {smallResult.optimalLoading.totalPieces + smallResult.optimalLoading.filler.fillerPieces}
                    <br />
                    Area: {(smallResult.optimalLoading.totalArea + smallResult.optimalLoading.filler.fillerArea).toFixed(4)} m²
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Average value if both kilns */}
      {bigResult && smallResult && (
        <div className="average-result">
          <h3>📊 Average</h3>
          <div className="average-stats">
            <div className="avg-stat">
              <span className="avg-label">Pieces:</span>
              <span className="avg-value">
                {Math.round((bigResult.optimalLoading.totalPieces + smallResult.optimalLoading.totalPieces) / 2)} pcs
              </span>
            </div>
            <div className="avg-stat">
              <span className="avg-label">Area:</span>
              <span className="avg-value">
                {((bigResult.optimalLoading.totalArea + smallResult.optimalLoading.totalArea) / 2).toFixed(2)} m²
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
