const { exec } = require('child_process');
const path = require('path');
const Secret = require('../models/Secret');
const { encrypt } = require('./encryption');
const { logEvent } = require('../routes/audit');

/**
 * Rotates a secret by executing its associated script and updating the database.
 * @param {string} secretId - MongoDB ID of the secret.
 * @param {string} scriptName - Name of the script in the scripts/ folder.
 * @param {string} masterKey - The master key for encryption.
 */
async function rotateSecret(secretId, scriptName, masterKey) {
    try {
        const secret = await Secret.findById(secretId);
        if (!secret) return console.log(`Secret ${secretId} not found for rotation.`);

        const scriptPath = path.join(__dirname, `../../scripts/${scriptName}`);

        exec(scriptPath, async (error, stdout, stderr) => {
            if (error) {
                logEvent('Auto-Rotation', secret.name, 'FAILURE', `Script ${scriptName} failed: ${error.message}`);
                return console.error(`Rotation error for ${secret.name}: ${error}`);
            }

            const newValue = stdout.trim();
            if (!newValue) return;

            const { iv, encryptedData, authTag } = encrypt(newValue, masterKey);

            secret.encryptedData = encryptedData;
            secret.iv = iv;
            secret.authTag = authTag;
            await secret.save();

            logEvent('Auto-Rotation', secret.name, 'SUCCESS', `Automated scheduled rotation via ${scriptName}`);
            console.log(`Successfully rotated secret: ${secret.name}`);
        });
    } catch (err) {
        console.error(`Scheduled rotation failed for ${secretId}:`, err);
    }
}

/**
 * Initializes scheduled rotations.
 * Note: In a real zero-knowledge system, the master key must be provided to the scheduler
 * (e.g., kept in memory after an 'unseal' operation).
 */
function initScheduler(masterKey) {
    if (!masterKey) {
        console.log('Scheduler waiting for master key to be provided (Vault is sealed).');
        return;
    }

    // Example: Rotate a specific secret every hour (simulated with 1 minute for demo)
    // In reality, you'd store rotation schedules in the DB or a config file.
    console.log('Rotation scheduler initialized.');
}

module.exports = { rotateSecret, initScheduler };
