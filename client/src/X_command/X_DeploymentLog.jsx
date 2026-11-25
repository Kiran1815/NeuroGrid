// X_DeploymentLog.jsx — Mission Deployment Audit Log
// Scrollable timestamped log of every "DEPLOY" action taken by operator.

import { useRef, useEffect } from 'react';

const SEVERITY_C = { CATASTROPHIC: '#EB5757', SEVERE: '#F2994A', MODERATE: '#F9A825', MINOR: '#6FCF97' };

function fmt(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour12: false });
}

export function X_DeploymentLog({ log = [], onClear }) {
  const endRef = useRef(null);

  // Auto-scroll to bottom on new entry
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  return (
    <div className="x-panel" style={{ height: '100%', minHeight: 200 }}>
      <div className="x-panel__header" style={{ justifyContent: 'space-between' }}>
        <span>📋 DEPLOYMENT AUDIT LOG ({log.length})</span>
        {log.length > 0 && (
          <button onClick={onClear} style={{
            background: 'transparent', border: '1px solid var(--earth-soil)',
            color: 'var(--earth-sand)', fontFamily: 'var(--x-font-terminal)',
            fontSize: '0.52rem', padding: '2px 7px', borderRadius: 3, cursor: 'pointer',
          }}>CLEAR</button>
        )}
      </div>
      <div className="x-panel__body" style={{ padding: '8px 12px', overflowY: 'auto', maxHeight: 240 }}>
        {log.length === 0 ? (
          <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.6rem', color: 'var(--earth-sand)', textAlign: 'center', padding: '20px 0' }}>
            No deployments yet. Use AI tab to dispatch resources.
          </div>
        ) : (
          log.map((entry, i) => (
            <div key={`${entry.zone_id}-${entry.deployed_at}`} style={{
              display: 'flex', flexDirection: 'column', gap: 3,
              padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
              animation: i === log.length - 1 ? 'x-slide-in 0.3s ease forwards' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.7rem', color: SEVERITY_C[entry.severity] || 'var(--earth-parchment)', fontWeight: 600 }}>
                  ✓ {entry.zone_name}
                </span>
                <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.55rem', color: 'var(--earth-sand)' }}>
                  {fmt(entry.deployed_at)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {entry.resources.ndrf_units > 0    && <LogPill icon="🦺" n={entry.resources.ndrf_units}    l="NDRF" />}
                {entry.resources.helicopters > 0   && <LogPill icon="🚁" n={entry.resources.helicopters}   l="HELI" />}
                {entry.resources.medical_teams > 0 && <LogPill icon="⚕"  n={entry.resources.medical_teams} l="MED" />}
                {entry.resources.rescue_boats > 0  && <LogPill icon="🚤" n={entry.resources.rescue_boats}  l="BOAT" />}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function LogPill({ icon, n, l }) {
  return (
    <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.58rem', color: 'var(--earth-clay)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--earth-soil)', padding: '1px 6px', borderRadius: 3 }}>
      {icon} {n} {l}
    </span>
  );
}

export default X_DeploymentLog;
