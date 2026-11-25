// X_SARDataGenerator.js — Synthetic SAR Raster Data for India Districts
// Generates before/after disaster SAR data for simulation purposes.
// Used ONLY by X_SARProcessor.js — does not touch any existing modules.

export const INDIA_DISTRICTS = [
  // Telangana
  { id: 'WARANGAL_NORTH',  name: 'Warangal North',  lat: 17.9784, lng: 79.5941, district: 'Warangal',   population: 380000 },
  { id: 'KARIMNAGAR_EAST', name: 'Karimnagar East',  lat: 18.4386, lng: 79.1288, district: 'Karimnagar', population: 310000 },
  { id: 'NIZAMABAD',       name: 'Nizamabad',        lat: 18.6725, lng: 78.0941, district: 'Nizamabad',  population: 270000 },
  { id: 'ADILABAD',        name: 'Adilabad',         lat: 19.6640, lng: 78.5320, district: 'Adilabad',   population: 195000 },
  { id: 'KHAMMAM',         name: 'Khammam',          lat: 17.2473, lng: 80.1514, district: 'Khammam',    population: 260000 },
  // Andhra Pradesh (Cyclone Michaung scenario)
  { id: 'NELLORE',         name: 'Nellore',          lat: 14.4426, lng: 79.9865, district: 'Nellore',    population: 480000 },
  { id: 'ONGOLE',          name: 'Ongole',           lat: 15.5057, lng: 80.0499, district: 'Prakasam',   population: 230000 },
  { id: 'BAPATLA',         name: 'Bapatla',          lat: 15.9045, lng: 80.4671, district: 'Bapatla',    population: 160000 },
];

// Severity level definitions
export const SEVERITY_LEVELS = {
  MINOR:        { label: 'MINOR',        threshold: 0.15, color: '#558B2F', rgba: 'rgba(85,139,47,0.45)'   },
  MODERATE:     { label: 'MODERATE',     threshold: 0.40, color: '#F9A825', rgba: 'rgba(249,168,37,0.45)'  },
  SEVERE:       { label: 'SEVERE',       threshold: 0.65, color: '#E65100', rgba: 'rgba(230,81,0,0.50)'    },
  CATASTROPHIC: { label: 'CATASTROPHIC', threshold: 1.00, color: '#B71C1C', rgba: 'rgba(183,28,28,0.55)'   },
};

function getSeverityLevel(changePct) {
  if (changePct < 0.15) return SEVERITY_LEVELS.MINOR;
  if (changePct < 0.40) return SEVERITY_LEVELS.MODERATE;
  if (changePct < 0.65) return SEVERITY_LEVELS.SEVERE;
  return SEVERITY_LEVELS.CATASTROPHIC;
}

/**
 * Generate a synthetic SAR damage dataset for a named scenario.
 * @param {string} scenarioId - 'telangana_flood' | 'cyclone_andhra' | 'random'
 * @returns {Array} Array of district damage objects
 */
export function generateSARData(scenarioId = 'telangana_flood') {
  const profiles = getSARProfiles(scenarioId);

  return INDIA_DISTRICTS.map((district) => {
    const profile = profiles[district.id];
    // Use predefined profile or random fallback
    const changePct = profile !== undefined
      ? profile + (Math.random() * 0.08 - 0.04)   // ±4% random variation
      : Math.random() * 0.35;                       // random minor-moderate baseline

    const clampedPct = Math.max(0, Math.min(1, changePct));
    const severity = getSeverityLevel(clampedPct);
    const affectedArea = Math.round(clampedPct * district.population * 0.0002 * 100) / 100;  // km²
    const populationExposed = Math.round(district.population * clampedPct * 0.8);
    const confidenceScore = 0.75 + Math.random() * 0.22;

    return {
      district_id: district.id,
      district_name: district.name,
      district: district.district,
      lat_center: district.lat,
      lng_center: district.lng,
      change_magnitude: clampedPct,
      severity: severity.label,
      severity_color: severity.color,
      severity_rgba: severity.rgba,
      affected_area_km2: affectedArea,
      population_exposed: populationExposed,
      total_population: district.population,
      confidence_score: Math.round(confidenceScore * 100) / 100,
      sos_density: Math.round(populationExposed * 0.002),  // estimated SOS signals
      processed_at: Date.now(),
    };
  });
}

function getSARProfiles(scenarioId) {
  const profiles = {
    telangana_flood: {
      WARANGAL_NORTH:  0.73,
      KARIMNAGAR_EAST: 0.58,
      NIZAMABAD:       0.41,
      ADILABAD:        0.22,
      KHAMMAM:         0.61,
      NELLORE:         0.10,
      ONGOLE:          0.08,
      BAPATLA:         0.06,
    },
    cyclone_andhra: {
      NELLORE:         0.79,
      ONGOLE:          0.64,
      BAPATLA:         0.47,
      WARANGAL_NORTH:  0.15,
      KARIMNAGAR_EAST: 0.10,
      NIZAMABAD:       0.08,
      ADILABAD:        0.05,
      KHAMMAM:         0.20,
    },
    random: {},
  };
  return profiles[scenarioId] || profiles.random;
}

// Pre-built scenario list (matches NeuroGridX.md spec)
export const X_INDIA_SCENARIOS = {
  cyclone_andhra: {
    name: 'Cyclone Michaung — Andhra Pradesh Landfall',
    center: { lat: 15.9129, lng: 79.7400 },
    affected_districts: 8,
    survivor_count: 45,
    sar_scenario: 'cyclone_andhra',
    sar_damage_profile: [
      { district: 'Nellore', severity: 'CATASTROPHIC', pop_exposed: 180000 },
      { district: 'Ongole',  severity: 'SEVERE',       pop_exposed: 95000  },
      { district: 'Bapatla', severity: 'MODERATE',     pop_exposed: 62000  },
    ],
    vsat_terminals_deployed: 3,
    field_teams: 8,
  },
  telangana_flood: {
    name: 'Telangana Flash Floods — Multi-District',
    center: { lat: 17.9784, lng: 79.5941 },
    affected_districts: 5,
    survivor_count: 38,
    sar_scenario: 'telangana_flood',
    sar_damage_profile: [
      { district: 'Warangal', severity: 'CATASTROPHIC', pop_exposed: 310000 },
      { district: 'Khammam',  severity: 'SEVERE',       pop_exposed: 210000 },
      { district: 'Karimnagar', severity: 'MODERATE',   pop_exposed: 180000 },
    ],
    vsat_terminals_deployed: 2,
    field_teams: 6,
  },
};
