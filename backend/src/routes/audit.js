const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');

// Middleware to check for Master Key (Security)
const requireMasterKey = (req, res, next) => {
    const masterKey = req.headers['x-master-key'];
    if (!masterKey || masterKey.length !== 64) {
        return res.status(401).json({ error: 'Vault authentication required' });
    }
    next();
};

// GET /audit - Fetch recent security logs
router.get('/', requireMasterKey, async (req, res) => {
    try {
        const logs = await AuditLog.find()
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// Helper function to log events (for internal use)
const logEvent = async (event, secretName, status, details) => {
    try {
        const log = new AuditLog({ event, secretName, status, details });
        await log.save();
    } catch (err) {
        console.error('Audit logging failed:', err);
    }
};

module.exports = { router, logEvent };
