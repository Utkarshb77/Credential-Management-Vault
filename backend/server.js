require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const secretsRouter = require('./src/routes/secrets');
const { router: auditRouter, logEvent } = require('./src/routes/audit');
const authRouter = require('./src/routes/auth');
const { requireAuth, requireRole } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/credential-vault')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const { initScheduler } = require('./src/services/scheduler');

let isUnsealed = false;
let globalMasterKey = null;
const isValidMasterKey = (value) => typeof value === 'string' && value.length === 64 && /^[0-9a-fA-F]+$/.test(value);

// Middleware to check if vault is unsealed
const checkUnsealed = (req, res, next) => {
    if (!isUnsealed && req.path !== '/unseal' && !req.path.startsWith('/auth')) {
        return res.status(503).json({ error: 'Vault is sealed. Please unseal with master key.' });
    }
    next();
};

app.use('/auth', authRouter);

// Unseal endpoint
app.post('/unseal', requireAuth, async (req, res) => {
    const { masterKey } = req.body;
    if (!isValidMasterKey(masterKey)) {
        return res.status(400).json({ error: 'Valid 32-byte hex master key required' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }

    if (!user.masterKeyHash) {
        user.masterKeyHash = await bcrypt.hash(masterKey, 10);
        await user.save();
    } else {
        const isMasterKeyMatch = await bcrypt.compare(masterKey, user.masterKeyHash);
        if (!isMasterKeyMatch) {
            return res.status(403).json({ error: 'Invalid master key for this account' });
        }
    }

    globalMasterKey = masterKey;
    isUnsealed = true;
    initScheduler(globalMasterKey);

    logEvent('Vault Unsealed', 'System', 'SUCCESS', 'Vault unsealed via master key');

    res.json({ message: 'Vault unsealed successfully' });
});

// Seal endpoint (Panic Button)
app.post('/seal', requireAuth, requireRole('admin'), (req, res) => {
    globalMasterKey = null;
    isUnsealed = false;
    
    logEvent('Vault Sealed (Emergency)', 'System', 'INFO', 'Emergency seal triggered by user');
    
    console.log('Vault has been EMERGENCY SEALED.');
    res.json({ message: 'Vault sealed successfully' });
});

// Routes
app.use('/secrets', requireAuth, checkUnsealed, secretsRouter);
app.use('/audit', requireAuth, checkUnsealed, auditRouter);

// Handle React routing, return all requests to React app
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Vault is currently SEALED.');
});
