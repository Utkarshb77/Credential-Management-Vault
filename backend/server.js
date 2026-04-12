require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const secretsRouter = require('./src/routes/secrets');
const { router: auditRouter, logEvent } = require('./src/routes/audit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/credential-vault')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const { initScheduler } = require('./src/services/scheduler');

let isUnsealed = false;
let globalMasterKey = null;

// Middleware to check if vault is unsealed
const checkUnsealed = (req, res, next) => {
    if (!isUnsealed && req.path !== '/unseal') {
        return res.status(503).json({ error: 'Vault is sealed. Please unseal with master key.' });
    }
    next();
};

app.use(checkUnsealed);

// Unseal endpoint
app.post('/unseal', (req, res) => {
    const { masterKey } = req.body;
    if (!masterKey || masterKey.length !== 64) {
        return res.status(400).json({ error: 'Valid 32-byte hex master key required' });
    }

    globalMasterKey = masterKey;
    isUnsealed = true;
    initScheduler(globalMasterKey);

    logEvent('Vault Unsealed', 'System', 'SUCCESS', 'Vault unsealed via master key');

    res.json({ message: 'Vault unsealed successfully' });
});

// Seal endpoint (Panic Button)
app.post('/seal', (req, res) => {
    globalMasterKey = null;
    isUnsealed = false;
    
    logEvent('Vault Sealed (Emergency)', 'System', 'INFO', 'Emergency seal triggered by user');
    
    console.log('Vault has been EMERGENCY SEALED.');
    res.json({ message: 'Vault sealed successfully' });
});

// Routes
app.use('/secrets', secretsRouter);
app.use('/audit', auditRouter);

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
