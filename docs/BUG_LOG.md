# 🐛 NeuroGrid: Comprehensive Bug Log & Technical Resolutions
**The Zero-Gravity Debugging Records**

This document serves as a historical record of all major blockers, logic errors, and platform limitations encountered during the development of NeuroGrid, alongside their precise technical and mathematical resolutions.

---

## 1. UI & Framework Battles
**1.1. The Leaflet Map Rendering Void**
* **The Bug:** The Rescue HQ dashboard map frequently loaded as a massive gray void, or tiles would render in a jagged, disconnected puzzle.
* **The Investigation:** This occurs when the DOM container `<div>` holding the map doesn't have an explicitly defined static pixel height or physical dimension before Leaflet mounts. React's flex-box layout was rendering the container at 0 height initially.
* **The Resolution:** CSS enforced a strict `height: 100%` and `min-height: 400px` on the `.map-container`. Added a `ResizeObserver` listener to trigger `map.invalidateSize()` whenever the browser window shifted, forcing Leaflet to accurately recalculate tile geometry.

**1.2. Capacitor Mobile Safe-Areas (The iPhone Notch Trap)**
* **The Bug:** On modern devices, the ultra-dark UI was overlapping with the physical camera notch and the home indicator bar, making buttons unclickable.
* **The Resolution:** Bound the root CSS variables `padding-top/bottom` to `-webkit-env(safe-area-inset-top)` and `bottom`. This allowed iOS and Android to automatically push the React DOM out of the physical hardware obstructions dynamically.

## 2. Offline Persistence & Execution Conflicts
**2.1. IndexedDB Asynchronous Race Conditions**
* **The Bug:** `SyncQueue.js` failed to upload saved survivors when the network reconnected, dropping critical data.
* **The Investigation:** When looping through the cached offline queue, the Javascript Engine fired `fetch()` requests simultaneously in a massive asynchronous wave. If the connection was unstable, they failed concurrently, and the queue tried to mark them all as deleted simultaneously, causing a transaction lock in `IndexedDBAdapter.js`.
* **The Resolution:** Refactored `SyncQueue` to process entries sequentially using a strict `for...of` loop with `await db.open()` guarding every discrete record. The queue mathematically verifies the 200 OK server response *before* purging local storage.

**2.2. The Service Worker iOS Trap**
* **The Bug:** iOS (Safari) aggressively refused to prompt the user to install the application offline (PWA), unlike Android Chrome which showed the native "Add to Home Screen" ribbon natively.
* **The Resolution:** Safari does NOT support the `beforeinstallprompt` API mathematically. Built a custom UI detector inside `usePWAInstall.js` that catches `userAgent` signatures for iPhones. If it's iOS and running in the browser, it injects a custom visual modal teaching the user to tap "Share -> Add to Home Screen".

## 3. The Hardware Mesh Wars (The "Zero-Gravity" Era)
The greatest challenges encountered were forcing standard web technologies to command bare-metal Bluetooth Low Energy (BLE) hardware to build a true offline network. Capacitor handles Scanning easily, but strictly forbids Broadcasting natively. 

**3.1. Building the Custom Native Java Bridge (`NeuroMeshPlugin.java`)**
* **The Bug:** Javascript had no way to command the Android `BluetoothLeAdvertiser`.
* **The Resolution:** Injected a raw Java file directly into `client/android/app/src/main/java`. This exposed `@CapacitorMethod` endpoints allowing Javascript to natively pass down 16-byte payloads to the OS layer.

**3.2. The Capacitor Native Registration Race Condition**
* **The Bug:** `"NeuroMesh" plugin is not implemented on android`. The custom plugin was simply ignored.
* **The Investigation:** The React layer booted, the bridge connected, but the Java code wasn't bound. Why? `MainActivity.java` creates the Javascript-to-Android Bridge using `super.onCreate(savedInstanceState)`. We placed `registerPlugin(NeuroMeshPlugin.class)` *after* that line, meaning the OS built the bridge, locked the doors, and ignored our plugin.
* **The Resolution:** Swapped the architecture. `registerPlugin` was moved *before* the `super.onCreate` call, successfully passing the plugin into the bridge pipeline.

**3.3. The Android 12+ BLE Permission Void**
* **The Bug:** The app silently failed to broadcast BLE. No errors were thrown in JS.
* **The Investigation:** Android 12 introduced aggressive hardware security, decoupling GPS Location from Bluetooth. It now requires extremely explicit `BLUETOOTH_ADVERTISE` and `BLUETOOTH_CONNECT` permissions. The Capacitor plugin did not handle these new peripheral permissions natively.
* **The Resolution:** Hand-coded `@CapacitorPlugin(permissions = {...})` into the Java plugin. Wrote a `requestPermissions()` hook forcing the OS to prompt the user. JS blocks all WebRTC/Mesh logic (`NativeMeshManager.js`) until the user approves this specific OS dialog.

**3.4. The ManufacturerData Map vs. Object Trap**
* **The Bug:** Devices broadcasted properly, but receiving phones failed to extract the payload.
* **The Investigation:** The Native Android scanner returned `result.manufacturerData`. We originally accessed it using ES6 Map syntax: `.get(0xFFFF)`. It failed because Capacitor serializes Java HashMaps into flat Javascript Objects.
* **The Resolution:** Fixed the extraction vector to use string bracket notation: `result.manufacturerData['65535']`, successfully unpacking the binary array.

**3.5. "Error Code 2" Hardware Overloading (The Debouncer)**
* **The Bug:** The console was spammed with `BLE Advertising failed to start. Error code: 2`. 
* **The Investigation:** Android Error Code 2 means `ADVERTISE_FAILED_TOO_MANY_ADVERTISERS` (No available hardware device slots remaining). The WebRTC React interface was calling `sendSOS()` every 5 seconds to simulate a network loop. This was disastrous for a physical Bluetooth chip. Every 5 seconds, JS ordered Android to open a brand-new BLE broadcaster, eventually exhausting the hardware.
* **The Resolution:** BLE advertising is continuous at the OS layer. It only needs to be told to start *once*. We implemented a mathematical "Debouncer" in `NativeMeshManager.js`. It calculates a unique fingerprint of the active payload (`Lat_Lon_Priority`). If the React 5-second loop fires with the same payload footprint, JS mathematically ignores it and allows the physical Android chip to flawlessly run in the background. 

**3.6. The "0 Peers" UI Boot Desync**
* **The Bug:** The hardware perfectly worked. Devices bounced offline data to the gateway. Yet their screens still said "0 Peers".
* **The Investigation:** A pure React Lifecycle bug. The phone's Native Bluetooth scanner found the device *immediately* during boot—well before React finished mounting the DOM. The React `useMesh` Hook initialized state to `0` and only listened for future events. It ignored the fact that the underlying `MeshRouter` already had peers.
* **The Resolution:** Set `useMesh` state initialization to dynamically read the actual variable `useState(() => sharedRouter?.peerCount ?? 0)`. Added a forced render sweep on Component Mount.

## 4. The Windows OS "Android Studio" Demons
**4.1. Gradle Daemons Locking the Snapshot Caches**
* **The Bug:** The terminal violently threw: `Unable to delete directory ... packageDebugResources` and `Cannot snapshot ... ic_launcher.png: not a regular file`.
* **The Investigation:** Windows aggressively locks files that are open in background processes. Android Studio uses hidden Java daemons (`java.exe`) to execute Gradle builds in the background. If a build crashes or halts midway, `java.exe` retains a death-grip on the corrupted intermediary files (like unmerged JSONs or half-copied PNGs). Subsequent builds fail because Gradle cannot overwrite or read the corrupted file.
* **The Resolution:** Refused to rely on Android Studio's internal "Clean Project" tool. Dropped aggressive, targeted commands directly into the environment:
  ```powershell
  taskkill /F /IM studio64.exe /T
  taskkill /F /IM java.exe /T
  cmd /c "rmdir /s /q C:\Users\vijay\OneDrive\Desktop\NeuroGrid\client\android\app\build"
  ```
  We forcefully assassinated the java background processes and swept the entire `app/build` tree into the void. This forced Gradle into absolute amnesia, mathematically guaranteeing that all corrupted, locked snapshot ghosts were permanently destroyed.
