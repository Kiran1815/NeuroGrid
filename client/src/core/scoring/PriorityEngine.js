// core/scoring/PriorityEngine.js
// One job. Score survivors. No side effects. Pure function.

const EMERGENCY_WEIGHTS = {
  medical:  50,
  trapped:  60,
  fire:     55,
  flood:    45,
  other:    20,
};

const PRIORITY_LEVELS = [
  { label: 'CRITICAL', min: 121, color: '#C0392B' },
  { label: 'MEDIUM',   min: 51,  color: '#D35400' },
  { label: 'LOW',      min: 0,   color: '#7D6608' },
];

export function computePriorityScore(survivor, now = Date.now()) {
  let score = 0;
  const age         = (now - survivor.timestamp) / 1000;   // seconds since SOS
  const lastSeenAge = (now - survivor.last_seen) / 1000;   // seconds since last contact

  // Emergency type weight
  score += EMERGENCY_WEIGHTS[survivor.emergency_type] ?? 20;

  // Time since SOS sent
  if (age > 3600) score += 20;   // > 1 hour

  // Cluster / nearby SOS density
  if ((survivor.nearby_sos_count ?? 0) >= 5) score += 30;

  // Movement status — stationary > 30 min is escalated
  if (!survivor.is_moving && age > 1800) score += 40;

  // Battery risk
  const bat = survivor.battery_level ?? 100;
  if (bat < 10)      score += 50;
  else if (bat < 20) score += 30;
  else if (bat < 50) score += 10;

  // Last seen silence risk
  if (lastSeenAge > 1200) score += 40;   // > 20 min silence

  // Hop penalty — harder to reach = more urgent routing
  score += Math.min((survivor.hop_count ?? 0) * 5, 20);

  const level = PRIORITY_LEVELS.find(l => score >= l.min) ?? PRIORITY_LEVELS.at(-1);

  return {
    score,
    level: level.label,
    color: level.color,
    estimated_survival_minutes: estimateSurvivalWindow(survivor),
  };
}

function estimateSurvivalWindow(survivor) {
  const drain_rate = survivor.battery_drain_rate ?? 8;   // % per hour
  const hours_left = (survivor.battery_level ?? 50) / drain_rate;
  return Math.round(hours_left * 60);   // minutes
}

export function getPriorityColor(level) {
  return PRIORITY_LEVELS.find(l => l.label === level)?.color ?? '#7D6608';
}
