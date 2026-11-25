// server/routes/survivors.js
// GET /api/survivors — return all survivors

const express = require('express');

module.exports = function (memStore) {
    const router = express.Router();

    router.get('/survivors', (req, res) => {
        const { priority, limit = 100 } = req.query;
        let results = [...memStore.survivors];

        if (priority) {
            results = results.filter(s => s.priority?.level === priority.toUpperCase());
        }

        // Sort by priority score descending
        results.sort((a, b) => (b.priority?.score ?? 0) - (a.priority?.score ?? 0));

        res.json({
            count: results.length,
            survivors: results.slice(0, parseInt(limit)),
        });
    });

    router.get('/survivors/:device_id', (req, res) => {
        const survivor = memStore.survivors.find(s => s.device_id === req.params.device_id);
        if (!survivor) return res.status(404).json({ error: 'Survivor not found' });
        res.json(survivor);
    });

    return router;
};
