const mongoose = require('mongoose');

const secretSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
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
    rotationType: {
        type: String,
        enum: ['db_password', 'api_key', 'certificate'],
        default: 'db_password'
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
