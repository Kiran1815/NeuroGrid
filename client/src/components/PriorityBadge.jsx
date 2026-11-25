// components/PriorityBadge.jsx
import React from 'react';

export function PriorityBadge({ level, score }) {
    const lvl = (level ?? 'LOW').toLowerCase();
    return (
        <span className={`priority-badge priority-badge--${lvl}`}>
            {level === 'CRITICAL' && <span style={{ fontSize: '0.6rem' }}>●</span>}
            {level}
            {score !== undefined && <span style={{ opacity: 0.7 }}> {score}</span>}
        </span>
    );
}
