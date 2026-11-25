# 🌐 NeuroGrid: Software Requirements Specification (SRS)
**Version:** 1.0 (Production Release)
**Codename:** Disaster Intelligence Platform
**Tech Stack:** React (Vite), Node.js (Express), MongoDB, Socket.io, Capacitor (Android/iOS)

---

## 1. Product Vision & Scope
NeuroGrid is an advanced, offline-first disaster response and communication system software built for extreme environments where traditional cellular and internet infrastructure has collapsed. 

The software operates in two primary modes:
1. **Survivor Mode (Mobile-First):** An ultra-low power interface that allows victims to broadcast SOS signals and critical telemetrics (GPS, Battery, Emergency Type) using peer-to-peer hardware radio signals.
2. **Rescue HQ Dashboard (Desktop/Tablet):** A command center interface for emergency responders that maps incoming survivors, clusters high-density disaster zones, and mathematically prioritizes rescue operations based on survival probability.

## 2. System Architecture
NeuroGrid employs a distributed **Mesh-Gateway Architecture**. 

- **The Edge (Survivors):** Devices with no internet connect to each other forming a local mesh network.
- **The Mesh (Transport Layer):** Data hops device-to-device using physical Bluetooth Low Energy (BLE) on native Android/iOS, and simulated WebRTC routing for web-browsers.
- **The Gateway:** Any device in the mesh that regains internet access automatically identifies itself as a Gateway. It reads the local offline history and pushes all queued mesh data to the central cloud.
- **The Cloud (Rescue HQ):** A Node.js tracking server running MongoDB receives the gateway dumps and streams them in real-time to the Rescue Dashboard via secure WebSockets.

## 3. Core Technical Engines (The "Brains")

### 3.1. The Sub-Space Transport Router (`MeshRouter.js`)
The Mesh Router abstracts the underlying networking hardware. When a message is sent, the router decides *how* to broadcast it.
- **Native Context (Android App):** Invokes `NativeMeshManager.js` which interfaces via a custom Java Plugin to the Android Bluetooth Hardware. Compresses JSON payloads into a 16-byte binary array and broadcasts it via BLE Manufacturer Data (Peripheral Mode).
- **Web Context (Browser):** Invokes `WebRTCManager.js` using a lightweight signaling server to simulate the mesh for development and browsers without BLE API access.

### 3.2. Offline Persistence Engine (`IndexedDBAdapter.js`)
A robust local database (`idb` wrapper) that guarantees data survival when completely disconnected.
- Stores local device history.
- Caches all intercepted signals from peers in the mesh.
- Defers server interaction using the **SyncQueue** system which automatically flushes the cache when `navigator.onLine` fires.

### 3.3. Algorithmic Priority Engine (`PriorityEngine.js`)
A deterministic mathematical model that evaluates the urgency of an SOS signal.
- Evaluates Battery Decay, Time-since-signal, GPS drift, and Emergency Category.
- Outputs a normalized Priority Score (0-100) and an exact "Estimated Survival Window" in minutes.
- Rescue teams sort operations strictly by this mathematical output.

### 3.4. Hardware Toolkits (Hooks & Modules)
- `useGeolocation`: Tracks high-accuracy GPS arrays and alerts if GPS goes stale.
- `useBattery`: Monitors discharge rates and dynamically alters UI and mesh polling intervals (Battery Saver Throttling).
- `SOSFlashlight.js`: Connects to Capacitor Torch API to physically flash the camera LED in Morse Code (.- - - ...) to guide ground-level visual rescues.

## 4. Sub-System Specifications

### 4.1. The Survivor Interface
- Ultra-dark contrast UI (Earth & Ember design system) optimized for AMOLED screens to physically drastically reduce OLED pixel power consumption.
- Single-Action SOS activation. Requires a 2-second press-and-hold to prevent accidental triggers in chaotic environments.
- Displays Mesh Peer availability (real-time hardware connection count).

### 4.2. The Rescue Headquarters
- Fully authenticated mapping dashboard (Leaflet / OpenStreetMap).
- **Radar Scope:** Real-time pulse UI rendering all known live survivor coordinates.
- **Cluster & Intelligence Map:** Dynamically groups high-density survivor areas. Calculates total victims per block using K-Means style spatial clustering.
- Displays calculated triage severity for operations dispatching.

## 5. Security & Build Specifications
- **App Deployment:** Deployed primarily as an Android Application (`.apk`) built using Gradle and Capacitor Native Bridge. 
- **PWA Fallback:** Capable of installing directly from Safari/Chrome as a Progressive Web App (PWA) with full Service Worker caching if App Stores are unavailable.
- **Payload Compression:** To bypass OS-level BLE Broadcast limits (often restricted to 31 bytes total), the NeuroGrid payload is lossy-compressed into a mathematically packed 16-byte `Uint8Array`.
