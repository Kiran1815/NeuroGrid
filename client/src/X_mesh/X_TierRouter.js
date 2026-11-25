// X_TierRouter.js — 3-Tier Mesh Hierarchy Data Model
// Provides data structures + state helpers for Field→EOC→NDMA routing visualization.
// Does NOT modify MeshRouter.js.

export const TIER_LEVELS = {
  FIELD:    { id: 'FIELD',  label: 'Field Teams',     icon: '🏕', color: '#00BCD4' },
  EOC:      { id: 'EOC',    label: 'District EOCs',   icon: '🏢', color: '#FFB300' },
  NDMA_HQ:  { id: 'NDMA',  label: 'NDMA Command HQ', icon: '🇮🇳', color: '#69F0AE' },
};

const BASE_FIELD_TEAMS = [
  { id: 'FT-ALPHA',   name: 'Alpha Team',   tier: 'FIELD',  lat: 17.99, lng: 79.61, transport: 'BLE',  status: 'ACTIVE',  members: 6, last_ping: 0 },
  { id: 'FT-BRAVO',   name: 'Bravo Team',   tier: 'FIELD',  lat: 18.01, lng: 79.55, transport: 'BLE',  status: 'ACTIVE',  members: 5, last_ping: 0 },
  { id: 'FT-CHARLIE', name: 'Charlie Team', tier: 'FIELD',  lat: 17.93, lng: 79.70, transport: 'LORA', status: 'ACTIVE',  members: 7, last_ping: 0 },
  { id: 'FT-DELTA',   name: 'Delta Team',   tier: 'FIELD',  lat: 18.10, lng: 79.45, transport: 'LORA', status: 'DEGRADED',members: 4, last_ping: 0 },
  { id: 'FT-ECHO',    name: 'Echo Team',    tier: 'FIELD',  lat: 17.85, lng: 79.80, transport: 'BLE',  status: 'ACTIVE',  members: 6, last_ping: 0 },
  { id: 'FT-FOXTROT', name: 'Foxtrot Team', tier: 'FIELD',  lat: 18.15, lng: 79.65, transport: 'VSAT', status: 'ACTIVE',  members: 8, last_ping: 0 },
  { id: 'FT-GOLF',    name: 'Golf Team',    tier: 'FIELD',  lat: 17.75, lng: 79.50, transport: 'BLE',  status: 'ACTIVE',  members: 5, last_ping: 0 },
  { id: 'FT-HOTEL',   name: 'Hotel Team',   tier: 'FIELD',  lat: 18.20, lng: 79.35, transport: 'LORA', status: 'OFFLINE', members: 3, last_ping: 0 },
];

const BASE_EOCS = [
  { id: 'EOC-HYD', name: 'Hyderabad EOC', tier: 'EOC', lat: 17.385, lng: 78.487, status: 'ACTIVE',  linked_teams: 4, transport: 'VSAT', uplink_kbps: 384 },
  { id: 'EOC-WRG', name: 'Warangal EOC',  tier: 'EOC', lat: 17.978, lng: 79.594, status: 'ACTIVE',  linked_teams: 6, transport: 'VSAT', uplink_kbps: 256 },
  { id: 'EOC-KNR', name: 'Karimnagar EOC',tier: 'EOC', lat: 18.438, lng: 79.128, status: 'DEGRADED',linked_teams: 3, transport: 'VSAT', uplink_kbps: 128 },
  { id: 'EOC-KHM', name: 'Khammam EOC',   tier: 'EOC', lat: 17.247, lng: 80.151, status: 'ACTIVE',  linked_teams: 5, transport: 'VSAT', uplink_kbps: 256 },
];

const NDMA_HQ = {
  id: 'NDMA-HQ',
  name: 'NDMA New Delhi HQ',
  tier: 'NDMA_HQ',
  lat: 28.6139,
  lng: 77.2090,
  status: 'ACTIVE',
  linked_eocs: 4,
  transport: 'SATELLITE',
  uplink_mbps: 10,
};

/**
 * Generate live tier hierarchy with simulated ping times.
 */
export function getTierHierarchy() {
  const now = Date.now();
  const fieldTeams = BASE_FIELD_TEAMS.map(t => ({
    ...t,
    last_ping:    now - Math.floor(Math.random() * 30_000),
    ping_ms:      t.status === 'OFFLINE' ? null : Math.round(Math.random() * 150 + 20),
    survivors_nearby: t.status !== 'OFFLINE' ? Math.floor(Math.random() * 12) : 0,
  }));

  const eocs = BASE_EOCS.map(e => ({
    ...e,
    last_ping:     now - Math.floor(Math.random() * 10_000),
    ping_ms:       Math.round(Math.random() * 80 + 15),
  }));

  return {
    ndma_hq:    { ...NDMA_HQ, last_ping: now - Math.floor(Math.random() * 5_000) },
    eocs,
    field_teams: fieldTeams,
  };
}

/**
 * Compute tier summary stats for the header banner.
 */
export function getTierSummary(hierarchy) {
  if (!hierarchy) return { field_active: 0, eoc_active: 0, total: 0 };
  const field_active = hierarchy.field_teams?.filter(t => t.status === 'ACTIVE').length ?? 0;
  const eoc_active   = hierarchy.eocs?.filter(e => e.status === 'ACTIVE').length ?? 0;
  return {
    field_active,
    eoc_active,
    total: hierarchy.field_teams?.length ?? 0,
    ndma_linked: hierarchy.ndma_hq?.status === 'ACTIVE',
  };
}
