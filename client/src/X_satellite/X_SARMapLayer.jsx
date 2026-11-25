// X_SARMapLayer.jsx — Leaflet SAR Damage Overlay
// Renders semi-transparent district damage polygons on existing Leaflet map instance.
// Must be rendered INSIDE the MapPanel or passed the map instance as a prop.
// DOES NOT replace or modify any existing map layer.

import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Approximate district boundary boxes (lat/lng rectangles simplified as polygons)
// In a production system these would be real GeoJSON district boundaries
const DISTRICT_BOUNDS = {
  WARANGAL_NORTH:  [[17.85,79.40],[18.10,79.40],[18.10,79.75],[17.85,79.75]],
  KARIMNAGAR_EAST: [[18.25,79.00],[18.60,79.00],[18.60,79.35],[18.25,79.35]],
  NIZAMABAD:       [[18.55,77.80],[18.88,77.80],[18.88,78.35],[18.55,78.35]],
  ADILABAD:        [[19.40,78.30],[19.90,78.30],[19.90,78.80],[19.40,78.80]],
  KHAMMAM:         [[17.00,80.00],[17.50,80.00],[17.50,80.40],[17.00,80.40]],
  NELLORE:         [[14.20,79.70],[14.70,79.70],[14.70,80.30],[14.20,80.30]],
  ONGOLE:          [[15.30,79.80],[15.70,79.80],[15.70,80.25],[15.30,80.25]],
  BAPATLA:         [[15.70,80.30],[16.10,80.30],[16.10,80.70],[15.70,80.70]],
};

/**
 * X_SARMapLayer — React component that imperatively adds Leaflet polygon layers.
 *
 * Props:
 *   districts   - Array from X_SARProcessor (with severity_rgba, severity, etc.)
 *   visible     - boolean toggle
 *   mapInstance - Leaflet map instance (ref.current from MapPanel)
 */
export function X_SARMapLayer({ districts = [], visible = true, mapInstance = null }) {
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!mapInstance) return;

    // Clean up previous layers
    if (layerGroupRef.current) {
      mapInstance.removeLayer(layerGroupRef.current);
    }

    if (!visible || districts.length === 0) return;

    const group = L.layerGroup();

    districts.forEach(district => {
      const bounds = DISTRICT_BOUNDS[district.district_id];
      if (!bounds) return;

      const polygon = L.polygon(bounds, {
        color:       district.severity_color || '#FFB300',
        fillColor:   district.severity_color || '#FFB300',
        fillOpacity: 0.42,
        weight:      1.5,
        dashArray:   district.severity === 'CATASTROPHIC' ? null : '4 3',
        className:   district.severity === 'CATASTROPHIC' ? 'x-sar-catastrophic-zone' : '',
      });

      const popupHtml = `
        <div style="font-family:'Share Tech Mono',monospace;font-size:0.72rem;min-width:180px;background:#0A0F1A;border:1px solid rgba(0,188,212,0.3);border-radius:4px;padding:10px;color:#B3E5FC">
          <div style="color:#00BCD4;font-size:0.8rem;margin-bottom:6px;letter-spacing:0.1em">🛰 SAR DAMAGE REPORT</div>
          <div><strong style="color:#fff">${district.district_name}</strong></div>
          <div style="margin-top:4px;color:${district.severity_color}">▶ ${district.severity}</div>
          <div style="margin-top:4px;color:rgba(179,229,252,0.7)">Δ Change: ${Math.round(district.change_magnitude * 100)}%</div>
          <div>Affected: ${district.affected_area_km2.toFixed(1)} km²</div>
          <div>Population: ${district.population_exposed.toLocaleString()} exposed</div>
          <div>Confidence: ${Math.round(district.confidence_score * 100)}%</div>
          <div style="margin-top:6px;color:#76FF03;font-size:0.62rem">SNN Processed · ${new Date(district.processed_at).toLocaleTimeString()}</div>
        </div>
      `;

      polygon.bindPopup(popupHtml, { className: 'x-sar-popup', maxWidth: 220 });

      // Pulse animation for catastrophic zones
      if (district.severity === 'CATASTROPHIC') {
        polygon.on('add', () => {
          polygon.getElement()?.style.setProperty('animation', 'x-damage-pulse 2s ease-in-out infinite');
        });
      }

      polygon.addTo(group);

      // Label marker at center
      const centerLat = district.lat_center;
      const centerLng = district.lng_center;
      const labelIcon = L.divIcon({
        className: '',
        html: `<div style="
          font-family:'Share Tech Mono',monospace;
          font-size:0.55rem;
          color:${district.severity_color};
          background:rgba(10,15,26,0.85);
          border:1px solid ${district.severity_color}60;
          padding:2px 5px;
          border-radius:3px;
          white-space:nowrap;
          letter-spacing:0.08em;
          pointer-events:none;
        ">${district.severity.charAt(0)}·${district.district_name.toUpperCase()}</div>`,
        iconAnchor: [40, 10],
      });
      L.marker([centerLat, centerLng], { icon: labelIcon, interactive: false }).addTo(group);
    });

    group.addTo(mapInstance);
    layerGroupRef.current = group;

    return () => {
      if (layerGroupRef.current) {
        mapInstance.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [districts, visible, mapInstance]);

  return null; // no DOM output — purely imperative Leaflet layer
}

export default X_SARMapLayer;
