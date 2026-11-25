// core/mesh/MeshRouter.js
// Message type routing layer over WebRTCManager

import { WebRTCManager } from './WebRTCManager.js';
import { NativeMeshManager } from './NativeMeshManager.js';
import { Capacitor } from '@capacitor/core';

const MSG_TYPES = {
    SOS: 'sos',
    POSITION: 'position',
    MESSAGE: 'text_message',
    ACK: 'ack',
};

export class MeshRouter {
    #mesh;
    #handlers = new Map();

    constructor(signalingUrl) {
        // Automatically switch transport layer based on environment:
        // Native App (Android/iOS) gets True Offline BLE mesh
        // Web Browser gets Simulated Offline WebRTC mesh
        if (Capacitor.isNativePlatform()) {
            console.info('[MeshRouter] Native environment detected — using BLE transport');
            this.#mesh = new NativeMeshManager();
        } else {
            console.info('[MeshRouter] Web environment detected — using WebRTC transport');
            this.#mesh = new WebRTCManager(signalingUrl);
        }
        this.localId = this.#mesh.localId;

        this.#mesh.addEventListener('message', e => {
            const { payload } = e.detail;
            const handler = this.#handlers.get(payload?.type);
            handler?.(payload, e.detail);
        });
    }

    get peerCount() { return this.#mesh.peerCount; }

    connect() { this.#mesh.connectSignaling(); }

    on(type, handler) { this.#handlers.set(type, handler); }

    sendSOS(data) {
        this.#mesh.broadcast({ type: MSG_TYPES.SOS, ...data });
    }

    sendPosition(data) {
        this.#mesh.broadcast({ type: MSG_TYPES.POSITION, ...data });
    }

    sendMessage(text) {
        this.#mesh.broadcast({ type: MSG_TYPES.MESSAGE, text, ts: Date.now() });
    }

    onPeerJoined(cb) { this.#mesh.addEventListener('peer_joined', e => cb(e.detail)); }
    onPeerLost(cb) { this.#mesh.addEventListener('peer_lost', e => cb(e.detail)); }
}

export { MSG_TYPES };
