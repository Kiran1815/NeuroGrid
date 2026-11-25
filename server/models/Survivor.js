// server/models/Survivor.js — Mongoose schema (optional, for MongoDB mode)
const mongoose = require('mongoose');

const SurvivorSchema = new mongoose.Schema({
    device_id: { type: String, required: true, unique: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    battery_level: { type: Number, default: 100 },
    emergency_type: { type: String, enum: ['medical', 'trapped', 'fire', 'flood', 'other'], default: 'other' },
    timestamp: { type: Number, default: Date.now },
    last_seen: { type: Number, default: Date.now },
    movement_status: { type: String, enum: ['moving', 'stationary'], default: 'stationary' },
    is_moving: { type: Boolean, default: false },
    hop_count: { type: Number, default: 0 },
    nearby_sos_count: { type: Number, default: 0 },
    simulated: { type: Boolean, default: false },
    priority: {
        score: Number,
        level: { type: String, enum: ['CRITICAL', 'MEDIUM', 'LOW'] },
        color: String,
        estimated_survival_minutes: Number,
    },
}, { timestamps: true });

module.exports = mongoose.models.Survivor || mongoose.model('Survivor', SurvivorSchema);
