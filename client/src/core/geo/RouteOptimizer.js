// core/geo/RouteOptimizer.js
// Nearest-neighbor greedy routing through CRITICAL survivors.

function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getBearing(lat1, lng1, lat2, lng2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function bearingToArrow(deg) {
    const dirs = [
        { label: 'N', arrow: '↑', max: 22.5 },
        { label: 'NE', arrow: '↗', max: 67.5 },
        { label: 'E', arrow: '→', max: 112.5 },
        { label: 'SE', arrow: '↘', max: 157.5 },
        { label: 'S', arrow: '↓', max: 202.5 },
        { label: 'SW', arrow: '↙', max: 247.5 },
        { label: 'W', arrow: '←', max: 292.5 },
        { label: 'NW', arrow: '↖', max: 337.5 },
        { label: 'N', arrow: '↑', max: 360 },
    ];
    const d = dirs.find(d => deg < d.max);
    return `${d.arrow} ${d.label}`;
}

export function optimizeRescueRoute(rescuerLat, rescuerLng, survivors) {
    // Sort by priority first, then by distance for same-priority
    const sorted = [...survivors].sort((a, b) => {
        const priority = { CRITICAL: 0, MEDIUM: 1, LOW: 2 };
        const aP = priority[a.priority?.level ?? 'LOW'];
        const bP = priority[b.priority?.level ?? 'LOW'];
        if (aP !== bP) return aP - bP;

        const dA = haversine(rescuerLat, rescuerLng, a.latitude, a.longitude);
        const dB = haversine(rescuerLat, rescuerLng, b.latitude, b.longitude);
        return dA - dB;
    });

    // Annotate with distance from rescuer
    let curLat = rescuerLat;
    let curLng = rescuerLng;
    let totalDist = 0;

    return sorted.map(s => {
        const dist = haversine(curLat, curLng, s.latitude, s.longitude);
        const bearingDeg = getBearing(curLat, curLng, s.latitude, s.longitude);
        totalDist += dist;
        curLat = s.latitude;
        curLng = s.longitude;
        return {
            ...s,
            distance_m: Math.round(dist),
            total_dist_m: Math.round(totalDist),
            bearing_deg: Math.round(bearingDeg),
            bearing_label: bearingToArrow(bearingDeg),
        };
    });
}

export function formatDistance(meters) {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
}
