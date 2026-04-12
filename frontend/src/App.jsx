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
  Search,
  Copy,
  Check,
  Clock,
  Database,
  Activity,
  Layers,
  ShieldAlert,
  Terminal,
  History,
  Info,
  Zap
} from 'lucide-react';
import { unsealVault, listSecrets, getSecret, createSecret, rotateSecret, getAuditLogs, sealVault } from './api';

export default function App() {
  const [masterKey, setMasterKey] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [secrets, setSecrets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [revealedValues, setRevealedValues] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copyStatus, setCopyStatus] = useState({});

  // Ensure master key is valid before enabling unlock button (64 hex characters)
  const isValidKey = keyInput.trim().length === 64 && /^[0-9a-fA-F]+$/.test(keyInput.trim());

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
      const logs = await getAuditLogs(key);
      setAuditLogs(logs);
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
    setAuditLogs([]);
    setRevealedValues({});
    clearError();
  };

  const handlePanic = async () => {
    if (!window.confirm('EMERGENCY: Are you sure you want to seal the vault? This will wipe the master key from server memory.')) return;
    try {
      await sealVault();
      handleLogout();
    } catch (err) {
      setError('Panic button failed to contact server. Please verify network.');
    }
  };

  const refreshSecrets = useCallback(async () => {
    try {
      const data = await listSecrets(masterKey);
      setSecrets(Array.isArray(data) ? data : []);
      const logs = await getAuditLogs(masterKey);
      setAuditLogs(logs);
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

  const handleCopy = useCallback((id, value) => {
    navigator.clipboard.writeText(value);
    setCopyStatus((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopyStatus((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  }, []);

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

  const stats = {
    total: secrets.length,
    active: secrets.length,
    health: '100%',
  };

  if (!isUnlocked) {
    return (
      <div className="login-container">
        <div className="login-card glass">
          <div className="lock-icon">
            <Lock size={36} color="white" />
          </div>
          <h1>Vault Unseal</h1>
          <p className="subtitle">Secure, Zero-Knowledge Credential Infrastructure</p>

          {error && (
            <div className="error-banner glass-panel" style={{marginBottom: '2rem', borderLeft: '4px solid var(--danger)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem'}}>
                <ShieldAlert size={18} style={{color: 'var(--danger)'}} />
                <span>{error}</span>
              </div>
              <button className="dismiss" onClick={clearError} style={{background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '1rem'}}>✕</button>
            </div>
          )}

          <div className="input-group">
            <label>MASTER AUTHENTICATION KEY</label>
            <div className="input-wrapper">
              <input
                type="password"
                placeholder="Paste your 64-char hex key..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="hint">
              <small style={{display: 'block', marginBottom: '0.5rem', opacity: 0.6}}>SYSTEM REQUIREMENT: AES-256 CONFORMANT KEY</small>
              <code>aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</code>
            </div>
          </div>

          <button className="btn btn-primary full-width" onClick={handleLogin} disabled={loading || !isValidKey} style={{height: '56px', marginTop: '1rem'}}>
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Unlock size={20} />}
            <span>{loading ? 'INITIALIZING...' : 'UNSEAL VAULT'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar glass">
        <div className="logo">
          <ShieldCheck className="logo-icon" size={32} />
          <span>CREDENTIAL VAULT</span>
        </div>
        <div style={{display: 'flex', gap: '1.25rem', alignItems: 'center'}}>
          <div className="glass-panel" style={{padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <span style={{width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981'}}></span>
            <span style={{fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.05em'}}>SYSTEM ACTIVE</span>
          </div>
          <button className="btn btn-outline" onClick={handleLogout} style={{padding: '0.5rem 1rem'}}>
            <LogOut size={16} />
            <span>Sec-Lock</span>
          </button>
          <button className="btn btn-danger panic-btn" onClick={handlePanic} style={{padding: '0.5rem 1rem', background: 'var(--danger)', color: 'white'}}>
            <Zap size={16} />
            <span>PANIC</span>
          </button>
        </div>
      </header>

      <main className="dashboard" style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '2rem', maxWidth: '1400px'}}>
        <div className="main-content">
          <div className="stats-grid">
            <div className="stat-card glass">
              <div className="stat-icon" style={{background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)'}}>
                <Database size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-label">PROTECTED ENTITIES</p>
                <h4 className="stat-value">{stats.total}</h4>
              </div>
            </div>
            <div className="stat-card glass">
              <div className="stat-icon" style={{background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)'}}>
                <Shield size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-label">INFRASTRUCTURE HEALTH</p>
                <h4 className="stat-value">{stats.health}</h4>
              </div>
            </div>
            <div className="stat-card glass">
              <div className="stat-icon" style={{background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6'}}>
                <Activity size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-label">ACTIVE POLICIES</p>
                <h4 className="stat-value" style={{fontSize: '1.2rem'}}>Admin:Global</h4>
              </div>
            </div>
          </div>

          <div className="actions-bar">
            <div>
              <h2>Secrets Infrastructure</h2>
            </div>
            <div style={{display: 'flex', gap: '1rem'}}>
              <div className="input-wrapper" style={{width: '240px', position: 'relative'}}>
                <Search style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3}} size={18} />
                <input 
                  type="text" 
                  placeholder="Search secrets..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{paddingLeft: '3rem', height: '48px'}}
                />
              </div>
              <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{height: '48px'}}>
                <Plus size={20} />
                <span>New Secret</span>
              </button>
            </div>
          </div>

          {filteredSecrets.length === 0 ? (
            <div className="empty-state glass" style={{borderRadius: '32px', padding: '4rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'}}>
              <Layers size={48} style={{opacity: 0.1}} />
              <h3>Vault is Empty</h3>
              <button className="btn btn-outline" style={{marginTop: '1rem'}} onClick={() => setShowModal(true)}>
                Add First Secret
              </button>
            </div>
          ) : (
            <div className="secrets-list">
              {filteredSecrets.map((secret) => (
                <div className="secret-card glass" key={secret._id}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1}}>
                    <div className="glass-panel" style={{width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <Key size={20} style={{color: 'var(--primary)'}} />
                    </div>
                    <div className="secret-info">
                      <h3>{secret.name}</h3>
                      <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                        <span className="secret-id">ID: {secret._id.slice(-8)}</span>
                        <span style={{display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                          <Clock size={12} />
                          {new Date(secret.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {revealedValues[secret._id] && (
                        <div className="secret-value-container">
                          <div className="secret-value">{revealedValues[secret._id]}</div>
                          <button className="copy-btn" onClick={() => handleCopy(secret._id, revealedValues[secret._id])} style={{width: '36px', height: '36px', border: '1px solid var(--border)', background: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px'}}>
                            {copyStatus[secret._id] ? <Check size={16} color="var(--accent)" /> : <Copy size={16} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="secret-actions" style={{display: 'flex', gap: '0.5rem'}}>
                    <button className="btn btn-outline" onClick={() => handleReveal(secret._id)} style={{padding: '0.5rem 1rem'}}>
                      {revealedValues[secret._id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      <span>{revealedValues[secret._id] ? 'Hide' : 'Reveal'}</span>
                    </button>
                    <button className="btn btn-outline" onClick={() => handleRotate(secret._id)} style={{padding: '0.5rem 1rem'}}>
                      <RefreshCw size={16} />
                      <span>Rotate</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="activity-panel glass" style={{borderRadius: 'var(--radius-lg)', padding: '2rem', display: 'flex', flexDirection: 'column', height: 'fit-content', position: 'sticky', top: '100px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
              <History size={20} style={{color: 'var(--primary)'}} />
              <h3 style={{fontSize: '1.25rem', fontWeight: '800'}}>Security Audit</h3>
            </div>
            <button className="btn btn-ghost" onClick={refreshSecrets} style={{padding: '0.4rem'}}>
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="audit-timeline" style={{display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', maxHeight: '600px', paddingRight: '0.5rem'}}>
            {auditLogs.length === 0 ? (
              <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>
                <Terminal size={32} style={{opacity: 0.1, marginBottom: '1rem'}} />
                <p style={{fontSize: '0.8rem'}}>Access logs will appear here</p>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div className="audit-entry glass-panel" key={log._id} style={{padding: '1rem', borderLeft: `3px solid ${log.status === 'SUCCESS' ? 'var(--accent)' : log.status === 'FAILURE' ? 'var(--danger)' : 'var(--primary)'}`}}>
                   <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem'}}>
                     <span style={{fontSize: '0.7rem', fontWeight: '800', color: log.status === 'SUCCESS' ? 'var(--accent)' : 'inherit', letterSpacing: '0.05em'}}>
                       {log.event.toUpperCase()}
                     </span>
                     <span style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>
                       {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </span>
                   </div>
                   <p style={{fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem'}}>{log.secretName}</p>
                   <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3'}}>{log.details}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div className="modal-card glass" onClick={(e) => e.stopPropagation()} style={{padding: '3rem', borderRadius: '24px', width: '100%', maxWidth: '480px'}}>
            <h3 style={{marginBottom: '2rem'}}>Register Credential</h3>
            <div className="input-group">
              <label>NAME</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="e.g. AWS_ACCESS_KEY"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
            </div>
            <div className="input-group">
              <label>VALUE</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  placeholder="Paste sensitive data..."
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
            </div>
            <div className="modal-actions" style={{display: 'flex', gap: '1rem', marginTop: '2.5rem'}}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)} style={{flex: 1}}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading} style={{flex: 2}}>
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <Unlock size={20} />}
                <span>{loading ? 'Encrypting...' : 'Secure & Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
