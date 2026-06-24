# Project Air-Touch AR: Development Journey Part 1 (The 3D CAD Era)
**Developer:** TejUzumaki  
**Environment:** Termux (Android ARM64), Python 3.13, Chrome Mobile, MediaPipe WASM, Three.js (ES Modules)  
**Date:** June 24, 2026  

---

## 1. Project Evolution Context
Part 1 of the journal documents the massive architectural leap from a 2D AR overlay into a fully-fledged, browser-based 3D Holographic CAD engine. This phase was defined by severe browser threading limitations, complex mathematical spatial transformations, and the introduction of gesture-based state machines.

*Note: The AR anchoring feature (locking objects to physical space) remains mathematically incomplete at the end of this journal phase due to a deep Three.js coordinate space bug.*

---

## 2. The Dual-Window Architecture (TejUzumaki's Breakthrough)
**The Problem:** MediaPipe's WASM engine was silently crashing or refusing to process frames when initialized inside the same JavaScript execution context as Three.js's WebGL renderer. The browser's main thread was choking on the conflicting memory management of both graphics pipelines.

**The Solution (Conceptualized by TejUzumaki):** 
During a critical debugging session, Tej proposed a revolutionary architecture: *"What if we create a false Chrome window in which Three.js is going to run, and in the window where the camera feed is tracking, we fire the MediaPipe? We run Three.js on another port in another window in the background which will act as our 3D fuel."*

**The Legacy:** While we did not immediately implement the full dual-port architecture (due to the ~20ms WebSocket latency it would introduce for hand tracking), this exact philosophy guided all subsequent solutions. We achieved the *logical* separation of the engines by delaying MediaPipe initialization until Three.js had completely stabilized, essentially creating a time-based isolation layer rather than a port-based one.

---

## 3. The WebXR Mirage & The Hybrid Reality
**The Initial Goal:** Integrate the WebXR Device API with `immersive-ar` to achieve true Iron Man-style holograms anchored to real-world geometry using ARCore's SLAM.

**The Wall:** We implemented `navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hand-tracking'] })`. This instantly crashed Chrome on mobile. The WebXR Hand Input API is strictly reserved by the browser for dedicated VR/AR headsets (like Meta Quest). Phones are treated as 2D video pass-through devices by the WebXR standard.

**The Pivot:** We developed the "Hybrid AR" architecture:
1.  **Video Layer:** Standard HTML `<video>` with CSS `object-fit: cover` (Hardware accelerated, 0 RAM).
2.  **Tracking Layer:** MediaPipe WASM (Processes 2.5D hand coordinates).
3.  **Rendering Layer:** Three.js `WebGLRenderer` with `alpha: true` (Draws 3D objects over the video).

---

## 4. The Module Scope War & The Dynamic Import Loophole
**The Conflict:** Three.js requires modern JavaScript modules (`<script type="module">`). MediaPipe's `hands.js` is a legacy script that expects to mutate global window variables and spin up WebWorkers in a synchronous-friendly environment. Putting them in the same `<script type="module">` tag caused MediaPipe's WASM compiler to silently abort.

**Failed Attempts:**
1.  `window.onResults = function`: Failed because the module scope still choked the underlying WebWorker setup.
2.  Event Dispatching (`window.dispatchEvent('three-ready')`): Failed due to deferred execution race conditions.

**The Loophole (The Final Solution):**
We removed the `<script type="module">` tag entirely. We kept MediaPipe in a standard `<script>` tag, and used a dynamic `await import('./js/three-engine.js')` *inside* the standard script. This allowed Three.js to load as an ES Module, but execute within MediaPipe's safe, global scope.

---

## 5. The Watchdog Heartbeat System
**The Problem:** MediaPipe would successfully process Frame 1, update the UI to "HANDS ONLINE", and then silently freeze on Frame 2. Standard `try/catch` blocks couldn't catch a frozen thread.

**The Solution:** We implemented a Watchdog Heartbeat.
*   Every time `onResults` fires, it updates `lastHeartbeat = Date.now()`.
*   A secondary loop checks if `Date.now() - lastHeartbeat > 2500ms`.
*   If the heartbeat is lost, it assumes the WASM engine is dead. It forcefully nukes the `handsInstance`, waits 2 seconds for the GPU memory to clear, and dynamically re-compiles a brand new MediaPipe instance without requiring a page refresh.

---

## 6. The 3D CAD Engine Integration
We transitioned from drawing flat 2D lines to generating real 3D geometry.

### The Math Engine:
*   **Perfect Squares:** Calculated by finding the 2D bounding box of a drawn path. If the path is closed and fills a decent area, it generates 5 points (4 corners + closure) at exact 90-degree angles.
*   **Perfect Circles:** Detected if a closed path has roughly equal width/height. Generates 36 points using `Math.cos` and `Math.sin` around the center point.
*   **3D Extrusion:** When a user grabs a flat 2D square and pulls upwards, the engine calculates the exact width/height and generates a `THREE.BoxGeometry(width, height, depth)`. For circles, it generates a `THREE.CylinderGeometry`.

### Interaction Mechanics:
*   **Bounding Box Grabbing:** Instead of trying to raycast against 1-pixel thick lines (which is notoriously buggy on mobile), we project the 3D bounding box of shapes back to 2D screen space. If the user's finger is *anywhere inside* that 2D box, they can grab it.
*   **Fist Detection Algorithm:** Calculates the average distance from the 4 fingertips to their base knuckles (MCP joints). Works seamlessly whether the palm or back of the hand is facing the camera.

---

## 7. The Gesture State Machine (Zero-UI)
We removed manual UI buttons for mode switching and implemented physical hand gestures:
1.  **Point (Index only):** Auto-switches to Cursor Mode.
2.  **Peace Sign (Index + Middle):** Auto-switches to Draw Mode.
3.  **Fist (All fingers curled):** Auto-switches to Grab/Move Mode. Open hand drops the object.

---

## 8. The AR Anchoring Puzzle (The Current Blocker)
**The Goal:** Make drawn shapes freeze in physical space when the user moves the phone, exactly like the `Augmented-Reality-` repo does using native `frame.getHitTestResults()`.

**The Challenge:** Since WebXR is disabled, we attempted to simulate spatial locking using the phone's physical Gyroscope (`deviceorientation` API). 

**The Mathematical Flaw (Why it's currently broken):**
When AR mode is enabled, drawn shapes are placed inside an `arWorldGroup` (a Three.js `Group` object) that rotates based on gyroscope data. 

The bug occurs during the drawing phase:
1.  The cursor calculates its position in **World Space** via `screenTo3D()`.
2.  This World Space coordinate was pushed directly into the `currentPoints` array.
3.  The `currentPoints` array was used to generate a line that was added as a *child* of the rotated `arWorldGroup`.
4. **Result:** The vertices were mathematically misaligned. When the phone moved, the group rotated, but the vertices were in the wrong coordinate space, causing them to stick to the screen or wobble wildly.

**The Required Fix (Documented for next phase):**
Before adding a point to a line while in AR mode, the code *must* translate the World Space coordinate into the AR Group's Local Space using `arWorldGroup.worldToLocal(pos3D)`. While this math was written and pushed in the final updates, it requires further rigorous testing against Android Chrome's specific WebRTC video scaling quirks.

---

## 9. Advanced Error Handling
*   **BrokenPipeError:** Python's `SimpleHTTPRequestHandler` was updated with a custom `handle_error` override to silently ignore `EPIPE` and `BrokenPipe` errors caused by Chrome aggressively closing idle HTTP streams.
*   **Camera Hardware Locks:** Implemented `robustGetUserMedia()`. If Android throws `Could not start video source` (due to hardware sleep), the function forcefully kills all existing tracks, waits 1.5 seconds for the hardware mutex to release, and retries automatically.

---

*End of Journey Part 1. The project successfully established a modular 3D CAD engine with gesture control, but awaits the final resolution of the Local-to-World coordinate transformation to achieve perfect gyroscope-based AR anchoring.*
