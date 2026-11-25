// X_PopulationLayer.jsx — Census Data Population Density Overlay
// Renders district population circles on Leaflet map.
// Accepts mapInstance prop (imperative Leaflet integration).

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { INDIA_DISTRICTS } from '../X_simulation/X_SARDataGenerator.js';

export function X_PopulationLayer({ visible = false, mapInstance = null }) {
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!mapInstance) return;
    if (layerGroupRef.current) {
      mapInstance.removeLayer(layerGroupRef.current);
      layerGroupRef.current = null;
    }
    if (!visible) return;

    const group = L.layerGroup();
    const maxPop = Math.max(...INDIA_DISTRICTS.map(d => d.population));

    INDIA_DISTRICTS.forEach(d => {
      const radiusKm = Math.sqrt(d.population / maxPop) * 22;  // km
      const radiusM  = radiusKm * 1000;

      L.circle([d.lat, d.lng], {
        radius:      radiusM,
        color:       'rgba(0,188,212,0.6)',
        fillColor:   '#006064',
        fillOpacity: 0.15,
        weight:      1,
        dashArray:   '3 4',
      })
        .bindPopup(`
          <div style="font-family:'Share Tech Mono',monospace;font-size:0.7rem;color:#B3E5FC;padding:8px">
            <div style="color:#00BCD4;margin-bottom:4px">👥 POPULATION DATA</div>
            <strong>${d.name}</strong><br/>
            District: ${d.district}<br/>
            Population: <strong style="color:#69F0AE">${d.population.toLocaleString()}</strong><br/>
            <span style="color:rgba(179,229,252,0.4);font-size:0.58rem">Source: Census 2011 (est.)</span>
          </div>
        `)
        .addTo(group);

      // Pop density label
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          font-family:'Share Tech Mono',monospace;font-size:0.58rem;
          color:rgba(0,188,212,0.7);background:rgba(0,96,100,0.5);
          border:1px solid rgba(0,188,212,0.2);padding:2px 6px;border-radius:3px;
          pointer-events:none;white-space:nowrap;
        ">${(d.population/1000).toFixed(0)}k pop</div>`,
        iconAnchor: [25, 8],
      });
      L.marker([d.lat, d.lng], { icon, interactive: false }).addTo(group);
    });

    group.addTo(mapInstance);
    layerGroupRef.current = group;

    return () => {
      if (layerGroupRef.current) {
        mapInstance.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [visible, mapInstance]);

  return null;
}

export default X_PopulationLayer;
