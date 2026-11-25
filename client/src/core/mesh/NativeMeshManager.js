// core/mesh/NativeMeshManager.js
// Native transport for Capacitor using Bluetooth Low Energy (BLE)
// Provides a unified event interface matching WebRTCManager

import { BleClient } from '@capacitor-community/bluetooth-le';
import { registerPlugin } from '@capacitor/core';
import { MeshCodec } from './MeshCodec.js';

const NeuroMesh = registerPlugin('NeuroMesh');

const SERVICE_UUID = '0000FF01-0000-1000-8000-00805F9B34FB';
const CHAR_UUID = '0000FF02-0000-1000-8000-00805F9B34FB';

export class NativeMeshManager extends EventTarget {
    #localId = crypto.randomUUID().slice(0, 8).toUpperCase();
    #peers = new Set();
    #seenMsgs = new Set();
    #isScanning = false;
    #msgCounter = 0;
    #lastPayloadSignature = '';

    constructor() {
        super();
        this.localId = this.#localId;
    }

    get peerCount() { return this.#peers.size; }

    async connectSignaling() {
        try {
            // First, ask Android 12+ for formal Background Broadcast Permission that we added to Java
            await NeuroMesh.requestPermissions().catch(err => {
                console.warn('[NativeMesh] User denied or permissions not found:', err);
            });

            await BleClient.initialize();
            console.info('[NativeMesh] Bluetooth LE Scan Initialized');

            this.#startScanning();
            this.#startHeartbeat(); // Start broadcasting our ID into the room constantly

            // Start advertising our presence as a mesh node (requires native background plugin/logic in production)
            // Note: capacitor-community/bluetooth-le focuses on central role (scanning). 
            // Full peripheral (advertising) on Android normally uses native BroadcastReceiver. 
            // For now, we simulate basic BLE node discovery.
            console.info(`[NativeMesh] Active. Local peer: ${this.#localId}`);
        } catch (err) {
            console.error('[NativeMesh] BLE Init failed:', err);
        }
    }

    broadcast(payload) {
        const envelope = {
            id: crypto.randomUUID(),
            origin: this.#localId,
            hop: 0,
            max_hop: 6,
            ts: Date.now(),
            payload,
        };
        this.#relay(envelope);
    }

    // Continuous pulse so all nearby phones can detect this device without an SOS
    #startHeartbeat() {
        const beat = () => {
            // Build a minimal 16-byte heartbeat (message_id=0, lat/lng = 0) for BLE advertising
            const heartbeatPayload = {
                type: 'mesh_node',
                device_id: this.#localId,
                latitude: 0,
                longitude: 0,
                priority: { level: 'LOW' },
                battery_level: 100
            };
            const view = MeshCodec.encodeSOS(heartbeatPayload, 0, 0); // message_id=0 = heartbeat
            const buffer = new Uint8Array(view.buffer);
            let binary = '';
            for (let i = 0; i < buffer.byteLength; i++) binary += String.fromCharCode(buffer[i]);
            const b64Payload = btoa(binary);

            NeuroMesh.startAdvertising({ data: b64Payload }).catch(err => {
                console.debug('[NativeMesh] Heartbeat advertise failed (harmless if temp):', err);
            });

            // Also fire a local 'mesh_node' event so the dashboard can render THIS device as a node
            this.dispatchEvent(new CustomEvent('message', {
                detail: {
                    id: `hb-${this.#localId}`,
                    origin: this.#localId,
                    hop: 0,
                    payload: { ...heartbeatPayload, is_heartbeat: true }
                }
            }));
        };

        beat();
        // Re-fire every 30s so the entry stays fresh
        setInterval(beat, 30000);
    }

    async #startScanning() {
        if (this.#isScanning) return;
        this.#isScanning = true;

        try {
            await BleClient.requestLEScan(
                { services: [SERVICE_UUID] },
                (result) => {
                    const peerId = result.device?.deviceId || result.device?.name;
                    if (peerId && !this.#peers.has(peerId)) {
                        this.#peers.add(peerId);
                        console.info(`[NativeMesh] Found peer via BLE: ${peerId}`);
                        this.dispatchEvent(new CustomEvent('peer_joined', { detail: { peerId } }));
                    }
                    // Extract payload from manufacturer data if present (real mesh implementation)
                    this.#parseAdvertisementData(result);
                }
            );

            // Restart scan periodically to refresh cache
            setInterval(async () => {
                await BleClient.stopLEScan();
                this.#isScanning = false;
                this.#startScanning();
            }, 30000);
        } catch (err) {
            console.warn('[NativeMesh] Scan failed (permissions?)', err);
        }
    }

    #parseAdvertisementData(result) {
        const manufacturerObj = result.manufacturerData;
        if (!manufacturerObj) return;

        const rawView = manufacturerObj['65535'];
        if (!rawView || rawView.byteLength !== 16) return;

        const decompressedPayload = MeshCodec.decodeSOS(rawView);
        if (!decompressedPayload) return;

        // Ignore our own packets
        if (decompressedPayload.device_id === this.#localId) return;

        // Register as a known peer regardless of message type
        if (!this.#peers.has(decompressedPayload.device_id)) {
            this.#peers.add(decompressedPayload.device_id);
            console.info(`[NativeMesh] Discovered peer: ${decompressedPayload.device_id}`);
            this.dispatchEvent(new CustomEvent('peer_joined', { detail: { peerId: decompressedPayload.device_id } }));
        }

        if (decompressedPayload.message_id === 0) {
            // Heartbeat / presence ping — surface as mesh_node so dashboard can render without GPS
            const nodeEvent = {
                id: `hb-${decompressedPayload.device_id}`,
                origin: decompressedPayload.device_id,
                hop: decompressedPayload.hop_count,
                payload: {
                    type: 'mesh_node',
                    device_id: decompressedPayload.device_id,
                    battery_level: decompressedPayload.battery_level,
                    is_heartbeat: true,
                    timestamp: Date.now()
                }
            };
            this.dispatchEvent(new CustomEvent('message', { detail: nodeEvent }));
        } else {
            // Actual SOS — relay normally
            const fakeUuid = `${decompressedPayload.device_id}-${decompressedPayload.message_id}`;
            if (!this.#seenMsgs.has(fakeUuid)) {
                const envelope = {
                    id: fakeUuid,
                    origin: decompressedPayload.device_id,
                    hop: decompressedPayload.hop_count,
                    max_hop: 6,
                    ts: Date.now(),
                    payload: decompressedPayload
                };
                console.info(`[NativeMesh] SOS Packet from ${decompressedPayload.device_id}`);
                this.#relay(envelope);
            }
        }
    }

    #relay(envelope) {
        if (this.#seenMsgs.has(envelope.id)) return;
        if (envelope.hop >= envelope.max_hop) return;

        this.#seenMsgs.add(envelope.id);

        if (this.#seenMsgs.size > 500) {
            const [first] = this.#seenMsgs;
            this.#seenMsgs.delete(first);
        }

        const next = { ...envelope, hop: envelope.hop + 1 };

        // ── ACTUAL BLE BROADCAST ──
        if (next.payload?.type === 'sos') {
            // 1. Guard against overloading the Android BLE Hardware Advertiser (Error Code: 2)
            // React calls sendSOS() every 5 seconds for WebRTC simulated routing, 
            // but BLE is continuous! We only restart the BLE radio if Location/Priority materially changes.
            const p = next.payload;
            const sig = `${(p.latitude || 0).toFixed(4)}_${(p.longitude || 0).toFixed(4)}_${p.priority?.level}`;
            if (this.broadcastingEmergency && this.#lastPayloadSignature === sig) {
                console.debug('[NativeMesh] Skipping redundant BLE advertiser restart; data unchanged');
                // Still dispatch locally even if not re-advertising
                this.dispatchEvent(new CustomEvent('message', { detail: envelope }));
                return;
            }
            this.#lastPayloadSignature = sig;

            // 2. Compress the payload to 16 bytes for Native Bridge
            this.#msgCounter = (this.#msgCounter + 1) % 256;
            const view = MeshCodec.encodeSOS(next.payload, next.hop, this.#msgCounter);

            // 3. Convert DataView (ArrayBuffer) to Base64 to bridge to Java Plugin
            const buffer = new Uint8Array(view.buffer);
            let binary = '';
            for (let i = 0; i < buffer.byteLength; i++) {
                binary += String.fromCharCode(buffer[i]);
            }
            const b64Payload = btoa(binary);

            console.info(`[NativeMesh] TRUE SOS Advertised (16 bytes compressed SOS)`);
            this.broadcastingEmergency = true;

            // 4. Force Java to physically broadcast it via BluetoothLeAdvertiser
            NeuroMesh.startAdvertising({ data: b64Payload }).catch(err => {
                console.error('[NativeMesh] Hardware broadcasting failed:', err);
            });

            // Stop the emergency broadcast after 2 minutes to save battery
            setTimeout(() => {
                this.broadcastingEmergency = false;
                this.#lastPayloadSignature = '';
                console.info('[NativeMesh] SOS Broadcast limit reached, falling back to Heartbeat');
                this.#startHeartbeat(); // Resume ambient presence
            }, 120000);

        } else {
            console.info(`[NativeMesh] BLE Advertised packet: ${next.id}`);
        }

        // Bubble up to MeshRouter locally as well
        this.dispatchEvent(new CustomEvent('message', { detail: envelope }));
    }
}
