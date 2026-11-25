// modes/RescueMode/RescueMode.jsx
// Full-screen rescue map — Leaflet-based with live GPS beacon + zone survivors

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGeolocation } from '../../hooks/useGeolocation.js';
import { getBearing, bearingToArrow, formatDistance } from '../../core/geo/RouteOptimizer.js';
import { db } from '../../core/storage/IndexedDBAdapter.js';
import { PriorityBadge } from '../../components/PriorityBadge.jsx';
import { LastSeenTimer } from '../../components/LastSeenTimer.jsx';
import { BatteryIndicator } from '../../components/BatteryIndicator.jsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const BROADCAST_INTERVAL = 10_000;
const GEOFENCE_RADIUS = 100;
// Stable team ID that persists for the session
const SESSION_TEAM_ID = `RESCUE-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// ── Leaflet icon helpers ────────────────────────────────────────────────────
function makeSurvivorMarker(level, isSelected) {
    const lvl = (level ?? 'low').toLowerCase();
    const colors = { critical: '#C0392B', medium: '#D35400', low: '#7D6608' };
    const color = colors[lvl] || '#7D6608';
    return L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:28px;height:28px">
            ${isSelected ? `<div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${color};opacity:0.5;animation:ping 1.2s ease infinite"></div>` : ''}
            <div style="
              width:28px;height:28px;border-radius:50%;
              background:${color};border:2px solid rgba(255,255,255,0.5);
              display:flex;align-items:center;justify-content:center;
              font-size:11px;font-weight:700;color:#fff;
              box-shadow:0 0 ${isSelected ? '12px' : '4px'} ${color};
            ">${lvl === 'critical' ? '🆘' : lvl === 'medium' ? '⚠' : '●'}</div>
          </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -18],
    });
}

function makeBeaconMarker() {
    return L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:22px;height:22px">
            <div style="position:absolute;inset:-10px;border-radius:50%;background:rgba(52,152,219,0.25);animation:ping 1.5s ease infinite"></div>
            <div style="position:absolute;inset:-5px;border-radius:50%;background:rgba(52,152,219,0.15);animation:ping 1.5s ease 0.3s infinite"></div>
            <div style="width:22px;height:22px;border-radius:50%;background:#3498db;
              border:3px solid rgba(255,255,255,0.9);
              box-shadow:0 0 16px rgba(52,152,219,0.9);
              display:flex;align-items:center;justify-content:center;">
              <div style="width:6px;height:6px;border-radius:50%;background:#fff"></div>
            </div>
          </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -15],
    });
}

function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180, dl = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function RescueMode({ onSwitchMode, onLogout }) {
    const { position, error: gpsError, lowAccuracy } = useGeolocation();
    const teamIdRef = useRef(SESSION_TEAM_ID);
    const TEAM_ID = teamIdRef.current;
    const broadcastIntervalRef = useRef(null);
    const [survivors, setSurvivors] = useState([]);
    const [selectedSurvivor, setSelectedSurvivor] = useState(null);
    const [geofenceAlert, setGeofenceAlert] = useState(null); // { survivor, distance }
    const [snoozed, setSnoozed] = useState(new Set()); // device_ids suppressed
    const [signalSent, setSignalSent] = useState(null);
    const [isZoneMode, setIsZoneMode] = useState(false);
    const [rescuedIds, setRescuedIds] = useState(new Set());

    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersGroup = useRef(null);
    const beaconMarker = useRef(null);
    const dirLineRef = useRef(null);
    const alertTimer = useRef(null);

    // ── Load survivors: from localStorage zone OR full IndexedDB ─────────────
    useEffect(() => {
        const zoneRaw = localStorage.getItem('neurogrid_rescue_zone');
        const focusId = localStorage.getItem('neurogrid_rescue_focus');

        if (zoneRaw) {
            try {
                const zone = JSON.parse(zoneRaw);
                setSurvivors(zone);
                setIsZoneMode(true);
                if (focusId) {
                    const focused = zone.find(s => s.device_id === focusId);
                    if (focused) setSelectedSurvivor(focused);
                }
                // Clear so next visit shows all
                localStorage.removeItem('neurogrid_rescue_zone');
                localStorage.removeItem('neurogrid_rescue_focus');
                return;
            } catch { /* fall through to DB load */ }
        }

        db.open()
            .then(() => db.getAll('survivors'))
            .then(all => setSurvivors(all ?? []))
            .catch(() => { });
    }, []);

    // ── Init Leaflet map ──────────────────────────────────────────────────────
    useEffect(() => {
        if (mapInstance.current || !mapRef.current) return;
        mapInstance.current = L.map(mapRef.current, {
            center: [position.latitude, position.longitude],
            zoom: 16,
            zoomControl: false,
        });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OSM © CARTO', maxZoom: 19,
        }).addTo(mapInstance.current);
        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
        markersGroup.current = L.layerGroup().addTo(mapInstance.current);

        // Add CSS for beacon ping animation
        if (!document.getElementById('rescue-ping-style')) {
            const style = document.createElement('style');
            style.id = 'rescue-ping-style';
            style.textContent = `
              @keyframes ping {
                0%   { transform:scale(1); opacity:0.8; }
                100% { transform:scale(2.5); opacity:0; }
              }`;
            document.head.appendChild(style);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Update rescue worker beacon on map ────────────────────────────────────
    useEffect(() => {
        if (!mapInstance.current) return;
        const latlng = [position.latitude, position.longitude];
        if (beaconMarker.current) {
            beaconMarker.current.setLatLng(latlng);
        } else {
            beaconMarker.current = L.marker(latlng, { icon: makeBeaconMarker(), zIndexOffset: 2000 })
                .bindTooltip(`🚒 You · ${TEAM_ID}`, { permanent: false })
                .addTo(mapInstance.current);
        }
    }, [position]);

    // ── Draw survivor markers ─────────────────────────────────────────────────
    useEffect(() => {
        if (!mapInstance.current || !markersGroup.current) return;
        markersGroup.current.clearLayers();
        // Remove old direction line
        if (dirLineRef.current) { dirLineRef.current.remove(); dirLineRef.current = null; }

        survivors.forEach(s => {
            if (!s.latitude || !s.longitude) return;
            const dist = haversine(position.latitude, position.longitude, s.latitude, s.longitude);
            const bearing = getBearing(position.latitude, position.longitude, s.latitude, s.longitude);
            const arrow = bearingToArrow(bearing);
            const isSelected = selectedSurvivor?.device_id === s.device_id;
            const lvl = s.priority?.level ?? 'LOW';

            const marker = L.marker([s.latitude, s.longitude], {
                icon: makeSurvivorMarker(lvl, isSelected),
                zIndexOffset: isSelected ? 1000 : 0,
            }).addTo(markersGroup.current);

            // Popup with direction + distance info
            const popupHtml = `
              <div style="font-family:monospace;font-size:0.78rem;min-width:160px;background:#1a1a1a;color:#e8e0d0;padding:4px 0">
                <div style="font-weight:700;color:#f0e6c8;margin-bottom:4px">${s.device_id}</div>
                <div style="color:#C0392B;font-weight:700;margin-bottom:2px">${lvl}</div>
                <div style="font-size:1.4rem;color:#FFAA00;text-align:center;padding:4px 0">${arrow}</div>
                <div style="text-align:center;color:#FFAA00;font-weight:700;font-size:0.9rem">${formatDistance(Math.round(dist))}</div>
                <div style="margin-top:6px;font-size:0.68rem;color:#a0946c">${s.emergency_type?.toUpperCase() ?? 'UNKNOWN'} · 🔋${s.battery_level}%</div>
              </div>`;

            marker.bindPopup(popupHtml, {
                className: 'rescue-popup',
                maxWidth: 200,
            });

            marker.on('click', () => {
                setSelectedSurvivor(prev => prev?.device_id === s.device_id ? null : s);
            });
        });

        // Draw direction line to selected survivor
        if (selectedSurvivor?.latitude && mapInstance.current) {
            dirLineRef.current = L.polyline(
                [[position.latitude, position.longitude], [selectedSurvivor.latitude, selectedSurvivor.longitude]],
                { color: '#FFAA00', weight: 2.5, opacity: 0.7, dashArray: '8 6' }
            ).addTo(mapInstance.current);
        }

        // Auto-fit bounds to show all survivors + beacon
        const allPoints = survivors
            .filter(s => s.latitude && s.longitude)
            .map(s => [s.latitude, s.longitude]);
        allPoints.push([position.latitude, position.longitude]);
        if (allPoints.length > 1) {
            mapInstance.current.fitBounds(allPoints, { padding: [50, 50], maxZoom: 17 });
        }
    }, [survivors, selectedSurvivor, position]);

    // ── Geofence check ─────────────────────────────────────────────────────────
    useEffect(() => {
        const id = setInterval(() => {
            for (const s of survivors) {
                if (!s.latitude || rescuedIds.has(s.device_id)) continue;
                const dist = Math.round(haversine(position.latitude, position.longitude, s.latitude, s.longitude));
                // Clear snooze when rescuer has moved away (>150m)
                if (snoozed.has(s.device_id) && dist > 150) {
                    setSnoozed(prev => { const n = new Set(prev); n.delete(s.device_id); return n; });
                }
                if (dist <= GEOFENCE_RADIUS && !snoozed.has(s.device_id)) {
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
                    if (alertTimer.current) clearTimeout(alertTimer.current);
                    setGeofenceAlert({ survivor: s, distance: dist });
                    alertTimer.current = setTimeout(() => setGeofenceAlert(null), 8000);
                    return;
                }
            }
        }, 3000);
        return () => { clearInterval(id); if (alertTimer.current) clearTimeout(alertTimer.current); };
    }, [survivors, position, snoozed, rescuedIds]);

    // ── Mark survivor as Rescued ───────────────────────────────────────────────
    const handleRescued = useCallback(async (survivor) => {
        const rescuedRecord = { ...survivor, rescued: true, rescue_time: Date.now() };
        // Update locally
        setRescuedIds(prev => new Set([...prev, survivor.device_id]));
        setSurvivors(prev => prev.filter(s => s.device_id !== survivor.device_id));
        setGeofenceAlert(null);
        setSelectedSurvivor(prev => prev?.device_id === survivor.device_id ? null : prev);
        // Persist in IndexedDB
        await db.upsert('survivors', rescuedRecord);
        // Notify server → broadcasts to all dashboards
        if (navigator.onLine) {
            fetch(`${API_BASE}/api/survivor/rescued`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_id: survivor.device_id, team_id: TEAM_ID, rescue_time: Date.now() }),
            }).catch(() => { });
        }
    }, []);

    // ── Broadcast rescue worker GPS ───────────────────────────────────────────
    useEffect(() => {
        const broadcast = () => {
            // Skip if GPS accuracy is too poor (> 100m)
            if (position.accuracy > 0 && position.accuracy > 100) return;
            fetch(`${API_BASE}/api/rescue-team`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_id: TEAM_ID, latitude: position.latitude, longitude: position.longitude, timestamp: Date.now() }),
            }).catch(() => { });
        };
        broadcast();
        broadcastIntervalRef.current = setInterval(broadcast, BROADCAST_INTERVAL);
        return () => clearInterval(broadcastIntervalRef.current);
    }, [position, TEAM_ID]);

    // ── Handle logout — clear beacon from server first ───────────────────────
    const handleLogout = useCallback(() => {
        // Stop broadcasting
        clearInterval(broadcastIntervalRef.current);
        // Delete beacon from server so dashboard map clears immediately
        fetch(`${API_BASE}/api/rescue-team/${TEAM_ID}`, { method: 'DELETE' })
            .catch(() => { })
            .finally(() => onLogout?.());
    }, [TEAM_ID, onLogout]);

    // ── Signal a survivor ─────────────────────────────────────────────────────
    const handleSignal = useCallback(async (survivor) => {
        const updated = { ...survivor, last_seen: Date.now(), pinged_at: Date.now() };
        await db.upsert('survivors', updated);
        await db.queueForSync(updated);
        if (navigator.onLine) {
            fetch(`${API_BASE}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gateway_id: TEAM_ID, batch: [updated], timestamp: Date.now() }),
            }).catch(() => { });
        }
        setSignalSent(survivor.device_id);
        setTimeout(() => setSignalSent(null), 2000);
        setSurvivors(prev => prev.map(s => s.device_id === survivor.device_id ? updated : s));
    }, []);

    const gpsOk = !gpsError && position.accuracy > 0 && !lowAccuracy;
    const distToSelected = selectedSurvivor?.latitude
        ? Math.round(haversine(position.latitude, position.longitude, selectedSurvivor.latitude, selectedSurvivor.longitude))
        : null;
    const bearingToSelected = selectedSurvivor?.latitude
        ? getBearing(position.latitude, position.longitude, selectedSurvivor.latitude, selectedSurvivor.longitude)
        : null;

    return (
        <div style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0a0a' }}>

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header className="dashboard__header" style={{ flexShrink: 0, zIndex: 1001, position: 'relative' }}>
                <div className="header-logo">
                    <div className="header-logo__icon">🚒</div>
                    Rescue Navigator
                </div>

                {/* GPS strip */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, marginLeft: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: gpsOk ? '#2ecc71' : '#e74c3c',
                            display: 'inline-block',
                            boxShadow: gpsOk ? '0 0 6px #2ecc71' : 'none',
                        }} />
                        <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.68rem', color: 'var(--earth-sand)' }}>
                            {gpsOk ? `${position.latitude.toFixed(5)}°N  ${position.longitude.toFixed(5)}°E  ±${Math.round(position.accuracy)}m` : (gpsError || 'Acquiring GPS…')}
                        </span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.65rem', color: 'var(--accent-amber)', letterSpacing: '0.08em' }}>
                        {TEAM_ID}
                    </span>
                    {isZoneMode && (
                        <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.62rem', color: '#2ecc71', background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)', borderRadius: 4, padding: '2px 8px' }}>
                            📍 ZONE VIEW · {survivors.length} survivors
                        </span>
                    )}
                </div>

                <div className="header-controls">
                    {onSwitchMode && (
                        <button className="btn btn--ghost" onClick={() => onSwitchMode('ndma')}>← Dashboard</button>
                    )}
                    {lowAccuracy && (
                        <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.62rem', color: '#e67e22', background: 'rgba(230,126,34,0.12)', border: '1px solid rgba(230,126,34,0.3)', borderRadius: 4, padding: '2px 8px' }}>
                            ⚠ Low GPS ±{Math.round(position.accuracy)}m
                        </span>
                    )}
                    {onLogout && (
                        <button className="btn btn--ghost" onClick={handleLogout} style={{ borderColor: 'rgba(192,57,43,0.5)', color: '#e74c3c' }}>⏻ Logout</button>
                    )}
                </div>
            </header>

            {/* ── Proximity Overlay ── */}
            {geofenceAlert && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: 'rgba(150, 20, 20, 0.22)',
                    backdropFilter: 'blur(2px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                }}>
                    <div style={{
                        pointerEvents: 'all',
                        position: 'relative',
                        background: 'rgba(12, 6, 6, 0.92)',
                        backdropFilter: 'blur(18px)',
                        border: '1px solid rgba(192, 57, 43, 0.45)',
                        borderRadius: 16,
                        padding: '28px 40px 24px',
                        textAlign: 'center',
                        boxShadow: '0 0 60px rgba(192,57,43,0.2), inset 0 0 30px rgba(192,57,43,0.05)',
                        maxWidth: 320, minWidth: 260,
                    }}>
                        {/* X close — snoozes this survivor */}
                        <button
                            onClick={() => {
                                setSnoozed(prev => new Set([...prev, geofenceAlert.survivor.device_id]));
                                setGeofenceAlert(null);
                            }}
                            style={{
                                position: 'absolute', top: 10, right: 12,
                                background: 'none', border: 'none',
                                color: 'rgba(255,255,255,0.35)', fontSize: '1rem',
                                cursor: 'pointer', lineHeight: 1, padding: 4,
                                borderRadius: 4, transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
                            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}
                            title="Snooze — won't alert again until you move away"
                        >✕</button>

                        <div style={{ fontSize: '2rem', marginBottom: 6 }}>🆘</div>
                        <div style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.7rem', letterSpacing: '0.28em',
                            color: '#e74c3c', textTransform: 'uppercase', marginBottom: 10,
                        }}>Survivor Nearby</div>
                        <div style={{
                            fontFamily: 'var(--font-data)',
                            fontSize: '2rem', fontWeight: 700,
                            color: 'var(--earth-parchment)', lineHeight: 1, marginBottom: 4,
                        }}>{geofenceAlert.distance}m</div>
                        <div style={{
                            fontFamily: 'var(--font-data)', fontSize: '0.75rem',
                            color: 'rgba(255,200,180,0.65)', letterSpacing: '0.06em',
                            marginBottom: 20,
                        }}>to {geofenceAlert.survivor.device_id}</div>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            {/* Dismiss (snooze) */}
                            <button
                                onClick={() => {
                                    setSnoozed(prev => new Set([...prev, geofenceAlert.survivor.device_id]));
                                    setGeofenceAlert(null);
                                }}
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    color: 'rgba(255,255,255,0.5)',
                                    borderRadius: 8, padding: '7px 18px',
                                    fontFamily: 'var(--font-data)', fontSize: '0.7rem',
                                    cursor: 'pointer', letterSpacing: '0.08em',
                                }}
                            >SNOOZE</button>

                            {/* RESCUED — only when very close (≤10m) */}
                            {geofenceAlert.distance <= 10 && (
                                <button
                                    onClick={() => handleRescued(geofenceAlert.survivor)}
                                    style={{
                                        background: 'rgba(46,204,113,0.2)',
                                        border: '1px solid rgba(46,204,113,0.6)',
                                        color: '#2ecc71',
                                        borderRadius: 8, padding: '7px 18px',
                                        fontFamily: 'var(--font-data)', fontSize: '0.7rem',
                                        fontWeight: 700, cursor: 'pointer',
                                        letterSpacing: '0.08em',
                                        boxShadow: '0 0 12px rgba(46,204,113,0.3)',
                                    }}
                                >✓ RESCUED</button>
                            )}
                        </div>
                        {geofenceAlert.distance > 10 && (
                            <div style={{ marginTop: 10, fontFamily: 'var(--font-data)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)' }}>
                                "RESCUED" button appears at ≤10m
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Map fills rest of screen ──────────────────────────────────── */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
                <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />

                {/* ── Selected Survivor Overlay (bottom-left) ──────────────── */}
                {selectedSurvivor && (
                    <div style={{
                        position: 'absolute', bottom: 20, left: 16, zIndex: 1000,
                        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,170,0,0.4)', borderRadius: 10,
                        padding: '12px 16px', minWidth: 220, maxWidth: 280,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
                        fontFamily: 'var(--font-data)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--earth-parchment)', flex: 1 }}>{selectedSurvivor.device_id}</span>
                            <PriorityBadge level={selectedSurvivor.priority?.level} />
                            <button onClick={() => setSelectedSurvivor(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
                        </div>

                        {/* Big compass + distance */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ fontSize: '2.2rem', color: '#FFAA00', lineHeight: 1 }}>
                                {bearingToArrow(bearingToSelected)}
                            </div>
                            <div>
                                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--earth-parchment)' }}>{formatDistance(distToSelected)}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--earth-sand)', letterSpacing: '0.1em' }}>{Math.round(bearingToSelected)}° {bearingToArrow(bearingToSelected)?.split(' ')[1]}</div>
                            </div>
                        </div>

                        {/* Meta */}
                        <div style={{ fontSize: '0.68rem', color: 'var(--earth-sand)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{selectedSurvivor.emergency_type}</div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <BatteryIndicator level={selectedSurvivor.battery_level} />
                                <LastSeenTimer timestamp={selectedSurvivor.last_seen} />
                            </div>
                        </div>

                        {/* Signal button */}
                        <button
                            onClick={() => handleSignal(selectedSurvivor)}
                            style={{
                                width: '100%', marginTop: 10,
                                padding: '7px',
                                background: signalSent === selectedSurvivor.device_id ? 'rgba(46,204,113,0.2)' : 'rgba(255,170,0,0.12)',
                                border: `1px solid ${signalSent === selectedSurvivor.device_id ? '#2ecc71' : 'rgba(255,170,0,0.5)'}`,
                                color: signalSent === selectedSurvivor.device_id ? '#2ecc71' : 'var(--accent-amber)',
                                borderRadius: 6, fontFamily: 'var(--font-data)', fontSize: '0.72rem',
                                fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em',
                                transition: 'all 0.25s',
                            }}
                        >
                            {signalSent === selectedSurvivor.device_id ? '✓ SIGNAL SENT' : '📡 SEND SIGNAL'}
                        </button>
                    </div>
                )}

                {/* ── Map legend (bottom-right, above zoom) ──────────────────── */}
                <div style={{
                    position: 'absolute', bottom: 80, right: 16, zIndex: 1000,
                    background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                    padding: '8px 12px', fontFamily: 'var(--font-data)', fontSize: '0.62rem',
                    color: 'rgba(255,255,255,0.55)', lineHeight: 1.8,
                }}>
                    <div><span style={{ color: '#3498db' }}>●</span> You (beacon)</div>
                    <div><span style={{ color: '#C0392B' }}>🆘</span> Critical</div>
                    <div><span style={{ color: '#D35400' }}>⚠</span> Medium</div>
                    <div><span style={{ color: '#7D6608' }}>●</span> Low</div>
                    <div style={{ marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 4 }}>
                        Click marker for nav
                    </div>
                </div>

                {/* ── No survivors hint ──────────────────────────────────────── */}
                {survivors.length === 0 && (
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                        zIndex: 1000, textAlign: 'center',
                        fontFamily: 'var(--font-data)', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem',
                        background: 'rgba(10,10,10,0.7)', padding: '20px 32px', borderRadius: 10,
                        backdropFilter: 'blur(8px)',
                    }}>
                        No survivors cached.<br />
                        <span style={{ fontSize: '0.72rem' }}>Go online + select a zone on Dashboard first.</span>
                    </div>
                )}
            </div>

            {/* Leaflet popup dark theme override */}
            <style>{`
                .rescue-popup .leaflet-popup-content-wrapper {
                    background: #1a1a1a !important;
                    border: 1px solid rgba(255,170,0,0.3) !important;
                    border-radius: 8px !important;
                    color: #e8e0d0 !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.7) !important;
                }
                .rescue-popup .leaflet-popup-tip {
                    background: #1a1a1a !important;
                }
                .rescue-popup .leaflet-popup-close-button {
                    color: rgba(255,255,255,0.5) !important;
                }
            `}</style>
        </div>
    );
}
