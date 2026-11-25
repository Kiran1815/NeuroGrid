// X_DamageScorer.js — Zone Severity Scoring (SAR + SOS Fusion)
// Reads existing PriorityEngine output read-only via passed survivors prop.
// Does NOT modify PriorityEngine.js or any existing module.

/**
 * Compute composite damage score for a SAR district zone,
 * fusing satellite data with ground-truth SOS mesh signals.
 *
 * @param {object} district   - from X_SARProcessor output
 * @param {number} sosDensity - SOS signal count in this zone (from existing mesh)
 * @param {number} maxSOS     - normalization reference (global max SOS density)
 * @returns {number} composite score 0-100
 */
export function computeDamageScore(district, sosDensity = 0, maxSOS = 100) {
  const damageNorm       = district.change_magnitude;          // already 0-1
  const sosNorm          = maxSOS > 0 ? Math.min(1, sosDensity / maxSOS) : 0;
  const popNorm          = district.population_exposed / (district.total_population || 1);
  const accessNorm       = computeAccessibilityScore(district); // 0-1, higher = harder to reach

  const score = (
    (damageNorm  * 0.35) +
    (sosNorm     * 0.30) +
    (popNorm     * 0.25) +
    (accessNorm  * 0.10)
  ) * 100;

  return Math.round(Math.min(100, Math.max(0, score)) * 10) / 10;
}

/**
 * Accessibility score (inverted — harder to reach = higher priority weight).
 * Simple heuristic based on distance from major road/city centres.
 */
function computeAccessibilityScore(district) {
  // Higher lat variance = more remote terrain heuristic
  const latFactor = Math.abs(district.lat_center - 17.0) / 5;  // normalised to Telangana center
  const cost_score = 0.3 + latFactor * 0.4;
  return Math.min(1, cost_score);
}

/**
 * Score and rank all districts in a SAR result.
 * @param {Array} districts  - from X_SARProcessor
 * @param {Array} survivors  - existing scored survivors (read-only reference)
 * @returns {Array} sorted districts with composite_score
 */
export function rankDistricts(districts, survivors = []) {
  const maxSOS = Math.max(1, ...districts.map(d => d.sos_density || 0));

  return districts
    .map(d => {
      // Count survivors near this district (rough 1-degree radius check)
      const nearSurvivors = survivors.filter(s =>
        Math.abs(s.latitude  - d.lat_center) < 1.0 &&
        Math.abs(s.longitude - d.lng_center) < 1.0
      ).length;
      const sosDensity = d.sos_density + nearSurvivors;
      const composite_score = computeDamageScore(d, sosDensity, maxSOS);
      return { ...d, composite_score, sos_density_adjusted: sosDensity };
    })
    .sort((a, b) => b.composite_score - a.composite_score)
    .map((d, i) => ({ ...d, priority_rank: i + 1 }));
}
