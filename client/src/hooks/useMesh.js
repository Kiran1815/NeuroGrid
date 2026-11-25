// hooks/useMesh.js
// Offline-first mesh: receives SOS from peers → stores + forwards to server as gateway
import { useState, useEffect, useRef } from 'react';
import { MeshRouter } from '../core/mesh/MeshRouter.js';
import { db } from '../core/storage/IndexedDBAdapter.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Module-level singleton so all component instances share one mesh connection
let sharedRouter = null;

export function useMesh() {
    const [peerCount, setPeerCount] = useState(() => sharedRouter?.peerCount ?? 0);
    const [messages, setMessages] = useState([]);
    const [localId, setLocalId] = useState(() => sharedRouter?.localId ?? null);
    const [meshPeers, setMeshPeers] = useState({}); // { [device_id]: { device_id, battery_level, last_seen } }
    const routerRef = useRef(null);

    useEffect(() => {
        const signalingUrl = API_BASE;

        if (!sharedRouter) {
            sharedRouter = new MeshRouter(signalingUrl);
            sharedRouter.connect();
        }
        routerRef.current = sharedRouter;

        // Publish the real peerId now that sharedRouter exists
        // This triggers a re-render in SurvivorMode so device_id is always correct
        if (!localId) {
            setLocalId(sharedRouter.localId);
        }

        // Force a sync to catch any peers that joined before this hook mounted
        setPeerCount(sharedRouter.peerCount);

        const handleCountSync = () => setPeerCount(sharedRouter.peerCount);
        sharedRouter.onPeerJoined(handleCountSync);
        sharedRouter.onPeerLost(handleCountSync);

        // ── SOS received from mesh peer ──────────────────────────────────────
        // This device acts as a GATEWAY: store + push to server if online
        sharedRouter.on('sos', async (rawPayload) => {
            const { type: _type, ...payload } = rawPayload;

            if (!payload.device_id || !payload.latitude || !payload.longitude) {
                console.warn('[Mesh] Received SOS with missing fields — ignored', payload);
                return;
            }
            if (payload.device_id === sharedRouter?.localId) return;

            // Also register as a known peer node with spatial data
            setMeshPeers(prev => ({
                ...prev,
                [payload.device_id]: { 
                    ...payload,
                    last_seen: Date.now() 
                }
            }));

            try {
                await db.open();
                await db.upsert('survivors', payload);
                await db.queueForSync(payload);
            } catch (e) {
                console.warn('[Mesh] Failed to store received SOS in IndexedDB:', e);
            }

            if (navigator.onLine) {
                const gatewayId = sharedRouter?.localId ?? 'GATEWAY-UNKNOWN';
                fetch(`${API_BASE}/api/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gateway_id: gatewayId,
                        batch: [payload],
                        timestamp: Date.now(),
                    }),
                }).catch(() => {
                    console.warn('[Mesh] Gateway POST failed — will retry via SyncQueue');
                });
            }

            setMessages(msgs => [
                { type: 'sos', ...payload, receivedAt: Date.now() },
                ...msgs.slice(0, 49),
            ]);
        });

        // ── Mesh Node presence ping (heartbeat, no GPS) ──
        sharedRouter.on('mesh_node', (rawPayload) => {
            if (!rawPayload.device_id || rawPayload.device_id === sharedRouter?.localId) return;
            setMeshPeers(prev => ({
                ...prev,
                [rawPayload.device_id]: {
                    device_id: rawPayload.device_id,
                    battery_level: rawPayload.battery_level ?? 100,
                    last_seen: Date.now(),
                    is_heartbeat: true,
                }
            }));
        });

        sharedRouter.on('text_message', (payload) => {
            setMessages(msgs => [
                { type: 'text', ...payload, receivedAt: Date.now() },
                ...msgs.slice(0, 49),
            ]);
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const sendSOS = (data) => routerRef.current?.sendSOS(data);
    const sendMsg = (text) => routerRef.current?.sendMessage(text);

    return { peerCount, messages, sendSOS, sendMsg, localId: localId ?? 'NG-LOADING', meshPeers };
}
