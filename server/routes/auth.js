// server/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'neurogrid_secure_key_123';

// Hardcoded credentials for MVP, including Main HQ and Sub HQs
const USERS = [
    { username: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASS || 'rescue2026', role: 'admin', name: 'Main HQ' },
    { username: 'Hyderabad EOC', password: 'rescue2026', role: 'sub_hq', name: 'Hyderabad EOC' },
    { username: 'Warangal EOC', password: 'rescue2026', role: 'sub_hq', name: 'Warangal EOC' },
    { username: 'Karimnagar EOC', password: 'rescue2026', role: 'sub_hq', name: 'Karimnagar EOC' },
    { username: 'Kammam EOC', password: 'rescue2026', role: 'sub_hq', name: 'Kammam EOC' }
];

module.exports = () => {
    // POST /api/auth/login
    router.post('/login', (req, res) => {
        const { username, password } = req.body;

        const cleanInput = (username || '').trim().toLowerCase().replace(/_/g, ' ');
        const user = USERS.find(u => u.username.toLowerCase() === cleanInput && u.password === password);

        if (user) {
            // Create token payload
            const payload = {
                user: user.username,
                role: user.role,
                name: user.name,
                timestamp: Date.now()
            };

            // Sign token, expires in 24 hours
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

            return res.json({ 
                success: true, 
                token,
                user: { username: user.username, role: user.role, name: user.name }
            });
        }

        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    });

    return router;
};
