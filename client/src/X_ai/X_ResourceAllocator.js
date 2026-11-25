// X_ResourceAllocator.js — SNN-Inspired Priority Resource Allocation Engine
// AI engine: damage map + SOS density + population → ranked NDRF deployment recommendations
// Reads existing PriorityEngine survivors as read-only input.
// Does NOT modify any existing module.

import { rankDistricts } from './X_DamageScorer.js';

const DEFAULT_RESOURCES = {
  ndrf_units:    12,
  helicopters:   4,
  medical_teams: 8,
  rescue_boats:  6,
};

/**
 * Generate resource allocation recommendations.
 * @param {object} opts
 * @param {Array}  opts.damage_zones        - from X_SARProcessor
 * @param {Array}  opts.survivors           - from existing PriorityEngine (read-only)
 * @param {object} opts.available_resources - resource pool
 * @returns {object} { recommendations, summary, allocated_at }
 */
export function allocateResources({ damage_zones = [], survivors = [], available_resources = DEFAULT_RESOURCES } = {}) {
  if (damage_zones.length === 0) return { recommendations: [], summary: null, allocated_at: Date.now() };

  const ranked = rankDistricts(damage_zones, survivors);
  const resources = { ...DEFAULT_RESOURCES, ...available_resources };

  // Proportional allocation based on composite score
  const totalScore = ranked.reduce((sum, d) => sum + d.composite_score, 0);
  let remaining = { ...resources };
  const recommendations = [];

  for (const district of ranked) {
    const weight = totalScore > 0 ? district.composite_score / totalScore : 1 / ranked.length;

    const rec = {
      zone_id:              district.district_id,
      zone_name:            district.district_name,
      priority_rank:        district.priority_rank,
      composite_score:      district.composite_score,
      severity:             district.severity,
      lat_center:           district.lat_center,
      lng_center:           district.lng_center,
      estimated_lives_at_risk: district.population_exposed,
      deployment_window_hours: computeWindowHours(district.composite_score),
      confidence:           district.confidence_score,
      rationale:            buildRationale(district),
      recommended_deployment: allocateForZone(weight, remaining, district),
    };

    recommendations.push(rec);
    // Deduct from remaining pool
    remaining.ndrf_units    = Math.max(0, remaining.ndrf_units    - rec.recommended_deployment.ndrf_units);
    remaining.helicopters   = Math.max(0, remaining.helicopters   - rec.recommended_deployment.helicopters);
    remaining.medical_teams = Math.max(0, remaining.medical_teams - rec.recommended_deployment.medical_teams);
    remaining.rescue_boats  = Math.max(0, remaining.rescue_boats  - rec.recommended_deployment.rescue_boats);
  }

  const summary = {
    total_zones:        ranked.length,
    critical_zones:     ranked.filter(d => d.composite_score >= 70).length,
    resources_deployed: {
      ndrf_units:    resources.ndrf_units    - remaining.ndrf_units,
      helicopters:   resources.helicopters   - remaining.helicopters,
      medical_teams: resources.medical_teams - remaining.medical_teams,
      rescue_boats:  resources.rescue_boats  - remaining.rescue_boats,
    },
    resources_remaining: remaining,
    total_pop_at_risk:  ranked.reduce((s, d) => s + d.population_exposed, 0),
  };

  return { recommendations, summary, allocated_at: Date.now() };
}

function allocateForZone(weight, remaining, district) {
  // Minimum 1 team for any active zone; scale by weight + severity boost
  const severityBoost = { CATASTROPHIC: 1.4, SEVERE: 1.2, MODERATE: 1.0, MINOR: 0.6 }[district.severity] || 1;
  const w = Math.min(1, weight * severityBoost);

  return {
    ndrf_units:    clamp(Math.round(remaining.ndrf_units    * w), 0, remaining.ndrf_units),
    helicopters:   clamp(Math.round(remaining.helicopters   * w), 0, remaining.helicopters),
    medical_teams: clamp(Math.round(remaining.medical_teams * w), 0, remaining.medical_teams),
    rescue_boats:  district.severity !== 'MINOR'
      ? clamp(Math.round(remaining.rescue_boats * w), 0, remaining.rescue_boats)
      : 0,
  };
}

function computeWindowHours(score) {
  if (score >= 80) return 1;
  if (score >= 60) return 2;
  if (score >= 40) return 4;
  return 6;
}

function buildRationale(d) {
  const parts = [
    `SAR: ${Math.round(d.change_magnitude * 100)}% structural damage`,
    `${d.sos_density_adjusted ?? d.sos_density} active SOS signals`,
    `${d.population_exposed.toLocaleString()} population exposed`,
  ];
  if (d.confidence_score >= 0.9) parts.push('high-confidence detection');
  return parts.join(' · ');
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
