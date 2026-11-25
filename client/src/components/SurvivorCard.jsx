// components/SurvivorCard.jsx
import React from 'react';
import { PriorityBadge } from './PriorityBadge.jsx';
import { BatteryIndicator } from './BatteryIndicator.jsx';
import { LastSeenTimer } from './LastSeenTimer.jsx';

const EMERGENCY_ICONS = {
    medical: '🏥', trapped: '🪤', fire: '🔥', flood: '🌊', other: '⚠️',
};

export function SurvivorCard({ survivor, onClick, isSelected = false }) {
    const { priority = {}, device_id, emergency_type, battery_level, last_seen, movement_status, hop_count } = survivor;
    const lvl = (priority.level ?? 'LOW').toLowerCase();

    return (
        <div
            className={`survivor-item survivor-item--${lvl} animate-in`}
            onClick={() => onClick?.(survivor)}
            role="button"
            tabIndex={0}
            style={isSelected ? {
                borderLeft: '3px solid var(--accent-amber, #FFAA00)',
                background: 'rgba(255,170,0,0.07)',
                boxShadow: '0 0 12px rgba(255,170,0,0.15) inset',
            } : undefined}
        >
            <div className="survivor-item__header">
                <span className="survivor-item__id">
                    {EMERGENCY_ICONS[emergency_type] ?? '⚠️'} {device_id}
                </span>
                <PriorityBadge level={priority.level} score={priority.score} />
            </div>

            <div className="survivor-item__meta">
                <span className="survivor-item__type">{emergency_type?.toUpperCase()}</span>
                <span>·</span>
                <span>{movement_status === 'moving' ? '↑ moving' : '◉ stationary'}</span>
                <span>·</span>
                <span title="Hop count">📡 {hop_count ?? 0} hops</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, opacity: 0.8 }}>
                <div style={{ 
                    fontFamily: 'var(--font-data)', fontSize: '0.62rem', color: 'var(--earth-sand)',
                    background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.05)', letterSpacing: '0.05em'
                }}>
                    {survivor.latitude && survivor.longitude ? (
                        <>📍 {survivor.latitude.toFixed(5)}°N {survivor.longitude.toFixed(5)}°E</>
                    ) : (
                        <span style={{ opacity: 0.5 }}>🛰 GPS SIGNAL PENDING</span>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <BatteryIndicator level={battery_level} />
                <LastSeenTimer timestamp={last_seen} />
            </div>

            {priority.estimated_survival_minutes !== undefined && (
                <div style={{ marginTop: 4, fontFamily: 'var(--font-data)', fontSize: '0.68rem', color: 'var(--earth-sand)' }}>
                    Comm window: ~{priority.estimated_survival_minutes}min
                </div>
            )}
        </div>
    );
}
