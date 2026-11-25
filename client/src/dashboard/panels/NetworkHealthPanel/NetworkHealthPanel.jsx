// dashboard/panels/NetworkHealthPanel/NetworkHealthPanel.jsx
import React from 'react';

export function NetworkHealthPanel({ nodes = [], avgHops = 0, coverage = 0, meshPeers = {} }) {
    const peerList = Object.values(meshPeers);
    const totalNodes = Math.max(nodes.length, peerList.length);

    return (
        <div style={{ padding: '0' }}>
            <div className="section-header">
                <span className="section-header__title">NETWORK HEALTH</span>
                <span className={`status-dot ${totalNodes > 0 ? 'status-dot--connected' : 'status-dot--disconnected'}`} />
            </div>

            <div className="net-stat">
                <span className="net-stat__label">Active Nodes</span>
                <span className="net-stat__val">{totalNodes > 0 ? totalNodes : '—'}</span>
            </div>
            <div className="net-stat">
                <span className="net-stat__label">BLE Peers</span>
                <span className="net-stat__val" style={{ color: peerList.length > 0 ? '#56CCF2' : 'inherit' }}>
                    {peerList.length > 0 ? peerList.length : '—'}
                </span>
            </div>
            <div className="net-stat">
                <span className="net-stat__label">Avg Hops</span>
                <span className="net-stat__val">{avgHops > 0 ? avgHops.toFixed(1) : '—'}</span>
            </div>
            <div className="net-stat">
                <span className="net-stat__label">Mesh Coverage</span>
                <span className="net-stat__val" style={{ color: coverage > 60 ? 'var(--signal-safe)' : 'var(--signal-medium)' }}>
                    {coverage}%
                </span>
            </div>

            <div style={{ padding: '12px 16px' }}>
                <div className="health-bar">
                    <div className="health-bar__label">
                        <span>Coverage</span>
                        <span>{coverage}%</span>
                    </div>
                    <div className="health-bar__track">
                        <div className="health-bar__fill" style={{ width: `${coverage}%` }} />
                    </div>
                </div>
            </div>

            {/* Live BLE Peer List */}
            {peerList.length > 0 && (
                <div style={{ padding: '0 16px 12px' }}>
                    <div style={{ fontFamily: 'var(--font-data)', fontSize: '0.62rem', color: 'var(--earth-sand)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                        📡 BLE Mesh Peers (Offline)
                    </div>
                    {peerList.map(peer => {
                        const ago = Math.round((Date.now() - peer.last_seen) / 1000);
                        return (
                            <div key={peer.device_id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '5px 8px', marginBottom: 4,
                                background: 'rgba(86,204,242,0.06)', border: '1px solid rgba(86,204,242,0.2)',
                                borderLeft: '3px solid #56CCF2', borderRadius: 4,
                                fontFamily: 'var(--font-data)', fontSize: '0.68rem',
                            }}>
                                <div>
                                    <span style={{ color: '#56CCF2', fontWeight: 700 }}>📶 {peer.device_id}</span>
                                    {peer.is_heartbeat && <span style={{ color: 'var(--earth-sand)', marginLeft: 6, fontSize: '0.58rem' }}>OFFLINE BLE</span>}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: '#6FCF97', fontSize: '0.62rem' }}>🔋 {peer.battery_level}%</div>
                                    <div style={{ color: 'var(--earth-clay)', fontSize: '0.56rem' }}>{ago}s ago</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {totalNodes === 0 && (
                <div style={{ padding: 16, fontFamily: 'var(--font-data)', fontSize: '0.72rem', color: 'var(--earth-sand)', textAlign: 'center' }}>
                    No mesh nodes detected.<br />Activate simulation or connect a BLE peer.
                </div>
            )}
        </div>
    );
}
