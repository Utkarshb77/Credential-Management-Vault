const mongoose = require('mongoose');

const secretSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    encryptedData: {
        type: String,
        required: true
    },
    iv: {
        type: String,
        required: true
    },
    authTag: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastRotated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Secret', secretSchema);
