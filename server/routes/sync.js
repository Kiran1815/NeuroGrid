// server/routes/sync.js
// POST /api/sync — receives batch upload from gateway nodes

const express = require('express');

module.exports = function (io, memStore) {
    const router = express.Router();

    router.post('/sync', async (req, res) => {
        const { gateway_id, batch, timestamp } = req.body;

        if (!Array.isArray(batch) || batch.length === 0) {
            return res.status(400).json({ error: 'Empty or invalid batch' });
        }

        let stored = 0;

        batch.forEach(record => {
            // Guard: must have a real device_id and valid GPS
            if (!record.device_id) return;
            if (!record.latitude || !record.longitude) return;


            // Strip any mesh routing fields before storing
            // eslint-disable-next-line no-unused-vars
            const { type: _type, ...clean } = record;

            const idx = memStore.survivors.findIndex(s => s.device_id === clean.device_id);
            if (idx === -1) {
                memStore.survivors.push(clean);
            } else {
                memStore.survivors[idx] = { ...memStore.survivors[idx], ...clean };
            }
            stored++;
        });

        // Push FULL cumulative survivors list to all dashboards
        io.emit('batch_synced', {
            gateway_id,
            synced_count: stored,
            timestamp: Date.now(),
            survivors: memStore.survivors,   // entire list, not just this batch
        });

        console.log(`[SYNC] Gateway ${gateway_id}: ${stored}/${batch.length} stored — total: ${memStore.survivors.length}`);
        res.json({ synced: stored, total: memStore.survivors.length, timestamp: Date.now() });
    });

    return router;
};
