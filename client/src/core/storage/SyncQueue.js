// core/storage/SyncQueue.js
// Flushes offline-queued data to server when connectivity is restored.

import { db } from './IndexedDBAdapter.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SYNC_ENDPOINT = `${API_BASE}/api/sync`;
const GATEWAY_ID = `GW-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

let syncing = false;

export async function attemptSync() {
    if (syncing || !navigator.onLine) return;
    syncing = true;

    try {
        await db.open(); // ensure DB is open before accessing (fixes race condition)
        const queued = await db.flushSyncQueue();
        if (!queued || queued.length === 0) { syncing = false; return; }

        const batch = queued.map(q => q.data).filter(d => d && d.device_id); // guard nulls
        if (batch.length === 0) { syncing = false; return; }

        const res = await fetch(SYNC_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gateway_id: GATEWAY_ID, batch, timestamp: Date.now() }),
        });

        if (res.ok) {
            await db.clearSyncQueue();
            console.info(`[SyncQueue] Synced ${batch.length} records via gateway.`);
        }
    } catch (err) {
        console.warn('[SyncQueue] Sync failed, will retry on next connection.', err);
    } finally {
        syncing = false;
    }
}

// Auto-sync on network restore
window.addEventListener('online', attemptSync);
window.addEventListener('focus', attemptSync);

// Periodic sync every 30s
setInterval(attemptSync, 30_000);
