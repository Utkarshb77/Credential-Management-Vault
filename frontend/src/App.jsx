import { useState, useCallback, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  Shield, 
  Plus, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  LogOut, 
  AlertCircle,
  Key,
  ShieldCheck,
  Search
} from 'lucide-react';
import { unsealVault, listSecrets, getSecret, createSecret, rotateSecret } from './api';

export default function App() {
  const [masterKey, setMasterKey] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [secrets, setSecrets] = useState([]);
  const [revealedValues, setRevealedValues] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const clearError = () => setError('');

  const handleLogin = useCallback(async () => {
    clearError();
    const key = keyInput.trim();
    if (key.length !== 64) {
      setError('Master key must be exactly 64 hex characters (32 bytes).');
      return;
    }
    setLoading(true);
    try {
      await unsealVault(key);
      setMasterKey(key);
      setIsUnlocked(true);
      const data = await listSecrets(key);
      setSecrets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [keyInput]);

  const handleLogout = () => {
    setMasterKey('');
    setIsUnlocked(false);
    setKeyInput('');
    setSecrets([]);
    setRevealedValues({});
    clearError();
  };

  const refreshSecrets = useCallback(async () => {
    try {
      const data = await listSecrets(masterKey);
      setSecrets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  }, [masterKey]);

  const handleReveal = useCallback(async (id) => {
    if (revealedValues[id]) {
      setRevealedValues((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      return;
    }
    try {
      const data = await getSecret(id, masterKey);
      setRevealedValues((prev) => ({ ...prev, [id]: data.value }));
    } catch (err) {
      setError(err.message);
    }
  }, [masterKey, revealedValues]);

  const handleRotate = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to rotate this credential?')) return;
    try {
      await rotateSecret(id, masterKey);
      setRevealedValues((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      refreshSecrets();
    } catch (err) {
      setError(err.message);
    }
  }, [masterKey, refreshSecrets]);

  const handleCreate = useCallback(async () => {
    clearError();
    if (!newName.trim() || !newValue.trim()) {
      setError('Name and value are required.');
      return;
    }
    setLoading(true);
    try {
      await createSecret(newName.trim(), newValue.trim(), masterKey);
      setNewName('');
      setNewValue('');
      setShowModal(false);
      await refreshSecrets();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [newName, newValue, masterKey, refreshSecrets]);

  const filteredSecrets = secrets.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isUnlocked) {
    return (
      <div className="login-container">
        <div className="login-card glass">
          <div className="lock-icon">
            <Shield size={32} color="white" />
          </div>
          <h1>Vault Unseal</h1>
          <p className="subtitle">Secure, Zero-Knowledge Credential Management</p>

          {error && (
            <div className="error-banner">
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
              <button className="dismiss" onClick={clearError}>✕</button>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="master-key-input">MASTER KEY (HEX)</label>
            <div className="input-wrapper">
              <input
                id="master-key-input"
                type="password"
                placeholder="Enter your 32-byte hex master key..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <small className="hint">
              Demo key: <code>aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</code>
            </small>
          </div>

          <button id="login-btn" className="btn btn-primary full-width" onClick={handleLogin} disabled={loading}>
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Unlock size={20} />}
            {loading ? 'Unsealing...' : 'Unseal Vault'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar glass">
        <div className="logo">
          <ShieldCheck className="logo-icon" size={28} />
          <span>CREDENTIAL VAULT</span>
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <div className="status-badge" style={{fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '100px', fontWeight: '700', border: '1px solid rgba(16, 185, 129, 0.2)'}}>
            UNSEALED
          </div>
          <button id="logout-btn" className="btn btn-ghost" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Lock</span>
          </button>
        </div>
      </header>

      <main className="dashboard">
        {error && (
          <div className="error-banner">
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button className="dismiss" onClick={clearError}>✕</button>
          </div>
        )}

        <div className="actions-bar">
          <h2>Stored Secrets</h2>
          <div style={{display: 'flex', gap: '0.75rem'}}>
            <div className="input-wrapper" style={{maxWidth: '240px'}}>
              <Search style={{position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4}} size={16} />
              <input 
                type="text" 
                placeholder="Search secrets..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{paddingLeft: '32px', height: '40px'}}
              />
            </div>
            <button id="add-secret-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={20} />
              <span>New Secret</span>
            </button>
          </div>
        </div>

        {filteredSecrets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Shield size={48} /></div>
            <p>No compatible secrets found in the vault.</p>
            <button className="btn btn-outline" onClick={() => setShowModal(true)}>Create your first secret</button>
          </div>
        ) : (
          <div className="secrets-list">
            {filteredSecrets.map((secret) => (
              <div className="secret-card glass" key={secret._id}>
                <div className="secret-info">
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px'}}>
                    <Key size={16} style={{color: 'var(--primary)'}} />
                    <h3>{secret.name}</h3>
                  </div>
                  <span className="secret-id">UID: {secret._id}</span>
                  {revealedValues[secret._id] && (
                    <div className="secret-value-container">
                      <div className="secret-value">{revealedValues[secret._id]}</div>
                    </div>
                  )}
                </div>
                <div className="secret-actions">
                  <button className="btn btn-outline" onClick={() => handleReveal(secret._id)}>
                    {revealedValues[secret._id] ? <EyeOff size={18} /> : <Eye size={18} />}
                    <span>{revealedValues[secret._id] ? 'Hide' : 'Reveal'}</span>
                  </button>
                  <button className="btn btn-outline" onClick={() => handleRotate(secret._id)}>
                    <RefreshCw size={18} />
                    <span>Rotate</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card glass" onClick={(e) => e.stopPropagation()}>
            <h3>Store New Secret</h3>
            <div className="input-group">
              <label htmlFor="new-secret-name">IDENTIFIER</label>
              <input
                id="new-secret-name"
                type="text"
                placeholder="e.g., prod-database-password"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="new-secret-value">SECRET VALUE</label>
              <input
                id="new-secret-value"
                type="password"
                placeholder="Enter sensitive value..."
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="modal-actions">
              <button id="cancel-create-btn" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="save-secret-btn" className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <Shield size={20} />}
                <span>{loading ? 'Encrypting...' : 'Encrypt & Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
