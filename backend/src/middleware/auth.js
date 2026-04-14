const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'credential-vault-dev-secret-change-me';

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Authentication token is required' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired authentication token' });
    }
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        const role = req.user?.role;
        if (!role || !allowedRoles.includes(role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient role permissions' });
        }
        next();
    };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };
