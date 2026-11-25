// components/LastSeenTimer.jsx
import React, { useState, useEffect } from 'react';

function elapsed(ts) {
    if (!ts) return '—';
    const secs = Math.floor((Date.now() - ts) / 1000);
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s ago`;
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m ago`;
}

export function LastSeenTimer({ timestamp }) {
    const [label, setLabel] = useState(() => elapsed(timestamp));

    useEffect(() => {
        const id = setInterval(() => setLabel(elapsed(timestamp)), 1000);
        return () => clearInterval(id);
    }, [timestamp]);

    return <span className="text-data" style={{ fontSize: '0.75rem', color: 'var(--earth-sand)' }}>{label}</span>;
}
