# Portal FX: Spatial Media Sandbox

**Developer:** TejUzumaki  
**Environment:** Termux (Android ARM64), Python, Chrome Mobile, MediaPipe WASM  
**Status:** Active / Experimental

---

## 1. Origin & Evolution
This project began as **Air-Touch 3D-CAD**, an ambitious attempt to build a browser-based, holographic 3D modeling tool using MediaPipe and Three.js. While the 3D engine was a technical success—allowing users to draw shapes in mid-air, extrude them, and manipulate them with hand gestures—the vision evolved.

A friend watching a viral Instagram reel noted that the reel's creator was using Python and OpenCV to create dynamic, real-time visual effects inside a hand-tracking portal. The challenge was issued: *Why not build that here?*

Pivoting away from 3D CAD, the project was reborn as **Portal FX**. The Three.js engine was stripped out, and the focus shifted to high-performance, 2D Canvas pixel manipulation and spatial tracking. 

## 2. The Concept
Portal FX uses the MediaPipe Hands WASM library to track both hands simultaneously. By isolating the thumb and index fingertips, the engine generates a dynamic 4-point polygon. This polygon acts as a "portal" or a flexible pane of liquid glass. 

The camera feed *inside* this portal is subjected to real-time visual transformations, while the world outside remains untouched. The portal's angle dictates the active effect, allowing seamless, gesture-driven transitions.

## 3. The Effects Engine
- **Liquid Glass:** A frosted glass aesthetic with dynamic light refraction and a turbulent, lavender fluid mixing horizontally inside the pane.
- **ASCII Matrix:** The video feed is converted into pure ASCII art using a dynamic brightness-to-character mapping.
- **Cartoon Pixel:** The feed is heavily downscaled, pixelated, and posterized to create a retro, cartoonish 8-bit aesthetic.
- **Manga Halftone:** A high-contrast black and white effect overlaid with dynamic comic-book halftone dots.
- **Monochrome:** Pure, cinematic black and white.

## 4. Technical Architecture
- **Tracking:** MediaPipe WASM (`maxNumHands: 2`). 
- **Rendering:** HTML5 `<canvas>` 2D API. 
- **Performance:** All pixel manipulation is handled via offscreen canvases to prevent UI thread blocking. The `object-fit: cover` math is perfectly mapped between the background video and the portal canvas to ensure the illusion is never broken by scaling mismatches.
- **UI/UX:** A strict, minimal black/white/grey interface using Space Grotesk and Inter fonts. No emojis, pure SVG icons.

*Concept inspired by a friend's vision. Built from scratch in Termux.*
