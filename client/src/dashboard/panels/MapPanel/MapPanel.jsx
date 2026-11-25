// dashboard/panels/MapPanel/MapPanel.jsx
// Preserves original dark CARTO look — adds layer switcher + survivor focus mode
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Tile Layers (Dark CARTO is the default — untouched) ──────────────────────
const TILE_LAYERS = {
    'Dark': {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attr: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
    },
    'Satellite': {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attr: '© <a href="https://www.esri.com/">Esri</a> — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    },
    'Street': {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attr: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
};

function makeSurvivorIcon(level, isMoving, isSelected = false) {
    const lvl = (level ?? 'low').toLowerCase();
    return L.divIcon({
        className: '',
        html: `
      <div class="survivor-marker survivor-marker--${lvl} ${isMoving ? 'survivor-marker--moving' : ''} ${isSelected ? 'survivor-marker--selected' : ''}">
        ${lvl === 'critical' || isSelected ? '<div class="survivor-marker__pulse"></div>' : ''}
        <div class="survivor-marker__dot"></div>
        ${isSelected ? '<div class="survivor-marker__ring"></div>' : ''}
      </div>
    `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
    });
}

function buildPopup(s) {
    return `
    <div>
      <strong style="color:var(--earth-parchment)">${s.device_id}</strong><br/>
      Type: ${s.emergency_type}<br/>
      Battery: ${s.battery_level}%<br/>
      Priority: <strong style="color:${s.priority?.color}">${s.priority?.level}</strong> (${s.priority?.score})<br/>
      Hops: ${s.hop_count}
    </div>
  `;
}

export function MapPanel({ survivors = [], dangerZones = [], meshNodes = [], rescueTeams = [], focusedSurvivor = null, onClearFocus, xDeployments = {} }) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const layerGroup = useRef(null);
    const tileLayerRef = useRef(null);
    const focusLayerRef = useRef(null);
    const [activeLayer, setActiveLayer] = useState('Dark');

    // ── Init map once ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (mapInstance.current) return;

        mapInstance.current = L.map(mapRef.current, {
            center: [17.385, 78.4867],
            zoom: 14,
            zoomControl: false,
        });

        tileLayerRef.current = L.tileLayer(TILE_LAYERS['Dark'].url, {
            attribution: TILE_LAYERS['Dark'].attr,
            maxZoom: 19,
        }).addTo(mapInstance.current);

        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
        layerGroup.current = L.layerGroup().addTo(mapInstance.current);
        focusLayerRef.current = L.layerGroup().addTo(mapInstance.current);
    }, []);

    // ── Swap tile layer when user switches ─────────────────────────────────────
    useEffect(() => {
        if (!mapInstance.current || !tileLayerRef.current) return;
        const cfg = TILE_LAYERS[activeLayer];
        tileLayerRef.current.setUrl(cfg.url);
        tileLayerRef.current.options.attribution = cfg.attr;
    }, [activeLayer]);

    // ── Re-render ALL markers ─────────────────────────────────────────────────
    useEffect(() => {
        if (!mapInstance.current) return;
        layerGroup.current?.clearLayers();

        const isFocusing = !!focusedSurvivor;

        // Survivor markers
        survivors.forEach(s => {
            // Skip if GPS is missing or still at default fallback location
            if (!s.latitude || !s.longitude) return;
            if (s.latitude === 17.385 && s.longitude === 78.4867) return;

            const isSelected = isFocusing && s.device_id === focusedSurvivor.device_id;
            const lvl = s.priority?.level ?? 'LOW';
            const isMoving = s.movement_status === 'moving';
            const icon = makeSurvivorIcon(lvl, isMoving, isSelected);

            // JITTER: slightly randomize coordinates (approx ~3 meters) based on device_id
            // This prevents devices on the exact same Wi-Fi from completely overlapping
            // by using the device_id hash so the offset is consistent for the same device
            const seed = s.device_id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            const jLat = s.latitude + ((Math.sin(seed) * 2 - 1) * 0.00003);
            const jLng = s.longitude + ((Math.cos(seed) * 2 - 1) * 0.00003);

            const marker = L.marker([jLat, jLng], {

                icon,
                opacity: isFocusing && !isSelected ? 0.25 : 1,
                zIndexOffset: isSelected ? 1000 : 0,
            }).bindPopup(buildPopup(s)).addTo(layerGroup.current);

            if (isSelected) {
                marker.openPopup();
            }
        });

        // Danger zone circles
        dangerZones.forEach(zone => {
            L.circle(zone.center, {
                radius: zone.radius,
                color: '#C0392B',
                fillColor: '#C0392B',
                fillOpacity: isFocusing ? 0.03 : 0.08,
                weight: 2,
                dashArray: '6 4',
            })
                .bindPopup(`<strong>⚠ Danger Zone ${zone.id}</strong><br/>${zone.count} survivors`)
                .addTo(layerGroup.current);
        });

        // Mesh node markers
        meshNodes.forEach(node => {
            const icon = L.divIcon({
                className: '',
                html: `<div class="mesh-node-marker" style="opacity:${Math.max(0.3, node.signal ?? 0.8)}"></div>`,
                iconSize: [10, 10],
                iconAnchor: [5, 5],
            });
            L.marker([node.latitude, node.longitude], {
                icon,
                opacity: isFocusing ? 0.2 : 1,
            }).addTo(layerGroup.current);
        });

        // Rescue team markers — large pulsing orange beacon
        rescueTeams.forEach(team => {
            // Inject pulse keyframe once
            if (!document.getElementById('hq-rescue-pulse')) {
                const s = document.createElement('style');
                s.id = 'hq-rescue-pulse';
                s.textContent = `
                  @keyframes hqPulse {
                    0%   { transform: rotate(45deg) scale(1);   box-shadow: 0 0 0 0 rgba(230,126,34,0.8); }
                    70%  { transform: rotate(45deg) scale(1.1); box-shadow: 0 0 0 14px rgba(230,126,34,0); }
                    100% { transform: rotate(45deg) scale(1);   box-shadow: 0 0 0 0 rgba(230,126,34,0); }
                  }
                  @keyframes hqRing {
                    0%   { transform: scale(1); opacity:0.6; }
                    100% { transform: scale(2.8); opacity:0; }
                  }`;
                document.head.appendChild(s);
            }
            const icon = L.divIcon({
                className: '',
                html: `
                  <div style="position:relative;width:36px;height:36px">
                    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(230,126,34,0.35);animation:hqRing 1.6s ease-out infinite"></div>
                    <div style="position:absolute;inset:4px;border-radius:50%;background:rgba(230,126,34,0.2);animation:hqRing 1.6s ease-out 0.4s infinite"></div>
                    <div style="
                      position:absolute;top:8px;left:8px;
                      width:20px;height:20px;
                      background:linear-gradient(135deg,#F39C12,#E67E22);
                      animation:hqPulse 1.8s ease infinite;
                      border:2px solid rgba(255,255,255,0.9);
                      box-shadow:0 0 10px rgba(230,126,34,0.9);
                    "></div>
                  </div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 18],
                popupAnchor: [0, -22],
            });
            L.marker([team.latitude, team.longitude], { icon, zIndexOffset: 3000 })
                .bindPopup(`
                  <div style="font-family:monospace;font-size:0.78rem">
                    <strong style="color:#E67E22">🚒 RESCUE TEAM</strong><br/>
                    ${team.team_id}<br/>
                    <span style="color:#aaa;font-size:0.65rem">Last ping: ${new Date(team.timestamp).toLocaleTimeString()}</span>
                  </div>`)
                .addTo(layerGroup.current);
        });

        // Auto-fit: include both survivors + rescue team positions
        const survivorPoints = survivors.map(s => [s.latitude, s.longitude]);
        const teamPoints = rescueTeams
            .filter(t => t.latitude && t.longitude)
            .map(t => [t.latitude, t.longitude]);
        const allPoints = [...survivorPoints, ...teamPoints];

        if (!isFocusing && allPoints.length > 0) {
            if (allPoints.length === 1) {
                mapInstance.current.setView(allPoints[0], 16);
            } else {
                mapInstance.current.fitBounds(allPoints, { padding: [50, 50], maxZoom: 16 });
            }
        } else if (!isFocusing && teamPoints.length > 0) {
            // Rescue teams exist but no survivors — still pan to show them
            if (teamPoints.length === 1) {
                mapInstance.current.setView(teamPoints[0], 15);
            } else {
                mapInstance.current.fitBounds(teamPoints, { padding: [60, 60], maxZoom: 15 });
            }
        }

        // ── X-Layer: Deployed resource icons ─────────────────────────────────
        Object.values(xDeployments).forEach(dep => {
            if (!dep.lat || !dep.lng) return;
            const d = dep.resources;
            const icons = [
                d.ndrf_units    > 0 ? { emoji: '🦺', label: `${d.ndrf_units} NDRF`,    color: '#E67E22' } : null,
                d.helicopters   > 0 ? { emoji: '🚁', label: `${d.helicopters} HELI`,   color: '#56CCF2' } : null,
                d.medical_teams > 0 ? { emoji: '⚕',  label: `${d.medical_teams} MED`,  color: '#EB5757' } : null,
                d.rescue_boats  > 0 ? { emoji: '🚤', label: `${d.rescue_boats} BOAT`,  color: '#56CCF2' } : null,
            ].filter(Boolean);
            const html = `
              <div style="display:flex;flex-direction:column;align-items:center;gap:1px;pointer-events:none">
                <div style="display:flex;gap:3px">${icons.map(ic => `<span style="font-size:0.9rem">${ic.emoji}</span>`).join('')}</div>
                <div style="font-family:'Share Tech Mono',monospace;font-size:0.42rem;color:#6FCF97;background:rgba(26,18,8,0.9);border:1px solid rgba(74,124,89,0.4);padding:1px 5px;border-radius:2px;white-space:nowrap">✓ ${dep.zone_name?.split(' ')[0]}</div>
              </div>`;
            const icon = L.divIcon({ className: '', html, iconSize: [48, 32], iconAnchor: [24, 32] });
            L.marker([dep.lat, dep.lng], { icon, zIndexOffset: 2000 })
                .bindPopup(`
                  <div style="font-family:monospace;font-size:0.72rem;color:var(--earth-parchment)">
                    <strong style="color:#6FCF97">✓ DEPLOYED</strong><br/>
                    <strong>${dep.zone_name}</strong><br/>
                    ${icons.map(ic => `${ic.emoji} ${ic.label}`).join('<br/>')}<br/>
                    <span style="color:var(--earth-sand);font-size:0.6rem">${new Date(dep.deployed_at).toLocaleTimeString()}</span>
                  </div>`)
                .addTo(layerGroup.current);
        });

    }, [survivors, dangerZones, meshNodes, rescueTeams, focusedSurvivor, xDeployments]);

    // ── Focus overlay — zoom + draw hop lines to nearby mesh nodes ─────────────
    useEffect(() => {
        if (!mapInstance.current) return;
        focusLayerRef.current?.clearLayers();

        if (!focusedSurvivor) return;

        const { latitude: lat, longitude: lng } = focusedSurvivor;
        if (lat == null || lng == null) return;

        // Fly to selected survivor
        mapInstance.current.flyTo([lat, lng], 16, { duration: 1.2 });

        // Draw lines from this survivor to nearby mesh nodes (within ~500m)
        meshNodes.forEach(node => {
            const dist = mapInstance.current.distance([lat, lng], [node.latitude, node.longitude]);
            if (dist < 800) {
                L.polyline([[lat, lng], [node.latitude, node.longitude]], {
                    color: '#FFAA00',
                    weight: 1.5,
                    opacity: 0.55,
                    dashArray: '5 6',
                }).addTo(focusLayerRef.current);

                // Highlight nearby mesh node
                const icon = L.divIcon({
                    className: '',
                    html: `<div class="mesh-node-marker" style="opacity:1;box-shadow:0 0 8px rgba(255,170,0,0.7)"></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6],
                });
                L.marker([node.latitude, node.longitude], { icon })
                    .bindTooltip(`📡 Node · ${Math.round(dist)}m`)
                    .addTo(focusLayerRef.current);
            }
        });

        // Draw connections to nearby survivors within the same cluster
        survivors.forEach(s => {
            if (s.device_id === focusedSurvivor.device_id) return;
            const dist = mapInstance.current.distance([lat, lng], [s.latitude, s.longitude]);
            if (dist < 600) {
                L.polyline([[lat, lng], [s.latitude, s.longitude]], {
                    color: '#5dade2',
                    weight: 1,
                    opacity: 0.35,
                    dashArray: '3 8',
                }).addTo(focusLayerRef.current);
            }
        });
    }, [focusedSurvivor, meshNodes, survivors]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>

            {/* ── Tile Layer Switcher ──────────────────────────────────────────── */}
            <div style={{
                position: 'absolute', top: 12, left: 12, zIndex: 1000,
                display: 'flex', gap: 4, background: 'rgba(10,10,10,0.8)',
                padding: '4px 6px', borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(6px)',
            }}>
                {Object.keys(TILE_LAYERS).map(name => (
                    <button
                        key={name}
                        onClick={() => setActiveLayer(name)}
                        style={{
                            background: activeLayer === name ? 'var(--accent-amber, #FFAA00)' : 'transparent',
                            color: activeLayer === name ? '#000' : 'rgba(255,255,255,0.65)',
                            border: 'none',
                            borderRadius: 4,
                            padding: '3px 10px',
                            fontSize: '0.7rem',
                            fontFamily: 'var(--font-data, monospace)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            transition: 'all 0.15s',
                        }}
                    >
                        {name}
                    </button>
                ))}
            </div>

            {/* ── Focus Mode Banner ────────────────────────────────────────────── */}
            {focusedSurvivor && (
                <div style={{
                    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 1000, background: 'rgba(10,10,10,0.9)',
                    border: '1px solid var(--accent-amber, #FFAA00)',
                    borderRadius: 8, padding: '6px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    fontFamily: 'var(--font-data, monospace)', fontSize: '0.75rem',
                    color: 'var(--accent-amber, #FFAA00)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                }}>
                    <span>📍 FOCUS: {focusedSurvivor.device_id.toUpperCase()}</span>
                    <button
                        onClick={onClearFocus}
                        style={{
                            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                            borderRadius: 4, padding: '2px 8px', cursor: 'pointer',
                            fontFamily: 'inherit', fontSize: '0.7rem',
                        }}
                    >
                        ✕ Clear
                    </button>
                </div>
            )}

            {/* ── The Map itself ───────────────────────────────────────────────── */}
            <div
                ref={mapRef}
                className="map-panel"
                style={{ width: '100%', height: '100%' }}
                aria-label="Survivor location map"
            />
        </div>
    );
}
