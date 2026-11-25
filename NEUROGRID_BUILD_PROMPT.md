# NeuroGrid — Master Engineering & Design Build Prompt
### For: Antigravity Development Team
### Classification: HACKATHON-CRITICAL / PRODUCTION-GRADE
### Aesthetic Direction: Earth-Toned Rescue Intelligence Interface

---

## 🧠 ARCHITECT'S MINDSET

> Think like Elon Musk: First principles. Strip everything non-essential. What is the absolute minimum system that saves the maximum lives?
> Write like Linus Torvalds: Clean, unambiguous, maintainable code. No cleverness for its own sake. Every function does ONE thing.
> Design like a field medic's toolkit: Visible in sunlight, readable with shaking hands, operable with one thumb, zero learning curve.

---

## 🎨 DESIGN SYSTEM — EARTH TONES FOR RESCUE

### Color Palette (CSS Variables)

```css
:root {
  /* Earth Foundation */
  --earth-obsidian:    #1A1208;   /* deepest background */
  --earth-charcoal:   #2C2416;   /* card backgrounds */
  --earth-bark:       #3D3120;   /* elevated surfaces */
  --earth-soil:       #5C4A2A;   /* borders, dividers */
  --earth-sand:       #A08C6E;   /* secondary text */
  --earth-clay:       #C4A882;   /* primary text */
  --earth-parchment:  #E8D9C0;   /* headings, labels */

  /* Rescue Signal Colors */
  --signal-critical:  #C0392B;   /* red — CRITICAL priority */
  --signal-critical-glow: rgba(192,57,43,0.35);
  --signal-medium:    #D35400;   /* burnt orange — MEDIUM */
  --signal-low:       #7D6608;   /* olive — LOW */
  --signal-safe:      #4A7C59;   /* forest green — SAFE */
  --signal-mesh:      #2E6B8A;   /* deep teal — network */

  /* Accent & Data */
  --accent-amber:     #E67E22;   /* active alerts, CTAs */
  --accent-moss:      #6B8F5E;   /* movement / alive indicators */
  --data-pulse:       #F39C12;   /* real-time heartbeat */

  /* Typography */
  --font-display:     'Bebas Neue', 'Impact', sans-serif;
  --font-ui:          'DM Mono', 'Courier New', monospace;
  --font-body:        'Lora', 'Georgia', serif;
  --font-data:        'Share Tech Mono', monospace;
}
```

### Visual Language Rules
- **NO** white backgrounds. **NO** purple gradients. **NO** glass-morphism.
- Texture: Subtle noise grain overlay on all backgrounds (SVG filter or CSS noise)
- Shadows: Warm amber/brown shadow tones — never cold grey
- Icons: Filled, high-contrast, minimal stroke (Phosphor Icons or Lucide)
- All map UI: Dark basemap (Mapbox Dark or OpenStreetMap Toner)
- Blinking animations only for CRITICAL priority items — not decorative

---

## 🏗️ APPLICATION STRUCTURE

```
neurogrid/
├── client/                         # React PWA
│   ├── public/
│   │   ├── manifest.json           # PWA manifest
│   │   └── sw.js                   # Service Worker (offline-first)
│   ├── src/
│   │   ├── core/
│   │   │   ├── mesh/
│   │   │   │   ├── WebRTCManager.js        # P2P connection pool
│   │   │   │   ├── PeerDiscovery.js        # Signaling & discovery
│   │   │   │   └── MeshRouter.js           # Packet routing & hop management
│   │   │   ├── storage/
│   │   │   │   ├── IndexedDBAdapter.js     # Local persistent store
│   │   │   │   └── SyncQueue.js            # Offline queue, cloud sync
│   │   │   ├── scoring/
│   │   │   │   ├── PriorityEngine.js       # The brain — scoring algorithm
│   │   │   │   ├── MovementDetector.js     # GPS delta analysis
│   │   │   │   └── SurvivalPredictor.js    # Battery → time window calc
│   │   │   └── geo/
│   │   │       ├── ClusterDetector.js      # Danger zone auto-detection
│   │   │       └── RouteOptimizer.js       # Nearest-neighbor rescue routing
│   │   ├── modes/
│   │   │   ├── SurvivorMode/              # Survivor PWA screen
│   │   │   └── RescueMode/               # Rescue team interface
│   │   ├── dashboard/                    # Command center (desktop)
│   │   │   ├── panels/
│   │   │   │   ├── MapPanel/
│   │   │   │   ├── SurvivorPanel/
│   │   │   │   ├── NetworkHealthPanel/
│   │   │   │   └── LiveActivityPanel/
│   │   │   └── Dashboard.jsx
│   │   ├── simulation/
│   │   │   └── DisasterSimulator.js      # Hackathon demo mode
│   │   ├── hooks/
│   │   │   ├── useMesh.js
│   │   │   ├── usePriorityScore.js
│   │   │   ├── useGeolocation.js
│   │   │   └── useBattery.js
│   │   ├── components/
│   │   │   ├── SurvivorCard.jsx
│   │   │   ├── PriorityBadge.jsx
│   │   │   ├── BatteryIndicator.jsx
│   │   │   ├── LastSeenTimer.jsx
│   │   │   ├── DangerZoneOverlay.jsx
│   │   │   ├── HeatmapLayer.jsx
│   │   │   └── MeshNodeMarker.jsx
│   │   ├── App.jsx
│   │   └── index.jsx
│   └── package.json
├── server/                         # Node.js Gateway Sync Server
│   ├── routes/
│   │   ├── sync.js                 # POST /api/sync — receive mesh batch
│   │   ├── survivors.js            # GET /api/survivors
│   │   └── dashboard.js           # WebSocket dashboard feed
│   ├── models/
│   │   ├── Survivor.js             # Mongoose schema
│   │   └── MeshNode.js
│   ├── services/
│   │   ├── GatewayService.js       # Handles mesh → cloud upload
│   │   └── PriorityService.js      # Server-side priority recalculation
│   └── index.js
└── README.md
```

---

## 📱 SCREEN 1 — SURVIVOR MODE (Mobile PWA)

### Layout: Full-screen, thumb-first design

```
┌─────────────────────────────────┐
│  🌐 NeuroGrid          [MESH ●] │  ← Header: mesh status dot (green/red)
│  Device: NG-7A4F                │
├─────────────────────────────────┤
│                                 │
│         🔴  SOS                 │  ← Giant SOS button (140px diameter)
│    [PRESS & HOLD 2s]            │     Earth red, pulsing ring animation
│                                 │     Haptic feedback on press
├─────────────────────────────────┤
│  Emergency Type:                │
│  [Medical] [Trapped] [Fire]     │  ← Toggle chips, earth amber active state
│  [Flood]   [Other]              │
├─────────────────────────────────┤
│  📍 GPS: 17.3850°N 78.4867°E   │  ← Live coordinates (DM Mono font)
│  🔋 Battery: 67%    [▓▓▓▓▓▓░░] │
│  📡 Mesh Peers: 3 connected     │
├─────────────────────────────────┤
│  💬 SEND MESSAGE                │
│  [Stuck on 2nd floor     ] [→]  │  ← Short text input, mesh-propagated
├─────────────────────────────────┤
│  ⏱ SOS Sent: 4m 32s ago        │
│  Priority Score: 140 — CRITICAL │  ← Real-time self-score display
│  Est. Comm. Window: ~38 min     │
└─────────────────────────────────┘
```

### SOS Button Code (React Component):
```jsx
// components/SOSButton.jsx
// CLEAN. SINGLE PURPOSE. No props bloat.

import { useState, useRef } from 'react';
import { usePriorityScore } from '../hooks/usePriorityScore';

export function SOSButton({ onActivate }) {
  const [pressed, setPressed] = useState(false);
  const [active, setActive] = useState(false);
  const holdTimer = useRef(null);

  const handlePressStart = () => {
    setPressed(true);
    holdTimer.current = setTimeout(() => {
      setActive(true);
      onActivate();
      navigator.vibrate?.([200, 100, 200]); // Haptic feedback
    }, 2000); // 2 second hold
  };

  const handlePressEnd = () => {
    setPressed(false);
    clearTimeout(holdTimer.current);
  };

  return (
    <button
      className={`sos-btn ${pressed ? 'sos-btn--pressing' : ''} ${active ? 'sos-btn--active' : ''}`}
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerLeave={handlePressEnd}
      aria-label="Send SOS emergency signal"
    >
      <span className="sos-btn__label">SOS</span>
      {active && <span className="sos-btn__ring" aria-hidden />}
    </button>
  );
}
```

```css
/* SOS Button — Earth Red, Maximum Visibility */
.sos-btn {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #E74C3C, #922B21);
  border: 4px solid #E74C3C;
  box-shadow:
    0 0 0 8px rgba(192,57,43,0.2),
    0 8px 32px rgba(0,0,0,0.6),
    inset 0 2px 4px rgba(255,255,255,0.1);
  font-family: var(--font-display);
  font-size: 2.8rem;
  letter-spacing: 0.15em;
  color: #fff;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  touch-action: none;
}

.sos-btn--pressing {
  transform: scale(0.94);
  box-shadow:
    0 0 0 16px rgba(192,57,43,0.3),
    0 4px 16px rgba(0,0,0,0.8),
    inset 0 3px 8px rgba(0,0,0,0.3);
}

.sos-btn--active .sos-btn__ring {
  position: absolute;
  inset: -20px;
  border-radius: 50%;
  border: 3px solid #E74C3C;
  animation: sos-pulse 1.4s ease-out infinite;
}

@keyframes sos-pulse {
  0%   { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.6); opacity: 0; }
}
```

---

## 🖥️ SCREEN 2 — RESCUE COMMAND DASHBOARD (Desktop)

### Layout: 4-Panel Grid

```
┌──────────────────────────────────────────────────────────────────────────┐
│  NeuroGrid Command Center                    [SIMULATION MODE]  [SYNC ●] │
│  17 Active Survivors  ·  3 Danger Zones  ·  Mesh Coverage: 73%          │
├────────────────────────────┬───────────────────┬──────────────────────────┤
│                            │  SURVIVORS         │  LIVE ACTIVITY           │
│     [MAP PANEL]            │  ─────────────     │  ─────────────────────   │
│                            │  🔴 CRITICAL (4)   │  12:04:31 SOS RECV      │
│  [Dark Earth Basemap]      │  ▸ SUR-4A  19m  ↑ │  12:04:29 NODE JOINED    │
│                            │  ▸ SUR-7C  8m  ◉  │  12:04:22 MSG RELAYED    │
│  🔴 Danger Zone A          │  🟠 MEDIUM  (8)   │  12:04:15 GATEWAY SYNC   │
│     ████████               │  ▸ SUR-2B  44m  ↑ │  "11 survivors synced"   │
│  📍📍📍📍📍               │  ▸ SUR-9D  31m  ◉ │                          │
│                            │  🟡 LOW    (5)    │  ─────────────────────   │
│  📡 Mesh Grid Overlay      │                   │  NETWORK HEALTH           │
│                            │  [Sort: Priority] │  ─────────────────────   │
│                            │  [Sort: Distance] │  Nodes: 17               │
│                            │  [Sort: Battery]  │  Hops avg: 2.3           │
│                            │                   │  Coverage: 73%           │
│                            │                   │  ██████████░░░░ 73%      │
└────────────────────────────┴───────────────────┴──────────────────────────┘
```

### Dashboard CSS Grid:
```css
.dashboard {
  display: grid;
  grid-template-columns: 1fr 360px 300px;
  grid-template-rows: 56px 1fr;
  height: 100vh;
  background: var(--earth-obsidian);
  gap: 2px;
}

.dashboard__header {
  grid-column: 1 / -1;
  background: var(--earth-charcoal);
  border-bottom: 1px solid var(--earth-soil);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 24px;
  font-family: var(--font-ui);
}

.dashboard__map    { grid-column: 1; background: #0a0d0a; }
.dashboard__list   { grid-column: 2; background: var(--earth-charcoal); overflow-y: auto; }
.dashboard__side   { grid-column: 3; background: var(--earth-bark); display: flex; flex-direction: column; }
```

---

## ⚡ PRIORITY ENGINE (Core Logic)

```javascript
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
  const age = (now - survivor.timestamp) / 1000; // seconds
  const lastSeenAge = (now - survivor.last_seen) / 1000;

  // Emergency type weight
  score += EMERGENCY_WEIGHTS[survivor.emergency_type] ?? 20;

  // Time since SOS
  if (age > 3600) score += 20;       // >1 hour

  // Cluster proximity (passed in from ClusterDetector)
  if (survivor.nearby_sos_count >= 5) score += 30;

  // Movement status
  if (!survivor.is_moving && age > 1800) score += 40; // stationary >30min

  // Battery risk
  const bat = survivor.battery_level;
  if (bat < 10)      score += 50;
  else if (bat < 20) score += 30;
  else if (bat < 50) score += 10;

  // Last seen risk
  if (lastSeenAge > 1200) score += 40; // >20 min silence

  // Hop penalty — harder to reach = more urgent routing
  score += Math.min(survivor.hop_count * 5, 20);

  const level = PRIORITY_LEVELS.find(l => score >= l.min) ?? PRIORITY_LEVELS.at(-1);

  return {
    score,
    level: level.label,
    color: level.color,
    estimated_survival_minutes: estimateSurvivalWindow(survivor),
  };
}

function estimateSurvivalWindow(survivor) {
  // Simplified linear drain model — replace with actual drain rate tracking
  const drain_rate_per_hour = survivor.battery_drain_rate ?? 8; // % per hour
  const hours_remaining = survivor.battery_level / drain_rate_per_hour;
  return Math.round(hours_remaining * 60); // minutes
}
```

---

## 📡 MESH COMMUNICATION LAYER

```javascript
// core/mesh/WebRTCManager.js
// Manages N peer connections. Auto-reconnect. Gossip protocol.

export class WebRTCManager extends EventTarget {
  #peers = new Map();           // peerId → RTCPeerConnection
  #channels = new Map();        // peerId → RTCDataChannel
  #seenMessages = new Set();    // TTL-based dedup cache
  #localId = crypto.randomUUID().slice(0, 8).toUpperCase();

  constructor(signalingServer) {
    super();
    this.signalingServer = signalingServer;
  }

  broadcast(payload) {
    const envelope = {
      id:       crypto.randomUUID(),
      origin:   this.#localId,
      hop:      0,
      max_hop:  6,
      ts:       Date.now(),
      payload,
    };
    this.#relay(envelope);
  }

  #relay(envelope) {
    if (this.#seenMessages.has(envelope.id)) return; // already seen — drop
    if (envelope.hop >= envelope.max_hop) return;    // TTL expired — drop
    this.#seenMessages.add(envelope.id);

    // Relay to all connected peers (gossip flood)
    const next = { ...envelope, hop: envelope.hop + 1 };
    const data = JSON.stringify(next);
    for (const channel of this.#channels.values()) {
      if (channel.readyState === 'open') {
        channel.send(data);
      }
    }

    // Emit locally for own processing
    this.dispatchEvent(new CustomEvent('message', { detail: envelope }));
  }

  // ... peer connect/disconnect/ICE handling omitted for brevity
  // Full implementation: standard WebRTC signaling via WebSocket handshake
}
```

---

## 🗄️ OFFLINE STORAGE STRATEGY

```javascript
// core/storage/IndexedDBAdapter.js
// Store. Retrieve. Sync queue. Nothing else.

const DB_NAME    = 'neurogrid';
const DB_VERSION = 1;

const STORES = {
  survivors:   { keyPath: 'device_id' },
  messages:    { keyPath: 'id', indexes: [['ts', 'ts']] },
  sync_queue:  { keyPath: 'id', autoIncrement: true },
};

class IndexedDBAdapter {
  #db = null;

  async open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        for (const [name, opts] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: opts.keyPath, autoIncrement: opts.autoIncrement });
            opts.indexes?.forEach(([name, keyPath]) => store.createIndex(name, keyPath));
          }
        }
      };
      req.onsuccess = e => { this.#db = e.target.result; resolve(this); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  async upsert(storeName, record) {
    return this.#tx(storeName, 'readwrite', s => s.put(record));
  }

  async getAll(storeName) {
    return this.#tx(storeName, 'readonly', s => s.getAll());
  }

  async queueForSync(data) {
    return this.#tx('sync_queue', 'readwrite', s => s.add({ data, queued_at: Date.now() }));
  }

  #tx(storeName, mode, fn) {
    return new Promise((resolve, reject) => {
      const tx  = this.#db.transaction(storeName, mode);
      const req = fn(tx.objectStore(storeName));
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }
}

export const db = new IndexedDBAdapter();
```

---

## 🗺️ MAP PANEL SPEC (Leaflet/Mapbox)

```jsx
// dashboard/panels/MapPanel/MapPanel.jsx

import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Visual spec for map markers:
// ● CRITICAL survivor   → Red pulsing circle marker (CSS animation via DivIcon)
// ● MEDIUM survivor     → Orange solid marker
// ● MOVING survivor     → Blue chevron icon (directional)
// ● Danger zone         → Red semi-transparent circle polygon (200m radius)
// ● Rescue team         → White diamond marker
// ● Mesh node           → Teal dot, opacity = signal strength
// ● Heatmap layer       → Leaflet.heat plugin, earth red → amber gradient

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
// Free, no API key. Dark earth-compatible basemap.

export function MapPanel({ survivors, dangerZones, meshNodes, rescueTeams }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current, {
      center: [17.385, 78.4867],
      zoom: 14,
      zoomControl: false,  // Custom positioned
    });
    L.tileLayer(TILE_URL, { attribution: '© CartoDB' }).addTo(mapInstance.current);
    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
  }, []);

  // Survivors layer — update on data change
  useEffect(() => {
    if (!mapInstance.current) return;
    // Clear + re-render survivor markers
    // Each marker uses L.divIcon with priority-appropriate class
    survivors.forEach(s => renderSurvivorMarker(mapInstance.current, s));
  }, [survivors]);

  return <div ref={mapRef} className="map-panel" style={{ width: '100%', height: '100%' }} />;
}

function renderSurvivorMarker(map, survivor) {
  const { level } = survivor.priority;
  const isMoving = survivor.movement_status === 'moving';

  const icon = L.divIcon({
    className: '',
    html: `
      <div class="survivor-marker survivor-marker--${level.toLowerCase()} ${isMoving ? 'survivor-marker--moving' : ''}">
        ${level === 'CRITICAL' ? '<div class="survivor-marker__pulse"></div>' : ''}
        <div class="survivor-marker__dot"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  L.marker([survivor.latitude, survivor.longitude], { icon })
    .bindPopup(buildPopupHTML(survivor))
    .addTo(map);
}
```

---

## 🎭 SIMULATION MODE (Hackathon Demo)

```javascript
// simulation/DisasterSimulator.js
// Generate realistic disaster scenarios on demand.

const SCENARIO_PRESETS = {
  building_collapse: {
    name: 'Multi-Story Building Collapse',
    center: null, // uses user's current GPS
    radius_m: 150,
    survivor_count: 18,
    weight: { trapped: 0.6, medical: 0.3, other: 0.1 },
  },
  flood_zone: {
    name: 'Flash Flood — Residential',
    radius_m: 400,
    survivor_count: 24,
    weight: { flood: 0.7, medical: 0.2, trapped: 0.1 },
  },
  mass_casualty: {
    name: 'Mass Casualty Event',
    radius_m: 300,
    survivor_count: 35,
    weight: { medical: 0.5, trapped: 0.3, other: 0.2 },
  },
};

export function generateSimulatedSurvivors(scenario, centerLat, centerLng) {
  const preset = SCENARIO_PRESETS[scenario];
  const survivors = [];

  for (let i = 0; i < preset.survivor_count; i++) {
    const { lat, lng } = randomPointInRadius(centerLat, centerLng, preset.radius_m);
    const emergencyType = weightedRandom(preset.weight);
    const batteryLevel  = Math.floor(Math.random() * 100);
    const timeSinceSOS  = Math.floor(Math.random() * 7200) * 1000; // 0–2hr ago

    survivors.push({
      device_id:      `SIM-${String(i + 1).padStart(3, '0')}`,
      latitude:       lat,
      longitude:      lng,
      battery_level:  batteryLevel,
      emergency_type: emergencyType,
      timestamp:      Date.now() - timeSinceSOS,
      last_seen:      Date.now() - Math.floor(Math.random() * 600000),
      movement_status: Math.random() > 0.4 ? 'stationary' : 'moving',
      hop_count:      Math.floor(Math.random() * 5),
      simulated:      true,
    });
  }
  return survivors;
}
```

---

## 🔌 BACKEND API SURFACE (Minimal. Necessary only.)

```javascript
// server/routes/sync.js
// POST /api/sync — receives batch upload from gateway nodes

router.post('/api/sync', async (req, res) => {
  const { gateway_id, batch, timestamp } = req.body;

  if (!Array.isArray(batch) || batch.length === 0) {
    return res.status(400).json({ error: 'Empty batch' });
  }

  const results = await Promise.allSettled(
    batch.map(record => Survivor.findOneAndUpdate(
      { device_id: record.device_id },
      { $set: record },
      { upsert: true, new: true }
    ))
  );

  const synced = results.filter(r => r.status === 'fulfilled').length;

  // Push to dashboard via WebSocket
  io.emit('batch_synced', {
    gateway_id,
    synced_count: synced,
    timestamp: Date.now(),
  });

  res.json({ synced, total: batch.length });
});
```

---

## 📦 PACKAGE.JSON — KEY DEPENDENCIES

```json
{
  "client": {
    "dependencies": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "leaflet": "^1.9.4",
      "leaflet.heat": "^0.2.0",
      "simple-peer": "^9.11.1",
      "idb": "^7.1.1",
      "socket.io-client": "^4.6.1",
      "phosphor-react": "^1.4.1",
      "date-fns": "^2.30.0"
    },
    "devDependencies": {
      "vite": "^5.0.0",
      "vite-plugin-pwa": "^0.17.0"
    }
  },
  "server": {
    "dependencies": {
      "express": "^4.18.2",
      "mongoose": "^7.5.0",
      "socket.io": "^4.6.1",
      "cors": "^2.8.5",
      "dotenv": "^16.3.1"
    }
  }
}
```

---

## 🏁 PWA MANIFEST

```json
{
  "name": "NeuroGrid — Disaster Intelligence",
  "short_name": "NeuroGrid",
  "description": "Offline-first mesh communication for disaster survivors",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1A1208",
  "theme_color": "#E67E22",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## 🧪 DEMO SCRIPT FOR JUDGES (60 seconds)

1. **Open dashboard** → Click "Simulation Mode" → Select "Building Collapse"
2. **Watch**: 18 survivors appear on map. Danger zone auto-detected (red circle).
3. **Show**: Survivor Panel sorted by priority — CRITICAL cases at top.
4. **Open phone** → Show Survivor PWA → Press & Hold SOS → Watch it appear on dashboard in real-time.
5. **Show**: Priority score updating live. Battery indicator ticking.
6. **Disconnect phone from WiFi** → Dashboard shows "gateway lost" → re-enable → "synced 1 survivor from offline region"
7. **Switch to Rescue Mode** → Show nearest-first ordered rescue list with distances.

---

## ✅ IMPLEMENTATION PRIORITIES

### Phase 1 — Core (Hours 0–6)
- [ ] Survivor PWA with SOS + GPS + battery reading
- [ ] IndexedDB local storage working
- [ ] Priority scoring engine (pure function, fully testable)
- [ ] Basic dashboard map with simulated data

### Phase 2 — Mesh (Hours 6–12)
- [ ] WebRTC peer connections via local signaling server
- [ ] Gossip message relay (hop-limited flood)
- [ ] Gateway auto-detection and cloud sync
- [ ] Dashboard live feed via WebSocket

### Phase 3 — Intelligence (Hours 12–16)
- [ ] Movement detection from GPS delta
- [ ] Cluster/danger zone auto-detection
- [ ] Heatmap layer on map
- [ ] Rescue route optimizer

### Phase 4 — Polish (Hours 16–20)
- [ ] Simulation mode (all presets)
- [ ] Offline Rescue Mode with local survivor cache
- [ ] Survival communication window predictor
- [ ] Final design pass — typography, animations, earth color audit

---

## 💬 FINAL ENGINEERING PRINCIPLE

> "NeuroGrid has one success metric: the first responder who picks up this device at 3am in a collapsed building, with no internet, no signal, no manual — and still gets the right survivor's location in under 10 seconds."
>
> Every line of code is answerable to that sentence.

---

*NeuroGrid — Built for the worst day. Designed for the fastest rescue.*
*© Antigravity — Hackathon Build 2025*
