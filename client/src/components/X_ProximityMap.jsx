// components/X_ProximityMap.jsx
// 1km Proximity Radar for Peer-to-Peer Survivor Help
// Shows nearby mesh nodes/survivors and provides direction vectors.

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getBearing, bearingToArrow, formatDistance } from '../core/geo/RouteOptimizer.js';

const RADAR_RADIUS_M = 1000; // 1km

export function X_ProximityMap({ position, peers = [], localId }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const markersGrp = useRef(null);
  const selfMarker = useRef(null);
  const dirLineRef = useRef(null);
  
  const [selectedPeer, setSelectedPeer] = useState(null);

  // Initialize Map
  useEffect(() => {
    if (mapInst.current || !mapRef.current) return;
    
    // High-resolution satellite-style dark map
    mapInst.current = L.map(mapRef.current, {
      center: [position.latitude, position.longitude],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(mapInst.current);

    markersGrp.current = L.layerGroup().addTo(mapInst.current);

    // Pulse animation style
    if (!document.getElementById('radar-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'radar-pulse-style';
      style.textContent = `
        @keyframes radar-ping {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .x-radar-self {
          width: 14px; height: 14px; background: #3498db;
          border: 2px solid white; border-radius: 50%;
          box-shadow: 0 0 10px #3498db;
        }
        .x-radar-peer {
          width: 10px; height: 10px; border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,0.8);
        }
        .x-radar-line {
            stroke-dasharray: 5, 5;
            animation: dash 1s linear infinite;
        }
        @keyframes dash {
            to { stroke-dashoffset: -10; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Update Peer Markers & Proximity 1km
  useEffect(() => {
    if (!mapInst.current || !markersGrp.current) return;
    markersGrp.current.clearLayers();
    if (dirLineRef.current) { dirLineRef.current.remove(); dirLineRef.current = null; }

    // Always keep "Self" updated at center
    const selfLatLng = [position.latitude, position.longitude];
    mapInst.current.setView(selfLatLng);

    if (selfMarker.current) {
      selfMarker.current.setLatLng(selfLatLng);
    } else {
      const selfIcon = L.divIcon({
        className: 'x-radar-self',
        iconSize: [14, 14], iconAnchor: [7, 7]
      });
      selfMarker.current = L.marker(selfLatLng, { icon: selfIcon, zIndexOffset: 1000 }).addTo(mapInst.current);
    }

    // 1km range circle overlay
    L.circle(selfLatLng, {
      radius: RADAR_RADIUS_M,
      color: 'rgba(230,126,34,0.3)',
      fillColor: 'rgba(230,126,34,0.05)',
      weight: 1,
      dashArray: '4 4'
    }).addTo(markersGrp.current);

    // Render all known peers
    peers.forEach(peer => {
      const lat = peer.latitude || peer.lat;
      const lng = peer.longitude || peer.lng;
      if (!lat || !lng || peer.device_id === localId) return;

      const dist = L.latLng(selfLatLng).distanceTo([lat, lng]);
      // removed proximity filter to show all mesh beacons

      const isSOS = peer.emergency_type || peer.priority?.level === 'CRITICAL';
      const col = isSOS ? '#EB5757' : '#F9A825';
      const isSelected = selectedPeer?.device_id === peer.device_id;

      const peerIcon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:10px;height:10px">
            ${isSOS ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${col};opacity:0.3;animation:radar-ping 1.5s infinite"></div>` : ''}
            <div class="x-radar-peer" style="background:${col}; box-shadow: 0 0 6px ${col}${isSelected ? '; width:14px; height:14px; border:2px solid white' : ''}"></div>
          </div>
        `,
        iconSize: [10, 10], iconAnchor: [5, 5]
      });

      const marker = L.marker([lat, lng], { icon: peerIcon }).addTo(markersGrp.current);
      
      marker.on('click', () => {
        setSelectedPeer(prev => prev?.device_id === peer.device_id ? null : peer);
      });
    });

    // Navigation line to selected peer
    if (selectedPeer) {
        const plat = selectedPeer.latitude || selectedPeer.lat;
        const plng = selectedPeer.longitude || selectedPeer.lng;
        dirLineRef.current = L.polyline([selfLatLng, [plat, plng]], {
            color: '#FFAA00', weight: 2, opacity: 0.8, className: 'x-radar-line'
        }).addTo(mapInst.current);
    }

  }, [position, peers, selectedPeer]);

  const bearing = selectedPeer ? getBearing(position.latitude, position.longitude, selectedPeer.latitude || selectedPeer.lat, selectedPeer.longitude || selectedPeer.lng) : null;
  const distM = selectedPeer ? Math.round(L.latLng(position.latitude, position.longitude).distanceTo([selectedPeer.latitude || selectedPeer.lat, selectedPeer.longitude || selectedPeer.lng])) : null;

  return (
    <div className="x-proximity-radar" style={{ 
      position: 'relative', 
      width: '100%', 
      aspectRatio: '1/1', 
      background: '#0a0a0a',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid var(--earth-soil)',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
    }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', filter: 'grayscale(0.3) contrast(1.1)' }} />
      
      {/* 1KM HUD Label */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 500,
        fontFamily: 'var(--font-data)', fontSize: '0.6rem', color: 'rgba(230,126,34,0.8)',
        letterSpacing: '0.15em', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4
      }}>
        📡 MESH EXPLORER
      </div>

      {/* Navigation HUD */}
      {selectedPeer && (
        <div style={{
          position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 500,
          background: 'rgba(12,12,12,0.9)', border: '1px solid var(--accent-amber)',
          padding: '8px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12,
          animation: 'x-slide-in 0.3s ease-out'
        }}>
          <div style={{ fontSize: '1.8rem', color: '#FFAA00' }}>{bearingToArrow(bearing)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--earth-parchment)' }}>{formatDistance(distM)}</div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.55rem', color: 'var(--earth-sand)', textTransform: 'uppercase' }}>
              Target: {selectedPeer.device_id?.slice(-6)}
            </div>
          </div>
          <button 
            onClick={() => setSelectedPeer(null)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
          >✕</button>
        </div>
      )}

      {!selectedPeer && peers.length > 1 && (
        <div style={{
            position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 500,
            fontFamily: 'var(--font-data)', fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)',
            textAlign: 'center', whiteSpace: 'nowrap'
        }}>
            TAP PEER TO NAVIGATE
        </div>
      )}
    </div>
  );
}
