const express = require('express');
const router = express.Router();
const Secret = require('../models/Secret');
const { encrypt, decrypt } = require('../services/encryption');
const { logEvent } = require('./audit');

const fs = require('fs');
const path = require('path');

// Middleware to check for Master Key
const requireMasterKey = (req, res, next) => {
    const masterKey = req.headers['x-master-key'];
    if (!masterKey || masterKey.length !== 64) {
        return res.status(401).json({ error: 'Valid Master Key (32-byte hex) required' });
    }
    req.masterKey = masterKey;
    next();
};

// Middleware for RBAC Policy Enforcement
const authorize = (permission) => {
    return (req, res, next) => {
        const role = req.headers['x-role'] || 'readonly';
        const policyPath = path.join(__dirname, `../../policies/${role}.json`);

        if (!fs.existsSync(policyPath)) {
            return res.status(403).json({ error: `Policy for role '${role}' not found` });
        }

        try {
            const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
            if (policy.permissions.includes(permission)) {
                return next();
            }
            res.status(403).json({ error: `Permission '${permission}' denied for role '${role}'` });
        } catch (error) {
            res.status(500).json({ error: 'Failed to parse policy' });
        }
    };
};

// Create a Secret
router.post('/', requireMasterKey, authorize('create:secret'), async (req, res) => {
    try {
        const { name, value } = req.body;
        if (!name || !value) {
            return res.status(400).json({ error: 'Name and value are required' });
        }

        const { iv, encryptedData, authTag } = encrypt(value, req.masterKey);

        const secret = new Secret({
            name,
            encryptedData,
            iv,
            authTag
        });

        await secret.save();
        logEvent('Secret Created', secret.name, 'SUCCESS', 'New credential stored in vault');
        res.status(201).json({ id: secret._id, name: secret.name });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create secret' });
    }
});

// List Secrets (Metadata only)
router.get('/', requireMasterKey, authorize('read:secret'), async (req, res) => {
    try {
        const secrets = await Secret.find({}, 'name createdAt'); // Only return metadata
        res.json(secrets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to list secrets' });
    }
});

// Get a Secret (Decrypted)
router.get('/:id', requireMasterKey, authorize('read:secret'), async (req, res) => {
    try {
        const secret = await Secret.findById(req.params.id);
        if (!secret) {
            return res.status(404).json({ error: 'Secret not found' });
        }

        try {
            const decryptedValue = decrypt({
                iv: secret.iv,
                encryptedData: secret.encryptedData,
                authTag: secret.authTag
            }, req.masterKey);

            res.json({
                id: secret._id,
                name: secret.name,
                value: decryptedValue,
                createdAt: secret.createdAt
            });
        } catch (decryptionError) {
            res.status(403).json({ error: 'Failed to decrypt secret. Wrong Key?' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const { exec } = require('child_process');

// Rotate a Secret
router.post('/rotate/:id', requireMasterKey, authorize('rotate:secret'), async (req, res) => {
    try {
        const secret = await Secret.findById(req.params.id);
        if (!secret) {
            return res.status(404).json({ error: 'Secret not found' });
        }

        // Determine which script to run (default to db rotation if not specified)
        const { type } = req.body;
        let scriptName = 'rotate_db_password.sh';
        if (type === 'api_key') scriptName = 'rotate_api_key.sh';
        if (type === 'certificate') scriptName = 'rotate_certificate.sh';

        const scriptPath = path.join(__dirname, `../../scripts/${scriptName}`);

        // Execute rotation script
        exec(scriptPath, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Rotation exec error: ${error}`);
                return res.status(500).json({ error: 'Rotation script failed', details: stderr });
            }

            const newValue = stdout.trim();
            if (!newValue) {
                return res.status(500).json({ error: 'Rotation script returned empty value' });
            }

            // Encrypt new value
            const encryptResult = encrypt(newValue, req.masterKey);

            // Update secret in DB
            secret.encryptedData = encryptResult.encryptedData;
            secret.iv = encryptResult.iv;
            secret.authTag = encryptResult.authTag;
            secret.lastRotated = new Date();

            await secret.save();
            logEvent('Secret Rotated', secret.name, 'SUCCESS', `Manual rotation via ${type || 'credential'} script`);

            res.json({ message: `Secret ${type || 'credential'} rotated successfully`, id: secret._id });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error during rotation' });
    }
});

module.exports = router;
