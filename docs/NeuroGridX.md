# ═══════════════════════════════════════════════════════════════════
# NEUROGRID-X UPGRADE PROMPT — COPY & PASTE THIS ENTIRE BLOCK
# Target: Google Antigravity / Any Production AI Code Assistant
# Classification: HACKATHON CRITICAL — SP-05 SATELLITE RESPONSE
# ═══════════════════════════════════════════════════════════════════

---

## 🔴 READ THIS FIRST BEFORE GENERATING A SINGLE LINE OF CODE

You are a **Principal Systems Architect** operating at the intersection of SpaceX Mission Engineering, ISRO Disaster Response Systems, and Edge AI. Your mandate is surgical precision: **extend an existing, fully-functional production codebase** to solve India's SP-05 national hackathon problem statement. 

**THE PRIME DIRECTIVE:**
> DO NOT rewrite, refactor, rename, or delete any existing NeuroGrid functionality.
> ONLY add new modules, new routes, new components, new layers.
> Every new file gets the prefix `X_` to visually mark it as the SP-05 upgrade layer.
> The old system must run identically. The new system runs on top of it.

Think of this like SpaceX bolting a new payload bay onto Falcon 9 — the rocket still works, the new payload is the upgrade.

---

## 📦 WHAT ALREADY EXISTS (DO NOT TOUCH — READ ONLY)

Our codebase **NeuroGrid v1.0** is a fully deployed, battle-tested system with:

### Existing Architecture:
```
Tech Stack: React (Vite) + Node.js (Express) + MongoDB + Socket.io + Capacitor
```

### Existing Modules (FROZEN — no modifications):
- `MeshRouter.js` — Sub-space transport router (BLE Native + WebRTC Web fallback)
- `NativeMeshManager.js` — Android BLE Peripheral Mode, 16-byte binary payload compression
- `WebRTCManager.js` — Browser WebRTC mesh simulation
- `IndexedDBAdapter.js` — Offline persistence engine with SyncQueue
- `PriorityEngine.js` — Deterministic survivor scoring (0–100), Survival Window calculator
- `useGeolocation.js` — High-accuracy GPS hook with staleness detection
- `useBattery.js` — Discharge rate monitor + Battery Saver Throttling
- `SOSFlashlight.js` — Capacitor Torch API → Morse Code LED (.- - - ...)
- Survivor Mode UI (AMOLED-optimized, Earth & Ember design system)
- Rescue HQ Dashboard (Leaflet/OpenStreetMap, Radar Scope, K-Means cluster map)
- Cloud sync via Gateway Node pattern
- Full PWA + Android APK deployment pipeline

### Existing Data Model (FROZEN):
```javascript
SurvivorState = {
  device_id, latitude, longitude, battery_level,
  emergency_type, timestamp, last_seen, movement_status,
  hop_count, priority_score, estimated_survival_time, message_queue[]
}
```

**CONSTRAINT: THE ABOVE IS SACRED. BUILD AROUND IT, NOT OVER IT.**

---

## 🎯 THE PROBLEM WE MUST NOW SOLVE — SP-05

**Problem Statement (Official):**
> *"Develop an integrated satellite-based disaster response system combining VSAT emergency terminals (deployable in 15 minutes), real-time SAR change detection for damage mapping within 6 hours, AI-driven resource allocation based on population and damage overlays, and a mesh backbone linking field teams, district EOCs, and NDMA."*

**The 5 Measurable Outcomes We Must Demonstrate:**
1. ✅ VSAT terminal UI — deployable simulation in under 15 minutes, 48hr battery display, IPX6 rating
2. ✅ SAR Change Detection pipeline — district-level damage map rendered within simulated 6-hour window
3. ✅ AI Resource Allocation Engine — prioritized NDRF unit deployment recommendations
4. ✅ Mesh backbone — field teams ↔ district EOCs ↔ NDMA command center (3-tier hierarchy)
5. ✅ NDMA IDRN platform integration panel — cost display ₹<3 lakh, response lag tracker showing <6hr target

**Our Winning Insight (NeuroGrid-X Differentiator):**
> We do NOT send raw SAR data to the cloud. We process it at the edge using our Spiking Neural Network (SNN) accelerator model. Output = 50KB decision map vs 500MB raw SAR image. **10,000x bandwidth reduction. 10x power efficiency. Minutes not hours.**

---

## 🏗️ NEW ARCHITECTURE TO BUILD — "THE X-LAYER"

### High-Level System Diagram:
```
┌─────────────────────────────────────────────────────────────────┐
│                    NEUROGRID-X ARCHITECTURE                      │
├──────────────────┬──────────────────┬──────────────────────────┤
│   L0: SURVIVORS  │  L1: FIELD CMD   │  L2: NDMA COMMAND CTR    │
│   (Existing)     │  VSAT Terminal   │  (Upgraded Dashboard)    │
│   BLE Mesh       │  + LoRa Relay    │  + SAR Map Layer         │
│   16B Payload    │  + Edge SNN      │  + AI Allocation Engine  │
│   (UNCHANGED)    │  + 48hr Battery  │  + IDRN Integration      │
└──────────────────┴──────────────────┴──────────────────────────┘
         ↕ BLE/LoRa (mesh)    ↕ VSAT uplink     ↕ WebSocket
```

### New Files to Create (X-Layer only):

```
src/
├── X_satellite/
│   ├── X_VSATTerminal.jsx          # Terminal deployment UI + status
│   ├── X_SARProcessor.js           # SAR change detection engine (simulated)
│   ├── X_SARMapLayer.jsx           # Leaflet layer: damage map overlay
│   └── X_SatelliteSync.js          # DTN-style delay-tolerant uplink queue
│
├── X_ai/
│   ├── X_SNNEngine.js              # Spiking Neural Network simulator
│   ├── X_ResourceAllocator.js      # AI recommendation engine
│   ├── X_PopulationLayer.jsx       # Census data overlay on map
│   └── X_DamageScorer.js           # Zone severity scoring (SAR + SOS fusion)
│
├── X_command/
│   ├── X_NDMADashboard.jsx         # Master 3-tier command interface
│   ├── X_EOCPanel.jsx              # District EOC status panel
│   ├── X_FieldTeamTracker.jsx      # Field team GPS + comms status
│   ├── X_IDRNIntegration.jsx       # IDRN platform mock integration
│   └── X_ResponseLagTracker.jsx    # Real-time 48hr→6hr countdown
│
├── X_mesh/
│   ├── X_LoRaSimulator.js          # LoRa 10-15km range simulation layer
│   └── X_TierRouter.js             # 3-tier routing: Field→EOC→NDMA
│
└── X_simulation/
    ├── X_DisasterScenarioEngine.js # India-specific scenario generator
    └── X_SARDataGenerator.js       # Synthetic SAR before/after image data
```

---

## 💻 MODULE 1 — X_VSATTerminal.jsx

**Purpose:** Simulate a portable VSAT terminal that a 2-person team deploys in the field. Shows deployment timer, link status, battery, and weather rating.

**Visual Design:**
- Dark military-green + amber color scheme
- Monospace "mission computer" aesthetic (font: `Share Tech Mono`)
- Hardware-inspired UI — looks like a ruggedized field tablet
- IPX6 rating badge, 48hr battery bar, signal strength radial gauge

**Component Spec:**
```jsx
// X_VSATTerminal.jsx — VSAT Deployment Command Interface

State:
  deploymentPhase: 'IDLE' | 'DEPLOYING' | 'ACQUIRING' | 'LINKED' | 'DEGRADED'
  deploymentTimer: number (seconds, counts up from 0, target < 900s = 15min)
  batteryHours: number (48 max, drains in simulation)
  uplinkBandwidth: number (kbps, fluctuates realistically)
  satLock: boolean
  weatherAttenuation: 'CLEAR' | 'RAIN_FADE' | 'BLOCKED'
  queueDepth: number (packets waiting for uplink)

UI Layout:
┌─────────────────────────────────────────────────────┐
│  ◉ NEUROGRID-X   VSAT TERMINAL   [IPX6] [MIL-SPEC] │
│  Unit: NG-VSAT-07   Location: 17.38°N 78.48°E      │
├──────────────┬──────────────────────────────────────┤
│ DEPLOY TIMER │  SATELLITE LOCK                      │
│  04:32       │  ████████████░░░ ACQUIRING           │
│  ✓ TARGET:   │  Ku-Band / INSAT-3DR                 │
│  <15:00      │  El: 42.3°  Az: 195.7°              │
├──────────────┴──────────────────────────────────────┤
│  UPLINK: 384 kbps   DOWNLINK: 2.1 Mbps             │
│  QUEUE: 847 packets pending                         │
│  BATTERY: ██████████████████░░░  38.4 hrs remaining │
│  WEATHER: ⚠ RAIN FADE DETECTED — Switching Ku-band │
├─────────────────────────────────────────────────────┤
│  MESH PEERS BRIDGED: 23 survivors / 4 field teams   │
│  DATA COMPRESSED: 847 packets → 51 KB (SNN output)  │
│  [▶ START DEPLOYMENT]   [⬆ FORCE UPLINK]           │
└─────────────────────────────────────────────────────┘

Key Behaviors:
- START DEPLOYMENT → starts timer, runs 5-phase animation sequence
- Phase 1 (0-60s): "Unfolding antenna array..."
- Phase 2 (60-180s): "Acquiring satellite INSAT-3DR..."
- Phase 3 (180-480s): "Establishing secure link..."
- Phase 4 (480-720s): "Bridging mesh network..."
- Phase 5 (720-900s): "OPERATIONAL — All systems nominal"
- If timer < 900s → show green "✓ WITHIN 15-MIN TARGET"
- Battery drains realistically (1% per 29 minutes)
- Rain fade simulation triggers at random → auto-switches band
```

---

## 💻 MODULE 2 — X_SARProcessor.js + X_SARMapLayer.jsx

**Purpose:** Simulate SAR (Synthetic Aperture Radar) change detection. Show before/after disaster damage map overlaid on existing Leaflet map. Output district-level damage severity within 6-hour simulation window.

**SAR Processing Pipeline:**
```javascript
// X_SARProcessor.js — Edge SNN-Based SAR Change Detection

Pipeline:
  INPUT:  Pre-disaster SAR raster (simulated grid) + Post-disaster SAR raster
  STEP 1: Delta computation — pixel-by-pixel change magnitude
  STEP 2: SNN spike threshold — only significant changes generate "spikes"
  STEP 3: Spatial clustering — group spike regions into damage zones
  STEP 4: Severity classification per district:
          - GREEN:  0–15% change → Minor damage
          - YELLOW: 15–40% change → Moderate damage  
          - ORANGE: 40–65% change → Severe damage
          - RED:    65%+ change → Catastrophic / rescue priority
  OUTPUT: Array of { district_id, lat, lng, severity, affected_area_km2, 
                     population_exposed, confidence_score, processed_at }

Performance Target:
  Raw SAR input: ~500MB (simulated)
  SNN output payload: ~50KB (damage vectors only)
  Processing time: Show 6hr countdown in UI, with progress bar
  Bandwidth saved: display "10,247x reduction vs raw upload"

// X_SARDataGenerator.js — generates synthetic India disaster scenario
// Uses real India district boundary coordinates (approximate)
// Districts to include: Warangal, Karimnagar, Nizamabad, Adilabad, Khammam
// Each gets randomized damage severity on scenario trigger
```

**Map Layer Spec (adds to EXISTING Leaflet map — DO NOT replace it):**
```jsx
// X_SARMapLayer.jsx — overlays on top of existing MapPanel

// Renders as:
// - Semi-transparent colored polygons per district (damage severity color)
// - Each polygon has popup: district name, severity, population exposed, 
//   recommended NDRF units, processing timestamp
// - Pulsing animation on CATASTROPHIC zones
// - Timeline scrubber: "T+0h  T+1h  T+2h  T+3h  T+4h  T+5h  T+6h"
//   → Shows damage map evolving as satellite data arrives
// - Toggle button on map: [🛰 SAR LAYER ON/OFF]

// Integration: Import and mount inside existing MapPanel.jsx as:
// <X_SARMapLayer districts={sarData} visible={sarLayerEnabled} />
// ADD THIS LINE ONLY — do not modify any other MapPanel code
```

---

## 💻 MODULE 3 — X_ResourceAllocator.js

**Purpose:** AI engine that ingests damage map + SOS density + population data → outputs ranked deployment recommendations for NDRF units, helicopters, and medical teams.

**Algorithm Spec:**
```javascript
// X_ResourceAllocator.js — SNN-Inspired Priority Resource Allocation

// INPUTS:
input = {
  damage_zones: [],        // from X_SARProcessor
  sos_clusters: [],        // from existing PriorityEngine (DO NOT MODIFY)
  population_grid: [],     // offline-cached census data (district level)
  available_resources: {
    ndrf_units: 12,        // configurable
    helicopters: 4,
    medical_teams: 8,
    rescue_boats: 6,
  }
}

// SCORING FUNCTION per zone:
zone_score = (
  (damage_severity_normalized * 0.35) +   // SAR damage weight
  (sos_density_normalized * 0.30) +        // ground truth from mesh
  (population_exposure_normalized * 0.25) + // census overlay
  (accessibility_score_inverted * 0.10)    // harder to reach = higher priority
) * 100

// OUTPUT (sorted by score descending):
recommendations = [
  {
    zone_id: "DISTRICT_WARANGAL_NORTH",
    priority_rank: 1,
    composite_score: 87.4,
    recommended_deployment: {
      ndrf_units: 3,
      helicopters: 1,
      medical_teams: 2,
    },
    estimated_lives_at_risk: 4200,
    deployment_window_hours: 2,
    rationale: "SAR: 73% structural collapse + 847 active SOS signals + 68k population exposed",
    confidence: 0.91,
  }
]

// Update every 15 minutes (or on new SAR/SOS data)
// Display in X_NDMADashboard as actionable command cards
```

---

## 💻 MODULE 4 — X_NDMADashboard.jsx (THE COMMAND CENTER)

**Purpose:** The upgraded top-level dashboard that wraps the existing Rescue HQ Dashboard and adds the satellite/AI/NDMA command layer.

**CRITICAL RULE:** The existing `Dashboard.jsx` and all its panels remain UNTOUCHED.
The `X_NDMADashboard.jsx` is a NEW PARENT WRAPPER that renders:
1. The existing dashboard (as a child component)
2. New X-layer panels alongside it

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ NeuroGrid-X  │  NDMA COMMAND CENTER  │  SP-05 LIVE  │  T+02:14:33 ▼   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ [🌐 MESH]  [🛰 SATELLITE]  [🧠 AI ALLOCATION]  [📡 VSAT]  [🇮🇳 IDRN] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────┐  ┌───────────────────────────────┐ │
│  │                                 │  │  X_RESPONSE LAG TRACKER       │ │
│  │   EXISTING MAP PANEL            │  │  ───────────────────────────  │ │
│  │   (Leaflet — UNCHANGED)         │  │  Traditional: 48+ hours       │ │
│  │   +                             │  │  NeuroGrid-X: 02:14:33 ✓     │ │
│  │   X_SAR DAMAGE OVERLAY          │  │  Target: < 6:00:00            │ │
│  │   (new layer on same map)        │  │  ████████████████░░░░  62%   │ │
│  │   X_POPULATION DENSITY LAYER    │  │                               │ │
│  │   (census data overlay)          │  │  X_AI ALLOCATION ENGINE       │ │
│  │                                 │  │  ───────────────────────────  │ │
│  └─────────────────────────────────┘  │  #1 WARANGAL NORTH  Score:87 │ │
│                                        │  → 3 NDRF + 1 HELI + 2 MED  │ │
│  ┌──────────────────┐  ┌────────────┐  │  #2 KARIMNAGAR EAST Score:71 │ │
│  │ EXISTING SURVIVOR│  │ EXISTING   │  │  → 2 NDRF + 1 MED           │ │
│  │ PANEL            │  │ LIVE FEED  │  │  #3 NIZAMABAD     Score:54  │ │
│  │ (UNCHANGED)      │  │ (UNCHANGED)│  │  → 1 NDRF + 1 BOAT          │ │
│  └──────────────────┘  └────────────┘  └───────────────────────────────┘ │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  X_3-TIER MESH HIERARCHY                                          │  │
│  │  FIELD TEAMS (23) ──BLE──▶ DISTRICT EOCs (4) ──VSAT──▶ NDMA HQ  │  │
│  │  [Alive ●] [Alive ●] [Alive ●]   [Delhi EOC ●] [Hyd EOC ●]       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Tab Navigation (new tabs — do not modify existing dashboard tabs):**
```
Tab 1: 🌐 MESH (existing dashboard — render as-is)
Tab 2: 🛰 SATELLITE (SAR map + VSAT status + damage zones)
Tab 3: 🧠 AI ALLOCATION (resource recommendation cards)
Tab 4: 📡 FIELD COMMS (3-tier mesh hierarchy, field team tracker)
Tab 5: 🇮🇳 IDRN (India Disaster Resource Network integration panel)
```

---

## 💻 MODULE 5 — X_IDRNIntegration.jsx

**Purpose:** Mock the NDMA IDRN (India Disaster Resource Network) platform integration. Show certified integration status, terminal unit cost, and response lag reduction.

**UI Spec:**
```
┌─────────────────────────────────────────────────────┐
│  🇮🇳 IDRN PLATFORM INTEGRATION STATUS               │
│  National Disaster Resource Network                  │
├─────────────────────────────────────────────────────┤
│  Integration Status:  ✅ CERTIFIED (Mock Demo)       │
│  API Version:         IDRN-v2.3                     │
│  Data Format:         GeoJSON + NDMA Schema v4      │
│  Last Sync:           2 minutes ago                  │
├─────────────────────────────────────────────────────┤
│  TERMINAL UNIT ECONOMICS                            │
│  Hardware BOM:        ₹1,84,000                     │
│  Assembly + Testing:  ₹38,000                       │
│  Certification:       ₹22,000                       │
│  Total Unit Cost:     ₹2,44,000  ✅ Under ₹3 Lakh  │
├─────────────────────────────────────────────────────┤
│  DEPLOYMENT METRICS (Validated)                     │
│  Setup Time:          04:32 minutes ✅ (<15 min)    │
│  Battery Runtime:     48.0 hours ✅                 │
│  Environmental:       IPX6 ✅                       │
│  First Response Lag:  2h 14m ✅ (<6hr target)       │
├─────────────────────────────────────────────────────┤
│  EXERCISE VALIDATION                                │
│  NDMA Exercise:       CYCLONE-MOCK-2024 ✅ PASSED  │
│  Interoperability:    NDRF / IAF / Coast Guard      │
│  [📤 EXPORT REPORT]  [📋 CERTIFICATION DOCS]       │
└─────────────────────────────────────────────────────┘
```

---

## 💻 MODULE 6 — X_LoRaSimulator.js

**Purpose:** Extend the existing MeshRouter to simulate LoRa long-range (10–15km) communication — fills gaps where BLE mesh can't reach.

```javascript
// X_LoRaSimulator.js
// DO NOT modify MeshRouter.js. Register as a new transport in the router's
// existing transport registry using the same interface contract.

// Interface contract (MUST match existing transport interface):
export const LoRaTransport = {
  type: 'LORA',
  range_km: 12,
  bandwidth_bps: 5000,        // LoRa is slow — data compression is critical
  power_mw: 100,              // 100mW TX power
  frequency_mhz: 865.0625,   // India ISM band

  // Simulate latency based on distance
  send(payload, target_device) {
    const distance = haversineKm(this.myPosition, target_device.position);
    if (distance > this.range_km) throw new Error('OUT_OF_RANGE');
    const latency_ms = 200 + (distance * 40); // ~40ms per km
    return new Promise(resolve => setTimeout(() => resolve({ 
      delivered: true, 
      latency_ms, 
      rssi: -60 - (distance * 8) // signal degrades with distance
    }), latency_ms));
  }
}

// Register in existing mesh system:
// In App.jsx or MeshRouter (READ ONLY — add only this one call):
// MeshRouter.registerTransport(LoRaTransport);  ← add this line only
```

---

## 🎨 DESIGN SYSTEM — X-LAYER ADDITIONS

**Extend the existing Earth & Ember design system with:**

```css
/* X_satellite.css — additional CSS variables for X-layer only */
/* DO NOT modify existing CSS variables */

:root {
  /* Satellite / Space layer colors */
  --x-satellite-deep:    #0A0F1A;   /* deep space background */
  --x-satellite-steel:   #1C2B3A;   /* terminal dark blue */
  --x-satellite-teal:    #1A4A5C;   /* VSAT active state */
  --x-ndma-green:        #1B5E20;   /* India emergency green */
  --x-sar-catastrophic:  #B71C1C;   /* SAR max damage */
  --x-sar-severe:        #E65100;   /* SAR severe */
  --x-sar-moderate:      #F9A825;   /* SAR moderate */
  --x-sar-minor:         #558B2F;   /* SAR minor */
  --x-signal-lora:       #00BCD4;   /* LoRa range visualization */
  --x-snn-spike:         #76FF03;   /* SNN activation — bioluminescent green */

  /* X-layer fonts */
  --x-font-terminal:  'Share Tech Mono', 'Courier New', monospace;
  --x-font-military:  'Rajdhani', 'Arial Narrow', sans-serif;
}

/* SNN Processing animation */
@keyframes x-snn-spike {
  0%   { opacity: 0; transform: scale(0.8); }
  50%  { opacity: 1; color: var(--x-snn-spike); transform: scale(1.1); }
  100% { opacity: 0.4; transform: scale(1); }
}

/* SAR damage zone pulse */
@keyframes x-damage-pulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 0.95; }
}

/* VSAT acquisition scan line */
@keyframes x-radar-sweep {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

---

## 🔌 BACKEND X-LAYER — New Server Routes

```javascript
// ADD to server/routes/ — do NOT modify existing routes

// server/routes/X_satellite.js
router.post('/api/x/sar-ingest',    X_handleSARUpload);   // receive SAR processed output
router.get ('/api/x/damage-map',    X_getDamageMap);      // serve current damage map
router.get ('/api/x/ai-allocation', X_getAllocation);     // get current AI recommendations
router.post('/api/x/vsat-heartbeat', X_vsatHeartbeat);    // VSAT terminal check-in
router.get ('/api/x/idrn-status',   X_getIDRNStatus);    // IDRN integration status

// server/models/X_DamageZone.js — NEW MongoDB schema (does not touch Survivor schema)
X_DamageZone = {
  district_id, district_name,
  lat_center, lng_center,
  severity,              // 'MINOR' | 'MODERATE' | 'SEVERE' | 'CATASTROPHIC'
  affected_area_km2,
  population_exposed,
  confidence_score,
  sar_processed_at,
  sos_density,           // from existing mesh (read-only reference)
  recommended_resources: { ndrf_units, helicopters, medical_teams },
  composite_score,
  created_at, updated_at
}
```

---

## ⚡ SIMULATION MODE (Hackathon Demo — 90 Seconds)

**Add to existing `DisasterSimulator.js`** — new export only:
```javascript
// Append to existing DisasterSimulator.js — do NOT modify existing functions

export const X_INDIA_SCENARIOS = {
  cyclone_andhra: {
    name: 'Cyclone Michaung — Andhra Pradesh Landfall',
    center: { lat: 15.9129, lng: 79.7400 },
    affected_districts: 8,
    survivor_count: 45,      // passed to EXISTING generateSimulatedSurvivors()
    sar_damage_profile: [
      { district: 'Nellore', severity: 'CATASTROPHIC', pop_exposed: 180000 },
      { district: 'Ongole',  severity: 'SEVERE',       pop_exposed: 95000  },
      { district: 'Bapatla', severity: 'MODERATE',     pop_exposed: 62000  },
    ],
    vsat_terminals_deployed: 3,
    field_teams: 8,
  }
}

// Demo flow for judges (90 seconds):
// T+00: "Cyclone Michaung" scenario triggers
// T+10: VSAT terminal deployment animation starts
// T+25: 45 survivors appear on existing mesh map (reuses existing sim)
// T+35: SAR processing pipeline begins (progress bar)
// T+50: Damage map overlays on existing Leaflet map
// T+60: AI allocation engine generates deployment recommendations
// T+75: NDMA 3-tier hierarchy shows all units linked
// T+90: Response lag tracker shows "2h 14m — 78% faster than 48hr baseline"
```

---

## 🧪 INTEGRATION CHECKLIST (Run Before Demo)

```
□ All existing mesh functionality works on its own (test in original tab)
□ X_NDMADashboard wraps existing dashboard without breaking it
□ SAR layer toggle doesn't affect existing survivor markers
□ LoRa transport registers without modifying MeshRouter.js
□ All X_ routes use `/api/x/` prefix — no conflicts with existing routes
□ All X_ MongoDB models use `X_` collection prefix
□ Simulation: existing scenario still works, new India scenario added
□ On mobile: existing Survivor Mode unchanged, unaffected by X-layer
□ VSAT deployment timer reaches < 15min target in demo
□ Response lag tracker shows < 6hr target
□ Cost panel shows < ₹3 lakh
□ IDRN integration panel shows "CERTIFIED"
```

---

## 📐 COMPONENT HIERARCHY MAP (FOR AI CLARITY)

```
App.jsx  (UNCHANGED)
├── SurvivorMode/  (UNCHANGED — mobile)
└── X_NDMADashboard.jsx  ← NEW PARENT WRAPPER
    ├── [Tab: MESH] → existing Dashboard.jsx  (UNCHANGED)
    │   ├── MapPanel/ (UNCHANGED) + X_SARMapLayer (injected)
    │   ├── SurvivorPanel/ (UNCHANGED)
    │   ├── NetworkHealthPanel/ (UNCHANGED)
    │   └── LiveActivityPanel/ (UNCHANGED)
    │
    ├── [Tab: SATELLITE] → X_VSATTerminal.jsx + X_SARMapLayer full view
    ├── [Tab: AI] → X_ResourceAllocator display + X_DamageScorer
    ├── [Tab: FIELD] → X_FieldTeamTracker + X_EOCPanel + X_TierRouter viz
    └── [Tab: IDRN] → X_IDRNIntegration + X_ResponseLagTracker
```

---

## 🏁 THE WINNING STATEMENT (Include in demo pitch)

> *"Traditional disaster response sends 500MB of raw SAR data to cloud servers for processing — taking hours and requiring functional internet. NeuroGrid-X processes that same data at the edge, on a deployable terminal the size of a backpack, using Spiking Neural Networks that output 50 kilobytes of actionable decision maps. That's 10,000x less data. That's the difference between a rescue team waiting 48 hours for orders — and getting them in under 6."*

---

## ⚠️ FINAL AI INSTRUCTION (Read before generating)

1. **Start with the file structure** — create all X_ files first, empty shells
2. **Never import into existing files** — only add X_ imports to App.jsx's router
3. **One exception**: `MapPanel.jsx` — ADD ONE LINE only: `<X_SARMapLayer />` mount
4. **Color discipline**: X-layer uses `--x-*` variables, never overrides `--earth-*`
5. **Test the seam**: the existing system must be demo-able in isolation before adding the X-layer
6. **Output order**: X_SARProcessor.js → X_VSATTerminal.jsx → X_ResourceAllocator.js → X_NDMADashboard.jsx → X_IDRNIntegration.jsx → backend routes → simulation

**THIS IS A SCALPEL OPERATION. NOT OPEN-HEART SURGERY.**

Build what's needed. Delete what isn't. Every line of code justifies one life saved faster.

---
*NeuroGrid-X — SP-05 Satellite Disaster Intelligence*
*Antigravity Hackathon Build — Classified: MISSION CRITICAL*
*"From 48 hours to 6. Every minute is someone's last."*