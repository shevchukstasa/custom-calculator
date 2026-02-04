import { ManagerName } from '../types';

interface ManagerSelectorProps {
  selectedManager: ManagerName | '';
  onManagerChange: (manager: ManagerName) => void;
}

const MANAGERS: ManagerName[] = ['Stas', 'Konstantin', 'Febby', 'Anna'];

export function ManagerSelector({ selectedManager, onManagerChange }: ManagerSelectorProps) {
  return (
    <div className="manager-selector">
      <h3>Manager</h3>
      <select
        value={selectedManager}
        onChange={(e) => onManagerChange(e.target.value as ManagerName)}
        className="manager-select"
        required
      >
        <option value="">Select manager</option>
        {MANAGERS.map((manager) => (
          <option key={manager} value={manager}>
            {manager}
          </option>
        ))}
      </select>
      {!selectedManager && (
        <p className="hint-text">⚠ Please select manager before calculation</p>
      )}
    </div>
  );
}
