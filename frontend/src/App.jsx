import { useState, useCallback } from "react";
import {
  unsealVault,
  listSecrets,
  getSecret,
  createSecret,
  rotateSecret,
} from "./api";

export default function App() {
  const [masterKey, setMasterKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [secrets, setSecrets] = useState([]);
  const [revealedValues, setRevealedValues] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Ensure master key is valid before enabling unlock button (64 hex characters)
  const isValidKey =
    keyInput.trim().length === 64 && /^[0-9a-fA-F]+$/.test(keyInput.trim());

  const clearError = () => setError("");

  const handleLogin = useCallback(async () => {
    clearError();
    const key = keyInput.trim();
    if (key.length !== 64) {
      setError("Master key must be exactly 64 hex characters (32 bytes).");
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
    setMasterKey("");
    setIsUnlocked(false);
    setKeyInput("");
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

  const handleReveal = useCallback(
    async (id) => {
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
    },
    [masterKey, revealedValues],
  );

  const handleRotate = useCallback(
    async (id) => {
      if (!window.confirm("Are you sure you want to rotate this credential?"))
        return;
      try {
        await rotateSecret(id, masterKey);
        setRevealedValues((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
        alert("Rotation successful!");
      } catch (err) {
        setError(err.message);
      }
    },
    [masterKey],
  );

  const handleCreate = useCallback(async () => {
    clearError();
    if (!newName.trim() || !newValue.trim()) {
      setError("Name and value are required.");
      return;
    }
    setLoading(true);
    try {
      await createSecret(newName.trim(), newValue.trim(), masterKey);
      setNewName("");
      setNewValue("");
      setShowModal(false);
      await refreshSecrets();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [newName, newValue, masterKey, refreshSecrets]);

  if (!isUnlocked) {
    return (
      <div className="app">
        <div className="login-container">
          <div className="login-card">
            <div className="lock-icon">🔒</div>
            <h1>Credential Vault</h1>
            <p className="subtitle">Zero-Knowledge Architecture</p>
            {error && <div className="error-banner">{error}</div>}
            <div className="input-group">
              <label htmlFor="master-key-input">Master Key (64-char hex)</label>
              <input
                id="master-key-input"
                type="password"
                placeholder="Enter your 32-byte hex master key..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <small className="hint">
                Demo key:{" "}
                <code>
                  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                </code>
              </small>
            </div>

            <button
              id="login-btn"
              className="btn btn-primary full-width"
              onClick={handleLogin}
              disabled={loading || !isValidKey}
            >
              {loading ? "Unlocking..." : "Unlock Vault"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">🔐 Credential Vault</div>
        <button
          id="logout-btn"
          className="btn btn-ghost"
          onClick={handleLogout}
        >
          Lock Vault
        </button>
      </header>

      <main className="dashboard">
        {error && (
          <div className="error-banner">
            {error}
            <button className="dismiss" onClick={clearError}>
              ✕
            </button>
          </div>
        )}

        <div className="actions-bar">
          <h2>Stored Secrets</h2>
          <button
            id="add-secret-btn"
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            + New Secret
          </button>
        </div>

        {secrets.length === 0 ? (
          <div className="empty-state">
            <p>
              No secrets stored yet. Click <strong>+ New Secret</strong> to add
              one.
            </p>
          </div>
        ) : (
          <div className="secrets-list">
            {secrets.map((secret) => (
              <div className="secret-card" key={secret._id}>
                <div className="secret-info">
                  <h3>{secret.name}</h3>
                  <span className="secret-id">ID: {secret._id}</span>
                  {revealedValues[secret._id] && (
                    <div className="secret-value">
                      {revealedValues[secret._id]}
                    </div>
                  )}
                </div>
                <div className="secret-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => handleReveal(secret._id)}
                  >
                    {revealedValues[secret._id] ? "Hide" : "Reveal"}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => handleRotate(secret._id)}
                  >
                    Rotate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Store New Secret</h3>
            <div className="input-group">
              <label htmlFor="new-secret-name">Name</label>
              <input
                id="new-secret-name"
                type="text"
                placeholder="e.g., db-prod-password"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="new-secret-value">Value</label>
              <input
                id="new-secret-value"
                type="password"
                placeholder="Secret value..."
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="modal-actions">
              <button
                id="cancel-create-btn"
                className="btn btn-outline"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                id="save-secret-btn"
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? "Saving..." : "Encrypt & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
