// dashboard/Dashboard.jsx
// Rescue Command Center — 4-panel CSS Grid layout

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { MapPanel } from './panels/MapPanel/MapPanel.jsx';
import { SurvivorPanel } from './panels/SurvivorPanel/SurvivorPanel.jsx';
import { NetworkHealthPanel } from './panels/NetworkHealthPanel/NetworkHealthPanel.jsx';
import { LiveActivityPanel } from './panels/LiveActivityPanel/LiveActivityPanel.jsx';
import { generateSimulatedSurvivors, SCENARIO_LIST } from '../simulation/DisasterSimulator.js';
import { computePriorityScore } from '../core/scoring/PriorityEngine.js';
import { detectClusters } from '../core/geo/ClusterDetector.js';
import { authService } from '../core/auth/authService.js';
import { useMesh } from '../hooks/useMesh.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DEMO_CENTER = [17.385, 78.4867];

function addEvent(setEvents, label, detail = '', type = 'info', simulated = false) {
    setEvents(prev => [
        ...prev.slice(-99),
        { id: crypto.randomUUID(), ts: Date.now(), label, detail, type, simulated },
    ]);
}

export function Dashboard({ onSwitchMode, onLogout, xDeployments = {}, onGlobalStateUpdate = null, user = { role: 'admin' }, deployRequests = [], onAlertClick = null, onLogClick = null }) {
    const [survivors, setSurvivors] = useState([]);
    const [dangerZones, setDangerZones] = useState([]);
    const [meshNodes, setMeshNodes] = useState([]);
    const [rescueTeams, setRescueTeams] = useState([]);
    const [events, setEvents] = useState([]);
    const [simMode, setSimMode] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [simModal, setSimModal] = useState(false);
    const [syncStatus, setSyncStatus] = useState('connecting');
    const [selectedSurvivor, setSelectedSurvivor] = useState(null);
    const socketRef = useRef(null);
    const simModeRef = useRef(false);
    const wasDisconnectedRef = useRef(false);
    const lastSurvivorCountRef = useRef(0);

    // Capture live BLE mesh peers from the native transport layer
    const { meshPeers } = useMesh();

    const processSurvivors = useCallback((raw) => {
        const scored = raw.map(s => ({ ...s, priority: computePriorityScore(s) }));
        const { zones, survivors: annotated } = detectClusters(scored);
        const rescored = annotated.map(s => ({ ...s, priority: computePriorityScore(s) }));
        setSurvivors(rescored);
        setDangerZones(zones);
        return { survivors: rescored, zones };
    }, []);

    // Push local state upstream if wrapped in NDMA Dashboard
    useEffect(() => {
        if (onGlobalStateUpdate) {
            onGlobalStateUpdate({ survivors, dangerZones, meshNodes, rescueTeams, simMode });
        }
    }, [survivors, dangerZones, meshNodes, rescueTeams, simMode, onGlobalStateUpdate]);

    // ── Live data: Socket.IO + HTTP polling fallback ──────────────────────────
    useEffect(() => {
        const headers = authService.getAuthHeaders();

        // 1. Initial fetch on mount
        const fetchLive = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/survivors`, { headers });
                if (res.ok) {
                    const { survivors: raw } = await res.json();
                    if (!simModeRef.current) {
                        // Process regardless of length so empty list clears the map after reset
                        if (Array.isArray(raw)) {
                            processSurvivors(raw);
                            if (raw.length !== lastSurvivorCountRef.current) {
                                lastSurvivorCountRef.current = raw.length;
                                if (raw.length > 0) {
                                    addEvent(setEvents, 'LIVE DATA LOADED', `${raw.length} survivors`, 'sync');
                                }
                            }
                        }
                    }
                }
            } catch { /* server offline */ }
        };

        // 1b. Fetch current rescue teams
        const fetchTeams = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/rescue-teams`);
                if (res.ok) {
                    const { teams } = await res.json();
                    setRescueTeams(teams ?? []);
                }
            } catch { /* ignore */ }
        };
        fetchLive();
        fetchTeams();

        // 2. Socket.IO for real-time push updates
        const socket = io(API_BASE, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            setSyncStatus('connected');
            // Only log SERVER CONNECTED on reconnect, not initial connect
            if (wasDisconnectedRef.current) {
                addEvent(setEvents, 'SERVER RECONNECTED', socket.id?.slice(0, 8), 'sync');
                wasDisconnectedRef.current = false;
            }
        });

        socket.on('disconnect', () => {
            setSyncStatus('disconnected');
            wasDisconnectedRef.current = true;
            addEvent(setEvents, 'SERVER DISCONNECTED', 'retrying…', 'info');
        });

        socket.on('batch_synced', ({ survivors: raw, gateway_id, synced_count }) => {
            if (simModeRef.current) return;   // don't overwrite simulation data
            if (Array.isArray(raw) && raw.length > 0) {
                processSurvivors(raw);
            }
            setSyncStatus('syncing');
            addEvent(setEvents, 'SOS BATCH RECV', `${synced_count ?? 1} survivor(s) via ${gateway_id ?? 'gateway'}`, 'sos');
            setTimeout(() => setSyncStatus('connected'), 2000);
        });

        socket.on('welcome', ({ teams }) => {
            if (teams?.length > 0) setRescueTeams(teams);
        });

        socket.on('rescue_team_update', ({ teams }) => {
            const safeTeams = Array.isArray(teams) ? teams : [];
            setRescueTeams(safeTeams);
            if (safeTeams.length > 0) {
                addEvent(setEvents, 'RESCUE TEAM UPDATE', `${safeTeams.length} team(s) active`, 'sync');
            }
        });

        socket.on('survivor_rescued', ({ device_id, team_id }) => {
            setSurvivors(prev => prev.filter(s => s.device_id !== device_id));
            addEvent(setEvents, '✓ RESCUED', `${device_id} by ${team_id ?? 'team'}`, 'sync');
        });

        // Reset — server wiped all data
        socket.on('reset', () => {
            setSurvivors([]);
            setDangerZones([]);
            setMeshNodes([]);
            setRescueTeams([]);
            setEvents([]);
            setSyncStatus('connected');
        });

        // 3. Polling fallback every 10s (catches missed events)
        const pollId = setInterval(fetchLive, 10_000);

        return () => {
            socket.disconnect();
            clearInterval(pollId);
        };
    }, [processSurvivors]);  // eslint-disable-line react-hooks/exhaustive-deps

    // Keep simModeRef in sync
    useEffect(() => { simModeRef.current = simMode; }, [simMode]);

    // Live re-score every 30s
    useEffect(() => {
        if (survivors.length === 0) return;
        const id = setInterval(() => processSurvivors(survivors), 30_000);
        return () => clearInterval(id);
    }, [survivors, processSurvivors]);

    // Simulate periodic sync events
    useEffect(() => {
        if (!simMode || survivors.length === 0) return;
        const id = setInterval(() => {
            const randomSurvivor = survivors[Math.floor(Math.random() * survivors.length)];
            const eventTypes = [
                { label: 'SOS RECV', detail: randomSurvivor?.device_id, type: 'sos' },
                { label: 'NODE JOINED', detail: `NG-${crypto.randomUUID().slice(0, 4).toUpperCase()}`, type: 'info' },
                { label: 'MSG RELAYED', detail: 'hop +1', type: 'info' },
                { label: 'GATEWAY SYNC', detail: `${survivors.length} synced`, type: 'sync' },
            ];
            const evt = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            // Use simModeRef to avoid stale closure bug
            if (simModeRef.current) {
                addEvent(setEvents, evt.label, evt.detail, evt.type, true /* simulated */);
            }
        }, 2500);
        return () => clearInterval(id);
    }, [simMode, survivors]);

    const runScenario = (scenarioKey) => {
        setSimModal(false);
        setSimMode(true);
        const raw = generateSimulatedSurvivors(scenarioKey, DEMO_CENTER[0], DEMO_CENTER[1]);
        const { survivors: processed, zones } = processSurvivors(raw);

        // Synthetic mesh nodes
        const nodes = raw.slice(0, 6).map((s, i) => ({
            id: `NODE-${i}`,
            latitude: s.latitude + (Math.random() - 0.5) * 0.002,
            longitude: s.longitude + (Math.random() - 0.5) * 0.002,
            signal: 0.4 + Math.random() * 0.5,
        }));
        setMeshNodes(nodes);

        addEvent(setEvents, `SIMULATION: ${scenarioKey.replace('_', ' ').toUpperCase()}`, `${raw.length} survivors`, 'info');
        addEvent(setEvents, 'DANGER ZONE DETECTED', `${zones.length} zones`, 'critical');
        addEvent(setEvents, 'MESH NODES ONLINE', `${nodes.length} nodes`, 'sync');
        setSyncStatus('syncing');
        setTimeout(() => setSyncStatus('connected'), 3000);
    };

    const critical = survivors.filter(s => s.priority?.level === 'CRITICAL').length;
    const medium = survivors.filter(s => s.priority?.level === 'MEDIUM').length;
    const avgHops = survivors.length > 0
        ? +(survivors.reduce((a, s) => a + (s.hop_count ?? 0), 0) / survivors.length).toFixed(1)
        : 0;
    const coverage = meshNodes.length > 0 ? Math.min(98, meshNodes.length * 13) : 0;

    const handleReset = async () => {
        if (!confirmReset) {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 4000);
            return;
        }
        setConfirmReset(false);
        try {
            // Clear local state immediately — don't wait for socket event
            setSurvivors([]);
            setDangerZones([]);
            setMeshNodes([]);
            setRescueTeams([]);
            setEvents([]);
            setSimMode(false);
            lastSurvivorCountRef.current = 0;

            await fetch(`${API_BASE}/api/reset`, {
                method: 'DELETE',
                headers: authService.getAuthHeaders(),
            });
            // Socket 'reset' event from server will also fire for other dashboards
        } catch (err) {
            console.error('[Reset] Failed:', err);
        }
    };

    return (
        <div className="dashboard">
            {/* ── Header ── */}
            <header className="dashboard__header">
                <div className="header-logo">
                    <div className="header-logo__icon">⚡</div>
                    NeuroGrid
                </div>

                <div className="header-stats">
                    <div className="header-stat">
                        <strong>{survivors.length}</strong> Survivors
                    </div>
                    <div className="header-stat">
                        <strong style={{ color: '#C0392B' }}>{critical}</strong> Critical
                    </div>
                    <div className="header-stat">
                        <strong style={{ color: '#D35400' }}>{medium}</strong> Medium
                    </div>
                    <div className="header-stat">
                        <strong>{dangerZones.length}</strong> Danger Zones
                    </div>
                    <div className="header-stat">
                        <strong>{coverage}%</strong> Coverage
                    </div>
                </div>

                <div className="header-controls">
                    {(user?.role === 'sub_hq' || user?.role === 'admin') && deployRequests.some(r => r.status === 'accepted') && (
                        <button 
                            className="btn" 
                            onClick={onLogClick}
                            style={{ 
                              background: 'rgba(111,207,151,0.1)', color: '#6FCF97', 
                              border: '1px solid #6FCF97', marginRight: 12 
                            }}
                        >
                            📋 {deployRequests.filter(r => r.status === 'accepted').length} DISPATCH LOG
                        </button>
                    )}
                    
                    {(user?.role === 'sub_hq' || user?.role === 'admin') && deployRequests.some(r => r.status === 'pending') && (
                        <button 
                            className="btn" 
                            onClick={onAlertClick}
                            style={{ 
                              background: 'rgba(235,87,87,0.2)', color: '#EB5757', 
                              border: '1px solid #EB5757', marginRight: 16, 
                              animation: 'x-snn-spike 1s infinite' 
                            }}
                        >
                            ⚠️ {deployRequests.filter(r => r.status === 'pending').length} ALERTS
                        </button>
                    )}
                    <button
                        className={`btn btn--sim ${simMode ? 'active' : ''}`}
                        onClick={() => setSimModal(true)}
                        id="sim-mode-btn"
                    >
                        🎭 {simMode ? 'SIM ON' : 'Simulation'}
                    </button>
                    {simMode && (
                        <button
                            className="btn btn--ghost"
                            onClick={() => { setSurvivors([]); setDangerZones([]); setMeshNodes([]); setSimMode(false); }}
                        >
                            ✕ Clear
                        </button>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-data)', fontSize: '0.72rem', color: 'var(--earth-sand)' }}>
                        <span className={`status-dot status-dot--${syncStatus}`} />
                        {syncStatus === 'syncing' ? 'SYNCING…' : 'LIVE'}
                    </div>
                    {onLogout && (
                        <button
                            className="btn btn--ghost"
                            onClick={onLogout}
                            style={{ borderColor: 'rgba(192,57,43,0.5)', color: '#e74c3c' }}
                        >
                            ⏻ Logout HQ
                        </button>
                    )}
                </div>
            </header>

            {/* ── Map ── */}
            <main className="dashboard__map">
                <MapPanel
                    survivors={survivors}
                    dangerZones={dangerZones}
                    meshNodes={meshNodes}
                    rescueTeams={rescueTeams}
                    focusedSurvivor={selectedSurvivor}
                    onClearFocus={() => setSelectedSurvivor(null)}
                    xDeployments={xDeployments}
                />
            </main>

            {/* ── Survivor List ── */}
            <aside className="dashboard__list">
                <SurvivorPanel
                    survivors={survivors}
                    selectedSurvivor={selectedSurvivor}
                    onSelect={(s) => setSelectedSurvivor(prev => prev?.device_id === s.device_id ? null : s)}
                />
            </aside>

            {/* ── Side Panels ── */}
            <aside className="dashboard__side">
                <NetworkHealthPanel nodes={meshNodes} avgHops={avgHops} coverage={coverage} meshPeers={meshPeers} />
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderTop: '2px solid var(--earth-soil)' }}>
                    <LiveActivityPanel events={events} />
                </div>
            </aside>

            {/* ── Reset Button — bottom-left corner ────────────────────────── */}
            <button
                onClick={handleReset}
                title="Reset all data — clears survivors, rescue beacons, activity"
                style={{
                    position: 'fixed',
                    bottom: 16,
                    left: 16,
                    zIndex: 2000,
                    background: confirmReset ? '#e74c3c' : 'rgba(10, 6, 6, 0.9)',
                    border: '1px solid rgba(192, 57, 43, 0.7)',
                    color: confirmReset ? '#fff' : '#e74c3c',
                    fontFamily: 'var(--font-data)',
                    fontSize: '0.6rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '5px 10px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s',
                    opacity: confirmReset ? 1 : 0.7,
                }}
                onMouseEnter={e => { if (!confirmReset) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(192,57,43,0.15)'; } }}
                onMouseLeave={e => { if (!confirmReset) { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'rgba(10,6,6,0.9)'; } }}
            >
                {confirmReset ? '⚠️ SURE?' : '↺ Reset'}
            </button>

            {/* ── Simulation Modal ── */}
            {simModal && (
                <div className="sim-modal" onClick={() => setSimModal(false)}>
                    <div className="sim-modal__panel" onClick={e => e.stopPropagation()}>
                        <div className="sim-modal__title">🎭 Simulation Mode</div>
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'var(--earth-sand)', marginBottom: 20 }}>
                            Select a scenario to generate simulated survivor data for demo:
                        </p>
                        {SCENARIO_LIST.map(scenario => (
                            <div
                                key={scenario.key}
                                className="scenario-card"
                                onClick={() => runScenario(scenario.key)}
                                id={`scenario-${scenario.key}`}
                            >
                                <div className="scenario-card__name">{scenario.name}</div>
                                <div className="scenario-card__detail">{scenario.description}</div>
                            </div>
                        ))}
                        <button className="btn btn--ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setSimModal(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
