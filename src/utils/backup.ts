import { StoneEntry } from '../types';
import { CalculationHistoryEntry } from '../types';

// Backup keys
const BACKUP_KEY_PREFIX = 'kiln_backup_';
const INCREMENTAL_BACKUP_KEY = `${BACKUP_KEY_PREFIX}incremental`;
const FULL_BACKUP_KEY = `${BACKUP_KEY_PREFIX}full`;
const LAST_BACKUP_TIME_KEY = `${BACKUP_KEY_PREFIX}last_time`;
const LAST_FULL_BACKUP_KEY = `${BACKUP_KEY_PREFIX}last_full_time`;

// Tracking changes
const CHANGES_TRACKER_KEY = `${BACKUP_KEY_PREFIX}changes`;

export interface BackupData {
  timestamp: Date;
  version: string;
  stoneDatabase: StoneEntry[];
  calculationHistory: CalculationHistoryEntry[];
}

export interface IncrementalBackupData {
  timestamp: Date;
  changes: {
    stoneDatabase?: {
      added?: StoneEntry[];
      modified?: StoneEntry[];
      deleted?: string[]; // IDs
    };
    calculationHistory?: {
      added?: CalculationHistoryEntry[];
      deleted?: string[]; // IDs
    };
  };
}

interface ChangeTracker {
  lastSnapshot: {
    stoneIds: string[];
    calculationIds: string[];
  };
  pendingChanges: {
    stoneAdded: string[];
    stoneDeleted: string[];
    calculationAdded: string[];
    calculationDeleted: string[];
  };
}

/**
 * Get current data from localStorage
 */
function getCurrentData(): { stones: StoneEntry[]; calculations: CalculationHistoryEntry[] } {
  const stonesData = localStorage.getItem('kiln_calculator_stone_database');
  const calcData = localStorage.getItem('kiln_calculator_history');
  
  const stones = stonesData ? JSON.parse(stonesData).map((e: any) => ({
    ...e,
    dateAdded: new Date(e.dateAdded)
  })) : [];
  
  const calculations = calcData ? JSON.parse(calcData).map((e: any) => ({
    ...e,
    dateCreated: new Date(e.dateCreated)
  })) : [];
  
  return { stones, calculations };
}

/**
 * Get or initialize change tracker
 */
function getChangeTracker(): ChangeTracker {
  const data = localStorage.getItem(CHANGES_TRACKER_KEY);
  if (data) {
    return JSON.parse(data);
  }
  
  const { stones, calculations } = getCurrentData();
  return {
    lastSnapshot: {
      stoneIds: stones.map(s => s.id),
      calculationIds: calculations.map(c => c.id)
    },
    pendingChanges: {
      stoneAdded: [],
      stoneDeleted: [],
      calculationAdded: [],
      calculationDeleted: []
    }
  };
}

/**
 * Save change tracker
 */
function saveChangeTracker(tracker: ChangeTracker): void {
  localStorage.setItem(CHANGES_TRACKER_KEY, JSON.stringify(tracker));
}

/**
 * Track changes since last backup
 */
export function trackChanges(): void {
  const tracker = getChangeTracker();
  const { stones, calculations } = getCurrentData();
  
  const currentStoneIds = new Set(stones.map(s => s.id));
  const currentCalcIds = new Set(calculations.map(c => c.id));
  
  const lastStoneIds = new Set(tracker.lastSnapshot.stoneIds);
  const lastCalcIds = new Set(tracker.lastSnapshot.calculationIds);
  
  // Find new stones
  stones.forEach(stone => {
    if (!lastStoneIds.has(stone.id) && !tracker.pendingChanges.stoneAdded.includes(stone.id)) {
      tracker.pendingChanges.stoneAdded.push(stone.id);
    }
  });
  
  // Find deleted stones
  tracker.lastSnapshot.stoneIds.forEach(id => {
    if (!currentStoneIds.has(id) && !tracker.pendingChanges.stoneDeleted.includes(id)) {
      tracker.pendingChanges.stoneDeleted.push(id);
    }
  });
  
  // Find new calculations
  calculations.forEach(calc => {
    if (!lastCalcIds.has(calc.id) && !tracker.pendingChanges.calculationAdded.includes(calc.id)) {
      tracker.pendingChanges.calculationAdded.push(calc.id);
    }
  });
  
  // Find deleted calculations
  tracker.lastSnapshot.calculationIds.forEach(id => {
    if (!currentCalcIds.has(id) && !tracker.pendingChanges.calculationDeleted.includes(id)) {
      tracker.pendingChanges.calculationDeleted.push(id);
    }
  });
  
  saveChangeTracker(tracker);
}

/**
 * Create full backup (all data)
 */
export function createFullBackup(): BackupData {
  const { stones, calculations } = getCurrentData();
  
  const backup: BackupData = {
    timestamp: new Date(),
    version: '1.0',
    stoneDatabase: stones,
    calculationHistory: calculations
  };
  
  localStorage.setItem(FULL_BACKUP_KEY, JSON.stringify(backup));
  localStorage.setItem(LAST_FULL_BACKUP_KEY, new Date().toISOString());
  
  // Reset change tracker after full backup
  const tracker = getChangeTracker();
  tracker.lastSnapshot = {
    stoneIds: stones.map(s => s.id),
    calculationIds: calculations.map(c => c.id)
  };
  tracker.pendingChanges = {
    stoneAdded: [],
    stoneDeleted: [],
    calculationAdded: [],
    calculationDeleted: []
  };
  saveChangeTracker(tracker);
  
  console.log('✅ Full backup created:', backup.timestamp);
  return backup;
}

/**
 * Create incremental backup (only changes)
 */
export function createIncrementalBackup(): IncrementalBackupData | null {
  const tracker = getChangeTracker();
  const { stones, calculations } = getCurrentData();
  
  // Check if there are any changes
  const hasChanges = 
    tracker.pendingChanges.stoneAdded.length > 0 ||
    tracker.pendingChanges.stoneDeleted.length > 0 ||
    tracker.pendingChanges.calculationAdded.length > 0 ||
    tracker.pendingChanges.calculationDeleted.length > 0;
  
  if (!hasChanges) {
    console.log('⏭️ No changes to backup');
    return null;
  }
  
  // Get actual data for added items
  const addedStones = stones.filter(s => tracker.pendingChanges.stoneAdded.includes(s.id));
  const addedCalculations = calculations.filter(c => tracker.pendingChanges.calculationAdded.includes(c.id));
  
  const backup: IncrementalBackupData = {
    timestamp: new Date(),
    changes: {
      stoneDatabase: {
        added: addedStones.length > 0 ? addedStones : undefined,
        deleted: tracker.pendingChanges.stoneDeleted.length > 0 ? tracker.pendingChanges.stoneDeleted : undefined
      },
      calculationHistory: {
        added: addedCalculations.length > 0 ? addedCalculations : undefined,
        deleted: tracker.pendingChanges.calculationDeleted.length > 0 ? tracker.pendingChanges.calculationDeleted : undefined
      }
    }
  };
  
  // Save incremental backup
  const existingBackups = getIncrementalBackups();
  existingBackups.push(backup);
  
  // Keep only last 100 incremental backups
  const recentBackups = existingBackups.slice(-100);
  localStorage.setItem(INCREMENTAL_BACKUP_KEY, JSON.stringify(recentBackups));
  localStorage.setItem(LAST_BACKUP_TIME_KEY, new Date().toISOString());
  
  // Reset pending changes
  tracker.lastSnapshot = {
    stoneIds: stones.map(s => s.id),
    calculationIds: calculations.map(c => c.id)
  };
  tracker.pendingChanges = {
    stoneAdded: [],
    stoneDeleted: [],
    calculationAdded: [],
    calculationDeleted: []
  };
  saveChangeTracker(tracker);
  
  console.log('💾 Incremental backup created:', backup.timestamp);
  return backup;
}

/**
 * Get all incremental backups
 */
function getIncrementalBackups(): IncrementalBackupData[] {
  const data = localStorage.getItem(INCREMENTAL_BACKUP_KEY);
  if (!data) return [];
  
  return JSON.parse(data).map((b: any) => ({
    ...b,
    timestamp: new Date(b.timestamp)
  }));
}

/**
 * Get last full backup
 */
export function getLastFullBackup(): BackupData | null {
  const data = localStorage.getItem(FULL_BACKUP_KEY);
  if (!data) return null;
  
  const backup = JSON.parse(data);
  return {
    ...backup,
    timestamp: new Date(backup.timestamp)
  };
}

/**
 * Export backup to downloadable file
 */
export function exportBackupToFile(backup: BackupData): void {
  const dataStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `kiln_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log('📥 Backup exported to file');
}

/**
 * Import backup from file
 */
export function importBackupFromFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        
        // Restore data
        localStorage.setItem('kiln_calculator_stone_database', JSON.stringify(backup.stoneDatabase));
        localStorage.setItem('kiln_calculator_history', JSON.stringify(backup.calculationHistory));
        
        // Create new full backup after restore
        createFullBackup();
        
        console.log('✅ Backup imported and restored');
        resolve(backup);
      } catch (error) {
        console.error('Error importing backup:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Get backup statistics
 */
export function getBackupStats(): {
  lastFullBackup: Date | null;
  lastIncrementalBackup: Date | null;
  incrementalBackupsCount: number;
  totalStones: number;
  totalCalculations: number;
} {
  const lastFull = localStorage.getItem(LAST_FULL_BACKUP_KEY);
  const lastIncremental = localStorage.getItem(LAST_BACKUP_TIME_KEY);
  const incrementalBackups = getIncrementalBackups();
  const { stones, calculations } = getCurrentData();
  
  return {
    lastFullBackup: lastFull ? new Date(lastFull) : null,
    lastIncrementalBackup: lastIncremental ? new Date(lastIncremental) : null,
    incrementalBackupsCount: incrementalBackups.length,
    totalStones: stones.length,
    totalCalculations: calculations.length
  };
}

/**
 * Clear all backups (for testing)
 */
export function clearAllBackups(): void {
  localStorage.removeItem(FULL_BACKUP_KEY);
  localStorage.removeItem(INCREMENTAL_BACKUP_KEY);
  localStorage.removeItem(LAST_BACKUP_TIME_KEY);
  localStorage.removeItem(LAST_FULL_BACKUP_KEY);
  localStorage.removeItem(CHANGES_TRACKER_KEY);
  console.log('🗑️ All backups cleared');
}
