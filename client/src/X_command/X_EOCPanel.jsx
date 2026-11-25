// X_EOCPanel.jsx — District Emergency Operations Centre Status Panel
// Shows live EOC link status, uplink bandwidth, and linked field teams.

import { useState, useEffect } from 'react';
import { getTierHierarchy } from '../X_mesh/X_TierRouter.js';

const STATUS_COLORS = { ACTIVE: '#69F0AE', DEGRADED: '#FFB300', OFFLINE: '#EF5350' };

export function X_EOCPanel() {
  const [hierarchy, setHierarchy] = useState(null);

  useEffect(() => {
    const refresh = () => setHierarchy(getTierHierarchy());
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, []);

  const eocs = hierarchy?.eocs ?? [];

  return (
    <div className="x-panel" style={{ height: '100%' }}>
      <div className="x-panel__header" style={{ justifyContent: 'space-between' }}>
        <span>🏢 DISTRICT EOC STATUS</span>
        <span className="x-badge x-badge--info">{eocs.filter(e => e.status === 'ACTIVE').length}/{eocs.length} ACTIVE</span>
      </div>
      <div className="x-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {eocs.map(eoc => (
          <div key={eoc.id} style={{
            background: 'rgba(28,43,58,0.5)',
            border: `1px solid rgba(0,188,212,0.12)`,
            borderLeft: `3px solid ${STATUS_COLORS[eoc.status] || '#546E7A'}`,
            borderRadius: 5,
            padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--x-font-military)', fontSize: '0.85rem', color: 'var(--x-ice-blue)', fontWeight: 600 }}>
                {eoc.name}
              </span>
              <span className={`x-badge x-badge--${eoc.status === 'ACTIVE' ? 'ok' : eoc.status === 'DEGRADED' ? 'warn' : 'danger'}`}>
                {eoc.status}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.5rem', color: 'rgba(179,229,252,0.35)', marginBottom: 2 }}>TRANSPORT</div>
                <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.65rem', color: '#00BCD4' }}>{eoc.transport}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.5rem', color: 'rgba(179,229,252,0.35)', marginBottom: 2 }}>UPLINK</div>
                <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.65rem', color: eoc.uplink_kbps >= 256 ? '#69F0AE' : '#FFB300' }}>
                  {eoc.uplink_kbps} kbps
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.5rem', color: 'rgba(179,229,252,0.35)', marginBottom: 2 }}>TEAMS</div>
                <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.65rem', color: 'var(--x-ice-blue)' }}>{eoc.linked_teams} linked</div>
              </div>
            </div>
          </div>
        ))}

        {/* NDMA HQ Link */}
        {hierarchy?.ndma_hq && (
          <div style={{
            background: 'rgba(27,94,32,0.12)',
            border: '1px solid rgba(105,240,174,0.2)',
            borderLeft: '3px solid #69F0AE',
            borderRadius: 5,
            padding: '10px 12px',
            marginTop: 4,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--x-font-military)', fontSize: '0.85rem', color: '#69F0AE', fontWeight: 700 }}>
                🇮🇳 {hierarchy.ndma_hq.name}
              </span>
              <span className="x-badge x-badge--ok">SATELLITE LINK</span>
            </div>
            <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.58rem', color: 'rgba(105,240,174,0.5)', marginTop: 5 }}>
              {hierarchy.ndma_hq.linked_eocs} EOCs linked · {hierarchy.ndma_hq.uplink_mbps} Mbps · New Delhi
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default X_EOCPanel;
