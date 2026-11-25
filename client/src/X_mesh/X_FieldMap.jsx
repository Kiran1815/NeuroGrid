// X_FieldMap.jsx — Field Command Live Map
// Shows field teams, real mesh survivors, LoRa range circles, EOC markers.
// Own Leaflet instance — does not interfere with MapPanel.

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTierHierarchy } from './X_TierRouter.js';

const TRANSPORT_COLOR = { BLE: '#56CCF2', LORA: '#6FCF97', VSAT: '#F9A825', SATELLITE: '#6FCF97' };
const STATUS_COLOR    = { ACTIVE: '#6FCF97', DEGRADED: '#F9A825', OFFLINE: '#EB5757' };

function teamIcon(team) {
  const col = STATUS_COLOR[team.status] || '#aaa';
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative">
        <div style="width:12px;height:12px;border-radius:50%;background:${col};border:2px solid rgba(255,255,255,0.7);box-shadow:0 0 8px ${col}80"></div>
        <div style="position:absolute;top:14px;left:50%;transform:translateX(-50%);white-space:nowrap;font-family:'Share Tech Mono',monospace;font-size:0.47rem;color:${col};background:rgba(26,18,8,0.85);padding:1px 4px;border-radius:2px;border:1px solid ${col}40">
          ${team.name?.split(' ')[1] || team.id}
        </div>
      </div>`,
    iconSize: [12, 12], iconAnchor: [6, 6], popupAnchor: [0, -16],
  });
}

function eocIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:rgba(230,126,34,0.8);border:2px solid #E67E22;border-radius:3px;transform:rotate(45deg);box-shadow:0 0 10px rgba(230,126,34,0.6)"></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -12],
  });
}

export function X_FieldMap({ survivors = [], rescueTeams = [], meshNodes = [], focusedTeam = null }) {
  const mapRef    = useRef(null);
  const mapInst   = useRef(null);
  const layerGrp  = useRef(null);

  useEffect(() => {
    if (mapInst.current) return;
    mapInst.current = L.map(mapRef.current, {
      center: [17.85, 79.5],
      zoom: 7,
      zoomControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OSM © CARTO', maxZoom: 18,
    }).addTo(mapInst.current);
    L.control.zoom({ position: 'bottomright' }).addTo(mapInst.current);
    layerGrp.current = L.layerGroup().addTo(mapInst.current);
  }, []);

  useEffect(() => {
    if (!mapInst.current) return;
    layerGrp.current.clearLayers();

    const hier = getTierHierarchy();

    // ── Field teams from TierRouter (simulated) + real rescue teams merged
    const allTeams = [
      ...hier.field_teams,
      ...rescueTeams.map(t => ({
        id: t.team_id,
        name: `Field ${t.team_id}`,
        lat: t.latitude,
        lng: t.longitude,
        status: 'ACTIVE',
        transport: 'BLE',
        members: 4,
        survivors_nearby: survivors.filter(s =>
          s.latitude && s.longitude &&
          mapInst.current.distance([t.latitude, t.longitude], [s.latitude, s.longitude]) < 2000
        ).length,
        ping_ms: Math.round(40 + Math.random() * 80),
        last_ping: Date.now() - Math.round(Math.random() * 30000),
      })),
    ];

    allTeams.forEach(team => {
      if (!team.lat || !team.lng) return;
      const marker = L.marker([team.lat, team.lng], { icon: teamIcon(team), zIndexOffset: 200 });
      marker.bindPopup(`
        <div style="font-family:'Share Tech Mono',monospace;font-size:0.7rem;color:var(--earth-parchment);padding:6px;min-width:140px">
          <div style="color:${STATUS_COLOR[team.status]};margin-bottom:4px">▶ ${team.name}</div>
          Status: <strong>${team.status}</strong><br/>
          Transport: ${team.transport}<br/>
          Members: ${team.members}<br/>
          Survivors nearby: <strong style="color:#EB5757">${team.survivors_nearby}</strong><br/>
          Ping: ${team.ping_ms}ms
        </div>`);
      marker.addTo(layerGrp.current);

      // LoRa range circle (12km) for LoRa-enabled teams
      if (team.transport === 'LORA') {
        L.circle([team.lat, team.lng], {
          radius: 12000,
          color: '#6FCF97', fillColor: '#6FCF97', fillOpacity: 0.04,
          weight: 1, dashArray: '5 6',
        }).bindTooltip(`📡 LoRa 12km range — ${team.name}`, { sticky: true })
          .addTo(layerGrp.current);
      }

      // BLE range (100m)
      if (team.transport === 'BLE') {
        L.circle([team.lat, team.lng], {
          radius: 100,
          color: '#56CCF2', fillColor: '#56CCF2', fillOpacity: 0.08,
          weight: 0.8, dashArray: '3 4',
        }).addTo(layerGrp.current);
      }
    });

    // ── EOC locations
    hier.eocs?.forEach(eoc => {
      if (!eoc.lat || !eoc.lng) return;
      L.marker([eoc.lat, eoc.lng], { icon: eocIcon(), zIndexOffset: 100 })
        .bindPopup(`<div style="font-family:monospace;font-size:0.7rem;color:var(--earth-parchment)"><strong style="color:#E67E22">🏢 ${eoc.name}</strong><br/>Transport: ${eoc.transport}<br/>Uplink: ${eoc.uplink_kbps} kbps<br/>Status: ${eoc.status}</div>`)
        .addTo(layerGrp.current);
    });

    // ── Real survivors from mesh
    survivors.forEach(s => {
      if (!s.latitude || !s.longitude) return;
      const isC = (s.priority?.level || '').toLowerCase() === 'critical';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:9px;height:9px;border-radius:50%;background:${isC ? '#EB5757' : '#F9A825'};border:1.5px solid rgba(255,255,255,0.6);opacity:0.8"></div>`,
        iconSize: [9, 9], iconAnchor: [4, 4],
      });
      L.marker([s.latitude, s.longitude], { icon, zIndexOffset: 50 })
        .bindTooltip(`${s.device_id} — ${s.priority?.level || 'LOW'}`, { sticky: true })
        .addTo(layerGrp.current);
    });

    // ── Network Mesh Nodes
    meshNodes.forEach(node => {
      if (!node.latitude || !node.longitude) return;
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:8px;height:8px;background:var(--earth-sand);border:1px solid rgba(255,255,255,0.8);transform:rotate(45deg);box-shadow:0 0 6px rgba(230,126,34,0.3)"></div>`,
        iconSize: [8, 8], iconAnchor: [4, 4],
      });
      L.marker([node.latitude, node.longitude], { icon, zIndexOffset: 40 })
        .bindTooltip(`Mesh Node: ${node.node_id}`, { sticky: true })
        .addTo(layerGrp.current);
    });

    // ── NDMA HQ (Delhi)
    const ndmaIcon = L.divIcon({
      className: '',
      html: `<div style="font-family:'Share Tech Mono',monospace;font-size:0.55rem;color:#6FCF97;background:rgba(26,18,8,0.92);border:1px solid rgba(74,124,89,0.6);padding:3px 7px;border-radius:3px;white-space:nowrap">🏛 NDMA HQ — New Delhi</div>`,
      iconAnchor: [60, 10],
    });
    L.marker([28.6, 77.2], { icon: ndmaIcon, interactive: false }).addTo(layerGrp.current);

    // ── Connection lines field→EOC for active teams
    allTeams.filter(t => t.status === 'ACTIVE' && t.lat && t.lng).forEach(team => {
      const nearEOC = hier.eocs?.find(e => e.lat && e.lng);
      if (nearEOC) {
        L.polyline([[team.lat, team.lng], [nearEOC.lat, nearEOC.lng]], {
          color: '#56CCF2', weight: 0.7, opacity: 0.25, dashArray: '4 6',
        }).addTo(layerGrp.current);
      }
    });

  }, [survivors, rescueTeams, meshNodes]);

  // Target acquisition: fly to focused team
  useEffect(() => {
    if (!mapInst.current || !focusedTeam || !focusedTeam.lat || !focusedTeam.lng) return;
    mapInst.current.flyTo([focusedTeam.lat, focusedTeam.lng], 14, { duration: 1.5, easeLinearity: 0.25 });
    
    // Draw temporary focus ring
    const ring = L.circleMarker([focusedTeam.lat, focusedTeam.lng], {
      radius: 40,
      color: '#E67E22',
      fillColor: 'transparent',
      weight: 2,
      opacity: 0.8,
      className: 'x-sar-cata-zone' // pulse animation
    }).addTo(layerGrp.current);

    setTimeout(() => {
      if (layerGrp.current?.hasLayer(ring)) {
        layerGrp.current.removeLayer(ring);
      }
    }, 4000);
  }, [focusedTeam]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

export default X_FieldMap;
