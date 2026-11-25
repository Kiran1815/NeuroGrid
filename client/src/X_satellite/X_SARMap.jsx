// X_SARMap.jsx — Dedicated SAR Satellite Map with Before/After/Timeline Toggle
// Stands alone with its own Leaflet instance. Does NOT share with MapPanel.
// Shows district damage overlays with toggle between PRE / POST / TIMELINE views.

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { INDIA_DISTRICTS } from '../X_simulation/X_SARDataGenerator.js';

const SEVERITY_COLOR = {
  CATASTROPHIC: '#B71C1C',
  SEVERE:       '#E65100',
  MODERATE:     '#F9A825',
  MINOR:        '#4A7C59',
};

// Timeline hours: each hour reveals ≈ districts/6 more
function getVisibleDistricts(districts, hourSlice) {
  const n = Math.max(1, Math.ceil((hourSlice / 6) * districts.length));
  return districts.slice(0, n);
}

function buildSAR(polygon, label, d) {
  return `
    <div style="font-family:'Share Tech Mono',monospace;font-size:0.72rem;background:var(--earth-charcoal);border:1px solid var(--earth-soil);border-radius:4px;padding:10px;color:var(--earth-parchment);min-width:170px">
      <div style="color:${SEVERITY_COLOR[d.severity]};font-size:0.8rem;margin-bottom:6px;letter-spacing:0.08em">🛰 ${d.severity}</div>
      <strong>${label}</strong><br/>
      <span style="color:var(--earth-sand)">Δ Change: ${Math.round((d.change_magnitude||0.3)*100)}%</span><br/>
      <span style="color:var(--earth-sand)">Area: ${(d.affected_area_km2||75).toFixed(1)} km²</span><br/>
      <span style="color:var(--earth-sand)">Population: ${(d.population_exposed||45000).toLocaleString()}</span>
    </div>`;
}

const INDIA_BOUNDS = [[8.0, 68.0], [37.0, 97.5]];

export function X_SARMap({ districts = [], deployments = {} }) {
  const mapRef    = useRef(null);
  const mapInst   = useRef(null);
  const layerGrp  = useRef(null);
  const [mode, setMode]   = useState('PRE');
  const [hour, setHour]   = useState(6);

  // Initialise Leaflet once
  useEffect(() => {
    if (mapInst.current) return;
    mapInst.current = L.map(mapRef.current, {
      center: [18.5, 79.5],
      zoom: 6,
      zoomControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OSM © CARTO', maxZoom: 18,
    }).addTo(mapInst.current);
    L.control.zoom({ position: 'bottomright' }).addTo(mapInst.current);
    layerGrp.current = L.layerGroup().addTo(mapInst.current);
  }, []);

  // Redraw layers when mode, hour, or districts change
  useEffect(() => {
    if (!mapInst.current) return;
    layerGrp.current.clearLayers();

    if (mode === 'PRE') {
      // baseline "Normal" view — soft blue/teal fog circles for population centers
      INDIA_DISTRICTS.forEach(d => {
        const popRadius = Math.sqrt(d.population || 200000) * 15;
        
        // Baseline glow
        L.circle([d.lat, d.lng], {
          radius: popRadius * 1.5,
          color: 'transparent',
          fillColor: '#0097A7',
          fillOpacity: 0.12,
          className: 'x-sar-baseline-fog',
          interactive: false
        }).addTo(layerGrp.current);

        // Population core
        L.circle([d.lat, d.lng], {
          radius: popRadius * 0.4,
          color: 'rgba(179,229,252,0.3)',
          weight: 1,
          fillColor: '#0097A7',
          fillOpacity: 0.25,
          className: 'x-sar-baseline-fog',
        }).bindTooltip(`<span style="font-family:monospace;font-size:0.65rem;color:var(--x-satellite-ice)">${d.name} — Baseline Density</span>`).addTo(layerGrp.current);
      });

      const infoIcon = L.divIcon({
        className: '',
        html: `<div style="font-family:'Share Tech Mono';font-size:0.6rem;color:var(--x-satellite-ice);background:rgba(0,151,167,0.15);border:1px solid rgba(0,151,167,0.6);padding:5px 10px;border-radius:4px;white-space:nowrap;box-shadow:0 0 15px rgba(0,151,167,0.3)">🛰 BASELINE SENSOR — NO CHANGE DETECTED</div>`,
        iconAnchor: [100, 10],
      });
      L.marker([22, 82], { icon: infoIcon, interactive: false }).addTo(layerGrp.current);

    } else if (mode === 'POST' || mode === 'TIMELINE') {
      // Weather Radar style damage fog
      const base = districts.length > 0 ? districts : buildFallbackDistricts();
      const toShow = mode === 'TIMELINE' ? getVisibleDistricts(base, hour) : base;

      toShow.forEach(d => {
        const baseRadius = (d.affected_area_km2 || 100) * 120;
        const color = SEVERITY_COLOR[d.severity] || '#F9A825';

        // 1. Outer Atmospheric Fog (Wide)
        L.circle([d.lat_center, d.lng_center], {
          radius: baseRadius * 2.2,
          color: 'transparent',
          fillColor: color,
          fillOpacity: 0.1,
          className: 'x-sar-fog',
          interactive: false
        }).addTo(layerGrp.current);

        // 2. Damage Perimeter (Mid)
        L.circle([d.lat_center, d.lng_center], {
          radius: baseRadius * 1.2,
          color: 'transparent',
          fillColor: color,
          fillOpacity: 0.25,
          className: 'x-sar-fog',
          interactive: false
        }).addTo(layerGrp.current);

        // 3. Dense Impact Core (Hot)
        const core = L.circle([d.lat_center, d.lng_center], {
          radius: baseRadius * 0.5,
          color: color,
          weight: d.severity === 'CATASTROPHIC' ? 3 : 1,
          fillColor: color,
          fillOpacity: 0.6,
          className: d.severity === 'CATASTROPHIC' ? 'x-sar-cata-zone x-sar-fog' : 'x-sar-fog',
        });
        core.bindPopup(buildSAR(core, d.district_name, d));
        core.addTo(layerGrp.current);

        // Label with shadow/glow
        if (mode === 'POST') {
          const lbl = L.divIcon({
            className: '',
            html: `<div style="font-family:'Share Tech Mono',monospace;font-size:0.55rem;color:${color};background:rgba(26,18,8,0.95);border:1px solid ${color}CC;padding:2px 6px;border-radius:2px;white-space:nowrap;pointer-events:none;box-shadow:0 0 10px ${color}60;text-shadow:0 0 5px ${color}">${d.district_name?.toUpperCase()?.split(' ')[0]}</div>`,
            iconAnchor: [25, -20],
          });
          L.marker([d.lat_center, d.lng_center], { icon: lbl, interactive: false }).addTo(layerGrp.current);
        }
      });

      if (mode === 'TIMELINE') {
        const tLbl = L.divIcon({
          className: '',
          html: `<div style="font-family:'Share Tech Mono',monospace;font-size:0.6rem;color:#F9A825;background:rgba(26,18,8,0.9);border:1px solid #F9A825;padding:4px 10px;border-radius:4px;box-shadow:0 0 15px rgba(249,168,37,0.3)">📡 T+${hour}h PROPAGATION — ${toShow.length}/${base.length} ZONES</div>`,
          iconAnchor: [100, 12],
        });
        L.marker([22, 82], { icon: tLbl, interactive: false }).addTo(layerGrp.current);
      } else {
        const postLbl = L.divIcon({
          className: '',
          html: `<div style="font-family:'Share Tech Mono';font-size:0.6rem;color:#EB5757;background:rgba(183,28,28,0.15);border:1px solid #EB5757;padding:5px 10px;border-radius:4px;white-space:nowrap;box-shadow:0 0 15px rgba(235,87,87,0.3)">⚠️ POST-DISASTER SAR FUSION — DAMAGE DETECTED</div>`,
          iconAnchor: [100, 10],
        });
        L.marker([22, 107], { icon: postLbl, interactive: false }).addTo(layerGrp.current);
      }
    }

    // Deployment icons (always shown regardless of mode)
    Object.values(deployments).forEach(dep => {
      if (!dep.lat || !dep.lng) return;
      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none">
          <div style="font-size:1rem">${dep.resources.helicopters > 0 ? '🚁' : dep.resources.rescue_boats > 0 ? '🚤' : '🦺'}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:0.42rem;color:#6FCF97;background:rgba(26,18,8,0.9);border:1px solid rgba(74,124,89,0.4);padding:1px 4px;border-radius:2px;white-space:nowrap">DEPLOYED</div>
        </div>`;
      const icon = L.divIcon({ className: '', html, iconAnchor: [12, 24] });
      L.marker([dep.lat, dep.lng], { icon, zIndexOffset: 500 })
        .bindPopup(`<div style="font-family:monospace;font-size:0.7rem;color:var(--earth-parchment)"><strong style="color:#6FCF97">✓ DEPLOYED</strong><br/>${dep.zone_name}<br/>${new Date(dep.deployed_at).toLocaleTimeString()}</div>`)
        .addTo(layerGrp.current);
    });

  }, [mode, hour, districts, deployments]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--earth-bark)', borderBottom: '1px solid var(--earth-soil)', borderTop: '1px solid var(--earth-soil)', flexShrink: 0, alignItems: 'center' }}>
        {['PRE', 'POST', 'TIMELINE'].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '6px 16px',
            background: mode === m ? 'rgba(230,126,34,0.15)' : 'transparent',
            border: 'none',
            borderBottom: `2px solid ${mode === m ? 'var(--accent-amber)' : 'transparent'}`,
            color: mode === m ? 'var(--accent-amber)' : 'var(--earth-sand)',
            fontFamily: 'var(--x-font-terminal)',
            fontSize: '0.6rem',
            letterSpacing: '0.1em',
            cursor: 'pointer',
          }}>
            {m === 'PRE' ? '🌿 BEFORE' : m === 'POST' ? '🔴 AFTER' : '⏱ TIMELINE'}
          </button>
        ))}
        {mode === 'TIMELINE' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', paddingRight: 12 }}>
            <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.58rem', color: 'var(--earth-sand)' }}>T+{hour}h</span>
            <input
              type="range" min={1} max={6} step={1} value={hour}
              onChange={e => setHour(Number(e.target.value))}
              style={{ width: 100, accentColor: 'var(--accent-amber)' }}
            />
            <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.55rem', color: 'var(--earth-sand)' }}>T+6h</span>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 12, paddingRight: 12 }}>
          {['CATA', 'SEV', 'MOD', 'MIN'].map((s,i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width:10, height:10, borderRadius:2, background: Object.values(SEVERITY_COLOR)[i] }} />
              <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.52rem', color: 'var(--earth-sand)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}

// Fallback districts when SAR hasn't run yet
function buildFallbackDistricts() {
  return INDIA_DISTRICTS.slice(0, 6).map((d, i) => ({
    district_id:       d.id,
    district_name:     d.name,
    lat_center:        d.lat,
    lng_center:        d.lng,
    severity:          ['CATASTROPHIC','SEVERE','SEVERE','MODERATE','MODERATE','MINOR'][i],
    change_magnitude:  [0.78, 0.62, 0.55, 0.38, 0.28, 0.14][i],
    affected_area_km2: [280, 195, 170, 120, 85, 40][i],
    population_exposed:[142000, 98000, 85000, 58000, 42000, 21000][i],
    confidence_score:  0.91,
  }));
}

export default X_SARMap;
