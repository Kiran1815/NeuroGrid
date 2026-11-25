// server/models/X_DamageZone.js — MongoDB schema for SAR damage zones
// NEW collection with X_ prefix — does not touch existing Survivor schema.

const mongoose = require('mongoose');

const X_DamageZoneSchema = new mongoose.Schema({
  district_id:        { type: String, required: true, index: true },
  district_name:      { type: String, required: true },

  // Spatial center
  lat_center:         { type: Number, required: true },
  lng_center:         { type: Number, required: true },

  // SAR analysis output
  severity:           { type: String, enum: ['MINOR', 'MODERATE', 'SEVERE', 'CATASTROPHIC'], required: true },
  severity_color:     { type: String },
  change_magnitude:   { type: Number, min: 0, max: 1 },
  affected_area_km2:  { type: Number },
  population_exposed: { type: Number },
  confidence_score:   { type: Number, min: 0, max: 1 },
  sar_processed_at:   { type: Date, default: Date.now },

  // Ground truth fusion (read-only reference from existing mesh)
  sos_density:        { type: Number, default: 0 },

  // AI allocation output
  composite_score:    { type: Number },
  recommended_resources: {
    ndrf_units:    { type: Number, default: 0 },
    helicopters:   { type: Number, default: 0 },
    medical_teams: { type: Number, default: 0 },
    rescue_boats:  { type: Number, default: 0 },
  },

  // Scenario context
  scenario_id:        { type: String },
}, {
  timestamps: true,
  collection: 'X_DamageZones',   // explicit X_ prefix — separate from all existing collections
});

// Compound index for efficient spatial + scenario queries
X_DamageZoneSchema.index({ scenario_id: 1, severity: 1 });
X_DamageZoneSchema.index({ composite_score: -1 });

// Guard: only register model once (hot reload safety)
module.exports = mongoose.models.X_DamageZone
  || mongoose.model('X_DamageZone', X_DamageZoneSchema);
