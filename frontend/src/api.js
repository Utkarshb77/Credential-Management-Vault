const API_BASE = '';

export async function apiRequest(endpoint, masterKey, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'x-master-key': masterKey,
    'x-role': 'admin',
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE}${endpoint}`, options);

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Invalid response from server');
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

export async function unsealVault(masterKey) {
  return apiRequest('/unseal', masterKey, 'POST', { masterKey });
}

export async function listSecrets(masterKey) {
  return apiRequest('/secrets', masterKey);
}

export async function getSecret(id, masterKey) {
  return apiRequest(`/secrets/${id}`, masterKey);
}

export async function createSecret(name, value, masterKey) {
  return apiRequest('/secrets', masterKey, 'POST', { name, value });
}

export async function rotateSecret(id, masterKey) {
  return apiRequest(`/secrets/rotate/${id}`, masterKey, 'POST');
}

export async function getAuditLogs(masterKey) {
  return apiRequest('/audit', masterKey);
}

export async function sealVault() {
  const response = await fetch('/seal', { method: 'POST' });
  return response.json();
}
