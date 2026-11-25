// dashboard/panels/LiveActivityPanel/LiveActivityPanel.jsx
import React, { useEffect, useRef } from 'react';

function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function LiveActivityPanel({ events = [] }) {
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events.length]);

    const getEventClass = (type) => {
        if (['sos', 'critical'].includes(type)) return 'activity-line--critical';
        if (['sync', 'gateway'].includes(type)) return 'activity-line--sync';
        return '';
    };

    return (
        <>
            <div className="section-header">
                <span className="section-header__title">LIVE ACTIVITY</span>
                <span className="status-dot status-dot--syncing" />
            </div>
            <div className="panel-scroll" style={{ flex: 1 }}>
                {events.length === 0 && (
                    <div style={{ padding: 16, fontFamily: 'var(--font-data)', fontSize: '0.72rem', color: 'var(--earth-sand)', textAlign: 'center' }}>
                        Waiting for events…
                    </div>
                )}
                {events.map((evt) => (
                    <div key={evt.id ?? evt.ts} className={`activity-line ${getEventClass(evt.type)}`}>
                        <span className="activity-line__time">{formatTime(evt.ts)}</span>
                        {evt.simulated && (
                            <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.58rem', color: 'rgba(255,200,100,0.6)', marginRight: 4, letterSpacing: '0.05em' }}>[SIM]</span>
                        )}
                        <span className="activity-line__event">{evt.label}</span>
                        {evt.detail && <span className="activity-line__detail">"{evt.detail}"</span>}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </>
    );
}
