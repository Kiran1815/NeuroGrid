// server/index.js
// Express + Socket.IO gateway server with mesh signaling namespace

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'DELETE'] },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// MongoDB connection (optional — server works without Mongo)
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('[DB] MongoDB connected'))
        .catch(err => console.warn('[DB] MongoDB unavailable — in-memory mode:', err.message));
}

// In-memory fallback store
const memStore = { survivors: [], nodes: [] };

// In-memory rescue teams store: { team_id => { team_id, latitude, longitude, timestamp } }
const rescueTeams = new Map();
const RESCUE_TEAM_TTL = 2 * 60 * 1000; // 2 minutes

// In-memory HQ deployment requests
const deployRequests = new Map();

// Prune stale rescue teams every 30s
setInterval(() => {
    const now = Date.now();
    for (const [id, team] of rescueTeams.entries()) {
        if (now - team.timestamp > RESCUE_TEAM_TTL) rescueTeams.delete(id);
    }
}, 30_000);

// Make io available to routes
app.locals.io = io;
app.locals.memStore = memStore;

// ── Public routes (NO auth required) ────────────────────────────────────────
const authMiddleware = require('./middleware/authMiddleware');

app.use('/api/auth', require('./routes/auth')());
app.use('/api', require('./routes/sync')(io, memStore));

// ── Rescue Team Position Tracking (no auth — rescue devices may be offline) ──
app.post('/api/rescue-team', (req, res) => {
    const { team_id, latitude, longitude, timestamp } = req.body;
    if (!team_id || latitude == null || longitude == null) {
        return res.status(400).json({ error: 'team_id, latitude, longitude required' });
    }
    const team = { team_id, latitude, longitude, timestamp: timestamp || Date.now() };
    rescueTeams.set(team_id, team);
    const teams = [...rescueTeams.values()];
    io.emit('rescue_team_update', { teams });
    console.log(`[RESCUE] Team ${team_id} at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    res.json({ ok: true });
});

app.get('/api/rescue-teams', (req, res) => {
    res.json({ teams: [...rescueTeams.values()] });
});

// ── DELETE rescue team beacon on logout ──────────────────────────────────────
app.delete('/api/rescue-team/:team_id', (req, res) => {
    const { team_id } = req.params;
    if (rescueTeams.has(team_id)) {
        rescueTeams.delete(team_id);
        const teams = [...rescueTeams.values()];
        io.emit('rescue_team_update', { teams });
        console.log(`[RESCUE] Team ${team_id} beacon cleared on logout`);
    }
    res.json({ ok: true });
});

// ── RESET — wipe all survivors + rescue teams, broadcast fresh state ──────────
app.delete('/api/reset', (req, res) => {
    memStore.survivors = [];
    memStore.nodes = [];
    rescueTeams.clear();
    deployRequests.clear();
    io.emit('reset', { ts: Date.now() });
    io.emit('rescue_team_update', { teams: [] });
    console.log('[RESET] All survivors, rescue teams, and deploy requests cleared');
    res.json({ ok: true, ts: Date.now() });
});


// ── Mark survivor as Rescued (no auth — rescue device may be offline-first) ──
app.post('/api/survivor/rescued', (req, res) => {
    const { device_id, team_id, rescue_time } = req.body;
    if (!device_id) return res.status(400).json({ error: 'device_id required' });
    // Remove from memStore
    memStore.survivors = (memStore.survivors || []).filter(s => s.device_id !== device_id);
    // Broadcast to all dashboards
    io.emit('survivor_rescued', { device_id, team_id, rescue_time: rescue_time || Date.now() });
    console.log(`[RESCUE] ✓ Survivor ${device_id} RESCUED by ${team_id}`);
    res.json({ ok: true });
});

// ── Protected routes (require valid JWT) ────────────────────────────────────
app.use('/api', authMiddleware, require('./routes/survivors')(memStore));
app.use('/api', authMiddleware, require('./routes/dashboard')());

// ── NeuroGrid-X Satellite Layer Routes (/api/x/...) ─────────────────────────
app.use('/api/x', require('./routes/X_satellite')(io, memStore));

// ── Socket.IO — Main namespace (dashboard) ───────────────────────────────────
io.on('connection', socket => {
    console.log(`[WS] Dashboard connected: ${socket.id}`);
    
    socket.emit('welcome', {
        ts: Date.now(),
        survivors: memStore.survivors.length,
        teams: [...rescueTeams.values()],
        deploy_requests: [...deployRequests.values()]
    });

    socket.on('deploy_request', (reqData) => {
        // Main HQ creates a deploy request
        const request = { ...reqData, status: 'pending', timestamp: Date.now() };
        deployRequests.set(request.zone_id, request);
        io.emit('deploy_request', request);
        console.log(`[WS] Deploy Request created for zone: ${request.zone_id}`);
    });

    socket.on('deploy_accept', (authData) => {
        // Sub-HQ accepts a deploy request
        const { zone_id, operator_id, team_name } = authData;
        const req = deployRequests.get(zone_id);
        if (req) {
            req.status = 'accepted';
            req.operator_id = operator_id;
            req.team_name = team_name;
            req.accepted_ts = Date.now();
            deployRequests.set(zone_id, req);
            io.emit('deploy_update', req);
            console.log(`[WS] Deploy Accepted by ${operator_id} for zone: ${zone_id}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[WS] Dashboard disconnected: ${socket.id}`);
    });
});

// ── Socket.IO — /mesh namespace (WebRTC signaling for peer mesh) ─────────────
const meshNsp = io.of('/mesh');
meshNsp.on('connection', socket => {
    console.log(`[Mesh] Peer connected to signaling: ${socket.id}`);

    socket.on('announce', ({ peerId }) => {
        socket.data.peerId = peerId;

        // CRITICAL: join a room named after own peerId so others can
        // target this socket via meshNsp.to(peerId).emit(...)
        socket.join(peerId);

        // Tell all existing peers in the room about this new peer
        socket.to('mesh-room').emit('peer_join', { peerId });

        // Now join the shared broadcast room
        socket.join('mesh-room');

        console.log(`[Mesh] Peer ${peerId} announced (socket: ${socket.id})`);
    });

    // Relay WebRTC signaling — 'to' is a peerId, which is now a room name
    socket.on('offer', ({ to, sdp }) => {
        meshNsp.to(to).emit('offer', { from: socket.data.peerId, sdp });
    });
    socket.on('answer', ({ to, sdp }) => {
        meshNsp.to(to).emit('answer', { from: socket.data.peerId, sdp });
    });
    socket.on('ice', ({ to, candidate }) => {
        meshNsp.to(to).emit('ice', { from: socket.data.peerId, candidate });
    });

    socket.on('disconnect', () => {
        console.log(`[Mesh] Peer ${socket.data.peerId ?? socket.id} left signaling`);
        // Notify remaining peers so they can clean up the connection
        socket.to('mesh-room').emit('peer_left', { peerId: socket.data.peerId });
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`\n🌐 NeuroGrid Gateway running on http://localhost:${PORT}`);
    console.log(`   POST   /api/sync                — receive mesh batch`);
    console.log(`   POST   /api/rescue-team         — rescue worker GPS (no auth)`);
    console.log(`   DELETE /api/rescue-team/:id     — clear beacon on logout`);
    console.log(`   GET    /api/rescue-teams        — list active rescue teams`);
    console.log(`   POST   /api/survivor/rescued    — mark rescued (no auth)`);
    console.log(`   WS     /mesh                   — WebRTC signaling namespace`);
});
