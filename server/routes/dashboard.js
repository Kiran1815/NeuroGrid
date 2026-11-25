// server/routes/dashboard.js
// Dashboard utility routes — stats and health

const express = require('express');

module.exports = function () {
    const router = express.Router();

    router.get('/health', (req, res) => {
        res.json({ status: 'ok', ts: Date.now() });
    });

    return router;
};
