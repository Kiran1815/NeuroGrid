// X_ResponseLagTracker.jsx — Real-time 48hr → 6hr Response Lag Comparison
// Shows NeuroGrid-X response time vs traditional disaster response baseline.

import { useState, useEffect } from 'react';

const BASELINE_HOURS   = 48;
const TARGET_HOURS     = 6;
const NEUROGRID_HOURS  = 2.242;  // 2h 14m 33s
const NEUROGRID_SECS   = Math.round(NEUROGRID_HOURS * 3600);

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function MetricRow({ label, value, unit, color, pct, isTarget }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.6rem', color: 'rgba(179,229,252,0.5)', letterSpacing: '0.1em' }}>
          {label}
        </span>
        <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.85rem', color, fontWeight: 'bold' }}>
          {value} <span style={{ fontSize: '0.55rem', opacity: 0.7 }}>{unit}</span>
        </span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: isTarget
            ? 'linear-gradient(90deg,rgba(100,100,100,0.5),rgba(150,150,150,0.5))'
            : (pct < 20 ? 'linear-gradient(90deg,#1B5E20,#69F0AE)' : 'linear-gradient(90deg,#B71C1C,#EF5350)'),
          borderRadius: 3, transition: 'width 1s ease',
        }} />
      </div>
    </div>
  );
}

export function X_ResponseLagTracker({ startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const id = setInterval(() => {
      setElapsed(Math.round((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const elapsedDisplay = startTime ? formatDuration(elapsed) : formatDuration(NEUROGRID_SECS);
  const elapsedHours   = startTime ? elapsed / 3600 : NEUROGRID_HOURS;
  const pctOfTarget    = Math.min(100, (elapsedHours / TARGET_HOURS) * 100);
  const withinTarget   = elapsedHours < TARGET_HOURS;
  const improvement    = Math.round((1 - elapsedHours / BASELINE_HOURS) * 100);

  return (
    <div className="x-panel" style={{ height: '100%' }}>
      <div className="x-panel__header">
        <span>⏱</span> RESPONSE LAG TRACKER
      </div>
      <div className="x-panel__body">
        {/* NeuroGrid-X time */}
        <div style={{
          background: 'rgba(27,94,32,0.15)',
          border: '1px solid rgba(105,240,174,0.2)',
          borderRadius: 6,
          padding: '12px 14px',
          marginBottom: 14,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.55rem', color: 'rgba(179,229,252,0.4)', letterSpacing: '0.12em', marginBottom: 6 }}>
            NEUROGRID-X RESPONSE TIME
          </div>
          <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '2rem', color: '#69F0AE', letterSpacing: '0.05em', lineHeight: 1 }}>
            {elapsedDisplay}
          </div>
          {withinTarget && (
            <div style={{ color: '#69F0AE', fontSize: '0.65rem', marginTop: 6, letterSpacing: '0.1em' }}>
              ✓ WITHIN 6-HOUR TARGET
            </div>
          )}
        </div>

        {/* Comparison bars */}
        <MetricRow
          label="TRADITIONAL RESPONSE"
          value="48+" unit="hrs"
          color="#EF5350"
          pct={100}
          isTarget={true}
        />
        <MetricRow
          label="TARGET (SP-05)"
          value="6.0" unit="hrs"
          color="#FFB300"
          pct={(6 / BASELINE_HOURS) * 100}
          isTarget={true}
        />
        <MetricRow
          label="NEUROGRID-X ACTUAL"
          value={elapsedHours.toFixed(2)} unit="hrs"
          color="#69F0AE"
          pct={pctOfTarget * 0.125}  // normalised to 48hr scale
          isTarget={false}
        />

        {/* Improvement badge */}
        <div style={{
          marginTop: 14,
          background: 'rgba(0,188,212,0.08)',
          border: '1px solid rgba(0,188,212,0.2)',
          borderRadius: 6,
          padding: '10px 14px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.55rem', color: 'rgba(179,229,252,0.4)', letterSpacing: '0.1em', marginBottom: 3 }}>IMPROVEMENT</div>
            <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '1.3rem', color: '#69F0AE' }}>{improvement}%</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.55rem', color: 'rgba(179,229,252,0.4)', letterSpacing: '0.1em', marginBottom: 3 }}>FASTER THAN BASELINE</div>
            <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '1.3rem', color: '#00BCD4' }}>{Math.round(BASELINE_HOURS / NEUROGRID_HOURS)}x</div>
          </div>
        </div>

        {/* Key metrics */}
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'VSAT Deploy', value: '04:32', ok: true },
            { label: 'SAR Processing', value: '2.1 hrs', ok: true },
            { label: 'AI Allocation', value: '< 30 sec', ok: true },
            { label: 'NDMA Briefing', value: '< 45 sec', ok: true },
          ].map(m => (
            <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(0,188,212,0.07)' }}>
              <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.58rem', color: 'rgba(179,229,252,0.4)' }}>{m.label}</span>
              <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.62rem', color: m.ok ? '#69F0AE' : '#FFB300' }}>
                {m.ok ? '✓' : '⚠'} {m.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default X_ResponseLagTracker;
