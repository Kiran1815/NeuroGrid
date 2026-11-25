// hooks/usePriorityScore.js
import { useState, useEffect } from 'react';
import { computePriorityScore } from '../core/scoring/PriorityEngine.js';

export function usePriorityScore(survivor, intervalMs = 10000) {
    const [priority, setPriority] = useState(() =>
        survivor ? computePriorityScore(survivor) : null
    );

    useEffect(() => {
        if (!survivor) return;
        const update = () => setPriority(computePriorityScore(survivor));
        update();
        const id = setInterval(update, intervalMs);
        return () => clearInterval(id);
    }, [survivor, intervalMs]);

    return priority;
}
