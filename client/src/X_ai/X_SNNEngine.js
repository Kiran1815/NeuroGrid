// X_SNNEngine.js — Spiking Neural Network Simulator
// Processes SAR pixel delta arrays as spike trains.
// Edge AI — runs fully client-side, zero cloud dependency.
// Does NOT modify any existing modules.

/**
 * Minimal LIF (Leaky Integrate-and-Fire) neuron model.
 * Processes a stream of input values and fires spikes when membrane potential exceeds threshold.
 */
class LIFNeuron {
  constructor({ threshold = 0.7, leak = 0.85, refractory = 2 } = {}) {
    this.threshold = threshold;
    this.leak = leak;
    this.refractory = refractory;
    this.potential = 0;
    this.refractoryCount = 0;
    this.spikes = [];
  }

  process(input) {
    if (this.refractoryCount > 0) {
      this.refractoryCount--;
      this.potential = 0;
      return false;
    }
    // Leak + integrate
    this.potential = this.potential * this.leak + input;
    if (this.potential >= this.threshold) {
      this.spikes.push(1);
      this.potential = 0;
      this.refractoryCount = this.refractory;
      return true; // fired
    }
    this.spikes.push(0);
    return false;
  }

  get firingRate() {
    if (this.spikes.length === 0) return 0;
    return this.spikes.filter(Boolean).length / this.spikes.length;
  }

  reset() {
    this.potential = 0;
    this.refractoryCount = 0;
    this.spikes = [];
  }
}

/**
 * SNN Layer — array of LIF neurons, one per spatial region.
 * @param {number} size - number of neurons
 */
class SNNLayer {
  constructor(size, neuronConfig = {}) {
    this.neurons = Array.from({ length: size }, () => new LIFNeuron(neuronConfig));
  }

  process(inputs) {
    return inputs.map((v, i) => this.neurons[i]?.process(v) ?? false);
  }

  get firingRates() {
    return this.neurons.map(n => n.firingRate);
  }

  reset() { this.neurons.forEach(n => n.reset()); }
}

/**
 * X_SNNEngine — full pipeline engine
 * Takes a pixel grid (simulated), runs SNN, returns spike density map.
 */
export class X_SNNEngine {
  constructor({ gridSize = 64, threshold = 0.65 } = {}) {
    this.gridSize = gridSize;
    this.threshold = threshold;
    this.inputLayer  = new SNNLayer(gridSize, { threshold: 0.6, leak: 0.9 });
    this.hiddenLayer = new SNNLayer(gridSize, { threshold: 0.7, leak: 0.85 });
    this.outputLayer = new SNNLayer(gridSize, { threshold: 0.8, leak: 0.80 });
  }

  /**
   * Process a simulated SAR delta grid (array of [0,1] floats).
   * Runs N time steps to accumulate spike rates.
   * @param {number[]} deltaGrid - array of length gridSize, values in [0,1]
   * @param {number}   timeSteps - number of simulation steps
   * @returns {{ spikeDensity: number[], bandwidth_reduction: number }}
   */
  process(deltaGrid, timeSteps = 20) {
    this.inputLayer.reset();
    this.hiddenLayer.reset();
    this.outputLayer.reset();

    for (let t = 0; t < timeSteps; t++) {
      // Add small temporal noise for biological realism
      const noisyInput = deltaGrid.map(v => Math.max(0, v + (Math.random() * 0.05 - 0.025)));
      const L1 = this.inputLayer.process(noisyInput);
      const L2 = this.hiddenLayer.process(L1.map(s => s ? 1 : 0));
      this.outputLayer.process(L2.map(s => s ? 1 : 0));
    }

    const spikeDensity = this.outputLayer.firingRates;
    // Simulated bandwidth reduction: only spike indices transmitted
    const activePixels = spikeDensity.filter(r => r > this.threshold).length;
    const rawSizeKB = 500 * 1024;   // simulated 500MB input
    const outputSizeKB = Math.max(48, activePixels * 0.8);  // ~50KB output
    const bandwidthReduction = Math.round(rawSizeKB / outputSizeKB);

    return { spikeDensity, bandwidthReduction, activePixels };
  }

  /**
   * Quick classify — single value → spike severity
   */
  static classify(normalizedValue) {
    if (normalizedValue < 0.15) return 'MINOR';
    if (normalizedValue < 0.40) return 'MODERATE';
    if (normalizedValue < 0.65) return 'SEVERE';
    return 'CATASTROPHIC';
  }
}

export default X_SNNEngine;
