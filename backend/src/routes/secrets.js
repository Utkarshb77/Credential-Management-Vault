const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const Secret = require('../models/Secret');
const { encrypt, decrypt } = require('../services/encryption');
const { logEvent } = require('./audit');

const router = express.Router();
const ROTATION_SCRIPT_MAP = {
    db_password: 'rotate_db_password.sh',
    api_key: 'rotate_api_key.sh',
    certificate: 'rotate_certificate.sh'
};

// Middleware to check for Master Key
const requireMasterKey = (req, res, next) => {
    const masterKey = req.headers['x-master-key'];
    if (!masterKey || masterKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(masterKey)) {
        return res.status(401).json({ error: 'Valid Master Key (32-byte hex) required' });
    }
    req.masterKey = masterKey;
    next();
};

// Middleware for RBAC Policy Enforcement
const authorize = (permission) => {
    return (req, res, next) => {
        const userRole = req.user?.role || 'user';
        const policyRole = userRole === 'admin' ? 'admin' : 'user';
        const policyPath = path.join(__dirname, `../../policies/${policyRole}.json`);

        if (!fs.existsSync(policyPath)) {
            return res.status(403).json({ error: `Policy for role '${policyRole}' not found` });
        }

        try {
            const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
            if (policy.permissions.includes(permission)) {
                return next();
            }
            res.status(403).json({ error: `Permission '${permission}' denied for role '${userRole}'` });
        } catch (error) {
            res.status(500).json({ error: 'Failed to parse policy' });
        }
    };
};

const buildSecretQuery = (req, secretId) => {
    if (req.user?.role === 'admin') {
        return { _id: secretId };
    }
    return { _id: secretId, owner: req.user.userId };
};

// Create a Secret
router.post('/', requireMasterKey, authorize('create:secret'), async (req, res) => {
    try {
        const { name, value, rotationType = 'db_password' } = req.body;
        if (!name || !value) {
            return res.status(400).json({ error: 'Name and value are required' });
        }
        if (!ROTATION_SCRIPT_MAP[rotationType]) {
            return res.status(400).json({ error: 'Invalid rotation type' });
        }

        const { iv, encryptedData, authTag } = encrypt(value, req.masterKey);

        const secret = new Secret({
            owner: req.user.userId,
            name,
            encryptedData,
            iv,
            authTag,
            rotationType
        });

        await secret.save();
        logEvent('Secret Created', secret.name, 'SUCCESS', 'New credential stored in vault');
        res.status(201).json({ id: secret._id, name: secret.name, rotationType: secret.rotationType });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create secret' });
    }
});

// List Secrets (Metadata only)
router.get('/', requireMasterKey, authorize('read:secret'), async (req, res) => {
    try {
        const query = req.user?.role === 'admin' ? {} : { owner: req.user.userId };
        const secrets = await Secret.find(query, 'name createdAt rotationType owner').sort({ createdAt: -1 });
        res.json(secrets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to list secrets' });
    }
});

// Get a Secret (Decrypted)
router.get('/:id', requireMasterKey, authorize('read:secret'), async (req, res) => {
    try {
        const secret = await Secret.findOne(buildSecretQuery(req, req.params.id));
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
                createdAt: secret.createdAt,
                rotationType: secret.rotationType
            });
        } catch (decryptionError) {
            res.status(403).json({ error: 'Failed to decrypt secret. Wrong Key?' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rotate a Secret
router.post('/rotate/:id', requireMasterKey, authorize('rotate:secret'), async (req, res) => {
    try {
        const secret = await Secret.findOne(buildSecretQuery(req, req.params.id));
        if (!secret) {
            return res.status(404).json({ error: 'Secret not found' });
        }

        const requestedType = req.body?.type;
        const rotationType = requestedType || secret.rotationType || 'db_password';
        if (!ROTATION_SCRIPT_MAP[rotationType]) {
            return res.status(400).json({ error: 'Invalid rotation type' });
        }
        const scriptName = ROTATION_SCRIPT_MAP[rotationType];
        const scriptPath = path.join(__dirname, `../../scripts/${scriptName}`);

        // Execute rotation script
        execFile(scriptPath, [], async (error, stdout, stderr) => {
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
            secret.rotationType = rotationType;
            secret.lastRotated = new Date();

            await secret.save();
            logEvent('Secret Rotated', secret.name, 'SUCCESS', `Manual rotation via ${rotationType} script`);

            res.json({ message: `Secret ${rotationType} rotated successfully`, id: secret._id, rotationType });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error during rotation' });
    }
});

module.exports = router;
