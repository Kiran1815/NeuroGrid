// core/geo/ClusterDetector.js
// Detects survivor clusters and marks danger zones.

const CLUSTER_RADIUS_M = 200;   // meters
const MIN_CLUSTER_SIZE = 3;

// Haversine distance in meters
function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function detectClusters(survivors) {
    const zones = [];
    const assigned = new Set();

    for (let i = 0; i < survivors.length; i++) {
        if (assigned.has(i)) continue;
        const s = survivors[i];
        const nearby = [i];

        for (let j = i + 1; j < survivors.length; j++) {
            if (assigned.has(j)) continue;
            const t = survivors[j];
            if (haversine(s.latitude, s.longitude, t.latitude, t.longitude) <= CLUSTER_RADIUS_M) {
                nearby.push(j);
            }
        }

        if (nearby.length >= MIN_CLUSTER_SIZE) {
            nearby.forEach(idx => assigned.add(idx));
            const centLat = nearby.reduce((acc, idx) => acc + survivors[idx].latitude, 0) / nearby.length;
            const centLng = nearby.reduce((acc, idx) => acc + survivors[idx].longitude, 0) / nearby.length;
            const maxDist = nearby.reduce((max, idx) => {
                const d = haversine(centLat, centLng, survivors[idx].latitude, survivors[idx].longitude);
                return Math.max(max, d);
            }, 0);

            zones.push({
                id: `DZ-${zones.length + 1}`,
                center: [centLat, centLng],
                radius: Math.max(maxDist + 50, CLUSTER_RADIUS_M),
                count: nearby.length,
                survivors: nearby.map(idx => survivors[idx].device_id),
            });
        }
    }

    // Annotate survivors with nearby_sos_count
    return {
        zones,
        survivors: survivors.map((s, i) => {
            const zone = zones.find(z => z.survivors.includes(s.device_id));
            return { ...s, nearby_sos_count: zone ? zone.count : 0 };
        }),
    };
}
