const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    event: {
        type: String,
        required: true
    },
    secretName: {
        type: String,
        default: 'System'
    },
    status: {
        type: String,
        enum: ['SUCCESS', 'FAILURE', 'INFO'],
        default: 'INFO'
      },
    details: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
