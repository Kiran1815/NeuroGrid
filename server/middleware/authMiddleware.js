// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// A hardcoded secret for MVP/development. In production, use process.env.JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'neurogrid_secure_key_123';

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
};

module.exports = authMiddleware;
