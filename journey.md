# Project Air-Touch AR: Development Journey & Manual
**Developer:** TejUzumaki  
**Environment:** Termux (Android ARM64), Python 3.13, Chrome Mobile, MediaPipe WASM  
**Date:** June 2026  

---

## 1. Project Overview
What started as a simple request to build a "MediaPipe hand tracking mouse for Termux" evolved into a highly optimized, browser-based Holographic AR Drawing Engine (think Iron Man's Jarvis). This journal documents the technical hurdles, the architectural pivots forced by Android's strict security model, and the final feature set of the Air-Touch AR system.

---

## 2. The Architecture (How it actually works)
The final application is a split-stack system:
*   **The Frontend (Brain & Eyes):** Runs entirely in Chrome. It uses the camera, and loads the MediaPipe AI model via WebAssembly (WASM) locally from the `/assets` folder. It handles all video processing, coordinate smoothing, AR rendering, and gesture logic.
*   **The Backend (Hands):** A lightweight Python WebSockets server. It does *zero* AI processing. Its only job is to listen for coordinate strings (e.g., `click:0.5,0.5`) from the browser and translate them into Android OS commands via `termux-api input`.

---

## 3. The Evolution: How Limitations Shaped Features

### Limitation 1: The ARM64 Pip Failure
*   **The Initial Plan:** Install `mediapipe` via `pip` and run computer vision natively in Python.
*   **The Wall:** Google does not provide pre-compiled `mediapipe` wheels for Android's ARM64 architecture in Termux. Compiling from source is practically impossible on a phone.
*   **The Pivot:** We moved the AI out of Python entirely. By utilizing MediaPipe's JavaScript CDN (and later caching it locally in `/assets`), we offloaded all heavy processing to the phone's dedicated GPU via the Chrome browser.

### Limitation 2: The "Address Already in Use" Crashes
*   **The Wall:** When refreshing the Python server, Android's network stack held onto ports 5000/5001 (TCP `TIME_WAIT` state), causing `OSError: [Errno 98]`.
*   **The Fix:** Implemented `allow_reuse_address = True` in the Python HTTP and WebSocket servers, and shifted to ports 8080/8081 to bypass locked ports.

### Limitation 3: The Black Screen & Chrome Freezes
*   **The Wall:** Initially, we drew the camera feed to a `<canvas>` using JavaScript (`ctx.drawImage`). On mobile, this caused massive RAM usage, triggering Chrome to silently freeze or kill the tab to prevent a phone crash.
*   **The Fix:** We completely separated the Video and the Canvas. The `<video>` tag now uses CSS (`object-fit: cover`) to handle the camera feed using the phone's hardware video decoder (zero RAM impact). The `<canvas>` was made invisible and strictly reserved for drawing the UI cursor and AR lines.

### Limitation 4: Android Background Execution & System Overlays
*   **The Initial Request:** Create a system-wide floating cursor that works when Chrome is in the background.
*   **The Wall:** Android security strictly forbids browsers from drawing over other apps (`SYSTEM_ALERT_WINDOW`) and kills the camera feed the second Chrome loses focus. Furthermore, standard Termux API `input tap` sends `INJECT_TOUCH` events, which Android ignores if the target app isn't in the foreground.
*   **The Pivot:** Instead of fighting Android OS-level restrictions, we pivoted the project's purpose. We transformed it from a "system mouse" into a **self-contained AR Holographic Drawing Engine**.

---

## 4. Feature Matrix: Initial vs. Current

| Feature | Initial Request | Current Implementation |
| :--- | :--- | :--- |
| **AI Model** | Python MediaPipe | Browser WASM MediaPipe (Cached locally) |
| **Tracking Target** | Green objects / Basic hand | Strictly Index Finger (Landmark 8) |
| **Cursor Behavior** | Jumpy, instant teleport | Lerp-smoothed glide (0.45 interpolation) |
| **Camera View** | Squished/Fisheye | CSS Hardware accelerated, perfect aspect ratio |
| **Camera Switching**| N/A | On-demand Front/Back toggle |
| **Drawing Mode** | N/A | Freehand AR drawing with distance thresholding |
| **Line Smoothing**| N/A | Chaikin Curve Algorithm & Straight-line snapping |
| **Shape Logic** | N/A | Auto-Circle generation on pen lift |
| **Precision Tools**| N/A | Anchor points + Long-pinch straight lines |
| **Object Manipulation**| N/A | Proximity selection & Drag-and-Drop |

---

## 5. The User Manual

### Booting Up
1. Run the backend: `python /data/data/com.termux/files/home/airtouch/app.py`
2. Open Chrome on your phone. Go to `http://localhost:8080`.
3. Tap the screen once to trigger Immersive Fullscreen (hides the Android status bar).
4. Wait for the real-time loader to hit 100%. (It only loads from the internet once; subsequent loads read from local Termux storage).

### Mode 1: Cursor Control (Default)
*   **Point:** A cyan glowing ring appears on your index finger. It sends micro-swipe commands to Android to simulate cursor movement.
*   **Pinch:** A red glowing ring appears. Sends a `termux-api input tap` command to click wherever the cursor is.

### Mode 2: AR Drawing (Tap "Draw Mode: OFF" button)
*   **Freehand Draw:** Point your finger to leave a glowing magenta trail. The system uses a **Distance Threshold (8px)** so micro-jitters don't create jagged lines.
*   **Lift Pen:** Pinch your finger, or move your hand out of frame. The system processes the line:
    *   If it's mostly straight -> Snaps to a mathematically perfect straight line.
    *   If it's a curve -> Runs through Chaikin Smoothing to make it silky.
    *   If it's a closed loop -> Generates a flawless 36-point CAD circle.

### Mode 3: Precision Mechanics
*   **Drop Anchor:** Do a *quick pinch* (less than 0.4 seconds) in empty space. A glowing cyan dot locks to that 3D space.
*   **Draw Laser Line:** Move your finger away from the anchor. Do a *long pinch* (hold it). A perfect straight line previews from the anchor to your finger. Release to save it.

### Mode 4: Object Manipulation
*   **Select:** Point your finger near an existing drawn line. The line turns yellow, and the UI says "HOLD TO GRAB".
*   **Grab & Move:** Pinch your finger to grab the shape. Move your hand to drag the entire shape to a new location. Release the pinch to drop it.

---

## 6. Technical Deep Dive (Under The Hood)

### The Stabilizer Math (Lerp)
Raw MediaPipe coordinates jump wildly frame-to-frame. We use Linear Interpolation:
`smoothX += (rawX - smoothX) * 0.45`
This forces the UI cursor to smoothly "chase" the real finger position, eliminating visual jitter without adding noticeable input lag.

### The Pinch Hysteresis State Machine
Early versions suffered from "false pinches" (accidentally cutting lines). We implemented a hardware-style hysteresis loop:
*   It requires `0.05` distance to *trigger* a pinch.
*   It requires opening the fingers to `0.1` distance to *release* the pinch.
This creates a "dead zone" that prevents gesture flickering.

### Camera Mirroring Logic
Front cameras are natively mirrored in Android. We apply CSS `transform: scaleX(-1)` to the video. To ensure the AR drawings align perfectly with the real world, we apply the exact same CSS transform to the drawing Canvas, meaning we *don't* have to flip the math in JavaScript.

### Local Asset Caching
To achieve the "instant reload" functionality, we downloaded the 6 essential MediaPipe WASM/TFLite files (`.wasm`, `.tflite`, `.js`, `.data`, `.binarypb`, `_loader.js`) into `/data/data/com.termux/files/home/airtouch/assets/`. The JS script uses `locateFile: (file) => '/assets/${file}'` to bypass the CDN completely after the first download.

---

*End of Journal. Project successfully transitioned from a broken Python script to a highly optimized, browser-based AR vector engine.*
