// simulation/DisasterSimulator.js
// Generate realistic disaster scenarios on demand — Hackathon demo mode.

const SCENARIO_PRESETS = {
    building_collapse: {
        name: 'Multi-Story Building Collapse',
        description: '18 survivors · 150m radius · Heavy trapped/medical mix',
        radius_m: 150,
        survivor_count: 18,
        weight: { trapped: 0.6, medical: 0.3, other: 0.1 },
    },
    flood_zone: {
        name: 'Flash Flood — Residential',
        description: '24 survivors · 400m radius · Flood dominant',
        radius_m: 400,
        survivor_count: 24,
        weight: { flood: 0.7, medical: 0.2, trapped: 0.1 },
    },
    mass_casualty: {
        name: 'Mass Casualty Event',
        description: '35 survivors · 300m radius · Medical critical',
        radius_m: 300,
        survivor_count: 35,
        weight: { medical: 0.5, trapped: 0.3, other: 0.2 },
    },
};

export const SCENARIO_KEYS = Object.keys(SCENARIO_PRESETS);
export const SCENARIO_LIST = SCENARIO_KEYS.map(k => ({ key: k, ...SCENARIO_PRESETS[k] }));

function randomPointInRadius(centerLat, centerLng, radiusM) {
    const r = radiusM / 111320;
    const angle = Math.random() * 2 * Math.PI;
    const dist = Math.sqrt(Math.random()) * r;
    return {
        lat: centerLat + dist * Math.cos(angle),
        lng: centerLng + dist * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180),
    };
}

function weightedRandom(weights) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    for (const [key, val] of Object.entries(weights)) {
        random -= val;
        if (random <= 0) return key;
    }
    return Object.keys(weights)[0];
}

export function generateSimulatedSurvivors(scenario, centerLat, centerLng) {
    const preset = SCENARIO_PRESETS[scenario];
    if (!preset) throw new Error(`Unknown scenario: ${scenario}`);

    const survivors = [];
    const now = Date.now();

    for (let i = 0; i < preset.survivor_count; i++) {
        const { lat, lng } = randomPointInRadius(centerLat, centerLng, preset.radius_m);
        const emergencyType = weightedRandom(preset.weight);
        const batteryLevel = Math.floor(Math.random() * 100);
        const timeSinceSOS = Math.floor(Math.random() * 7200) * 1000;   // 0–2hr ago
        const lastSeenDelta = Math.floor(Math.random() * 600_000);
        const hopCount = Math.floor(Math.random() * 5);
        const isMoving = Math.random() > 0.4 ? false : true;

        survivors.push({
            device_id: `SIM-${String(i + 1).padStart(3, '0')}`,
            latitude: lat,
            longitude: lng,
            battery_level: batteryLevel,
            emergency_type: emergencyType,
            timestamp: now - timeSinceSOS,
            last_seen: now - lastSeenDelta,
            movement_status: isMoving ? 'moving' : 'stationary',
            is_moving: isMoving,
            hop_count: hopCount,
            simulated: true,
        });
    }

    return survivors;
}
