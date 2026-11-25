// X_NDMADashboard.jsx — Master 5-Tab NDMA Command Center (Phase 2 Overhaul)
// Wraps original Dashboard (Tab 1) + 4 X-Layer tabs.
// Features LIVE Socket.IO connection, deployment state, mission log, and demo sequencer.

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Dashboard }            from '../dashboard/Dashboard.jsx';
import { X_VSATTerminal }       from '../X_satellite/X_VSATTerminal.jsx';
import { runSARPipeline }       from '../X_satellite/X_SARProcessor.js';
import { X_SARMap }             from '../X_satellite/X_SARMap.jsx';
import { allocateResources }    from '../X_ai/X_ResourceAllocator.js';
import { X_ResourceConfig }     from './X_ResourceConfig.jsx';
import { X_DeploymentLog }      from './X_DeploymentLog.jsx';
import { X_SimulationMenu }     from './X_SimulationMenu.jsx';
import { X_FieldMap }           from '../X_mesh/X_FieldMap.jsx';
import { X_FieldTeamTracker }   from './X_FieldTeamTracker.jsx';
import { X_EOCPanel }           from './X_EOCPanel.jsx';
import { X_IDRNIntegration }    from './X_IDRNIntegration.jsx';
import { X_ResponseLagTracker } from './X_ResponseLagTracker.jsx';
import { authService }          from '../core/auth/authService.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TABS = [
  { id: 'mesh',      label: '🌐 MESH',      title: 'Mesh Network'       },
  { id: 'satellite', label: '🛰 SATELLITE', title: 'Satellite + SAR'    },
  { id: 'ai',        label: '🧠 AI',         title: 'AI Allocation'      },
  { id: 'field',     label: '📡 FIELD',     title: 'Field Command'      },
  { id: 'idrn',      label: '🇮🇳 IDRN',     title: 'IDRN Integration'   },
];

const SEVERITY_COLORS = { CATASTROPHIC: '#EB5757', SEVERE: '#F2994A', MODERATE: '#F9A825', MINOR: '#6FCF97' };

function formatMsDur(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

// ── Shared AllocationCard with Deploy Button ─────────────────────────────────

function AllocationCard({ rec, rank, isDeployed, onDeploy }) {
  return (
    <div style={{
      background: isDeployed ? 'rgba(74,124,89,0.1)' : 'var(--earth-charcoal)',
      border: `1px solid ${isDeployed ? 'rgba(74,124,89,0.4)' : 'var(--earth-soil)'}`,
      borderLeft: `4px solid ${SEVERITY_COLORS[rec.severity] || 'var(--accent-amber)'}`,
      borderRadius: 6, padding: '12px 14px',
      animation: 'x-slide-in 0.3s ease forwards',
      animationDelay: `${rank * 0.05}s`, opacity: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.65rem', color: 'var(--earth-sand)' }}>#{rank}</span>
          <span style={{ fontFamily: 'var(--x-font-military)', fontSize: '1.05rem', color: 'var(--earth-parchment)', fontWeight: 700, letterSpacing: '0.05em' }}>
            {rec.zone_name}
          </span>
          <span className={`x-badge ${rec.severity === 'CATASTROPHIC' ? 'x-badge--danger' : rec.severity === 'SEVERE' ? 'x-badge--warn' : 'x-badge--ok'}`}>
            {rec.severity}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '1.1rem', color: 'var(--accent-amber)' }}>{rec.composite_score.toFixed(1)}</div>
          <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.5rem', color: 'var(--earth-sand)', letterSpacing: '0.08em' }}>SCORE</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {rec.recommended_deployment.ndrf_units > 0    && <ResourcePill icon="🦺" count={rec.recommended_deployment.ndrf_units}    label="NDRF" />}
        {rec.recommended_deployment.helicopters > 0   && <ResourcePill icon="🚁" count={rec.recommended_deployment.helicopters}   label="HELI" />}
        {rec.recommended_deployment.medical_teams > 0 && <ResourcePill icon="⚕" count={rec.recommended_deployment.medical_teams} label="MED" />}
        {rec.recommended_deployment.rescue_boats > 0  && <ResourcePill icon="🚤" count={rec.recommended_deployment.rescue_boats}  label="BOAT" />}
      </div>

      <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.6rem', color: 'var(--earth-clay)', lineHeight: 1.5, marginBottom: 10 }}>
        {rec.rationale}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--earth-soil)', paddingTop: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.58rem', color: '#F2994A' }}>⏱ Deploy within {rec.deployment_window_hours}h</span>
          <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.55rem', color: 'var(--earth-sand)' }}>{rec.estimated_lives_at_risk.toLocaleString()} at risk · {Math.round(rec.confidence * 100)}% conf</span>
        </div>
        <button
          onClick={() => !isDeployed && onDeploy(rec)}
          disabled={isDeployed}
          style={{
            background: isDeployed ? 'rgba(74,124,89,0.2)' : 'rgba(230,126,34,0.15)',
            border: `1px solid ${isDeployed ? '#6FCF97' : '#E67E22'}`,
            color: isDeployed ? '#6FCF97' : '#E67E22',
            padding: '6px 14px', borderRadius: 4, fontFamily: 'var(--x-font-terminal)',
            fontSize: '0.65rem', letterSpacing: '0.1em', cursor: isDeployed ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {isDeployed ? '✓ DEPLOYED' : '▶ DEPLOY TEAM'}
        </button>
      </div>
    </div>
  );
}

function ResourcePill({ icon, count, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'var(--earth-bark)', border: '1px solid var(--earth-soil)', borderRadius: 3 }}>
      <span style={{ fontSize: '0.75rem' }}>{icon}</span>
      <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.62rem', color: 'var(--earth-parchment)' }}>{count} {label}</span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function X_NDMADashboard({ onSwitchMode, onLogout }) {
  // UI State
  const [activeTab,   setActiveTab]   = useState('mesh');
  const [sarScenario, setSarScenario] = useState('telangana_flood');
  const [sarState,    setSarState]    = useState({ phase: 'idle', progress: 0, message: '', result: null });
  const [vsatStatus,  setVsatStatus]  = useState('IDLE');
  const [startTime]                   = useState(Date.now());
  const [elapsed,     setElapsed]     = useState('00:00:00');
  
  // Logistics State
  const [resourcePool, setResourcePool] = useState({});
  const [allocation,   setAllocation]   = useState(null);
  const [deployments,  setDeployments]  = useState({}); // { [zone_id]: { ...rec, deployed_at } }
  const [auditLog,     setAuditLog]     = useState([]);
  
  // Mesh Network Live State (Socket.IO)
  const [survivors,   setSurvivors]   = useState([]);
  const [rescueTeams, setRescueTeams] = useState([]);
  const [meshNodes,   setMeshNodes]   = useState([]);
  const [dangerZones, setDangerZones] = useState([]);
  const [isSimulated, setIsSimulated]   = useState(false);
  const [focusedTeam,  setFocusedTeam]  = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [deployRequests, setDeployRequests] = useState([]);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const user = authService.getUser() || { role: 'admin', name: 'Main HQ' };
  
  const socketRef   = useRef(null);
  const sarAbortRef = useRef(null);

  // 1. Mission Clock
  useEffect(() => {
    const id = setInterval(() => setElapsed(formatMsDur(Date.now() - startTime)), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  // 2. Socket.IO Live Connection (Deterministic Payload Sync)
  useEffect(() => {
    const s = io(API_BASE, { auth: { role: 'ndma_hq' }});
    socketRef.current = s;
    s.on('welcome', data => {
      if (isSimulated) return;
      // IMPORTANT: data.survivors is a Number (count) in the welcome payload, NOT an array.
      // Do NOT call setSurvivors(data.survivors) here; rely on batch_synced for the full array.
      setRescueTeams(data.teams || []); // Correct payload key matching server route
      if (data.deploy_requests) {
        setDeployRequests(data.deploy_requests);
        // Auto-popup for Sub HQs if there are pending requests
        const hasPending = data.deploy_requests.some(r => r.status === 'pending');
        if (hasPending && user.role === 'sub_hq') {
          setShowDeployModal(true);
        }
      }
    });
    s.on('batch_synced', ({ survivors: raw }) => {
      if (isSimulated) return;
      if (!Array.isArray(raw)) return; // Prevents corrupt payload crash
      setSurvivors(prev => {
        const next = [...prev];
        raw.forEach(s => {
          const i = next.findIndex(x => x.device_id === s.device_id);
          if (i >= 0) next[i] = { ...next[i], ...s };
          else next.push(s);
        });
        return next;
      });
    });
    s.on('deploy_request', req => {
      setDeployRequests(prev => {
        const next = [...prev];
        const i = next.findIndex(x => x.zone_id === req.zone_id);
        if (i >= 0) next[i] = req; else next.push(req);
        return next;
      });
      if (user.role === 'sub_hq' && req.status === 'pending') {
        setShowDeployModal(true);
      }
    });
    s.on('deploy_update', req => {
      setDeployRequests(prev => {
        const next = [...prev];
        const i = next.findIndex(x => x.zone_id === req.zone_id);
        if (i >= 0) next[i] = req; else next.push(req);
        return next;
      });
      if (req.status === 'accepted') {
        const entry = {
          ...req,
          lat: req.lat_center || req.lat,
          lng: req.lng_center || req.lng,
          resources: req.recommended_deployment,
          deployed_at: req.accepted_ts
        };
        setDeployments(prev => ({ ...prev, [req.zone_id]: entry }));
        setAuditLog(prev => [...prev, entry]);
      }
    });

    s.on('rescue_team_update', t => {
      if (isSimulated) return;
      setRescueTeams(prev => {
        const next = [...prev];
        const i = next.findIndex(x => x.team_id === t.team_id);
        if (i >= 0) next[i] = { ...next[i], ...t };
        else next.push(t);
        return next;
      });
    });

    s.on('reset', () => {
      setIsSimulated(false);
      setSarState({ phase: 'idle', progress: 0, message: '', result: null });
      setDeployRequests([]);
      setDeployments({});
      setAuditLog([]);
      setShowDeployModal(false);
      setShowLogModal(false);
      setDangerZones([]);
      setMeshNodes([]);
      setSelectedZoneId(null);
      setStartTime(Date.now());
    });

    s.on('x_sim_reset', () => {
      setIsSimulated(false);
      setSarState({ phase: 'idle', progress: 0, message: '', result: null });
      setDeployRequests([]);
      setDeployments({});
      setAuditLog([]);
      setShowDeployModal(false);
      setShowLogModal(false);
      setDangerZones([]);
      setMeshNodes([]);
      setSelectedZoneId(null);
      setStartTime(Date.now());
    });

    return () => s.disconnect();
  }, []);

  // 3. SAR Pipeline Trigger
  const triggerSAR = useCallback(async (scenario = sarScenario) => {
    if (sarState.phase === 'running') return;
    sarAbortRef.current?.abort();
    const controller = new AbortController();
    sarAbortRef.current = controller;

    setSarState({ phase: 'running', progress: 0, message: 'Initializing SAR pipeline…', result: null });

    try {
      const result = await runSARPipeline({
        scenarioId: scenario,
        signal:     controller.signal,
        onProgress: (step, total, msg) => setSarState(s => ({ ...s, progress: Math.round((step / total) * 100), message: msg })),
        onComplete: (result) => {
          setSarState({ phase: 'complete', progress: 100, message: `✓ SAR complete — ${result.bandwidth_reduction.toLocaleString()}x reduction`, result });
        },
      });
      return result;
    } catch (err) {
      if (err.message !== 'aborted') setSarState(s => ({ ...s, phase: 'error', message: `✕ ${err.message}` }));
    }
  }, [sarState.phase, sarScenario]);

  // 4. AI Allocation Re-computation
  // Re-runs automatically if resource pool changes OR if SAR finishes
  useEffect(() => {
    if (sarState.phase === 'complete' && sarState.result) {
      const alloc = allocateResources({
        damage_zones: sarState.result.districts,
        survivors,
        available_resources: resourcePool
      });
      setAllocation(alloc);
    }
  }, [sarState.phase, sarState.result, resourcePool, survivors]);

  // 5. Deployment Action
  const handleDeploy = (rec) => {
    if (user.role === 'admin') {
      socketRef.current?.emit('deploy_request', { 
        ...rec, 
        hq_id: user.name || 'Main HQ',
      });
      // Admin sees it pending immediately via local optimistic update or wait for server reflection
      // The socket broadcast will cover this, but we'll add it to Audit log locally
      setAuditLog(prev => [...prev, { ...rec, resources: rec.recommended_deployment, status: 'requested', deployed_at: Date.now() }]);
    } else {
      // Direct deploy for non-admins if allowed, or fallback behavior
      const entry = {
        zone_id: rec.zone_id,
        zone_name: rec.zone_name,
        severity: rec.severity,
        lat: rec.lat_center,
        lng: rec.lng_center,
        resources: rec.recommended_deployment,
        deployed_at: Date.now()
      };
      setDeployments(prev => ({ ...prev, [rec.zone_id]: entry }));
      setAuditLog(prev => [...prev, entry]);
    }
    
    // Deduct from pool so AI re-allocates next tick
    setResourcePool(prev => ({
      ...prev,
      ndrf_units:    Math.max(0, (prev.ndrf_units||0)    - rec.recommended_deployment.ndrf_units),
      helicopters:   Math.max(0, (prev.helicopters||0)   - rec.recommended_deployment.helicopters),
      medical_teams: Math.max(0, (prev.medical_teams||0) - rec.recommended_deployment.medical_teams),
      rescue_boats:  Math.max(0, (prev.rescue_boats||0)  - rec.recommended_deployment.rescue_boats),
    }));
  };

  // ── Tab Renderers ────────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case 'mesh':
        return (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Dashboard 
              onSwitchMode={onSwitchMode} 
              onLogout={onLogout} 
              xDeployments={deployments}
              globalState={isSimulated ? { survivors, meshNodes, dangerZones, rescueTeams } : null}
              user={user}
              deployRequests={deployRequests}
              onAlertClick={() => setShowDeployModal(true)}
              onLogClick={() => setShowLogModal(true)}
            />
          </div>
        );

      case 'satellite':
        return (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,0.9fr)', gap: 16, padding: 16, flexShrink: 0 }}>
              <div>
                <div style={{ marginBottom: 14, fontFamily: 'var(--x-font-terminal)', fontSize: '0.6rem', color: 'var(--earth-sand)', letterSpacing: '0.15em' }}>
                  VSAT DEPLOYMENT TERMINAL
                </div>
                <X_VSATTerminal onStatusChange={setVsatStatus} />
              </div>

              {/* SAR Pipeline Panel Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="x-panel">
                <div className="x-panel__header" style={{ justifyContent: 'space-between' }}>
                  <span>🛰 SAR PROCESSING PIPELINE</span>
                  <select
                    value={sarScenario} onChange={e => setSarScenario(e.target.value)}
                    style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.6rem', background: 'var(--earth-bark)', color: 'var(--accent-amber)', border: '1px solid var(--earth-soil)', borderRadius: 3, padding: '2px 6px' }}
                  >
                    <option value="telangana_flood">Telangana Floods</option>
                    <option value="cyclone_andhra">Cyclone Michaung</option>
                  </select>
                </div>
                <div className="x-panel__body">
                  {['Ingest SAR raster (500MB simulated)', 'Δ-Pixel change computation', 'SNN spike threshold filter', 'Spatial damage clustering', 'District severity classification', 'Output 50KB decision map'].map((step, i) => {
                    const stepNum = i + 1;
                    const done    = sarState.progress >= (stepNum / 6) * 100;
                    const active  = sarState.phase === 'running' && !done;
                    return (
                      <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                          background: done ? 'rgba(74,124,89,0.3)' : active ? 'rgba(230,126,34,0.2)' : 'var(--earth-obsidian)',
                          border: `1px solid ${done ? '#6FCF97' : active ? '#E67E22' : 'var(--earth-soil)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.6rem', color: done ? '#6FCF97' : active ? '#E67E22' : 'var(--earth-sand)',
                          animation: active ? 'x-snn-spike 0.8s ease-in-out infinite' : 'none',
                        }}>{done ? '✓' : stepNum}</div>
                        <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.6rem', color: done ? 'rgba(111,207,151,0.8)' : active ? '#E67E22' : 'var(--earth-sand)' }}>{step}</span>
                      </div>
                    );
                  })}
                  <div style={{ margin: '12px 0 8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.58rem', color: 'var(--earth-sand)' }}>{sarState.message || 'Ready to process'}</span>
                      <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.58rem', color: 'var(--accent-amber)' }}>{sarState.progress}%</span>
                    </div>
                    <div className="x-bar-track"><div className={`x-bar-fill ${sarState.phase === 'complete' ? 'x-bar-fill--green' : 'x-bar-fill--amber'}`} style={{ width: `${sarState.progress}%` }} /></div>
                  </div>
                  <button
                    onClick={() => triggerSAR()} disabled={sarState.phase === 'running'}
                    style={{
                      width: '100%', marginTop: 12, padding: '9px 0',
                      background: sarState.phase === 'running' ? 'var(--earth-obsidian)' : 'rgba(230,126,34,0.1)',
                      border: '1px solid ' + (sarState.phase === 'running' ? 'var(--earth-soil)' : 'var(--accent-amber)'), borderRadius: 5,
                      color: sarState.phase === 'running' ? 'var(--earth-sand)' : 'var(--accent-amber)', fontFamily: 'var(--x-font-terminal)', fontSize: '0.65rem',
                      letterSpacing: '0.1em', cursor: sarState.phase === 'running' ? 'not-allowed' : 'pointer',
                    }}
                  >{sarState.phase === 'running' ? '⟳ PROCESSING…' : sarState.phase === 'complete' ? '↺ RE-RUN SAR PIPELINE' : '▶ RUN SAR PIPELINE'}</button>
                </div>
              </div>

              {/* Disaster Comparison View (Appears on Complete) */}
              {sarState.phase === 'complete' && (
                <div className="x-panel animate-in" style={{ animation: 'x-slide-up 0.4s ease-out' }}>
                  <div className="x-panel__header" style={{ background: 'rgba(183,28,28,0.1)', justifyContent: 'space-between' }}>
                    <span style={{ color: '#EB5757' }}>🖼️ DISASTER COMPARISON (PRE vs POST)</span>
                    <span style={{ fontSize: '0.55rem', opacity: 0.6 }}>TELANGANA_REGION_A1</span>
                  </div>
                  <div className="x-panel__body" style={{ padding: 12, paddingBottom: 16 }}>
                    <div style={{ 
                      position: 'relative', borderRadius: 6, overflow: 'hidden', 
                      border: '1px solid var(--earth-soil)', background: 'rgba(0,0,0,0.3)',
                      padding: 16, display: 'flex', justifyContent: 'center'
                    }}>
                      <img 
                        src="https://res.cloudinary.com/dbs2ldktj/image/upload/v1774473215/WhatsApp_Image_2026-03-26_at_2.27.43_AM_ehtxeg.jpg"
                        alt="Disaster Comparison"
                        style={{ maxWidth: '95%', height: 'auto', display: 'block', borderRadius: 2, filter: 'contrast(1.1) brightness(0.9)' }}
                      />
                      <div style={{
                        position: 'absolute', bottom: 10, right: 10, 
                        fontFamily: 'var(--x-font-terminal)', fontSize: '0.45rem',
                        color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: 2
                      }}>
                        🛰 SAR FUSION IMAGERY
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
            
            {/* SAR Leaflet Map filling the rest of the tab */}
            <X_SARMap districts={sarState.result?.districts || []} deployments={deployments} />
          </div>
        );

      case 'ai':
        const selectedRec = allocation ? allocation.recommendations.find(r => r.zone_id === selectedZoneId) || allocation.recommendations[0] : null;

        return (
          <div className="x-triage-grid">
            {/* COLUMN 1: RESOURCES & LOGS (280px) */}
            <div className="x-triage-column x-triage-column--left" style={{ borderRight: '1px solid var(--earth-soil)', padding: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <X_ResourceConfig onChange={setResourcePool} />
                <div style={{ flex: 1 }}>
                  <X_DeploymentLog log={auditLog} onClear={() => setAuditLog([])} />
                </div>
              </div>
            </div>

            {/* COLUMN 2: PRIORITY ANALYSIS QUEUE (1.4fr) */}
            <div className="x-triage-column" style={{ borderRight: '1px solid var(--earth-soil)' }}>
              <div className="x-panel__header" style={{ justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)' }}>
                <span>⚡ PRIORITY ANALYSIS QUEUE</span>
                <span className="x-badge x-badge--warn">{allocation?.recommendations.length || 0} ZONES</span>
              </div>
              
              {/* Analysis Dials */}
              <div style={{ display: 'flex', gap: 20, padding: 16, background: 'var(--earth-obsidian)', borderBottom: '1px solid var(--earth-soil)' }}>
                {[
                  { label: 'SNN DELTA', val: sarState.progress + '%', fill: sarState.progress, color: '#6FCF97' },
                  { label: 'POP RISK',  val: allocation ? (allocation.summary.total_pop_at_risk / 1000).toFixed(1) + 'K' : '0', fill: 65, color: 'var(--accent-amber)' },
                  { label: 'SATELLITE', val: 'VSAT-1', fill: 90, color: '#56CCF2' },
                ].map(d => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="x-metric-dial">
                      <div className="x-metric-dial__fill" style={{ height: `${d.fill}%`, background: d.color, opacity: 0.3 }} />
                      <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.5rem', zIndex: 1, color: d.color }}>{d.val}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.5rem', color: 'var(--earth-sand)', textTransform: 'uppercase' }}>{d.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                {!allocation ? (
                  <div style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.7rem', color: 'var(--earth-clay)', textAlign: 'center', padding: '60px 20px' }}>
                    [!] WAITING FOR SAR DATA FEED...
                  </div>
                ) : (
                  allocation.recommendations.map((rec, i) => (
                    <div 
                      key={rec.zone_id} 
                      onClick={() => setSelectedZoneId(rec.zone_id)}
                      style={{ 
                        marginBottom: 8, padding: '10px 14px', 
                        background: selectedZoneId === rec.zone_id ? 'rgba(230,126,34,0.1)' : 'var(--earth-charcoal)',
                        border: `1px solid ${selectedZoneId === rec.zone_id ? 'var(--accent-amber)' : 'var(--earth-soil)'}`,
                        borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s',
                        position: 'relative', overflow: 'hidden'
                      }}
                    >
                      {deployments[rec.zone_id] && <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: '#6FCF97' }} />}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.7rem', color: 'var(--earth-parchment)', fontWeight: 600 }}>#{i+1} {rec.zone_name.toUpperCase()}</span>
                        <span className="x-priority-tag" style={{ color: rec.priority_score > 0.7 ? '#EB5757' : 'var(--accent-amber)' }}>{rec.severity}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.55rem', color: 'var(--earth-sand)' }}>🛰 POP: {rec.estimated_lives_at_risk?.toLocaleString()}</span>
                        <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.55rem', color: 'var(--earth-sand)' }}>📡 SOS: {rec.sos_density || 0}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 3: ACTION DISPATCHER (1.1fr) */}
            <div className="x-triage-column" style={{ background: 'rgba(26,18,8,0.4)' }}>
              <div className="x-panel__header" style={{ background: 'var(--earth-bark)' }}>🎯 ACTION DISPATCHER</div>
              
              {!selectedRec ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--earth-soil)', fontFamily: 'var(--x-font-terminal)', fontSize: '0.6rem' }}>SELECT ZONE TO DISPATCH</div>
              ) : (
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontFamily: 'var(--x-font-military)', fontSize: '1.2rem', color: 'var(--earth-parchment)', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>{selectedRec.zone_name}</h3>
                    <p style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.65rem', color: 'var(--earth-sand)' }}>DISASTER CLUSTER ID: {selectedRec.zone_id?.slice(-8)}</p>
                  </div>

                  <div className="x-panel" style={{ marginBottom: 20, background: 'rgba(0,0,0,0.2)' }}>
                    <div className="x-panel__body" style={{ padding: 15 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="x-metric">
                          <span className="x-metric__label">REQUIRED RESOURCES</span>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <ResourcePill icon="🚁" count={selectedRec.recommended_deployment?.helicopters || 0} label="HELI" />
                            <ResourcePill icon="🚤" count={selectedRec.recommended_deployment?.rescue_boats || 0} label="BOATS" />
                            <ResourcePill icon="🦺" count={selectedRec.recommended_deployment?.ndrf_units || 0} label="UNITS" />
                          </div>
                        </div>
                        <div className="x-metric">
                          <span className="x-metric__label">DEPLOYMENT WINDOW</span>
                          <span className="x-metric__value" style={{ color: '#F2994A' }}>T-MINUS {selectedRec.deployment_window_hours} HOURS</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1 }} />

                  <button
                    onClick={() => !deployRequests.some(r => r.zone_id === selectedRec.zone_id) && !deployments[selectedRec.zone_id] && handleDeploy(selectedRec)}
                    disabled={!!deployments[selectedRec.zone_id] || deployRequests.some(r => r.zone_id === selectedRec.zone_id)}
                    style={{
                      width: '100%', padding: '18px', 
                      background: deployments[selectedRec.zone_id] ? 'rgba(74,124,89,0.1)' : deployRequests.some(r => r.zone_id === selectedRec.zone_id) ? 'rgba(230,126,34,0.15)' : 'rgba(230,126,34,0.15)',
                      border: `1px solid ${deployments[selectedRec.zone_id] ? '#6FCF97' : deployRequests.some(r => r.zone_id === selectedRec.zone_id) ? '#E67E22' : 'var(--accent-amber)'}`,
                      color: deployments[selectedRec.zone_id] ? '#6FCF97' : deployRequests.some(r => r.zone_id === selectedRec.zone_id) ? '#E67E22' : 'var(--accent-amber)',
                      fontFamily: 'var(--x-font-terminal)', fontSize: '0.85rem', fontWeight: 700,
                      letterSpacing: '0.2em', cursor: deployments[selectedRec.zone_id] || deployRequests.some(r => r.zone_id === selectedRec.zone_id) ? 'default' : 'pointer',
                      borderRadius: 4, transition: 'all 0.3s',
                      boxShadow: deployments[selectedRec.zone_id] || deployRequests.some(r => r.zone_id === selectedRec.zone_id) ? 'none' : '0 0 20px rgba(230,126,34,0.15)'
                    }}
                  >
                    {deployments[selectedRec.zone_id] 
                      ? '✓ TASK DISPATCHED' 
                      : deployRequests.some(r => r.zone_id === selectedRec.zone_id) 
                        ? '⏳ REQUEST PENDING' 
                        : (user.role==='admin' ? '▶ REQUEST DEPLOYMENT' : '▶ INITIATE DEPLOYMENT')}
                  </button>

                  
                  {deployments[selectedRec.zone_id] && (
                    <div style={{ marginTop: 12, padding: 10, background: 'rgba(111,207,151,0.05)', border: '1px solid rgba(111,207,151,0.2)', borderRadius: 4 }}>
                      <p style={{ margin: 0, fontFamily: 'var(--x-font-terminal)', fontSize: '0.6rem', color: '#6FCF97', textAlign: 'center' }}>
                         TEAM IN TRANSIT TO ZONE. ETA 45 MINS via VSAT UPLINK.
                      </p>
                    </div>
                  )}

                  {deployRequests.filter(r => r.zone_id === selectedRec.zone_id && r.status === 'accepted').map(req => (
                    <div key={req.zone_id} style={{ marginTop: 12, padding: 10, background: 'rgba(111,207,151,0.05)', border: '1px solid rgba(111,207,151,0.2)', borderRadius: 4 }}>
                      <p style={{ margin: 0, fontFamily: 'var(--x-font-terminal)', fontSize: '0.6rem', color: '#6FCF97', textAlign: 'center' }}>
                         Deployed by {req.operator_id} with team {req.team_name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'field':
        return (
          <div style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(400px, 1.8fr)', gap: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--earth-soil)', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                <X_FieldTeamTracker focusedTeam={focusedTeam} onTeamClick={setFocusedTeam} />
                <div style={{ marginTop: 16 }}><X_EOCPanel /></div>
              </div>
            </div>
            {/* Live Field Command Map */}
            <div style={{ background: '#000', position: 'relative' }}>
              <X_FieldMap survivors={survivors} rescueTeams={rescueTeams} meshNodes={meshNodes} focusedTeam={focusedTeam} />
            </div>
          </div>
        );

      case 'idrn':
        return (
          <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16, alignItems: 'start' }}>
            <X_IDRNIntegration />
            <X_ResponseLagTracker startTime={startTime} />
          </div>
        );

      default: return null;
    }
  };

  const critCount = survivors.filter(s => (s.priority?.level||'').toUpperCase()==='CRITICAL').length;
  const activeTeamsCount = rescueTeams.length + 8; // API + sim

  return (
    <div className="x-ndma-layout">
      {/* If not in Mesh tab, render the classic dashboard header manually to keep styling consistent */}
      {activeTab !== 'mesh' && (
        <header className="dashboard__header" style={{ flexShrink: 0 }}>
          <div className="header-logo">
            <div className="header-logo__icon">⚡</div>
            NeuroGrid
          </div>
          <div className="header-stats">
            <div className="header-stat"><strong>{survivors.length}</strong> Survivors</div>
            <div className="header-stat"><strong style={{ color: '#C0392B' }}>{critCount}</strong> Critical</div>
            <div className="header-stat"><strong style={{ color: '#6FCF97' }}>{activeTeamsCount}</strong> Field Units</div>
          </div>
          <div className="header-controls">
            {(user.role === 'sub_hq' || user.role === 'admin') && deployRequests.some(r => r.status === 'accepted') && (
                <button 
                  className="btn" 
                  onClick={() => setShowLogModal(true)}
                  style={{ 
                    background: 'rgba(111,207,151,0.1)', color: '#6FCF97', 
                    border: '1px solid #6FCF97', marginRight: 12
                  }}
                >
                  📋 {deployRequests.filter(r => r.status === 'accepted').length} DISPATCH LOG
                </button>
            )}
            
            {user.role === 'sub_hq' && deployRequests.some(r => r.status === 'pending') && (
                <button 
                  className="btn" 
                  onClick={() => setShowDeployModal(true)}
                  style={{ 
                    background: 'rgba(235,87,87,0.2)', color: '#EB5757', 
                    border: '1px solid #EB5757', marginRight: 16, 
                    animation: 'x-snn-spike 1s infinite' 
                  }}
                >
                  ⚠️ {deployRequests.filter(r => r.status === 'pending').length} ALERTS
                </button>
            )}
            <div className="x-metric" style={{ marginRight: 16 }}>
              <div className="x-metric__label">MISSION</div>
              <div className="x-metric__value" style={{ color: 'var(--earth-parchment)' }}>{elapsed}</div>
            </div>
            {onLogout && (
              <button className="btn btn--danger" onClick={onLogout} style={{ padding: '6px 12px' }}>
                ⏻ LOGOUT
              </button>
            )}
          </div>
        </header>
      )}

      {/* ── Tab Content ──────────────────────────────────────────────────────── */}
      <div className="x-ndma-content">
        {renderTab()}
      </div>

      {/* ── Tab Bar (Moved to Bottom) ─────────────────────────────────────────── */}
      <nav className="x-ndma-tabs" style={{ borderTop: '1px solid var(--earth-soil)', borderBottom: 'none' }}>
        {TABS.map(tab => (
          <button
            key={tab.id} id={`ndma-tab-${tab.id}`}
            className={`x-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1 }}
          >{tab.label}</button>
        ))}
      </nav>

      {/* ── Sub-HQ Dynamic Alert Modal (Strictly Pending Action Required) ────── */}
      {showDeployModal && (
        <div className="sim-modal" onClick={() => setShowDeployModal(false)} style={{ zIndex: 9999 }}>
          <div className="sim-modal__panel" onClick={e => e.stopPropagation()} style={{ width: 450, padding: '24px' }}>
            <div className="sim-modal__title" style={{ color: '#EB5757', borderBottom: '1px solid rgba(235,87,87,0.3)', paddingBottom: 10 }}>
              ⚠️ URGENT DEPLOYMENT REQUEST
            </div>
            
            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8, marginTop: 16 }}>
              {deployRequests.filter(r => r.status === 'pending').length === 0 ? (
                <p style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.8rem', color: 'var(--earth-sand)', textAlign: 'center', padding: '20px 0' }}>All clear. No pending alerts.</p>
              ) : (
                <div style={{ marginBottom: 10 }}>
                  <h4 style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.65rem', color: 'var(--accent-amber)', marginBottom: 12, letterSpacing: '0.1em' }}>ACTION REQUIRED</h4>
                  {deployRequests.filter(r => r.status === 'pending').map(req => (
                    <AlertItem 
                      key={req.zone_id} 
                      req={req} 
                      user={user} 
                      socketRef={socketRef} 
                      onProcessed={() => {
                        if (deployRequests.filter(r => r.status === 'pending').length <= 1) setShowDeployModal(false);
                      }}
                      setDeployRequests={setDeployRequests}
                    />
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn--ghost" style={{ width: '100%', marginTop: 24 }} onClick={() => setShowDeployModal(false)}>CLOSE MENU</button>
          </div>
        </div>
      )}

      {/* ── Historical Dispatch Log Modal (Strictly Accepted Dispatches) ─────── */}
      {showLogModal && (
        <div className="sim-modal" onClick={() => setShowLogModal(false)} style={{ zIndex: 9999 }}>
          <div className="sim-modal__panel" onClick={e => e.stopPropagation()} style={{ width: 480, padding: '24px' }}>
            <div className="sim-modal__title" style={{ color: '#6FCF97', borderBottom: '1px solid rgba(111,207,151,0.3)', paddingBottom: 10 }}>
              📋 REGIONAL DISPATCH LOG
            </div>
            
            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8, marginTop: 16 }}>
              {deployRequests.filter(r => r.status === 'accepted').length === 0 ? (
                <p style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.8rem', color: 'var(--earth-sand)', textAlign: 'center', padding: '20px 0' }}>No active dispatches across the network.</p>
              ) : (
                <div>
                  <h4 style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.65rem', color: '#6FCF97', marginBottom: 12, letterSpacing: '0.1em' }}>MESH-WIDE DEPLOYMENTS</h4>
                  {deployRequests.filter(r => r.status === 'accepted').map(req => (
                    <div key={req.zone_id} style={{ background: 'rgba(111,207,151,0.05)', border: '1px solid rgba(111,207,151,0.2)', borderRadius: 6, padding: '14px', marginBottom: 12, position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: '#6FCF97', borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, paddingLeft: 6 }}>
                        <h4 style={{ margin: 0, fontFamily: 'var(--x-font-military)', color: 'var(--earth-parchment)', fontSize: '0.9rem', letterSpacing: '0.05em' }}>{req.zone_name.toUpperCase()}</h4>
                        <span style={{ fontFamily: 'var(--x-font-terminal)', fontSize: '0.55rem', color: 'var(--earth-sand)' }}>{new Date(req.accepted_ts || req.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, paddingLeft: 6, marginBottom: 10 }}>
                        {req.recommended_deployment?.helicopters > 0 && <ResourcePill icon="🚁" count={req.recommended_deployment.helicopters} label="HELI" />}
                        {req.recommended_deployment?.rescue_boats > 0  && <ResourcePill icon="🚤" count={req.recommended_deployment.rescue_boats} label="BOAT" />}
                        {req.recommended_deployment?.ndrf_units > 0    && <ResourcePill icon="🦺" count={req.recommended_deployment.ndrf_units} label="UNIT" />}
                      </div>
                      <p style={{ margin: '0', paddingLeft: 6, fontFamily: 'var(--x-font-terminal)', fontSize: '0.75rem', color: '#6FCF97' }}>
                        Deployed by <strong style={{ color: '#fff' }}>[{req.operator_id}]</strong> → <strong style={{ color: '#fff' }}>{req.team_name}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn--ghost" style={{ width: '100%', marginTop: 24 }} onClick={() => setShowLogModal(false)}>CLOSE LOG</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertItem({ req, user, socketRef, onProcessed, setDeployRequests }) {
  const [teamSelection, setTeamSelection] = useState('Team Alpha');

  const accept = () => {
    socketRef.current?.emit('deploy_accept', {
      zone_id: req.zone_id,
      operator_id: user.name,
      team_name: teamSelection
    });
    // Immediately remove from local pending list for snappy UI
    setDeployRequests(prev => prev.filter(r => r.zone_id !== req.zone_id));
    onProcessed();
  };

  const decline = () => {
    // Simply hide it locally for this sub_hq
    setDeployRequests(prev => prev.filter(r => r.zone_id !== req.zone_id));
  };

  return (
    <div style={{ background: 'var(--earth-charcoal)', border: '1px solid var(--earth-soil)', borderRadius: 6, padding: '15px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <h4 style={{ margin: 0, fontFamily: 'var(--x-font-military)', color: 'var(--earth-parchment)', letterSpacing: '0.05em' }}>{req.zone_name.toUpperCase()}</h4>
        <span className="x-priority-tag" style={{ color: req.severity === 'CATASTROPHIC' ? '#EB5757' : 'var(--accent-amber)' }}>{req.severity}</span>
      </div>
      
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {req.recommended_deployment?.helicopters > 0 && <ResourcePill icon="🚁" count={req.recommended_deployment.helicopters} label="HELI" />}
        {req.recommended_deployment?.rescue_boats > 0  && <ResourcePill icon="🚤" count={req.recommended_deployment.rescue_boats} label="BOAT" />}
        {req.recommended_deployment?.ndrf_units > 0    && <ResourcePill icon="🦺" count={req.recommended_deployment.ndrf_units} label="UNIT" />}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontFamily: 'var(--x-font-terminal)', fontSize: '0.6rem', color: 'var(--earth-sand)', marginBottom: 6 }}>SELECT DISPATCH UNIT:</label>
        <select 
          value={teamSelection} 
          onChange={e => setTeamSelection(e.target.value)}
          style={{ width: '100%', padding: '8px', background: 'var(--earth-obsidian)', color: 'var(--earth-parchment)', border: '1px solid var(--earth-soil)', borderRadius: 4, fontFamily: 'var(--font-data)' }}
        >
          <option value="Team Alpha">Team Alpha</option>
          <option value="Team Bravo">Team Bravo</option>
          <option value="Team Charlie">Team Charlie</option>
          <option value="Team Delta">Team Delta</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={accept} style={{ flex: 1, padding: '10px', background: 'rgba(111,207,151,0.15)', border: '1px solid #6FCF97', color: '#6FCF97', borderRadius: 4, fontFamily: 'var(--x-font-terminal)', fontWeight: 'bold', cursor: 'pointer' }}>✓ ACCEPT</button>
        <button onClick={decline} style={{ flex: 1, padding: '10px', background: 'rgba(235,87,87,0.15)', border: '1px solid #EB5757', color: '#EB5757', borderRadius: 4, fontFamily: 'var(--x-font-terminal)', fontWeight: 'bold', cursor: 'pointer' }}>✕ DECLINE</button>
      </div>
    </div>
  );
}

export default X_NDMADashboard;
