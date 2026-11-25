// X_ResourceConfig.jsx — Operator-Editable Resource Pool
// Lets command staff enter actual available forces before AI allocation.
// Persists to localStorage. Calls onChange when values update.

import { useState, useEffect } from 'react';

const DEFAULTS = { ndrf_units: 12, helicopters: 4, medical_teams: 8, rescue_boats: 6 };
const LS_KEY = 'neurogrid_x_resources';

const FIELDS = [
  { key: 'ndrf_units',    icon: '🦺', label: 'NDRF Units',     color: '#E67E22', max: 50 },
  { key: 'helicopters',   icon: '🚁', label: 'Helicopters',    color: '#56CCF2', max: 20 },
  { key: 'medical_teams', icon: '⚕',  label: 'Medical Teams', color: '#6FCF97', max: 30 },
  { key: 'rescue_boats',  icon: '🚤', label: 'Rescue Boats',  color: '#56CCF2', max: 20 },
];

export function X_ResourceConfig({ onChange }) {
  const [resources, setResources] = useState(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
  });

  // Persist + notify parent on every change
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(resources)); } catch {}
    onChange?.(resources);
  }, [resources, onChange]);

  const adjust = (key, delta) => {
    const field = FIELDS.find(f => f.key === key);
    setResources(prev => ({
      ...prev,
      [key]: Math.max(0, Math.min(field.max, (prev[key] ?? 0) + delta)),
    }));
  };

  const reset = () => setResources({ ...DEFAULTS });

  return (
    <div className="x-panel">
      <div className="x-panel__header" style={{ justifyContent: 'space-between' }}>
        <span>⚙ AVAILABLE FORCES (Set Before Allocation)</span>
        <button onClick={reset} style={{
          background: 'transparent', border: '1px solid var(--earth-soil)',
          color: 'var(--earth-sand)', fontFamily: 'var(--x-font-terminal)',
          fontSize: '0.55rem', letterSpacing: '0.08em', padding: '2px 7px',
          borderRadius: 3, cursor: 'pointer',
        }}>↺ RESET</button>
      </div>
      <div className="x-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.58rem', color: 'var(--earth-sand)', lineHeight: 1.5, marginBottom: 4 }}>
          Enter actual forces <em>available right now</em>. AI uses these counts for deployment recommendations.
        </p>
        {FIELDS.map(field => {
          const val = resources[field.key] ?? 0;
          const pct = (val / field.max) * 100;
          return (
            <div key={field.key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: '0.85rem' }}>{field.icon}</span>
                  <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.62rem', color: 'var(--earth-parchment)', letterSpacing: '0.06em' }}>{field.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => adjust(field.key, -1)} style={spinBtn}>−</button>
                  <input
                    type="number"
                    value={val}
                    min={0}
                    max={field.max}
                    onChange={e => {
                      const n = Math.max(0, Math.min(field.max, parseInt(e.target.value) || 0));
                      setResources(r => ({ ...r, [field.key]: n }));
                    }}
                    style={{
                      width: 46, textAlign: 'center',
                      background: 'var(--earth-bark)', border: '1px solid var(--earth-soil)',
                      color: field.color, fontFamily: 'var(--x-font-terminal)', fontSize: '0.85rem',
                      borderRadius: 3, padding: '3px 4px',
                    }}
                  />
                  <button onClick={() => adjust(field.key, 1)} style={spinBtn}>+</button>
                </div>
              </div>
              <div className="x-bar-track">
                <div className="x-bar-fill" style={{ width: `${pct}%`, background: field.color, opacity: 0.7 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const spinBtn = {
  width: 22, height: 22, border: '1px solid var(--earth-soil)',
  background: 'var(--earth-bark)', color: 'var(--earth-parchment)',
  borderRadius: 3, cursor: 'pointer', fontSize: '0.85rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'monospace', lineHeight: 1,
};

export default X_ResourceConfig;
