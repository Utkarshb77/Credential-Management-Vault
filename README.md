# Credential Management Vault

A secure, zero-knowledge secrets vault similar to HashiCorp Vault.

## Architecture

- **Zero-Knowledge**: The vault is "sealed" on startup. The master key is never stored on disk or in the database. It must be provided via the `/unseal` API and is kept only in memory.
- **Strong Encryption**: All secrets are encrypted using **AES-256-GCM** with unique IVs and authentication tags.
- **RBAC Policies**: Access is controlled by JSON policy files in the `policies/` directory. These are Git-trackable for auditing.
- **Scheduled Rotation**: Shell scripts in the `scripts/` directory handle rotation of database passwords, API keys, and certificates.
- **Security Hardening**: A security script ensures correct Unix file permissions (chmod 600) for sensitive files.

## API Usage

### 1. Unseal the Vault
Before any operation, you must unseal the vault.
```bash
curl -X POST http://localhost:3000/unseal \
  -H "Content-Type: application/json" \
  -d '{"masterKey": "YOUR_64_CHAR_HEX_KEY"}'
```

### 2. Create a Secret
```bash
curl -X POST http://localhost:3000/secrets \
  -H "x-master-key: YOUR_64_CHAR_HEX_KEY" \
  -H "x-role: admin" \
  -H "Content-Type: application/json" \
  -d '{"name": "DB_PASSWORD", "value": "supersecret"}'
```

### 3. Read a Secret
```bash
curl -H "x-master-key: YOUR_64_CHAR_HEX_KEY" \
     -H "x-role: readonly" \
     http://localhost:3000/secrets/SECRET_ID
```

### 4. Rotate a Secret
```bash
curl -X POST http://localhost:3000/secrets/rotate/SECRET_ID \
     -H "x-master-key: YOUR_64_CHAR_HEX_KEY" \
     -H "x-role: admin"
```

## Deployment (Render)

This project is configured for easy deployment on [Render](https://render.com).

1.  **Create a New Web Service** on Render.
2.  **Connect your Repository**.
3.  **Configure build settings**:
    -   **Runtime**: Node
    -   **Build Command**: `npm run render-build`
    -   **Start Command**: `npm start`
4.  **Add Environment Variables**:
    -   `MONGODB_URI`: Your MongoDB Atlas connection string.
    -   `PORT`: `3000` (optional).

The backend automatically serves the production build of the frontend from the `frontend/dist` directory.

## Local Development

### 1. Install Dependencies
Run from the root directory:
```bash
npm run install:all
```

### 2. Configure Environment
Create a `.env` file in the `backend/` directory based on `.env.example`.

### 3. Start Development Servers
- **Backend**: `npm start --prefix backend`
- **Frontend**: `npm run dev --prefix frontend`
