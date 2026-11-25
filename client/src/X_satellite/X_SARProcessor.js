// X_SARProcessor.js — Edge SNN-Based SAR Change Detection Pipeline
// Orchestrates: delta computation → SNN spike threshold → spatial clustering → severity classification
// Reads existing SOS data read-only. Writes only to X-layer state.
// Does NOT modify any existing core modules.

import { X_SNNEngine } from '../X_ai/X_SNNEngine.js';
import { generateSARData } from '../X_simulation/X_SARDataGenerator.js';

const GRID_SIZE = 64;
const TIME_STEPS = 20;

/**
 * Run the full SAR processing pipeline for a given scenario.
 * This is intentionally async + step-emitting so the UI can show a progress animation.
 *
 * @param {object} opts
 * @param {string}   opts.scenarioId   - 'telangana_flood' | 'cyclone_andhra'
 * @param {Function} opts.onProgress   - cb(step: number, total: number, message: string)
 * @param {Function} opts.onComplete   - cb(result: SARResult)
 * @param {AbortSignal} [opts.signal]  - optional abort controller signal
 */
export async function runSARPipeline({ scenarioId = 'telangana_flood', onProgress, onComplete, signal } = {}) {
  const snn = new X_SNNEngine({ gridSize: GRID_SIZE, threshold: 0.65 });
  const TOTAL_STEPS = 6;

  const emit = (step, msg) => onProgress?.(step, TOTAL_STEPS, msg);

  // Step 1: Ingest raw SAR data (simulated)
  emit(1, 'Ingesting pre/post SAR raster data…');
  await sleep(600, signal);

  // Step 2: Delta computation
  emit(2, 'Computing pixel-by-pixel change magnitude…');
  await sleep(700, signal);
  // Simulate a 64-element delta grid (normalised 0-1)
  const rawDeltas = Array.from({ length: GRID_SIZE }, () => Math.random());

  // Step 3: SNN processing
  emit(3, 'Running edge SNN spike detection (LIF neurons)…');
  await sleep(900, signal);
  const { spikeDensity, bandwidthReduction } = snn.process(rawDeltas, TIME_STEPS);

  // Step 4: Spatial clustering
  emit(4, 'Clustering spike regions into damage zones…');
  await sleep(600, signal);

  // Step 5: Severity classification (real data from generator)
  emit(5, 'Classifying district-level severity bands…');
  await sleep(700, signal);
  const districts = generateSARData(scenarioId);

  // Enrich with SNN confidence
  const enriched = districts.map((d, i) => ({
    ...d,
    snn_spike_rate: spikeDensity[i % GRID_SIZE],
    bandwidth_reduction: bandwidthReduction,
  }));

  // Step 6: Output
  emit(6, `SAR processing complete — ${bandwidthReduction.toLocaleString()}x bandwidth reduction`);
  await sleep(400, signal);

  const result = {
    scenario_id: scenarioId,
    processed_at: Date.now(),
    processing_duration_ms: 3900,  // simulated
    bandwidth_reduction: bandwidthReduction,
    output_size_kb: Math.round(enriched.length * 0.8),
    raw_input_size_mb: 500,
    districts: enriched,
  };

  onComplete?.(result);
  return result;
}

/**
 * Get progressive timeline data (T+0h to T+6h) for map scrubber.
 * Each step reveals more districts as satellite passes overhead.
 * @param {Array} fullDistricts - output from runSARPipeline
 * @param {number} hourIndex - 0-6
 */
export function getSARTimelineSlice(fullDistricts, hourIndex) {
  const revealFraction = Math.min(1, hourIndex / 6);
  const revealCount = Math.max(1, Math.ceil(fullDistricts.length * revealFraction));
  // Return districts sorted by severity (worst first) sliced to revealCount
  return [...fullDistricts]
    .sort((a, b) => b.change_magnitude - a.change_magnitude)
    .slice(0, revealCount);
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')); });
  });
}
