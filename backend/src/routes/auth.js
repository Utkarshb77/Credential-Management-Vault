const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', async (req, res) => {
    try {
        const { username, email, password, masterKey } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        if (masterKey && (masterKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(masterKey))) {
            return res.status(400).json({ error: 'Master key must be exactly 64 hex characters' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ error: 'Email is already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const masterKeyHash = masterKey ? await bcrypt.hash(masterKey, 10) : null;
        const usersCount = await User.countDocuments();
        const assignedRole = usersCount === 0 ? 'admin' : 'user';
        const user = await User.create({
            username: username.trim(),
            email: normalizedEmail,
            passwordHash,
            masterKeyHash,
            role: assignedRole
        });

        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.status(201).json({
            token,
            user: { id: user._id, username: user.username, email: user.email, role: user.role },
            requiresMasterKeySetup: !user.masterKeyHash
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Signup failed' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            token,
            user: { id: user._id, username: user.username, email: user.email, role: user.role },
            requiresMasterKeySetup: !user.masterKeyHash
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;
