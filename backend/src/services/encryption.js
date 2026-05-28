const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';


/**
 * Encrypts a text using AES-256-GCM.
 * @param {string} text - Plaintext to encrypt.
 * @param {string} masterKeyHex - 32-byte hex key.
 * @returns {object} Object containing iv, encryptedData, and authTag (all hex).
 */
function encrypt(text, masterKeyHex) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(masterKeyHex, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        authTag: authTag
    };
}

/**
 * Decrypts data using AES-256-GCM.
 * @param {object} encryptedObject - Contains iv, encryptedData, authTag (all hex).
 * @param {string} masterKeyHex - 32-byte hex key.
 * @returns {string} Decrypted plaintext.
 */
function decrypt(encryptedObject, masterKeyHex) {
    const { iv, encryptedData, authTag } = encryptedObject;
    const key = Buffer.from(masterKeyHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

module.exports = { encrypt, decrypt };
const IV_LENGTH = 12; // 12 bytes for GCM