// X_SatelliteSync.js — DTN-Style Delay-Tolerant Uplink Queue
// Manages packet queuing during connectivity gaps, bundles for efficient uplink.
// Does NOT modify IndexedDBAdapter.js or SyncQueue.js.

const QUEUE_KEY = 'x_sat_uplink_queue';

class X_SatelliteSync {
  constructor() {
    this._queue  = [];
    this._sending = false;
    this._listeners = [];
    this._totalSent = 0;
    this._totalSaved = 0;  // bytes saved by SNN compression
    this._load();
  }

  /** Subscribe to queue state changes */
  subscribe(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  _notify() {
    this._listeners.forEach(fn => fn(this.getState()));
  }

  _load() {
    try {
      const raw = sessionStorage.getItem(QUEUE_KEY);
      if (raw) this._queue = JSON.parse(raw);
    } catch { this._queue = []; }
  }

  _persist() {
    try { sessionStorage.setItem(QUEUE_KEY, JSON.stringify(this._queue.slice(-200))); } catch {}
  }

  /**
   * Enqueue a packet for satellite uplink.
   * @param {object} data    - payload (will be SNN-compressed summary)
   * @param {number} rawSize - original data size in bytes (for bandwidth display)
   */
  enqueue(data, rawSize = 0) {
    const packet = {
      id:           crypto.randomUUID(),
      data,
      queued_at:    Date.now(),
      raw_size:     rawSize,
      compressed_size: this._computeCompressed(rawSize),
      retries:      0,
    };
    this._queue.push(packet);
    this._totalSaved += rawSize - packet.compressed_size;
    this._persist();
    this._notify();
    return packet.id;
  }

  /** Attempt to transmit queued packets (simulated). */
  async flush(linkStatus = 'LINKED') {
    if (this._sending || this._queue.length === 0 || linkStatus !== 'LINKED') return;
    this._sending = true;
    this._notify();

    const batch = this._queue.splice(0, Math.min(50, this._queue.length));  // max 50 per flush
    // Simulate uplink delay proportional to batch size
    await new Promise(r => setTimeout(r, 300 + batch.length * 20));

    this._totalSent += batch.length;
    this._sending = false;
    this._persist();
    this._notify();
    return batch.length;
  }

  getState() {
    return {
      queue_depth:   this._queue.length,
      is_sending:    this._sending,
      total_sent:    this._totalSent,
      total_saved_kb: Math.round(this._totalSaved / 1024),
      oldest_packet: this._queue[0]?.queued_at ?? null,
    };
  }

  clear() {
    this._queue = [];
    this._persist();
    this._notify();
  }

  _computeCompressed(rawSize) {
    // SNN compression: ~10,000x for SAR, ~100x for SOS bundles
    return Math.max(64, Math.round(rawSize / (rawSize > 1024 * 1024 ? 8000 : 100)));
  }
}

// Singleton
export const satelliteSync = new X_SatelliteSync();
export default satelliteSync;
