import { useState } from 'react';
import { generateSimulatedSurvivors, SCENARIO_LIST } from '../simulation/DisasterSimulator.js';
import { detectClusters } from '../core/geo/ClusterDetector.js';

export function X_SimulationMenu({ onSimulate }) {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState('telangana_flood');

  const handleToggle = () => {
    if (active) {
      setActive(false);
      onSimulate({ active: false });
    } else {
      setActive(true);
      const raw = generateSimulatedSurvivors(100, selected);
      // Give them priority/hop_count etc as Dashboard expects
      const survivors = raw.map((s, i) => ({
        ...s,
        priority: {
          level: Math.random() > 0.8 ? 'CRITICAL' : Math.random() > 0.5 ? 'MEDIUM' : 'LOW',
          score: Math.floor(Math.random() * 100),
          factors: ['Simulated Hazard']
        },
        hop_count: Math.floor(Math.random() * 5) + 1,
        gateway_id: 'SIM_GW_01'
      }));

      const zones = detectClusters(survivors, 1.5, 3);
      const nodes = survivors.slice(0, Math.floor(survivors.length * 0.3)).map((s, i) => ({
        node_id: `MESH_${s.device_id?.split('_')[1] || i}`,
        latitude: s.latitude,
        longitude: s.longitude,
        type: Math.random() > 0.8 ? 'Relay' : 'Client',
        battery: Math.floor(Math.random() * 100)
      }));
      
      const rescueTeams = [
        { team_id: 'NDRF-Alpha', latitude: 17.4, longitude: 78.5, status: 'active', type: 'ndrf' },
        { team_id: 'HELI-01', latitude: 17.5, longitude: 78.4, status: 'active', type: 'heli' }
      ];

      onSimulate({ active: true, survivors, meshNodes: nodes, dangerZones: zones, rescueTeams });
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {active && (
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setActive(false); // Force toggle to regenerate
            setTimeout(() => document.getElementById('x-sim-toggle').click(), 50);
          }}
          style={{
            background: 'var(--earth-charcoal)',
            color: 'var(--accent-amber)',
            border: '1px solid var(--earth-soil)',
            fontFamily: 'var(--x-font-terminal)',
            fontSize: '0.65rem',
            padding: '4px 8px',
            borderRadius: 4
          }}
        >
          {SCENARIO_LIST.map(sc => (
            <option key={sc.id} value={sc.id}>{sc.name.toUpperCase()}</option>
          ))}
        </select>
      )}
      <button
        id="x-sim-toggle"
        onClick={handleToggle}
        style={{
          background: active ? 'rgba(230,126,34,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${active ? '#E67E22' : 'rgba(255,255,255,0.2)'}`,
          color: active ? '#E67E22' : '#aaa',
          padding: '6px 12px',
          borderRadius: 4,
          fontFamily: 'var(--x-font-terminal)',
          fontSize: '0.65rem',
          letterSpacing: '0.1em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.2s',
          boxShadow: active ? '0 0 10px rgba(230,126,34,0.2)' : 'none'
        }}
      >
        <span style={{ fontSize: '0.8rem' }}>{active ? '🛑' : '🎭'}</span>
        {active ? 'END SIMULATION' : 'SIMULATION MODE'}
      </button>
    </div>
  );
}
