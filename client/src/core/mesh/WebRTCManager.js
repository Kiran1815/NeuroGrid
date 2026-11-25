// core/mesh/WebRTCManager.js
// Manages N peer connections. Uses Socket.IO /mesh namespace for signaling.
// TURN server included for cross-network (4G ↔ WiFi) connections.

import { io } from 'socket.io-client';

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Free TURN server for NAT traversal (devices on different networks)
    {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
    {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
];

export class WebRTCManager extends EventTarget {
    #peers = new Map();       // peerId → RTCPeerConnection
    #channels = new Map();    // peerId → RTCDataChannel
    #seenMsgs = new Set();    // dedup cache by message ID
    #localId = crypto.randomUUID().slice(0, 8).toUpperCase();
    #socket = null;           // Socket.IO signaling socket

    constructor(signalingUrl) {
        super();
        this.signalingUrl = signalingUrl;
        this.localId = this.#localId;
    }

    get peerCount() { return this.#channels.size; }

    connectSignaling() {
        if (!this.signalingUrl) {
            console.warn('[Mesh] No signaling URL — mesh disabled');
            return;
        }

        try {
            // Connect to /mesh namespace on the Railway Socket.IO server
            this.#socket = io(`${this.signalingUrl}/mesh`, {
                transports: ['websocket', 'polling'],
                reconnectionDelayMax: 10000,
            });

            this.#socket.on('connect', () => {
                console.info(`[Mesh] Signaling connected. Local peer: ${this.#localId}`);
                // Announce ourselves to all other peers in the room
                this.#socket.emit('announce', { peerId: this.#localId });
            });

            this.#socket.on('peer_join', ({ peerId }) => {
                if (peerId !== this.#localId) {
                    console.info(`[Mesh] New peer joined: ${peerId} — creating offer`);
                    this.#createOffer(peerId);
                }
            });

            this.#socket.on('peer_left', ({ peerId }) => {
                if (this.#peers.has(peerId)) {
                    this.#peers.get(peerId).close();
                    this.#peers.delete(peerId);
                    this.#channels.delete(peerId);
                    this.dispatchEvent(new CustomEvent('peer_lost', { detail: { peerId } }));
                }
            });

            this.#socket.on('offer', ({ from, sdp }) => this.#handleOffer(from, sdp));
            this.#socket.on('answer', ({ from, sdp }) => {
                const pc = this.#peers.get(from);
                if (pc) pc.setRemoteDescription({ type: 'answer', sdp }).catch(console.warn);
            });
            this.#socket.on('ice', ({ from, candidate }) => {
                const pc = this.#peers.get(from);
                if (pc && candidate) pc.addIceCandidate(candidate).catch(console.warn);
            });

            this.#socket.on('disconnect', () => {
                console.info('[Mesh] Signaling disconnected — will reconnect automatically');
            });

        } catch (err) {
            console.warn('[Mesh] Signaling unavailable — standalone mode', err);
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

    #relay(envelope) {
        if (this.#seenMsgs.has(envelope.id)) return;
        if (envelope.hop >= envelope.max_hop) return;

        this.#seenMsgs.add(envelope.id);

        if (this.#seenMsgs.size > 500) {
            const [first] = this.#seenMsgs;
            this.#seenMsgs.delete(first);
        }

        const next = { ...envelope, hop: envelope.hop + 1 };
        const data = JSON.stringify(next);

        for (const channel of this.#channels.values()) {
            if (channel.readyState === 'open') {
                try { channel.send(data); } catch { /* ignore */ }
            }
        }

        this.dispatchEvent(new CustomEvent('message', { detail: envelope }));
    }

    async #createOffer(peerId) {
        const pc = this.#makePeer(peerId);
        const channel = pc.createDataChannel('ng-mesh');
        this.#setupChannel(channel, peerId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.#socket?.emit('offer', { to: peerId, sdp: offer.sdp });
    }

    async #handleOffer(peerId, sdp) {
        const pc = this.#makePeer(peerId);
        pc.ondatachannel = e => this.#setupChannel(e.channel, peerId);
        await pc.setRemoteDescription({ type: 'offer', sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.#socket?.emit('answer', { to: peerId, sdp: answer.sdp });
    }

    #makePeer(peerId) {
        // Remove stale connection if exists
        if (this.#peers.has(peerId)) {
            this.#peers.get(peerId).close();
            this.#peers.delete(peerId);
            this.#channels.delete(peerId);
        }

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        this.#peers.set(peerId, pc);

        pc.onicecandidate = e => {
            if (e.candidate) {
                this.#socket?.emit('ice', { to: peerId, candidate: e.candidate });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                this.#peers.delete(peerId);
                this.#channels.delete(peerId);
                this.dispatchEvent(new CustomEvent('peer_lost', { detail: { peerId } }));
            }
        };

        return pc;
    }

    #setupChannel(channel, peerId) {
        this.#channels.set(peerId, channel);
        channel.onopen = () => {
            console.info(`[Mesh] Data channel open with: ${peerId}`);
            this.dispatchEvent(new CustomEvent('peer_joined', { detail: { peerId } }));
        };
        channel.onclose = () => {
            this.#channels.delete(peerId);
            this.dispatchEvent(new CustomEvent('peer_lost', { detail: { peerId } }));
        };
        channel.onmessage = e => {
            try { this.#relay(JSON.parse(e.data)); } catch { /* malformed */ }
        };
    }
}
