// modes/SurvivorMode/SurvivorMode.jsx
// Full-screen mobile-first survivor interface

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SOSButton } from '../../components/SOSButton.jsx';
import { BatteryIndicator } from '../../components/BatteryIndicator.jsx';
import { PriorityBadge } from '../../components/PriorityBadge.jsx';
import { X_ProximityMap } from '../../components/X_ProximityMap.jsx';
import { useGeolocation } from '../../hooks/useGeolocation.js';
import { useBattery } from '../../hooks/useBattery.js';
import { useMesh } from '../../hooks/useMesh.js';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';
import { computePriorityScore } from '../../core/scoring/PriorityEngine.js';
import { db } from '../../core/storage/IndexedDBAdapter.js';
import { SOSFlashlight } from '../../core/device/SOSFlashlight.js';

const EMERGENCY_TYPES = ['Medical', 'Trapped', 'Fire', 'Flood', 'Other'];
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';


export function SurvivorMode() {
    const navigate = useNavigate();
    const { position } = useGeolocation();
    const { level: battLevel } = useBattery();
    const { peerCount, sendSOS, sendMsg, localId, meshPeers } = useMesh();
    const { canInstall, promptInstall, showIOSGuide, closeIOSGuide } = usePWAInstall();

    const [sosActive, setSosActive] = useState(false);
    const [manualFlashlight, setManualFlashlight] = useState(false);
    const [sosTime, setSosTime] = useState(null);
    const [emergency, setEmergency] = useState('Trapped');
    const [message, setMessage] = useState('');
    const [msgSent, setMsgSent] = useState(false);
    const [priority, setPriority] = useState(null);
    const [pingFlash, setPingFlash] = useState(false);

    const survivor = useRef({
        device_id: localId,
        latitude: position.latitude,
        longitude: position.longitude,
        battery_level: battLevel,
        emergency_type: emergency.toLowerCase(),
        timestamp: sosTime ?? Date.now(),
        last_seen: Date.now(),
        movement_status: 'stationary',
        is_moving: false,
        hop_count: peerCount,
    });

    // ── Flashlight Morse Code Lifecycle ──
    useEffect(() => {
        if (sosActive || manualFlashlight) {
            SOSFlashlight.start();
        } else {
            SOSFlashlight.stop();
        }
        return () => SOSFlashlight.stop();
    }, [sosActive, manualFlashlight]);

    // ── Auto-Ping Mesh Broadcast (Battery Throttled) ──
    const isThrottled = battLevel < 15;

    useEffect(() => {
        if (!sosActive) return;

        // Normal: 5s. Throttled (<15% battery): 120s
        const intervalMs = isThrottled ? 120000 : 5000;

        const autoPing = async () => {
            const now = Date.now();
            survivor.current.last_seen = now;
            survivor.current.pinged_at = now;
            sendSOS(survivor.current);
            await db.upsert('survivors', survivor.current);
        };

        const timer = setInterval(autoPing, intervalMs);
        // Fire once immediately when state changes into active/throttled
        autoPing();

        return () => clearInterval(timer);
    }, [sosActive, isThrottled, sendSOS]);

    useEffect(() => {
        survivor.current = {
            ...survivor.current,
            // CRITICAL: always sync device_id from the reactive localId
            // localId starts as 'NG-LOADING' then updates to real UUID after useMesh init
            // Without this, device_id is stale 'NG-XXXX' and all devices overwrite each other
            device_id: localId,
            latitude: position.latitude,
            longitude: position.longitude,
            battery_level: battLevel,
            emergency_type: emergency.toLowerCase(),
            hop_count: peerCount,
            last_seen: Date.now(),
        };
        if (sosActive) {
            const p = computePriorityScore(survivor.current);
            setPriority(p);
        }
    }, [position, battLevel, emergency, peerCount, sosActive, localId]); // localId in deps!


    const handleSOSActivate = async () => {

        const now = Date.now();
        setSosActive(true);
        setSosTime(now);
        survivor.current = {
            ...survivor.current,
            latitude: position.latitude,
            longitude: position.longitude,
            timestamp: now,
            last_seen: now,
        };

        const p = computePriorityScore(survivor.current);
        setPriority(p);

        // Broadcast over mesh to nearby peers
        sendSOS(survivor.current);

        // Store locally in IndexedDB (offline-first)
        await db.upsert('survivors', survivor.current);

        // Queue for server sync (for when offline)
        await db.queueForSync(survivor.current);

        // If online, immediately POST to server so Dashboard sees it right away
        if (navigator.onLine) {
            try {
                await fetch(`${API_BASE}/api/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gateway_id: localId,
                        batch: [survivor.current],
                        timestamp: now,
                    }),
                });
                console.info('[SOS] Synced to server immediately.');
            } catch (err) {
                console.warn('[SOS] Immediate sync failed, queued for retry.', err);
            }
        }
    };

    const handleSOSDeactivate = async () => {
        setSosActive(false);
        setPriority(null);
        setSosTime(null);
        setPingFlash(false);

        const now = Date.now();
        // Broadcast "SAFE" priority to clear from other devices' radars
        survivor.current = {
            ...survivor.current,
            timestamp: now,
            last_seen: now,
            priority: { level: 'SAFE', score: 0 }
        };

        sendSOS(survivor.current);

        await db.upsert('survivors', survivor.current);
        await db.queueForSync(survivor.current);

        if (navigator.onLine) {
            fetch(`${API_BASE}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gateway_id: localId, batch: [survivor.current], timestamp: now }),
            }).catch(() => { });
        }
    };

    const handleSendMessage = () => {
        if (!message.trim()) return;
        sendMsg(`[${localId}] ${message}`);
        setMsgSent(true);
        setMessage('');
        setTimeout(() => setMsgSent(false), 2000);
    };

    const handlePingLocation = async () => {
        const now = Date.now();
        // Always use the latest GPS position from the hook, not stale survivor.current
        const fresh = {
            ...survivor.current,
            latitude: position.latitude,
            longitude: position.longitude,
            last_seen: now,
            pinged_at: now,
        };
        survivor.current = fresh; // keep ref updated
        sendSOS(fresh); // re-broadcast over mesh with fresh GPS
        await db.upsert('survivors', fresh);
        await db.queueForSync(fresh);
        if (navigator.onLine) {
            fetch(`${API_BASE}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gateway_id: localId, batch: [fresh], timestamp: now }),
            }).catch(() => { });
        }
        setPingFlash(true);
        setTimeout(() => setPingFlash(false), 2000);
    };

    const elapsedSOS = () => {
        if (!sosTime) return null;
        const secs = Math.floor((Date.now() - sosTime) / 1000);
        return secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ${secs % 60}s ago`;
    };

    return (
        <div className="survivor-mode">
            {/* ── Header ── */}
            <header className="survivor-mode__header">
                <div className="survivor-mode__title">NeuroGrid</div>
                <div className="survivor-mode__mesh-status">
                    <span
                        className={`status-dot ${peerCount > 0 ? 'status-dot--connected' : 'status-dot--disconnected'}`}
                    />
                    MESH {peerCount > 0 ? `● ${peerCount} peers` : '○ OFFLINE'}
                </div>
            </header>

            {/* ── Device ID sub-header ── */}
            <div style={{
                background: 'var(--earth-charcoal)',
                padding: '4px 16px 8px',
                fontFamily: 'var(--font-data)',
                fontSize: '0.72rem',
                color: 'var(--earth-sand)',
                borderBottom: '1px solid var(--earth-soil)',
                flexShrink: 0,
            }}>
                Device: {localId}
            </div>

            {/* ── Body ── */}
            <div className="survivor-mode__body">

                {/* SOS Zone */}
                <div className="survivor-mode__sos-zone">
                    <SOSButton onActivate={handleSOSActivate} onDeactivate={handleSOSDeactivate} active={sosActive} />
                    {!sosActive
                        ? <p className="sos-hold-hint">Press &amp; Hold 2 seconds to activate</p>
                        : <div style={{ textAlign: 'center', marginTop: 8 }}>
                            <p className="sos-sent-label" style={{ color: '#E74C3C', margin: '4px 0 6px 0' }}>
                                🆘 SOS ACTIVE
                            </p>
                            {isThrottled && (
                                <p style={{ color: 'var(--accent-amber)', fontSize: '0.65rem', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <span className="status-dot status-dot--syncing"></span>
                                    BATTERY SAVER (Ping every 2m)
                                </p>
                            )}
                            <p style={{ fontSize: '0.65rem', opacity: 0.7, color: 'var(--earth-sand)', margin: 0 }}>
                                Press &amp; Hold to Deactivate
                            </p>
                        </div>
                    }
                </div>

                {/* Night-Mode SOS Flashlight Toggle */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <button
                        onClick={() => setManualFlashlight(!manualFlashlight)}
                        style={{
                            background: manualFlashlight ? 'rgba(230,126,34,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${manualFlashlight ? '#e67e22' : 'rgba(255,255,255,0.1)'}`,
                            color: manualFlashlight ? '#e67e22' : 'var(--earth-sand)',
                            padding: '8px 16px',
                            borderRadius: '30px',
                            fontFamily: 'var(--font-data)',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <span style={{ fontSize: '1rem' }}>🔦</span>
                        {manualFlashlight ? 'FLASH SOS: ON' : 'FLASH SOS: OFF'}
                    </button>
                </div>

                {/* Emergency Type */}
                <div className="card">
                    <label style={{ fontFamily: 'var(--font-data)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--earth-sand)', display: 'block', marginBottom: 8 }}>
                        Emergency Type
                    </label>
                    <div className="chip-row">
                        {EMERGENCY_TYPES.map(type => (
                            <button
                                key={type}
                                className={`chip ${emergency === type ? 'active' : ''}`}
                                onClick={() => setEmergency(type)}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats grid */}
                <div className="survivor-info-grid">
                    <div className="info-box">
                        <div className="info-box__label">📍 GPS</div>
                        <div className="info-box__value" style={{ fontSize: '0.72rem' }}>
                            {position.latitude.toFixed(4)}°N<br />
                            {position.longitude.toFixed(4)}°E
                        </div>
                    </div>
                    <div className="info-box">
                        <div className="info-box__label">📡 Mesh Peers</div>
                        <div className="info-box__value">{peerCount} connected</div>
                    </div>
                    <div className="info-box info-box--full">
                        <div className="info-box__label">🔋 Battery</div>
                        <BatteryIndicator level={battLevel} />
                    </div>
                </div>

                {/* MESH EXPLORER (Replaces Message Input) */}
                <div className="card" style={{ padding: 12 }}>
                    <label style={{ 
                        fontFamily: 'var(--font-data)', fontSize: '0.68rem', 
                        textTransform: 'uppercase', letterSpacing: '0.12em', 
                        color: 'var(--accent-amber)', display: 'block', marginBottom: 10 
                    }}>
                        🚁 MESH EXPLORER (GLOBAL)
                    </label>
                    
                    <X_ProximityMap 
                        position={position} 
                        peers={Object.values(meshPeers || {})} 
                        localId={localId} 
                    />

                    <div style={{
                        marginTop: 10, fontFamily: 'var(--font-data)', 
                        fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)',
                        textAlign: 'center', lineHeight: 1.4
                    }}>
                        Citizen-to-Citizen Help: Tap nearby peers to see direction and distance. 
                        Provide immediate assistance while rescue teams transit.
                    </div>
                </div>

                {/* Status / Priority Score */}
                {sosActive && (
                    <div className="score-panel">
                        <div className="score-panel__row">
                            <span className="score-panel__key">⏱ SOS Sent</span>
                            <span className="score-panel__val">{elapsedSOS()}</span>
                        </div>
                        {priority && (
                            <>
                                <div className="score-panel__row">
                                    <span className="score-panel__key">Priority Score</span>
                                    <span className="score-panel__val">
                                        {priority.score} — <PriorityBadge level={priority.level} />
                                    </span>
                                </div>
                                <div className="score-panel__row">
                                    <span className="score-panel__key">Est. Comm Window</span>
                                    <span className="score-panel__val">~{priority.estimated_survival_minutes} min</span>
                                </div>
                            </>
                        )}
                    </div>
                )}
                {/* Ping Location Button — only when SOS active */}
                {sosActive && (
                    <div className="card" style={{ textAlign: 'center' }}>
                        <button
                            onClick={handlePingLocation}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: pingFlash ? 'rgba(46,204,113,0.2)' : 'rgba(255,170,0,0.1)',
                                border: `1px solid ${pingFlash ? '#2ecc71' : 'rgba(255,170,0,0.5)'}`,
                                color: pingFlash ? '#2ecc71' : 'var(--accent-amber)',
                                borderRadius: 8,
                                fontFamily: 'var(--font-data)',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                            }}
                        >
                            {pingFlash ? '✓ LOCATION SENT' : '📍 Ping My Location'}
                        </button>
                        <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                            Helps rescue team find you faster
                        </div>
                    </div>
                )}
            </div>

            {/* ── iOS Install Guide Modal ─────────────────────────────────── */}
            {showIOSGuide && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                }} onClick={closeIOSGuide}>
                    <div style={{
                        background: '#1a1208', border: '1px solid rgba(230,126,34,0.4)',
                        borderRadius: '16px 16px 0 0', padding: '24px 24px 36px',
                        width: '100%', maxWidth: 420,
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontFamily: 'var(--font-display)', color: '#E67E22', fontSize: '0.7rem', letterSpacing: '0.2em', marginBottom: 16 }}>
                            INSTALL ON iOS
                        </div>
                        <div style={{ fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', lineHeight: 2 }}>
                            1. Tap the <strong style={{ color: '#E67E22' }}>Share</strong> button (□↑) at the bottom of Safari<br />
                            2. Scroll down and tap <strong style={{ color: '#E67E22' }}>"Add to Home Screen"</strong><br />
                            3. Tap <strong style={{ color: '#E67E22' }}>"Add"</strong> in the top right
                        </div>
                        <button onClick={closeIOSGuide} style={{
                            marginTop: 20, width: '100%', padding: '12px',
                            background: 'rgba(230,126,34,0.15)', border: '1px solid rgba(230,126,34,0.5)',
                            color: '#E67E22', borderRadius: 8, fontFamily: 'var(--font-data)',
                            fontSize: '0.75rem', cursor: 'pointer', letterSpacing: '0.1em',
                        }}>Got it</button>
                    </div>
                </div>
            )}

            {/* ── Footer: HQ login + PWA Install ── */}
            <footer style={{
                position: 'fixed',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                maxWidth: 480,
                padding: '10px 16px',
                textAlign: 'center',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                background: 'rgba(14,10,8,0.95)',
                backdropFilter: 'blur(10px)',
                zIndex: 100,
            }}>
                <button
                    onClick={() => navigate('/login')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.18)',
                        fontFamily: 'var(--font-data)',
                        fontSize: '0.65rem',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.45)'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.18)'}
                >
                    Rescue HQ
                </button>

                {/* PWA Install button — Android gets native prompt, iOS gets step guide */}
                {canInstall && (
                    <button
                        onClick={promptInstall}
                        style={{
                            background: 'rgba(230,126,34,0.15)',
                            border: '1px solid rgba(230,126,34,0.5)',
                            color: '#E67E22',
                            fontFamily: 'var(--font-data)',
                            fontSize: '0.65rem',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.2s',
                        }}
                    >
                        📲 Install App
                    </button>
                )}
            </footer>
        </div>
    );
}

