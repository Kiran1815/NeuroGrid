// X_LoRaSimulator.js — LoRa Long-Range Transport Simulation Layer
// Simulates LoRa 10-15km communication to fill BLE mesh gaps.
// DOES NOT modify MeshRouter.js — registered externally as a transport plugin.
// Interface contract matches existing transport registry pattern.

function haversineKm(pos1, pos2) {
  const R = 6371;
  const dLat = toRad(pos2.lat - pos1.lat);
  const dLng = toRad(pos2.lng - pos1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(pos1.lat)) * Math.cos(toRad(pos2.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return (deg * Math.PI) / 180; }

/**
 * LoRaTransport — plug-and-play transport object.
 * Register with: MeshRouter.registerTransport(LoRaTransport)
 */
export const LoRaTransport = {
  type:              'LORA',
  range_km:          12,
  bandwidth_bps:     5000,      // LoRa is slow — compression is critical
  power_mw:          100,       // 100mW TX
  frequency_mhz:     865.0625, // India ISM band
  myPosition:        { lat: 17.385, lng: 78.4867 }, // set at runtime

  setPosition(lat, lng) {
    this.myPosition = { lat, lng };
  },

  /**
   * Simulate sending a payload to a target device.
   * @param {object} payload       - data to transmit
   * @param {object} targetDevice  - { device_id, position: { lat, lng } }
   * @returns {Promise<{ delivered, latency_ms, rssi, distance_km }>}
   */
  send(payload, targetDevice) {
    const distance = haversineKm(this.myPosition, targetDevice.position ?? { lat: 0, lng: 0 });
    if (distance > this.range_km) {
      return Promise.reject(new Error(`LORA_OUT_OF_RANGE: ${distance.toFixed(1)}km > ${this.range_km}km`));
    }
    // Latency: ~200ms base + 40ms per km
    const latency_ms = Math.round(200 + distance * 40);
    // RSSI degrades with distance (dBm)
    const rssi = Math.round(-60 - distance * 8);
    // Simulate rare packet loss at edge of range
    const delivered = distance < this.range_km * 0.85 || Math.random() > 0.15;

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (delivered) {
          resolve({ delivered: true, latency_ms, rssi, distance_km: Math.round(distance * 10) / 10 });
        } else {
          reject(new Error('LORA_PACKET_LOSS'));
        }
      }, latency_ms);
    });
  },

  /**
   * Get real-time link stats (for UI display).
   */
  getLinkStats(targetDevice) {
    const distance = haversineKm(this.myPosition, targetDevice.position ?? { lat: 0, lng: 0 });
    const inRange  = distance <= this.range_km;
    const rssi     = inRange ? Math.round(-60 - distance * 8) : null;
    const quality  = inRange ? Math.max(0, Math.round((1 - distance / this.range_km) * 100)) : 0;
    return { distance_km: Math.round(distance * 10) / 10, inRange, rssi, quality_pct: quality };
  },
};

// ── Simulation helpers for UI visualization ────────────────────────

/**
 * Generate simulated LoRa node positions for visualization.
 * @param {number} count - number of LoRa relay nodes to simulate
 * @param {object} center - { lat, lng } reference center
 * @returns {Array} relay node objects
 */
export function generateLoRaNodes(count = 4, center = { lat: 17.385, lng: 78.487 }) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI;
    const dist  = 5 + Math.random() * 6;  // 5-11km out
    const lat   = center.lat + (dist / 111.32) * Math.cos(angle);
    const lng   = center.lng + (dist / (111.32 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
    return {
      id:         `LORA-${String(i + 1).padStart(2, '0')}`,
      lat, lng,
      range_km:   LoRaTransport.range_km,
      rssi:       Math.round(-65 - Math.random() * 20),
      active:     Math.random() > 0.15,
    };
  });
}
