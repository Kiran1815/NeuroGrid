// X_FieldTeamTracker.jsx — Field Team GPS + Comms Status
// Displays all field teams with transport, status, survivors nearby, ping.

import { useState, useEffect } from 'react';
import { getTierHierarchy } from '../X_mesh/X_TierRouter.js';

const TRANSPORT_COLORS = { BLE: 'var(--accent-amber)', LORA: '#6FCF97', VSAT: '#F2994A', SATELLITE: '#6FCF97' };
const STATUS_COLORS = { ACTIVE: '#6FCF97', DEGRADED: '#F2994A', OFFLINE: '#EB5757' };

function msAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s/60)}m ago`;
}

export function X_FieldTeamTracker({ focusedTeam, onTeamClick }) {
  const [teams, setTeams] = useState([]);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const refresh = () => setTeams(getTierHierarchy().field_teams);
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, []);

  const filtered = filter === 'ALL' ? teams : teams.filter(t => t.status === filter);
  const active   = teams.filter(t => t.status === 'ACTIVE').length;

  return (
    <div className="x-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="x-panel__header" style={{ justifyContent: 'space-between' }}>
        <span>🏕 FIELD TEAM TRACKER</span>
        <span className="x-badge x-badge--ok">{active}/{teams.length} ACTIVE</span>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(0,188,212,0.1)', background: 'rgba(28,43,58,0.3)' }}>
        {['ALL', 'ACTIVE', 'DEGRADED', 'OFFLINE'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 12px',
            background: 'transparent',
            border: 'none',
            borderBottom: `2px solid ${filter === s ? '#00BCD4' : 'transparent'}`,
            color: filter === s ? '#00BCD4' : 'rgba(179,229,252,0.4)',
            fontFamily: 'var(--x-font-terminal)',
            fontSize: '0.58rem', letterSpacing: '0.08em',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(team => (
          <div key={team.id} onClick={() => onTeamClick && onTeamClick(team)} style={{
            background: focusedTeam?.id === team.id ? 'rgba(230,126,34,0.1)' : 'var(--earth-obsidian)',
            border: `1px solid ${focusedTeam?.id === team.id ? 'var(--accent-amber)' : 'var(--earth-soil)'}`,
            borderLeft: `3px solid ${STATUS_COLORS[team.status] || 'var(--earth-sand)'}`,
            borderRadius: 5,
            padding: '8px 11px',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 6,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontFamily: 'var(--x-font-military)', fontSize: '0.82rem', color: 'var(--earth-parchment)', fontWeight: 600 }}>
                  {team.name}
                </span>
                <span style={{
                  background: `${TRANSPORT_COLORS[team.transport] || '#546E7A'}20`,
                  border: `1px solid ${TRANSPORT_COLORS[team.transport] || '#546E7A'}40`,
                  color: TRANSPORT_COLORS[team.transport] || '#546E7A',
                  fontFamily: 'var(--x-font-terminal)', fontSize: '0.5rem', letterSpacing: '0.08em',
                  padding: '1px 5px', borderRadius: 3,
                }}>
                  {team.transport}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.58rem', color: 'rgba(179,229,252,0.4)' }}>
                  👥 {team.members} members
                </span>
                {team.survivors_nearby > 0 && (
                  <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.58rem', color: '#FFB300' }}>
                    🆘 {team.survivors_nearby} nearby
                  </span>
                )}
                <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.58rem', color: 'rgba(179,229,252,0.3)' }}>
                  📍 {team.lat.toFixed(2)}°N, {team.lng.toFixed(2)}°E
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.55rem', color: STATUS_COLORS[team.status] }}>
                ● {team.status}
              </div>
              {team.ping_ms && (
                <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.55rem', color: 'rgba(179,229,252,0.3)', marginTop: 2 }}>
                  {team.ping_ms}ms
                </div>
              )}
              {team.last_ping && (
                <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.5rem', color: 'rgba(179,229,252,0.2)', marginTop: 1 }}>
                  {msAgo(team.last_ping)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tier bar at bottom */}
      <div style={{ padding: '8px 14px', background: 'var(--earth-charcoal)', borderTop: '1px solid var(--earth-soil)', fontFamily: 'var(--x-font-terminal)', fontSize: '0.58rem', color: 'var(--earth-sand)' }}>
        FIELD → EOC (BLE+LoRa) → NDMA HQ (VSAT)
      </div>
    </div>
  );
}

export default X_FieldTeamTracker;
