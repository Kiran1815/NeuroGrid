// X_VSATTerminal.jsx — VSAT Deployment Command Interface
// Military-green monospace terminal UI. 5-phase deployment animation.
// Stand-alone component — no props required for demo operation.

import { useState, useEffect, useRef, useCallback } from 'react';

const PHASES = [
  { label: 'Unfolding antenna array…',      minS: 0,   maxS: 60  },
  { label: 'Acquiring INSAT-3DR…',          minS: 60,  maxS: 180 },
  { label: 'Establishing secure link…',     minS: 180, maxS: 480 },
  { label: 'Bridging mesh network…',        minS: 480, maxS: 720 },
  { label: '✓ OPERATIONAL — All systems nominal', minS: 720, maxS: 900 },
];

const WEATHER_STATES = ['CLEAR', 'CLEAR', 'CLEAR', 'RAIN_FADE', 'BLOCKED'];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function SignalGauge({ level, label }) {
  const bars = Math.round(level / 20);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 24 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            width: 5,
            height: 4 + i * 4,
            background: i <= bars ? '#00BCD4' : 'rgba(0,188,212,0.15)',
            borderRadius: 2,
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.55rem', color: 'rgba(179,229,252,0.5)', letterSpacing: '0.1em' }}>
        {label}
      </span>
    </div>
  );
}

export function X_VSATTerminal({ onStatusChange, onBindStart }) {
  const [phaseIdx, setPhaseIdx]   = useState(0); // 0: IDLE, 1: DEPLOYING, ..., 5: LINKED
  const [timer, setTimer]         = useState(0);
  const [battery, setBattery]     = useState(48.0);
  const [uplink, setUplink]       = useState(0);
  const [downlink, setDownlink]   = useState(0);
  const [satLock, setSatLock]     = useState(false);
  const [weather, setWeather]     = useState('CLEAR');
  const [queue, setQueue]         = useState(847);
  const [elevation, setElevation] = useState(42.3);
  const [azimuth, setAzimuth]     = useState(195.7);
  const intervalRef = useRef(null);
  const timerRef    = useRef(null);

  const getPhaseIndex = (secs) => {
    for (let i = PHASES.length - 1; i >= 0; i--) {
      if (secs >= PHASES[i].minS) return i;
    }
    return 0;
  };

  const startDeployment = useCallback(() => {
    if (phaseIdx !== 0) return; // Only start if IDLE
    setPhaseIdx(1); // Start with DEPLOYING
    setTimer(0);
    setBattery(48.0);

    // Timer tick
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        const next = prev + 1;
        const newPhaseIdx = getPhaseIndex(next);
        setPhaseIdx(newPhaseIdx);

        if (next >= 900) {
          setSatLock(true);
          setUplink(384);
          setDownlink(2100);
          clearInterval(timerRef.current);
          onStatusChange?.('LINKED');
        } else if (next >= 480) {
          setSatLock(true);
          setUplink(Math.round(100 + Math.random() * 200));
          setDownlink(Math.round(800 + Math.random() * 1500));
        } else if (next >= 180) {
          setSatLock(false);
        }
        // Battery drain: ~1% per 29 minutes
        setBattery(b => Math.max(0, +(b - 1/1740).toFixed(3)));
        return next;
      });
    }, 1000);

    // Fluctuating stats
    intervalRef.current = setInterval(() => {
      setUplink(u => u > 0 ? Math.round(u + (Math.random() * 40 - 20)) : 0);
      setDownlink(d => d > 0 ? Math.round(d + (Math.random() * 200 - 100)) : 0);
      setQueue(q => Math.max(0, q - Math.floor(Math.random() * 15)));
      setElevation(e => +(e + (Math.random() * 0.4 - 0.2)).toFixed(1));
      setAzimuth(a  => +(a + (Math.random() * 0.3 - 0.15)).toFixed(1));
      // Weather simulation
      if (Math.random() < 0.03) {
        const w = WEATHER_STATES[Math.floor(Math.random() * WEATHER_STATES.length)];
        setWeather(w);
      }
    }, 2000);
  }, [phaseIdx, onStatusChange]);

  const forceUplink = () => {
    if (PHASES[phaseIdx].id !== 'LINKED') return;
    setQueue(0);
  };

  useEffect(() => {
    if (onBindStart) {
      onBindStart(startDeployment);
    }
  }, [onBindStart, startDeployment]);

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
    };
  }, []);

  const batteryPct = (battery / 48) * 100;
  const withinTarget = timer < 900 && PHASES[phaseIdx].id === 'LINKED';
  const currentPhase = PHASES[phaseIdx];
  const lockPct  = PHASES[phaseIdx].id === 'LINKED' ? 100 : PHASES[phaseIdx].id === 'BRIDGING' ? 80 : PHASES[phaseIdx].id === 'LINKING' ? 45 : PHASES[phaseIdx].id === 'ACQUIRING' ? 20 : 0;
  const active = phaseIdx > 0;

  return (
    <div className="x-panel">
      
      {/* ── CONNECTION BRIDGE EXPLAINER ──────────────────────────────────────── */}
      <div style={{ padding: '8px 14px', background: 'var(--earth-obsidian)', borderBottom: '1px solid var(--earth-soil)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BridgeNode icon="📱" label="BLE MESH"     active={true} />
        <BridgeFlow active={phaseIdx >= 4} />
        <BridgeNode icon="📡" label="NG-07 VSAT"   active={phaseIdx >= 1} />
        <BridgeFlow active={phaseIdx >= 5} />
        <BridgeNode icon="🛰" label="INSAT-3DR"    active={phaseIdx >= 3} />
        <BridgeFlow active={phaseIdx >= 5} />
        <BridgeNode icon="🏛" label="NDMA DELHI"   active={phaseIdx >= 5} />
      </div>

      <div className="x-panel__header" style={{ justifyContent: 'space-between' }}>
        <span>📡 TERMINAL DEPLOYMENT</span>
        <span className={`x-badge ${phaseIdx >= 5 ? 'x-badge--ok' : 'x-badge--warn'}`}>
          {PHASES[phaseIdx].id}
        </span>
      </div>

      {/* Sub-header */}
      <div style={{ background: '#060F08', borderBottom: '1px solid rgba(0,188,212,0.1)', padding: '6px 16px', fontSize: '0.6rem', color: 'rgba(179,229,252,0.4)', letterSpacing: '0.1em' }}>
        Unit: NG-VSAT-07 &nbsp;|&nbsp; Location: 17.38°N 78.48°E &nbsp;|&nbsp; Frequency: 865.0625 MHz
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(0,188,212,0.08)' }}>
        {/* Deploy timer */}
        <div style={{ background: '#050E0A', padding: '14px 16px' }}>
          <div style={{ fontSize: '0.58rem', color: 'rgba(179,229,252,0.4)', letterSpacing: '0.12em', marginBottom: 6 }}>DEPLOY TIMER</div>
          <div style={{ fontSize: '2.2rem', color: withinTarget ? '#69F0AE' : '#FFB300', letterSpacing: '0.05em', lineHeight: 1 }}>
            {formatTime(timer)}
          </div>
          {PHASES[phaseIdx].id === 'LINKED' && (
            <div style={{ color: '#69F0AE', fontSize: '0.62rem', marginTop: 6, letterSpacing: '0.1em' }}>
              ✓ WITHIN 15-MIN TARGET
            </div>
          )}
          <div style={{ color: 'rgba(179,229,252,0.3)', fontSize: '0.55rem', marginTop: 4 }}>TARGET: &lt;15:00</div>
        </div>

        {/* Satellite lock */}
        <div style={{ background: '#050E0A', padding: '14px 16px' }}>
          <div style={{ fontSize: '0.58rem', color: 'rgba(179,229,252,0.4)', letterSpacing: '0.12em', marginBottom: 6 }}>SATELLITE LOCK</div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: 'rgba(179,229,252,0.5)', marginBottom: 4 }}>
              <span>{satLock ? 'LOCKED' : (PHASES[phaseIdx].id === 'IDLE' ? 'STANDBY' : 'ACQUIRING…')}</span>
              <span>{lockPct}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${lockPct}%`, height: '100%', background: satLock ? 'linear-gradient(90deg,#1B5E20,#69F0AE)' : 'linear-gradient(90deg,#E65100,#FFB300)', borderRadius: 3, transition: 'width 1s ease' }} />
            </div>
          </div>
          <div style={{ fontSize: '0.6rem', color: 'rgba(179,229,252,0.5)' }}>Ku-Band / INSAT-3DR</div>
          <div style={{ fontSize: '0.58rem', color: 'rgba(179,229,252,0.35)', marginTop: 2 }}>El: {elevation}°  Az: {azimuth}°</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ background: '#050E0A', padding: '10px 16px', borderTop: '1px solid rgba(0,188,212,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: '0.55rem', color: 'rgba(179,229,252,0.4)', letterSpacing: '0.1em', marginBottom: 3 }}>UPLINK</div>
          <div style={{ fontSize: '0.95rem', color: '#00BCD4' }}>{uplink > 0 ? `${uplink} kbps` : '— —'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.55rem', color: 'rgba(179,229,252,0.4)', letterSpacing: '0.1em', marginBottom: 3 }}>DOWNLINK</div>
          <div style={{ fontSize: '0.95rem', color: '#00BCD4' }}>{downlink > 0 ? `${(downlink/1000).toFixed(1)} Mbps` : '— —'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.55rem', color: 'rgba(179,229,252,0.4)', letterSpacing: '0.1em', marginBottom: 3 }}>QUEUE</div>
          <div style={{ fontSize: '0.95rem', color: '#FFB300' }}>{queue.toLocaleString()} pkts</div>
        </div>
      </div>

      {/* Battery + weather */}
      <div style={{ background: '#060F08', padding: '10px 16px', borderTop: '1px solid rgba(0,188,212,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: '0.58rem', color: 'rgba(179,229,252,0.4)', letterSpacing: '0.1em' }}>BATTERY</div>
          <div style={{ fontSize: '0.65rem', color: batteryPct > 30 ? '#69F0AE' : '#FFB300' }}>{battery.toFixed(1)} hrs remaining</div>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: `${batteryPct}%`, height: '100%',
            background: batteryPct > 40 ? 'linear-gradient(90deg,#1B5E20,#69F0AE)' : 'linear-gradient(90deg,#E65100,#FFB300)',
            borderRadius: 4, transition: 'width 2s ease',
          }} />
        </div>
        <div style={{ marginTop: 8, fontSize: '0.62rem', color: weather === 'CLEAR' ? '#69F0AE' : weather === 'RAIN_FADE' ? '#FFB300' : '#EF5350' }}>
          {weather === 'CLEAR'     && '✓ WEATHER: CLEAR'}
          {weather === 'RAIN_FADE' && '⚠ RAIN FADE DETECTED — Switching Ku-band'}
          {weather === 'BLOCKED'   && '✕ SIGNAL BLOCKED — Beam steering…'}
        </div>
      </div>

      {/* Phase log */}
      <div style={{ background: '#050E0A', padding: '10px 16px', borderTop: '1px solid rgba(0,188,212,0.08)' }}>
        <div style={{ fontSize: '0.55rem', color: 'rgba(179,229,252,0.35)', letterSpacing: '0.12em', marginBottom: 8 }}>MESH INTEGRATION</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
          <div style={{ fontSize: '0.62rem', color: 'rgba(179,229,252,0.6)' }}>MESH PEERS BRIDGED: <span style={{ color: '#00BCD4' }}>23 survivors / 4 field teams</span></div>
          <div style={{ fontSize: '0.62rem', color: 'rgba(179,229,252,0.6)' }}>DATA COMPRESSED: <span style={{ color: '#76FF03' }}>847 pkts → 51 KB</span></div>
        </div>

        {currentPhase && PHASES[phaseIdx].id !== 'IDLE' && (
          <div style={{ background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.15)', borderRadius: 4, padding: '6px 10px', marginBottom: 10 }}>
            <div style={{ fontSize: '0.6rem', color: 'rgba(179,229,252,0.4)', marginBottom: 2 }}>PHASE {phaseIdx}/5</div>
            <div style={{ fontSize: '0.65rem', color: '#00BCD4', animation: 'x-flicker 5s infinite' }}>{currentPhase.label}</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ background: '#060F08', padding: '10px 16px', borderTop: '1px solid rgba(0,188,212,0.1)', display: 'flex', gap: 10 }}>
        <button
          id="vsat-deploy-btn"
          onClick={startDeployment}
          disabled={PHASES[phaseIdx].id !== 'IDLE'}
          style={{
            flex: 1,
            background: PHASES[phaseIdx].id === 'IDLE' ? 'linear-gradient(135deg, #1B5E20, #2E7D32)' : 'rgba(30,70,30,0.3)',
            border: '1px solid rgba(105,240,174,0.4)',
            borderRadius: 5,
            color: PHASES[phaseIdx].id === 'IDLE' ? '#69F0AE' : 'rgba(105,240,174,0.3)',
            fontFamily: 'var(--x-font-terminal)',
            fontSize: '0.65rem',
            letterSpacing: '0.12em',
            padding: '9px 0',
            cursor: PHASES[phaseIdx].id === 'IDLE' ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          ▶ {PHASES[phaseIdx].id === 'IDLE' ? 'START DEPLOYMENT' : PHASES[phaseIdx].id === 'LINKED' ? 'OPERATIONAL' : 'DEPLOYING…'}
        </button>
        <button
          onClick={forceUplink}
          disabled={PHASES[phaseIdx].id !== 'LINKED' || queue === 0}
          style={{
            background: 'rgba(0,188,212,0.1)',
            border: '1px solid rgba(0,188,212,0.3)',
            borderRadius: 5,
            color: '#00BCD4',
            fontFamily: 'var(--x-font-terminal)',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            padding: '9px 14px',
            cursor: PHASES[phaseIdx].id === 'LINKED' ? 'pointer' : 'not-allowed',
          }}
        >
          ⬆ FORCE UPLINK
        </button>
      </div>
      {/* Start Button */}
      {!active && (
        <button
          onClick={startDeployment}
          style={{
            width: '100%', padding: '9px 0', marginTop: 16,
            background: 'rgba(230,126,34,0.1)', border: '1px solid var(--accent-amber)',
            borderRadius: 5, color: 'var(--accent-amber)', fontFamily: 'var(--x-font-terminal)',
            fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer',
          }}
        >
          {phaseIdx === 5 ? '↺ RE-DEPLOY TERMINAL' : '▶ START DEPLOYMENT (15:00 TIMEOUT)'}
        </button>
      )}
    </div>
  );
}

function BridgeNode({ icon, label, active }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: active ? 1 : 0.4, transition: 'opacity 0.5s' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: active ? 'rgba(74,124,89,0.2)' : 'var(--earth-charcoal)', border: `1px solid ${active ? '#6FCF97' : 'var(--earth-soil)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: active ? '#6FCF97' : 'var(--earth-sand)', boxShadow: active ? '0 0 10px rgba(74,124,89,0.3)' : 'none' }}>
        {icon}
      </div>
      <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.45rem', color: active ? '#6FCF97' : 'var(--earth-sand)' }}>{label}</div>
    </div>
  );
}

function BridgeFlow({ active }) {
  return (
    <div style={{ flex: 1, height: 2, background: 'var(--earth-soil)', margin: '0 8px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', background: '#6FCF97', transform: active ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 1s ease' }} />
    </div>
  );
}

export default X_VSATTerminal;
