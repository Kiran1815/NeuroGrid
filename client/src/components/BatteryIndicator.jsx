// components/BatteryIndicator.jsx
import React from 'react';

export function BatteryIndicator({ level, charging = false }) {
    const pct = Math.min(100, Math.max(0, level ?? 100));
    const cls = pct < 10 ? 'crit' : pct < 20 ? 'low' : pct < 50 ? 'mid' : 'high';
    const label = charging ? `${pct}% ⚡` : `${pct}%`;

    return (
        <div className="battery-bar">
            <span>🔋</span>
            <div className="battery-bar__track">
                <div
                    className={`battery-bar__fill battery-bar__fill--${cls}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span>{label}</span>
        </div>
    );
}
