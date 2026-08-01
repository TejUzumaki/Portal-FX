# Portal FX: Spatial Media Sandbox

**Developer:** TejUzumaki (Tejas)  
**Live Demo:** [https://portalxtei.vercel.app/](https://portalxtei.vercel.app/)  
**Environment:** Termux (Android ARM64), Python, Chrome Mobile, MediaPipe WASM, Vercel  
**Status:** Active / Experimental

---

## 1. Origin & Evolution
This project began as **Air-Touch 3D-CAD**, an ambitious attempt to build a browser-based, holographic 3D modeling tool using MediaPipe and Three.js. While the 3D engine was a technical success—allowing users to draw shapes in mid-air, extrude them, and manipulate them with hand gestures—the vision evolved.

A friend watching a viral Instagram reel noted that the reel's creator was using Python and OpenCV to create dynamic, real-time visual effects inside a hand-tracking portal. The challenge was issued: *Why not build that here?*

Pivoting away from 3D CAD, the project was reborn as **Portal FX**. The Three.js engine was stripped out, and the focus shifted to high-performance, 2D Canvas pixel manipulation and spatial tracking. 

## 2. The Concept
Portal FX uses the MediaPipe Hands WASM library to track both hands simultaneously. By isolating the thumb and index fingertips, the engine generates a dynamic 4-point polygon. This polygon acts as a "portal" or a flexible pane of glass. 

The camera feed *inside* this portal is subjected to real-time visual transformations, while the world outside remains untouched. The physical size of the portal dictates the intensity of the active effect.

## 3. Controls & Gestures

### Changing Effects (1 Hand)
To change the active effect, drop the portal and show **one hand** to the camera making one of the following shapes. Hold the shape steady for **3 seconds**.
*   **Open Palm** (All 5 fingers extended)
*   **Fist** (All fingers curled)
*   **Peace Sign** (Index + Middle extended)
*   **Rock / Spider-Man** (Index + Pinky extended)

*Note: The system uses a strict state machine. Once a gesture successfully changes the effect, that exact same gesture cannot trigger another change until a different gesture is shown. This prevents accidental double-triggers.*

### The Portal (2 Hands)
*   **Form Portal:** Extend the thumb and index finger on **both** hands. The 4 points will connect to form the portal.
*   **Intensity:** Spread your hands further apart to increase the effect intensity (e.g., larger ASCII font, chunkier pixels, higher contrast).

### Freeze Mode
*   **Freeze:** While holding the portal with 2 hands, extend **both pinky fingers** and hold for **3 seconds**. The frame will lock in mid-air. You can drop your hands, and the portal stays floating.
*   **Unfreeze:** Either hold both pinkies again for 3 seconds, or tap the **Unfreeze Button** (top-right icon) on the screen.

## 4. The Effects Engine
- **Thermal Cam:** Purple/Orange heat signature mapping.
- **Invert:** True negative color inversion.
- **ASCII Art:** Pure black background, white text, dynamically mapping camera brightness to ASCII characters.
- **Cartoon Pixel:** Clean, blocky 8-bit pixels with color-banding for a retro cartoon aesthetic.
- **Manga Halftone:** High-contrast black and white overlaid with dynamic comic-book halftone dots.

*All effects are rendered through a strict offscreen canvas pipeline to guarantee 0% pixel bleeding outside the portal. The `object-fit: cover` math is perfectly mapped between the background video and the portal canvas to ensure the optical illusion is never broken by scaling mismatches.*

## 5. Technical Architecture
- **Tracking:** MediaPipe WASM (`maxNumHands: 2`). 
- **Rendering:** HTML5 `<canvas>` 2D API. 
- **Performance:** All pixel manipulation is handled via offscreen canvases to prevent UI thread blocking.
- **UI/UX:** A strict, minimal black/white/grey interface using Space Grotesk and JetBrains Mono fonts. No emojis, pure SVG icons, and a strict 5-second premium boot sequence with a fading telemetry HUD.

*Concept inspired by a friend's vision. Built from scratch in Termux.*
