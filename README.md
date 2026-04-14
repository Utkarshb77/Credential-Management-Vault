<div align="center">

# 🔐 Credential Management Vault

### A Zero-Knowledge Secrets Management System

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

<br/>

A secure, full-stack credential vault inspired by **[HashiCorp Vault](https://www.vaultproject.io/)** — featuring **AES-256-GCM encryption**, a **seal/unseal lifecycle**, **role-based access control (RBAC)**, **automated secret rotation**, and a comprehensive **security audit trail**.

<br/>

[Features](#-features) · [Architecture](#-architecture) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [API Reference](#-api-reference)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🛡️ Security First
- **AES-256-GCM** encryption for all secrets
- **Zero-Knowledge** — master key is never stored on disk
- **bcrypt** password hashing with salting
- **JWT** stateless authentication (12h expiry)
- **Emergency Seal** (Panic Button) to instantly lock the vault

</td>
<td width="50%">

### ⚙️ Enterprise Features
- **Role-Based Access Control** via JSON policies
- **Secret Rotation** (DB passwords, API keys, certificates)
- **Audit Trail** logging every vault operation
- **Ownership Isolation** — users access only their secrets
- **Automated Rotation Scheduler** framework

</td>
</tr>
<tr>
<td width="50%">

### 🖥️ Modern Frontend
- Sleek **glassmorphism** dark-themed UI
- Real-time **search & filter** secrets
- One-click **reveal / hide** decrypted values
- **Copy-to-clipboard** with visual feedback
- Responsive design for all screen sizes

</td>
<td width="50%">

### 🚀 Developer Experience
- **Monorepo** structure (single repo, single deploy)
- **Vite** dev server with API proxying
- **One-command** build & deploy
- Git-trackable RBAC policy files
- End-to-end verification script

</td>
</tr>
</table>

---

## 🏗️ Architecture

### Zero-Knowledge Seal / Unseal Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                          SERVER STARTS                              │
│                     Vault is SEALED 🔒                              │
│              (No secret operations allowed)                         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                    User authenticates
                    (Login / Signup)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  POST /unseal { masterKey }                         │
│           Master key is validated & held IN MEMORY ONLY             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Vault is UNSEALED 🔓                            │
│          Full CRUD operations on secrets are available               │
│     ┌──────────┬──────────┬──────────┬──────────────────┐           │
│     │  Create  │   Read   │  Rotate  │   Audit Logs     │           │
│     └──────────┴──────────┴──────────┴──────────────────┘           │
└───────────────┬──────────────────────────────┬──────────────────────┘
                │                              │
        Server Restart                  POST /seal (Panic)
                │                              │
                ▼                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Master key WIPED from memory                           │
│                   Vault re-SEALED 🔒                                │
└─────────────────────────────────────────────────────────────────────┘
```

> **The master encryption key is never stored on disk or in the database.** It exists only in server memory while the vault is unsealed. A server restart or emergency seal immediately destroys it.

### Encryption Pipeline

```
                ┌──────────────┐
                │  Plain Text  │   "my-database-password-123"
                └──────┬───────┘
                       │
            ┌──────────▼──────────┐
            │   AES-256-GCM       │
            │                     │
            │  Key: Master Key    │──── 256-bit (64 hex chars)
            │  IV:  Random 12B    │──── Unique per encryption
            │  Mode: GCM (AEAD)   │
            └──┬──────────┬───┬───┘
               │          │   │
               ▼          ▼   ▼
         ┌──────────┐ ┌────┐ ┌────────┐
         │Ciphertext│ │ IV │ │AuthTag │   ← Stored in MongoDB
         │  (hex)   │ │(hex│ │ (hex)  │     (all encrypted)
         └──────────┘ └────┘ └────────┘
```

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         React 19  +  Lucide Icons  +  Vite          │    │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │    │
│  │  │ Auth UI  │  │Dashboard │  │  Audit Panel      │ │    │
│  │  └──────────┘  └──────────┘  └───────────────────┘ │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │        api.js  (HTTP Client Layer)           │   │    │
│  │  └──────────────────────┬───────────────────────┘   │    │
│  └─────────────────────────┼───────────────────────────┘    │
└────────────────────────────┼────────────────────────────────┘
                             │  REST API (JSON)
                             │  Authorization: Bearer <JWT>
                             │  x-master-key: <64-char hex>
┌────────────────────────────┼────────────────────────────────┐
│                    SERVER (Express 5)                        │
│  ┌─────────────────────────┼───────────────────────────┐    │
│  │              Middleware Pipeline                     │    │
│  │  ┌────────┐  ┌──────────┐  ┌────────┐  ┌────────┐  │    │
│  │  │  CORS  │→ │ JWT Auth │→ │ Unseal │→ │  RBAC  │  │    │
│  │  └────────┘  └──────────┘  └────────┘  └────────┘  │    │
│  └─────────────────────────┼───────────────────────────┘    │
│  ┌──────────┐  ┌───────────┐  ┌────────────────────────┐   │
│  │  Routes  │  │ Services  │  │    Security Layer       │   │
│  │ /auth    │  │ encrypt() │  │ policies/*.json (RBAC)  │   │
│  │ /secrets │  │ decrypt() │  │ scripts/*.sh (rotation) │   │
│  │ /audit   │  │ scheduler │  │ harden_security.sh      │   │
│  │ /unseal  │  │           │  │                         │   │
│  │ /seal    │  │           │  │                         │   │
│  └──────────┘  └───────────┘  └────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │  Mongoose ODM
                             ▼
              ┌──────────────────────────────┐
              │     MongoDB (Atlas)           │
              │  ┌────────┐  ┌────────────┐  │
              │  │ Users  │  │  Secrets   │  │
              │  ├────────┤  ├────────────┤  │
              │  │username │  │name        │  │
              │  │email    │  │encryptedData│ │
              │  │passHash │  │iv          │  │
              │  │masterKey│  │authTag     │  │
              │  │  Hash   │  │owner       │  │
              │  │role     │  │rotationType│  │
              │  └────────┘  └────────────┘  │
              │  ┌────────────┐              │
              │  │ Audit Logs │              │
              │  ├────────────┤              │
              │  │event       │              │
              │  │secretName  │              │
              │  │status      │              │
              │  │details     │              │
              │  │timestamp   │              │
              │  └────────────┘              │
              └──────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Runtime** | Node.js | Server-side JavaScript |
| **Framework** | Express 5 | REST API & middleware |
| **Database** | MongoDB + Mongoose | Document storage with schema validation |
| **Encryption** | Node.js `crypto` (AES-256-GCM) | Secret encryption/decryption |
| **Auth** | JWT + bcryptjs | Stateless auth & password hashing |
| **Frontend** | React 19 | Component-based UI |
| **Build Tool** | Vite 8 | Fast dev server & production bundler |
| **Icons** | Lucide React | SVG icon library |
| **Styling** | Vanilla CSS (Glassmorphism) | Dark-themed modern UI |
| **Deployment** | Render | Cloud hosting |

---

## 📂 Project Structure

```
credential-vault/
├── 📄 package.json              # Monorepo scripts
├── 📄 render.yaml               # Render deployment config
│
├── 🔧 backend/
│   ├── server.js                # Express entry point + seal/unseal logic
│   ├── .env.example             # Environment variables template
│   │
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT verification + role-based guards
│   │   ├── models/
│   │   │   ├── User.js          # User schema (credentials, role, master key hash)
│   │   │   ├── Secret.js        # Secret schema (encrypted data, IV, authTag)
│   │   │   └── AuditLog.js      # Audit trail schema
│   │   ├── routes/
│   │   │   ├── auth.js          # Signup & Login endpoints
│   │   │   ├── secrets.js       # CRUD + rotation endpoints
│   │   │   └── audit.js         # Audit log endpoint & logger helper
│   │   └── services/
│   │       ├── encryption.js    # AES-256-GCM encrypt/decrypt functions
│   │       └── scheduler.js     # Automated rotation scheduler
│   │
│   ├── policies/                # RBAC policy definitions (Git-trackable)
│   │   ├── admin.json           # Full access: create, read, rotate, delete
│   │   ├── user.json            # Standard: create, read, rotate
│   │   └── readonly.json        # Limited: read only
│   │
│   └── scripts/                 # Rotation & security scripts
│       ├── rotate_db_password.sh
│       ├── rotate_api_key.sh
│       ├── rotate_certificate.sh
│       ├── harden_security.sh   # Unix permission hardening
│       └── verify_vault.js      # End-to-end test script
│
└── 🎨 frontend/
    ├── vite.config.js           # Build output → backend/public + dev proxy
    ├── index.html               # HTML entry with meta tags & fonts
    └── src/
        ├── main.jsx             # React entry point
        ├── App.jsx              # Complete UI (auth, unseal, dashboard)
        ├── api.js               # Centralized API client
        └── index.css            # Glassmorphism design system
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **MongoDB** (local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Utkarshb77/Credential-Management-Vault.git
cd Credential-Management-Vault

# 2. Install all dependencies (backend + frontend)
npm run install:all

# 3. Configure environment variables
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your values:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/credential-vault
JWT_SECRET=your-strong-random-secret-here
```

### Running Locally

```bash
# Terminal 1 — Start the backend
npm start --prefix backend
# → Server running on http://localhost:3000

# Terminal 2 — Start the frontend dev server
npm run dev --prefix frontend
# → Vite running on http://localhost:5173 (auto-proxies API calls)
```

### Usage Flow

1. **Sign Up** — Create your account (first user becomes admin)
2. **Enter Master Key** — Provide a 64-character hex key to unseal the vault
   ```
   Example key: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
   ```
3. **Store Secrets** — Add credentials with names and rotation types
4. **Manage** — Reveal, copy, rotate, and audit your secrets

---

## 📡 API Reference

> All endpoints (except auth) require `Authorization: Bearer <JWT_TOKEN>` header.
> Secret operations additionally require `x-master-key: <64-char-hex-key>` header.

### Authentication

| Method | Endpoint | Body | Description |
|:-------|:---------|:-----|:------------|
| `POST` | `/auth/signup` | `{ username, email, password }` | Register a new user |
| `POST` | `/auth/login` | `{ email, password }` | Login & receive JWT token |

### Vault Operations

| Method | Endpoint | Body | Description |
|:-------|:---------|:-----|:------------|
| `POST` | `/unseal` | `{ masterKey }` | Unseal the vault with master key |
| `POST` | `/seal` | — | 🚨 Emergency seal (admin only) |

### Secrets

| Method | Endpoint | Body | Description |
|:-------|:---------|:-----|:------------|
| `POST` | `/secrets` | `{ name, value, rotationType }` | Create & encrypt a new secret |
| `GET` | `/secrets` | — | List all secrets (metadata only) |
| `GET` | `/secrets/:id` | — | Read & decrypt a specific secret |
| `POST` | `/secrets/rotate/:id` | `{ type? }` | Rotate a secret's value |

### Audit

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/audit` | Fetch last 50 security audit events |

<details>
<summary><b>📋 Example: Full API Workflow with cURL</b></summary>

```bash
# 1. Sign up
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "email": "admin@example.com", "password": "securepass123"}'

# → Save the "token" from the response

# 2. Unseal the vault
curl -X POST http://localhost:3000/unseal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"masterKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'

# 3. Create a secret
curl -X POST http://localhost:3000/secrets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-master-key: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" \
  -d '{"name": "DB_PASSWORD", "value": "supersecret123", "rotationType": "db_password"}'

# 4. List secrets
curl http://localhost:3000/secrets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-master-key: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

# 5. Read a secret (decrypted)
curl http://localhost:3000/secrets/SECRET_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-master-key: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

# 6. Rotate a secret
curl -X POST http://localhost:3000/secrets/rotate/SECRET_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-master-key: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
```

</details>

---

## 🔒 Security Design

| Layer | Implementation | Details |
|:------|:---------------|:--------|
| **Encryption** | AES-256-GCM | AEAD cipher — provides confidentiality + integrity |
| **Key Management** | Zero-Knowledge | Master key held only in server RAM, never persisted |
| **Password Storage** | bcrypt (10 rounds) | One-way hash with random salt per password |
| **Authentication** | JWT (12h expiry) | Signed tokens with `{ userId, email, role }` payload |
| **Authorization** | RBAC Policies | JSON policy files: `admin`, `user`, `readonly` roles |
| **Data Isolation** | Ownership queries | Users see only their own secrets; admins see all |
| **Audit** | Event logging | Every operation logged with timestamp and status |
| **Emergency** | Panic Seal | Admin can instantly wipe encryption key from memory |
| **Rotation** | Shell scripts | Automated credential rotation for passwords, keys, certs |
| **Hardening** | File permissions | `chmod 600/700` for sensitive files (Unix) |

### RBAC Permissions Matrix

| Permission | Admin | User | Readonly |
|:-----------|:-----:|:----:|:--------:|
| `create:secret` | ✅ | ✅ | ❌ |
| `read:secret` | ✅ | ✅ | ✅ |
| `rotate:secret` | ✅ | ✅ | ❌ |
| `delete:secret` | ✅ | ❌ | ❌ |

---

## 🧩 How It Works — In Brief

```
User Signs Up  →  Gets JWT Token  →  Provides Master Key  →  Vault Unseals
                                                                    │
                      ┌─────────────────────────────────────────────┤
                      ▼                                             ▼
              Create Secret                                  Read Secret
              ┌──────────┐                                  ┌──────────┐
              │ Plaintext │                                  │  Fetch   │
              │     ↓     │                                  │ encrypted│
              │ AES-256   │                                  │ from DB  │
              │ Encrypt   │                                  │     ↓    │
              │     ↓     │                                  │ AES-256  │
              │ Store in  │                                  │ Decrypt  │
              │  MongoDB  │                                  │     ↓    │
              └──────────┘                                  │ Plaintext│
                                                            └──────────┘
```

---

## 📄 License

This project is open source and available under the [ISC License](LICENSE).

---

<div align="center">

**Built with 🔐 security in mind**

[⬆ Back to Top](#-credential-management-vault)

</div>
