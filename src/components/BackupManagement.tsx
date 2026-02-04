import { useState, useEffect } from 'react';
import { 
  getBackupStats, 
  createFullBackup, 
  createIncrementalBackup,
  exportBackupToFile,
  importBackupFromFile,
  clearAllBackups,
  getLastFullBackup
} from '../utils/backup';
import { clearStoneDatabase } from '../utils/stoneDatabase';
import { clearCalculationHistory } from '../utils/calculationHistory';

export function BackupManagement() {
  const [stats, setStats] = useState(getBackupStats());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    // Update stats every 10 seconds
    const interval = setInterval(() => {
      setStats(getBackupStats());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleCreateFullBackup = () => {
    createFullBackup();
    setStats(getBackupStats());
    alert('✅ Full backup created successfully!');
  };

  const handleCreateIncrementalBackup = () => {
    const backup = createIncrementalBackup();
    setStats(getBackupStats());
    if (backup) {
      alert('💾 Incremental backup created successfully!');
    } else {
      alert('⏭️ No changes to backup');
    }
  };

  const handleExportBackup = () => {
    const backup = getLastFullBackup();
    if (backup) {
      exportBackupToFile(backup);
      alert('📥 Backup exported to downloads folder!');
    } else {
      alert('❌ No backup available to export');
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    importBackupFromFile(file)
      .then(() => {
        setStats(getBackupStats());
        setImporting(false);
        alert('✅ Backup imported and restored successfully!');
        window.location.reload(); // Reload to show restored data
      })
      .catch((error) => {
        setImporting(false);
        alert(`❌ Error importing backup: ${error.message}`);
      });
  };

  const handleClearStoneDatabase = () => {
    if (confirm('⚠️ Are you sure you want to clear the stone database? This action cannot be undone!')) {
      clearStoneDatabase();
      setStats(getBackupStats());
      alert('🗑️ Stone database cleared');
    }
  };

  const handleClearCalculationHistory = () => {
    if (confirm('⚠️ Are you sure you want to clear all calculation history? This action cannot be undone!')) {
      clearCalculationHistory();
      setStats(getBackupStats());
      alert('🗑️ Calculation history cleared');
    }
  };

  const handleClearAllBackups = () => {
    if (confirm('⚠️ Are you sure you want to clear ALL backups? This action cannot be undone!')) {
      clearAllBackups();
      setStats(getBackupStats());
      alert('🗑️ All backups cleared');
    }
  };

  /** Clear stone DB + calculation history, then create full backup (e.g. before deploy) */
  const handleResetDataAndBackup = () => {
    if (!confirm('Reset stone database and calculation history, then create a full backup? This cannot be undone.')) {
      return;
    }
    clearStoneDatabase();
    clearCalculationHistory();
    createFullBackup();
    setStats(getBackupStats());
    alert('✅ Data reset. Full backup created with empty databases. Use Export to save the backup file.');
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="backup-management">
      <div className="backup-stats">
        <div className="stat-card">
          <h3>📊 Statistics</h3>
          <p><strong>Stones:</strong> {stats.totalStones}</p>
          <p><strong>Calculations:</strong> {stats.totalCalculations}</p>
          <p><strong>Incremental Backups:</strong> {stats.incrementalBackupsCount}</p>
        </div>

        <div className="stat-card">
          <h3>⏰ Last Backups</h3>
          <p><strong>Full:</strong> {formatDate(stats.lastFullBackup)}</p>
          <p><strong>Incremental:</strong> {formatDate(stats.lastIncrementalBackup)}</p>
        </div>
      </div>

      <div className="backup-actions">
        <div className="action-group">
          <h3>Manual Backup</h3>
          <button 
            className="button button-primary"
            onClick={handleCreateFullBackup}
          >
            🔄 Full Backup
          </button>
          <button 
            className="button button-secondary"
            onClick={handleCreateIncrementalBackup}
          >
            💾 Incremental
          </button>
        </div>

        <div className="action-group">
          <h3>Export / Import</h3>
          <button 
            className="button button-secondary"
            onClick={handleExportBackup}
          >
            📥 Export
          </button>
          <label className="button button-secondary file-upload-btn">
            📤 Import
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              disabled={importing}
              style={{ display: 'none' }}
            />
          </label>
          {importing && <p className="loading-text">Importing...</p>}
        </div>

        <div className="action-group danger-zone">
          <h3>⚠️ Danger Zone</h3>
          <button
            className="button button-primary"
            onClick={handleResetDataAndBackup}
            title="Clear stones and history, then create full backup (e.g. before deploy)"
          >
            🔄 Reset data & create backup
          </button>
          <button 
            className="button button-danger"
            onClick={handleClearStoneDatabase}
          >
            🗑️ Clear Stones
          </button>
          <button 
            className="button button-danger"
            onClick={handleClearCalculationHistory}
          >
            🗑️ Clear History
          </button>
          <button 
            className="button button-danger"
            onClick={handleClearAllBackups}
          >
            🗑️ Clear Backups
          </button>
        </div>
      </div>
    </div>
  );
}
