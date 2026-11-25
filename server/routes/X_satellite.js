// server/routes/X_satellite.js — NeuroGrid-X Satellite Layer Backend Routes
// All routes under /api/x/ prefix — zero conflict with existing routes.
// Uses existing io + memStore pattern from server/index.js.

const express = require('express');

// In-memory X-layer store (separate from existing memStore)
const xStore = {
  damageZones:     [],
  vsatTerminals:   new Map(),   // terminal_id → status
  allocation:      null,
  idrnStatus:      {
    status:         'CERTIFIED',
    api_version:    'IDRN-v2.3',
    data_format:    'GeoJSON + NDMA Schema v4',
    last_sync:      Date.now(),
    cost:           { hardware: 184000, assembly: 38000, certification: 22000, total: 244000 },
    metrics:        { setup_minutes: 4.53, battery_hours: 48, ipx_rating: 'IPX6', response_lag_hours: 2.24 },
    exercise:       { name: 'CYCLONE-MOCK-2024', result: 'PASSED' },
  },
};

module.exports = function X_satelliteRouter(io, memStore) {
  const router = express.Router();

  // ── POST /api/x/sar-ingest ─────────────────────────────────────────────────
  // Receive processed SAR output (50KB decision map, not raw 500MB)
  router.post('/sar-ingest', (req, res) => {
    const { districts, scenario_id, bandwidth_reduction, processed_at } = req.body;
    if (!Array.isArray(districts) || districts.length === 0) {
      return res.status(400).json({ error: 'districts array required' });
    }

    xStore.damageZones = districts.map(d => ({
      district_id:        d.district_id,
      district_name:      d.district_name,
      lat_center:         d.lat_center,
      lng_center:         d.lng_center,
      severity:           d.severity,
      severity_color:     d.severity_color,
      affected_area_km2:  d.affected_area_km2,
      population_exposed: d.population_exposed,
      confidence_score:   d.confidence_score,
      sos_density:        d.sos_density,
      change_magnitude:   d.change_magnitude,
      sar_processed_at:   processed_at || Date.now(),
      composite_score:    d.composite_score || 0,
    }));

    // Broadcast to all connected dashboards
    if (io) {
      io.emit('x_sar_update', {
        districts:           xStore.damageZones,
        scenario_id,
        bandwidth_reduction,
        ts:                  Date.now(),
      });
    }

    console.log(`[X-SAR] Ingested ${districts.length} district damage zones — scenario: ${scenario_id}`);
    res.json({ ok: true, districts_ingested: districts.length, bandwidth_reduction });
  });

  // ── GET /api/x/damage-map ──────────────────────────────────────────────────
  // Serve current SAR damage map
  router.get('/damage-map', (req, res) => {
    res.json({
      ok:            true,
      districts:     xStore.damageZones,
      total_zones:   xStore.damageZones.length,
      last_updated:  xStore.damageZones[0]?.sar_processed_at ?? null,
    });
  });

  // ── GET /api/x/ai-allocation ───────────────────────────────────────────────
  // Get current AI resource allocation recommendations
  router.get('/ai-allocation', (req, res) => {
    res.json({
      ok:           true,
      allocation:   xStore.allocation,
      generated_at: xStore.allocation?.allocated_at ?? null,
    });
  });

  // ── POST /api/x/vsat-heartbeat ─────────────────────────────────────────────
  // VSAT terminal check-in (simulated field terminal ping)
  router.post('/vsat-heartbeat', (req, res) => {
    const { terminal_id, status, battery_pct, uplink_kbps, lat, lng } = req.body;
    if (!terminal_id) return res.status(400).json({ error: 'terminal_id required' });

    xStore.vsatTerminals.set(terminal_id, {
      terminal_id,
      status:     status || 'LINKED',
      battery_pct: battery_pct ?? 100,
      uplink_kbps: uplink_kbps ?? 384,
      lat, lng,
      last_ping:  Date.now(),
    });

    if (io) {
      io.emit('x_vsat_update', { terminals: [...xStore.vsatTerminals.values()] });
    }

    console.log(`[X-VSAT] Heartbeat from ${terminal_id} — ${status} — battery ${battery_pct}%`);
    res.json({ ok: true, terminal_id });
  });

  // ── GET /api/x/idrn-status ────────────────────────────────────────────────
  // IDRN platform integration status
  router.get('/idrn-status', (req, res) => {
    xStore.idrnStatus.last_sync = Date.now();
    res.json({ ok: true, ...xStore.idrnStatus });
  });

  // ── GET /api/x/vsat-terminals ─────────────────────────────────────────────
  // List active VSAT terminals (bonus route)
  router.get('/vsat-terminals', (req, res) => {
    const now = Date.now();
    // Active = pinged in last 5 minutes
    const active = [...xStore.vsatTerminals.values()].filter(t => now - t.last_ping < 300_000);
    res.json({ ok: true, terminals: active, count: active.length });
  });

  return router;
};
