// X_IDRNIntegration.jsx — IDRN Platform Mock Integration Panel
// India Disaster Resource Network certified integration status display.
// All data is mock/demo. Does not connect to real IDRN API.

import { useState, useEffect } from 'react';

const COST_ITEMS = [
  { label: 'Hardware BOM (VSAT + BLE + LoRa)',  cost: 184000 },
  { label: 'Assembly + Testing',                  cost:  38000 },
  { label: 'Regulatory Certification',            cost:  22000 },
];
const TOTAL_COST = COST_ITEMS.reduce((s, i) => s + i.cost, 0);
const COST_TARGET = 300000;  // ₹3 lakh

function CostBar({ amount, max }) {
  const pct = Math.min(100, (amount / max) * 100);
  return (
    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#1B5E20,#69F0AE)', borderRadius: 3 }} />
    </div>
  );
}

function StatusRow({ label, value, ok }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(0,188,212,0.07)' }}>
      <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.6rem', color: 'rgba(179,229,252,0.5)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.65rem', color: ok !== false ? '#69F0AE' : '#EF5350' }}>
        {ok !== false ? '✅' : '✕'} {value}
      </span>
    </div>
  );
}

export function X_IDRNIntegration() {
  const [lastSync, setLastSync] = useState(2);

  useEffect(() => {
    const id = setInterval(() => setLastSync(s => s + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflow: 'auto', padding: 4 }}>
      {/* IDRN Status Card */}
      <div className="x-panel">
        <div className="x-panel__header" style={{ justifyContent: 'space-between' }}>
          <span>🇮🇳 IDRN PLATFORM INTEGRATION</span>
          <span className="x-badge x-badge--ok">CERTIFIED</span>
        </div>
        <div className="x-panel__body">
          <StatusRow label="Integration Status" value="CERTIFIED (Mock Demo)" ok={true} />
          <StatusRow label="API Version"        value="IDRN-v2.3"            ok={true} />
          <StatusRow label="Data Format"        value="GeoJSON + NDMA Schema v4" ok={true} />
          <StatusRow label="Last Sync"          value={`${lastSync} minute${lastSync !== 1 ? 's' : ''} ago`} ok={true} />
          <StatusRow label="Uptime (30d)"       value="99.7%"                ok={true} />
        </div>
      </div>

      {/* Terminal Cost */}
      <div className="x-panel">
        <div className="x-panel__header">
          💰 TERMINAL UNIT ECONOMICS
        </div>
        <div className="x-panel__body">
          {COST_ITEMS.map(item => (
            <div key={item.label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.58rem', color: 'rgba(179,229,252,0.5)' }}>{item.label}</span>
                <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.65rem', color: 'var(--x-ice-blue)' }}>₹{item.cost.toLocaleString('en-IN')}</span>
              </div>
              <CostBar amount={item.cost} max={COST_TARGET} />
            </div>
          ))}
          <div style={{
            marginTop: 12,
            padding: '10px 12px',
            background: 'rgba(27,94,32,0.15)',
            border: '1px solid rgba(105,240,174,0.25)',
            borderRadius: 5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.7rem', color: 'rgba(179,229,252,0.6)', letterSpacing: '0.08em' }}>TOTAL UNIT COST</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '1.1rem', color: '#69F0AE' }}>₹{TOTAL_COST.toLocaleString('en-IN')}</div>
              <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.55rem', color: '#69F0AE', opacity: 0.8 }}>✓ UNDER ₹3 LAKH TARGET</div>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Metrics */}
      <div className="x-panel">
        <div className="x-panel__header">📊 DEPLOYMENT METRICS (Validated)</div>
        <div className="x-panel__body">
          <StatusRow label="VSAT Setup Time"     value="04:32 min (< 15 min target)" ok={true} />
          <StatusRow label="Battery Runtime"     value="48.0 hours"                  ok={true} />
          <StatusRow label="Environmental Rating" value="IPX6 — Water Resistant"      ok={true} />
          <StatusRow label="First Response Lag"  value="2h 14m (< 6hr target)"       ok={true} />
          <StatusRow label="Bandwidth Reduction" value="10,247x (SNN compression)"   ok={true} />
          <StatusRow label="Offline First"       value="Fully functional w/o internet" ok={true} />
        </div>
      </div>

      {/* Exercise Validation */}
      <div className="x-panel">
        <div className="x-panel__header">🎖 EXERCISE VALIDATION</div>
        <div className="x-panel__body">
          <StatusRow label="NDMA Exercise"     value="CYCLONE-MOCK-2024 PASSED"         ok={true} />
          <StatusRow label="Interoperability"  value="NDRF / IAF / Coast Guard"         ok={true} />
          <StatusRow label="Data Standards"    value="CAP v1.2 + EDXL-DE Compatible"    ok={true} />
          <StatusRow label="Privacy (PDPA)"    value="Zero PII in satellite uplink"     ok={true} />

          <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
            <button style={{
              flex: 1, padding: '8px 0', background: 'rgba(0,188,212,0.1)', border: '1px solid rgba(0,188,212,0.3)',
              borderRadius: 5, color: '#00BCD4', fontFamily: 'var(--x-font-terminal)', fontSize: '0.62rem',
              letterSpacing: '0.08em', cursor: 'pointer',
            }}>
              📤 EXPORT REPORT
            </button>
            <button style={{
              flex: 1, padding: '8px 0', background: 'rgba(105,240,174,0.08)', border: '1px solid rgba(105,240,174,0.2)',
              borderRadius: 5, color: '#69F0AE', fontFamily: 'var(--x-font-terminal)', fontSize: '0.62rem',
              letterSpacing: '0.08em', cursor: 'pointer',
            }}>
              📋 CERTIFICATION DOCS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default X_IDRNIntegration;
