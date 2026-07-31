# Portal FX: Spatial Media Sandbox

**Developer:** TejUzumaki (Tejas)  
**Live Demo:** [https://portalxtej.vercel.app/](https://portalxtej.vercel.app/)  
**Environment:** Termux (Android ARM64), Python, Chrome Mobile, MediaPipe WASM, Vercel  
**Status:** Active / Experimental

---

## 1. Origin & Evolution
This project began as **Air-Touch 3D-CAD**, an ambitious attempt to build a browser-based, holographic 3D modeling tool using MediaPipe and Three.js. While the 3D engine was a technical success—allowing users to draw shapes in mid-air, extrude them, and manipulate them with hand gestures—the vision evolved.

A friend watching a viral Instagram reel noted that the reel's creator was using Python and OpenCV to create dynamic, real-time visual effects inside a hand-tracking portal. The challenge was issued: *Why not build that here?*

Pivoting away from 3D CAD, the project was reborn as **Portal FX**. The Three.js engine was stripped out, and the focus shifted to high-performance, 2D Canvas pixel manipulation and spatial tracking. 

## 2. The Concept
Portal FX uses the MediaPipe Hands WASM library to track both hands simultaneously. By isolating the thumb and index fingertips, the engine generates a dynamic 4-point polygon. This polygon acts as a "portal" or a flexible pane of glass. 

The camera feed *inside* this portal is subjected to real-time visual transformations, while the world outside remains untouched. The portal's angle dictates when to trigger the effect randomizer, allowing seamless, gesture-driven transitions.

## 3. The Effects Engine
- **Thermal Cam:** Purple/Orange heat signature mapping.
- **Invert:** True negative color inversion.
- **ASCII Art:** Pure black background, white text, dynamically mapping camera brightness to ASCII characters.
- **Cartoon Pixel:** Clean, blocky 8-bit pixels with color-banding for a retro cartoon aesthetic.
- **Manga Halftone:** High-contrast black and white overlaid with dynamic comic-book halftone dots.

*All effects are rendered through a strict offscreen canvas pipeline to guarantee 0% pixel bleeding outside the portal.*

## 4. Technical Architecture
- **Tracking:** MediaPipe WASM (`maxNumHands: 2`). 
- **Rendering:** HTML5 `<canvas>` 2D API. 
- **Performance:** All pixel manipulation is handled via offscreen canvases to prevent UI thread blocking. The `object-fit: cover` math is perfectly mapped between the background video and the portal canvas to ensure the illusion is never broken by scaling mismatches.
- **UI/UX:** A strict, minimal black/white/grey interface using Space Grotesk and JetBrains Mono fonts. No emojis, pure SVG icons, and a strict 5-second premium boot sequence.

*Concept inspired by a friend's vision. Built from scratch in Termux.*
