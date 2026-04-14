const API_BASE = '';
let authToken = '';

export function setAuthToken(token) {
  authToken = token || '';
}

export async function apiRequest(endpoint, masterKey, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (masterKey) headers['x-master-key'] = masterKey;
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

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

export async function signup(username, email, password, masterKey = null) {
  const body = masterKey ? { username, email, password, masterKey } : { username, email, password };
  return apiRequest('/auth/signup', null, 'POST', body);
}

export async function login(email, password) {
  return apiRequest('/auth/login', null, 'POST', { email, password });
}

export async function listSecrets(masterKey) {
  return apiRequest('/secrets', masterKey);
}

export async function getSecret(id, masterKey) {
  return apiRequest(`/secrets/${id}`, masterKey);
}

export async function createSecret(name, value, masterKey, rotationType = 'db_password') {
  return apiRequest('/secrets', masterKey, 'POST', { name, value, rotationType });
}

export async function rotateSecret(id, masterKey, type = null) {
  return apiRequest(`/secrets/rotate/${id}`, masterKey, 'POST', type ? { type } : null);
}

export async function getAuditLogs(masterKey) {
  return apiRequest('/audit', masterKey);
}

export async function sealVault() {
  return apiRequest('/seal', null, 'POST');
}
