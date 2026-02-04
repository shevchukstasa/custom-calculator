import React from 'react';
import { KilnType } from '../types';
import { KILNS } from '../utils/constants';

interface KilnSelectorProps {
  selectedKilns: KilnType[];
  onKilnsChange: (kilns: KilnType[]) => void;
}

export const KilnSelector: React.FC<KilnSelectorProps> = ({
  selectedKilns,
  onKilnsChange,
}) => {
  const handleToggle = (kilnType: KilnType) => {
    if (selectedKilns.includes(kilnType)) {
      // Remove kiln from selection (if not the last one)
      if (selectedKilns.length > 1) {
        onKilnsChange(selectedKilns.filter(k => k !== kilnType));
      }
    } else {
      // Add kiln to selection
      onKilnsChange([...selectedKilns, kilnType]);
    }
  };

  return (
    <div className="kiln-selector">
      <h2>Select Kiln</h2>
      <div className="checkbox-group">
        {(Object.keys(KILNS) as KilnType[]).map((kilnKey) => (
          <label key={kilnKey} className="checkbox-label">
            <input
              type="checkbox"
              name="kiln"
              value={kilnKey}
              checked={selectedKilns.includes(kilnKey)}
              onChange={() => handleToggle(kilnKey)}
            />
            <span>{KILNS[kilnKey].name}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
