import { useState } from 'react';
import './BackupLogin.css';

interface BackupLoginProps {
  onLogin: () => void;
}

export function BackupLogin({ onLogin }: BackupLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate checking credentials
    setTimeout(() => {
      if (username === 'admin' && password === 'admin') {
        // Save to sessionStorage (clears on browser close)
        sessionStorage.setItem('backup_auth', 'true');
        onLogin();
      } else {
        setError('❌ Invalid username or password');
        setPassword('');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="backup-login">
      <div className="login-container">
        <div className="login-header">
          <h2>🔒 Backup Access</h2>
          <p>This section requires administrator authentication</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="button button-primary login-button"
            disabled={isLoading}
          >
            {isLoading ? '🔄 Checking...' : '🔓 Login'}
          </button>
        </form>

        <div className="login-footer">
          <p className="hint">
            <small>
              💡 Session expires when browser closes
            </small>
          </p>
        </div>
      </div>
    </div>
  );
}
