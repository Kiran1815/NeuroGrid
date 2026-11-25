// X_DemoSequencer.jsx — 90-Second Hands-Free 1-Click Demo
// Steps through the entire SP-05 satellite pipeline for hackathon pitches.

import { useState, useRef, useEffect } from 'react';

export function X_DemoSequencer({ onSetTab, onStartVSAT, onRunSAR, onSwitchMode }) {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const seqRef = useRef(null);

  const STEPS = [
    { name: 'Init Command Center', duration: 3000, action: () => onSetTab('mesh') },
    { name: 'Switch to Satellite', duration: 4000, action: () => onSetTab('satellite') },
    { name: 'Deploy VSAT Link',    duration: 16000, action: () => onStartVSAT() },
    { name: 'Ingest SAR Data',     duration: 8000, action: () => onRunSAR() },
    { name: 'AI Allocation Engine',duration: 10000, action: () => onSetTab('ai') },
    { name: 'Field Command Map',   duration: 8000, action: () => onSetTab('field') },
    { name: 'IDRN Compliance',     duration: 6000, action: () => onSetTab('idrn') },
    { name: 'Demo Complete',       duration: 0,    action: () => setRunning(false) }
  ];

  const stop = () => {
    setRunning(false);
    clearTimeout(seqRef.current);
    setStep(0);
  };

  const playStep = (idx) => {
    if (idx >= STEPS.length) return stop();
    setStep(idx);
    STEPS[idx].action();
    if (STEPS[idx].duration > 0) {
      seqRef.current = setTimeout(() => playStep(idx + 1), STEPS[idx].duration);
    }
  };

  const start = () => {
    setRunning(true);
    playStep(0);
  };

  useEffect(() => { return () => clearTimeout(seqRef.current); }, []);

  if (running) {
    return (
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(230,126,34,0.15)', border: '1px solid #E67E22',
        borderRadius: 8, padding: '10px 20px', zIndex: 9999,
        backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: 15,
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      }}>
        <div style={{ animation: 'x-pulse-dot 1.5s infinite', width: 10, height: 10, background: '#E67E22', borderRadius: '50%' }} />
        <div>
          <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.6rem', color: '#E67E22', letterSpacing: '0.15em' }}>SP-05 DEMO AUTO-SEQUENCE</div>
          <div style={{ fontFamily: 'var(--x-font-military)', fontSize: '1rem', color: 'var(--earth-parchment)', fontWeight: 600 }}>{STEPS[step]?.name}</div>
        </div>
        <button onClick={stop} style={{ marginLeft: 20, background: 'rgba(235,87,87,0.2)', border: '1px solid #EB5757', color: '#EB5757', padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--x-font-terminal)' }}>🛑 ABORT</button>
      </div>
    );
  }

  return (
    <button onClick={start} style={{
      background: 'rgba(230,126,34,0.1)', border: '1px solid rgba(230,126,34,0.4)',
      color: '#E67E22', padding: '4px 10px', borderRadius: 4,
      fontFamily: 'var(--x-font-terminal)', fontSize: '0.6rem',
      cursor: 'pointer', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6,
    }}>
      ▶ 90s DEMO
    </button>
  );
}

export default X_DemoSequencer;
