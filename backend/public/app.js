// State
let masterKey = null;

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    dashboard: document.getElementById('dashboard-view')
};
const inputs = {
    masterKey: document.getElementById('master-key-input'),
    newSecretName: document.getElementById('new-secret-name'),
    newSecretValue: document.getElementById('new-secret-value')
};
const buttons = {
    login: document.getElementById('login-btn'),
    logout: document.getElementById('logout-btn'),
    addSecret: document.getElementById('add-secret-btn'),
    saveSecret: document.getElementById('save-secret-btn'),
    cancelCreate: document.getElementById('cancel-create-btn')
};
const containers = {
    secretsList: document.getElementById('secrets-list'),
    createModal: document.getElementById('create-modal')
};

// API Client
async function apiRequest(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'x-master-key': masterKey
    };

    try {
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(endpoint, options);

        if (response.status === 401) {
            alert('Invalid Master Key or Session Expired');
            logout();
            return null;
        }

        // Catch empty responses to avoid "Unexpected end of JSON input"
        const text = await response.text();
        let data = {};
        if (text) {
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('Failed to parse JSON:', text);
                throw new Error('Invalid response from server');
            }
        }

        if (!response.ok) {
            throw new Error(data.error || 'API Request Failed');
        }
        return data;
    } catch (error) {
        alert(error.message);
        return null;
    }
}

// Logic
async function login() {
    const key = inputs.masterKey.value.trim();
    if (key.length !== 64) {
        alert('Master Key must be exactly 64 hex characters (32 bytes).');
        return;
    }

    // Call /unseal to start the vault session for this operator
    const res = await apiRequest('/unseal', 'POST', { masterKey: key });

    if (res) {
        masterKey = key;
        showView('dashboard');
        loadSecrets();
    }
}

function logout() {
    masterKey = null;
    inputs.masterKey.value = '';
    showView('login');
}

function showView(viewName) {
    Object.values(views).forEach(el => el.classList.remove('active'));
    views[viewName].classList.add('active');
}

async function loadSecrets() {
    // Note: The current API doesn't have a specific "List metadata" endpoint that returns ALL secrets without decryption.
    // The GET /secrets/:id endpoint decrypts one.
    // However, the GET /secrets list endpoint was planned but implemented? 
    // Let's check server.js. Ah, routes/secrets.js only has POST / (create) and GET /:id (read one).
    // I need to add GET / to list them all (just names/ids) to make the dashboard work effectively.
    // For now, I will add a method to server.js in the next step.
    // I'll assume it exists for this frontend code.

    // Correction: I must ensure the backend supports listing. 
    // I will write the frontend code assuming I'll fix the backend right after.
    const secrets = await apiRequest('/secrets');
    if (!secrets) return;

    containers.secretsList.innerHTML = '';
    secrets.forEach(renderSecretCard);
}

function renderSecretCard(secret) {
    const div = document.createElement('div');
    div.className = 'secret-card';
    div.innerHTML = `
        <div class="secret-info">
            <h3>${secret.name}</h3>
            <div class="secret-meta">ID: ${secret._id}</div>
            <div id="val-${secret._id}" class="secret-value"></div>
        </div>
        <div class="secret-actions">
            <button class="btn secondary" onclick="revealSecret('${secret._id}')">Reveal</button>
            <button class="btn secondary" onclick="rotateSecret('${secret._id}')">Rotate</button>
        </div>
    `;
    containers.secretsList.appendChild(div);
}

window.revealSecret = async (id) => {
    const data = await apiRequest(`/secrets/${id}`);
    if (data) {
        const valEl = document.getElementById(`val-${id}`);
        valEl.textContent = data.value;
        valEl.classList.toggle('visible');
    }
};

window.rotateSecret = async (id) => {
    if (!confirm('Are you sure you want to rotate this credential? This will run the rotation script.')) return;
    const data = await apiRequest(`/secrets/rotate/${id}`, 'POST');
    if (data) {
        alert('Rotation Successful!');
        // Refresh to get new usage stats if any, or just hide the value
        const valEl = document.getElementById(`val-${id}`);
        valEl.classList.remove('visible');
        valEl.textContent = '';
    }
};

async function createSecret() {
    const name = inputs.newSecretName.value;
    const value = inputs.newSecretValue.value;

    if (!name || !value) {
        alert('Name and Value are required');
        return;
    }

    const res = await apiRequest('/secrets', 'POST', { name, value });
    if (res) {
        closeModal();
        loadSecrets();
        inputs.newSecretName.value = '';
        inputs.newSecretValue.value = '';
    }
}

// Modal handling
function openModal() {
    containers.createModal.classList.remove('hidden');
}
function closeModal() {
    containers.createModal.classList.add('hidden');
}

// Event Listeners
buttons.login.addEventListener('click', login);
buttons.logout.addEventListener('click', logout);
buttons.addSecret.addEventListener('click', openModal);
buttons.cancelCreate.addEventListener('click', closeModal);
buttons.saveSecret.addEventListener('click', createSecret);

// Allow Enter to login
inputs.masterKey.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
});
