import { CalculationHistoryEntry } from '../types';

const HISTORY_DB_KEY = 'kiln_calculator_history';

/**
 * Get all calculation history from localStorage
 */
export function getCalculationHistory(): CalculationHistoryEntry[] {
  try {
    const data = localStorage.getItem(HISTORY_DB_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    // Convert date string back to Date object
    return parsed.map((entry: any) => ({
      ...entry,
      dateCreated: new Date(entry.dateCreated),
    }));
  } catch (error) {
    console.error('Error reading calculation history:', error);
    return [];
  }
}

/**
 * Save calculation history to localStorage
 */
function saveCalculationHistory(history: CalculationHistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_DB_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving calculation history:', error);
  }
}

/**
 * Add new calculation to history
 */
export function addCalculationToHistory(
  entry: Omit<CalculationHistoryEntry, 'id' | 'dateCreated'>
): CalculationHistoryEntry {
  const history = getCalculationHistory();
  const newEntry: CalculationHistoryEntry = {
    ...entry,
    id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    dateCreated: new Date(),
  };
  history.unshift(newEntry); // Add to beginning (newest first)
  saveCalculationHistory(history);
  return newEntry;
}

/**
 * Delete calculation from history
 */
export function deleteCalculationFromHistory(id: string): boolean {
  const history = getCalculationHistory();
  const filtered = history.filter((entry) => entry.id !== id);
  
  if (filtered.length === history.length) return false;
  
  saveCalculationHistory(filtered);
  return true;
}

/**
 * Get recent N calculations
 */
export function getRecentCalculations(limit: number = 50): CalculationHistoryEntry[] {
  const history = getCalculationHistory();
  return history.slice(0, limit);
}

/**
 * Clear all calculation history (for testing)
 */
export function clearCalculationHistory(): void {
  localStorage.removeItem(HISTORY_DB_KEY);
}
