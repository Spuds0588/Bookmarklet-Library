# Master Engineering & Testing Specification: "Will it run Doom?"

> **Superseded 2026-10-28.** This document records the original raycaster design. The shipped tool now opens actual shareware DOOM Episode 1 from the hosted [doom/](doom/index.html) page, using Dwasm and `DOOM1.WAD`. The size and no-network assumptions below no longer apply; see [doom/README.md](doom/README.md) for the current build and licenses.

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Target Delivery:** Self-Contained Zero-Dependency JavaScript Bookmarklet  
**Author:** Lead Software Developer  

---

## 1. Executive Summary & Architecture Decision Record (ADR)

### 1.1 Context & Problem Statement
The product objective is to provide a single-click bookmarklet—playfully titled **"Will it run Doom?"**—that injects and executes a playable recreation of DOOM Episode 1 Level 1 (E1M1) over any webpage without external network dependencies.

### 1.2 Decision: Pure JS Raycaster + Procedural Web Audio (Option B)
We evaluated two architectural paths:
1. **WASM id Tech 1 Port + Stripped WAD (Rejected):** Exceeds the strict 64 KB bookmark URL limit enforced by Safari and Firefox (~1.4 MB minimum). Blocked outright by Content Security Policy (CSP) directives on modern domains (`script-src` lacking `'wasm-unsafe-eval'`).
2. **Pure Vanilla JS DDA Raycaster + Web Audio Synthesis (Accepted):** Fits entirely within **~11 KB to 16 KB** unminified/URL-encoded. Requires zero external network calls, avoids CSP WebAssembly compilation errors, complies with YAGNI principles, and runs across Chromium, Firefox, and Safari.

---

## 2. Core Architecture & Constraints

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Target Host Webpage DOM                         │
│                                                                        │
│  ┌─────────────────────── #doom-overlay ────────────────────────────┐  │
│  │ (z-index: 2147483647, fixed viewport, focus capture)             │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  <canvas width="320" height="200">                         │  │  │
│  │  │  - DDA Raycaster (Walls, Billboard Sprites)                │  │  │
│  │  │  - Procedural Floors/Ceilings & Doom Palette                │  │  │
│  │  │  - Weapon Rendering & Muzzle Flash Animation               │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  Custom HUD (Ammo, Health %, Doom Face, Diagnostics)       │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Audio Pipeline: Web Audio API (Noise Buffer + Modulated Oscillators)  │
│  Teardown: ESC key removes DOM, stops rAF loop, closes AudioContext    │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Hard Constraints Matrix

| Dimension | Target Metric | Hard Constraint / Ceiling | Reason |
| :--- | :--- | :--- | :--- |
| **Payload Size** | ~11 KB | **65,536 bytes (64 KB)** | Maximum bookmark URI length on Firefox & Safari |
| **Network Requests**| 0 requests | **0 requests** | Air-gapped self-containment requirement |
| **Dependencies** | None | **Zero 3rd-party libs** | No external loaders, CDNs, or bundlers |
| **Render Target**| 320 x 200 | Upscaled via CSS | Native DOOM aspect ratio, low CPU overhead |
| **Framerate** | 60 FPS | Target `requestAnimationFrame` | Low computational load per ray column |
| **Browser Support**| Chrome, Edge, Safari, Firefox | Evergreen Desktop Browsers | Cross-browser feature compatibility |

---

## 3. Subsystem Breakdown

### 3.1 Procedural Audio Subsystem (Web Audio API)
To maintain zero-byte asset overhead, all audio is synthesized programmatically at runtime:
1. **AudioContext Autoplay Compliance:** Modern browsers suspend `AudioContext` until a user gesture occurs. The engine initializes the context upon injection, but explicitly invokes `AudioContext.resume()` on the first `keydown` or `mousedown` event.
2. **Pistol Sound Effect:**
   * One-pole noise burst generated into an in-memory `AudioBuffer` (0.15s duration).
   * Routed through a bandpass `BiquadFilterNode` sweeping from 1000 Hz down to 80 Hz.
   * Concurrently mixed with a low-frequency sawtooth oscillator transient (160 Hz down to 20 Hz) for mechanical punch.
3. **Imp Hurt/Death Sound Effect:**
   * Downward pitch drop via a sawtooth oscillator (220 Hz down to 60 Hz over 0.25s) with an exponential gain falloff.
4. **Iconic E1M1 Theme ("At Doom's Gate"):**
   * Programmatic 16-step interval sequencer running at 135 ms/step.
   * Plays the repeating E-minor riff (`E2, E2, E3, E2, E2, D3, E2, E2, C3, E2, E2, Bb2, E2, E2, B2, C3`).
   * Filtered sawtooth wave through a 800 Hz lowpass filter to mimic an overdriven bass/guitar synth.
   * Toggleable via the `M` key.

### 3.2 Visual & Raycasting Engine
1. **DDA Algorithm:** Standard Digital Differential Analysis stepping through a 16x16 grid representing the iconic starting room, toxic slime pit, pillars, and corridor of E1M1.
2. **Texture Simulation:** Vertical column rendering shaded by wall orientation (North-South vs. East-West) to provide contrast without needing bitmap textures.
3. **Billboard Sprites:** Enemies sorted and rendered back-to-front using depth buffering (`zBuffer[320]`) to handle occlusion against walls.
4. **Weapon & Combat:**
   * Raycast hit detection calculated via vector angle divergence between player direction and enemy position.
   * Centered pistol sprite with active muzzle flash recoil animation on trigger.

### 3.3 DOM Isolation & Clean Teardown
1. **Host Isolation:** All injected nodes are contained within `#doom-overlay`. Explicit high `z-index: 2147483647` prevents host CSS bleeding or hidden stacking.
2. **Complete Teardown Lifecycle:** When `ESC` is pressed:
   * `cancelAnimationFrame(animId)` cancels the rendering cycle.
   * `window.removeEventListener()` strips all bound keyboard and click events.
   * `AudioContext.close()` releases system audio threads.
   * `#doom-overlay` is removed via `Element.remove()`.
   * Complete memory cleanup allows the host page to continue uninterrupted.

---

## 4. Diagnostics & Structured Console Logging

All runtime diagnostic logs must use the standardized namespace prefix `[WillItRunDoom:<Subsystem>]` to facilitate debugging during testing.

### 4.1 Telemetry Reference

| Namespace | Event | Diagnostic Purpose |
| :--- | :--- | :--- |
| `[WillItRunDoom:Init]` | Engine start | Confirms execution entry and initial coordinates |
| `[WillItRunDoom:DOM]` | Overlay mount | Verifies canvas sizing and viewport injection |
| `[WillItRunDoom:Audio]`| State change | Logs `AudioContext.state` transitions (`suspended` -> `running`) |
| `[WillItRunDoom:Audio]`| SFX/Music event | Logs sound triggers (Pistol, Imp, Sequencer steps) |
| `[WillItRunDoom:Combat]`| Hit / Miss / Kill | Logs weapon discharge vector and remaining enemy HP |
| `[WillItRunDoom:Teardown]`| Exit sequence | Confirms removal of listeners, loops, and DOM nodes |

---

## 5. Master Implementation Code

The entire testing harness, unminified engine, diagnostic telemetry, and bookmarklet encoder are contained in the following standalone file (`index.html`).

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Will it run Doom? - Master Test Harness</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      background: #0d0d11;
      color: #e0e0e0;
      padding: 30px;
      line-height: 1.6;
    }
    h1 { color: #d32f2f; margin-bottom: 4px; }
    .badge { background: #b71c1c; color: #fff; padding: 2px 8px; font-size: 12px; font-weight: bold; border-radius: 4px; }
    .card { background: #1a1a24; border: 1px solid #333; border-radius: 8px; padding: 20px; margin: 20px 0; max-width: 850px; }
    .btn {
      display: inline-block;
      background: #b71c1c;
      color: #fff;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: bold;
      text-decoration: none;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      margin-right: 12px;
      transition: background 0.2s;
    }
    .btn:hover { background: #d32f2f; }
    .btn-bm { background: #ff9800; color: #111; cursor: grab; }
    .btn-bm:hover { background: #ffa726; }
    pre { background: #000; padding: 12px; border-radius: 6px; overflow-x: auto; color: #4caf50; font-size: 12px; }
    #stats { font-size: 13px; color: #aaa; margin-top: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #333; }
    th { color: #ff9800; }
  </style>
</head>
<body>

  <h1>"Will it run Doom?" <span class="badge">Master Harness</span></h1>
  <p>Self-contained Raycasting DOOM Bookmarklet Engine with Procedural Web Audio.</p>

  <div class="card">
    <h3>1. In-Browser Verification</h3>
    <p>Test engine execution, event hooks, and raycasting within this isolated host page:</p>
    <button class="btn" id="btn-launch">Execute In-Place</button>
  </div>

  <div class="card">
    <h3>2. Bookmarklet Distribution</h3>
    <p>Drag the link below onto your browser's Bookmarks Toolbar, or copy its target URI:</p>
    <a class="btn btn-bm" id="bm-link" href="#">💥 Will it run Doom?</a>
    <div id="stats">Calculating payload size...</div>
  </div>

  <div class="card">
    <h3>3. Runtime Keymap</h3>
    <table>
      <thead>
        <tr><th>Input Action</th><th>Primary Key</th><th>Secondary / Alternative</th></tr>
      </thead>
      <tbody>
        <tr><td>Move Forward / Back</td><td><code>W</code> / <code>S</code></td><td><code>Up Arrow</code> / <code>Down Arrow</code></td></tr>
        <tr><td>Turn Left / Right</td><td><code>A</code> / <code>D</code></td><td><code>Left Arrow</code> / <code>Right Arrow</code></td></tr>
        <tr><td>Fire Pistol</td><td><code>Space</code></td><td><code>Left Click Canvas</code></td></tr>
        <tr><td>Toggle E1M1 Music</td><td><code>M</code></td><td>—</td></tr>
        <tr><td>Teardown / Exit</td><td><code>Escape</code></td><td>—</td></tr>
      </tbody>
    </table>
  </div>

  <script>
    // =========================================================================
    // CORE ENGINE IMPLEMENTATION (Embedded into the Bookmarklet URI)
    // =========================================================================
    function launchDoomEngine() {
      if (document.getElementById('doom-overlay')) {
        console.warn('[WillItRunDoom:Init] Active session detected. Halting duplicate.');
        return;
      }

      console.log('[WillItRunDoom:Init] Booting Micro-DOOM Engine...');

      // -----------------------------------------------------------------------
      // Audio Subsystem: Procedural Web Audio API Synthesis
      // -----------------------------------------------------------------------
      const AudioSys = {
        ctx: null,
        musicTimer: null,
        musicMuted: false,
        step: 0,
        e1m1Notes: [40, 40, 52, 40, 40, 50, 40, 40, 48, 40, 40, 46, 40, 40, 47, 48],

        init() {
          try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            console.log('[WillItRunDoom:Audio] Initialized. State:', this.ctx.state);
          } catch (e) {
            console.error('[WillItRunDoom:Audio] Initialization failed:', e);
          }
        },

        resume() {
          if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => {
              console.log('[WillItRunDoom:Audio] Suspended context resumed via user gesture.');
            });
          }
        },

        m2f(m) { return 440 * Math.pow(2, (m - 69) / 12); },

        playPistol() {
          if (!this.ctx) return;
          this.resume();
          const t = this.ctx.currentTime;

          // Bandpassed Noise Burst
          const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.15), this.ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.025));
          }
          const src = this.ctx.createBufferSource();
          src.buffer = buf;

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1200, t);
          filter.frequency.exponentialRampToValueAtTime(70, t + 0.15);

          src.connect(filter);
          filter.connect(this.ctx.destination);
          src.start(t);

          // Low-frequency body transient
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(160, t);
          osc.frequency.exponentialRampToValueAtTime(25, t + 0.12);
          gain.gain.setValueAtTime(0.7, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.12);
          console.log('[WillItRunDoom:Audio] Pistol SFX dispatched.');
        },

        playImpPain() {
          if (!this.ctx) return;
          this.resume();
          const t = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, t);
          osc.frequency.exponentialRampToValueAtTime(55, t + 0.25);
          gain.gain.setValueAtTime(0.5, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.25);
          console.log('[WillItRunDoom:Audio] Imp Hurt/Death SFX dispatched.');
        },

        startMusic() {
          if (!this.ctx || this.musicTimer) return;
          this.step = 0;
          this.musicTimer = setInterval(() => {
            if (this.musicMuted || !this.ctx || this.ctx.state !== 'running') return;
            const t = this.ctx.currentTime;
            const note = this.e1m1Notes[this.step % this.e1m1Notes.length];
            this.step++;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(this.m2f(note), t);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(750, t);

            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.12);
          }, 135);
          console.log('[WillItRunDoom:Audio] E1M1 Sequencer active.');
        },

        stopMusic() {
          if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
            console.log('[WillItRunDoom:Audio] E1M1 Sequencer halted.');
          }
        }
      };

      AudioSys.init();

      // -----------------------------------------------------------------------
      // Map Geometry & Entity Allocations
      // -----------------------------------------------------------------------
      const MAP_W = 16, MAP_H = 16;
      const MAP = [
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,
        1,0,2,0,0,0,1,0,3,3,3,3,0,0,0,1,
        1,0,0,0,0,0,0,0,3,0,0,3,0,2,0,1,
        1,0,0,0,0,0,1,0,3,0,0,3,0,0,0,1,
        1,1,0,1,1,1,1,0,3,3,0,3,0,0,0,1,
        1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,
        1,0,2,0,0,0,1,1,1,0,1,1,1,1,0,1,
        1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,1,
        1,1,1,0,1,1,0,0,1,0,1,0,2,0,0,1,
        1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,
        1,0,3,3,0,1,0,0,0,0,1,0,0,0,0,1,
        1,0,3,3,0,1,1,0,0,1,1,0,0,0,0,1,
        1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1,
        1,0,0,2,0,0,1,0,0,1,0,0,2,0,0,1,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
      ];

      const player = { x: 2.5, y: 2.5, dirX: 1, dirY: 0, planeX: 0, planeY: 0.66, health: 100, ammo: 50 };
      const enemies = [
        { id: 1, x: 9.5, y: 3.5, hp: 30, alive: true, color: '#9c4d1f' },
        { id: 2, x: 13.5, y: 8.5, hp: 30, alive: true, color: '#9c4d1f' },
        { id: 3, x: 4.5, y: 12.5, hp: 30, alive: true, color: '#9c4d1f' }
      ];

      // -----------------------------------------------------------------------
      // DOM Overlay Construction
      // -----------------------------------------------------------------------
      const overlay = document.createElement('div');
      overlay.id = 'doom-overlay';
      Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.85)', zIndex: '2147483647', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
      });

      const frame = document.createElement('div');
      Object.assign(frame.style, {
        position: 'relative', width: '640px', maxWidth: '95vw', background: '#000',
        border: '3px solid #b71c1c', boxShadow: '0 0 40px rgba(183,28,28,0.6)'
      });

      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 200;
      Object.assign(canvas.style, { width: '100%', height: 'auto', display: 'block', imageRendering: 'pixelated' });
      const ctx = canvas.getContext('2d');

      const hud = document.createElement('div');
      Object.assign(hud.style, {
        background: '#181818', borderTop: '2px solid #444', padding: '8px 14px',
        display: 'flex', justifyContent: 'space-between', color: '#ff3333',
        fontFamily: 'monospace', fontWeight: 'bold', fontSize: '14px'
      });
      hud.innerHTML = `<span>AMMO: <span id="doom-ammo">50</span></span> <span>HEALTH: <span id="doom-hp">100%</span></span> <span>STATUS: <span>😈</span></span> <span>[M] Mute | [ESC] Close</span>`;

      frame.appendChild(canvas);
      frame.appendChild(hud);
      overlay.appendChild(frame);
      document.body.appendChild(overlay);
      console.log('[WillItRunDoom:DOM] Overlay attached to host window.');

      // -----------------------------------------------------------------------
      // Input System & Hit Detection
      // -----------------------------------------------------------------------
      const keys = {};
      let isShooting = 0;

      const onKeyDown = (e) => {
        AudioSys.resume();
        AudioSys.startMusic();
        keys[e.code] = true;

        if (e.code === 'Space' && !isShooting && player.ammo > 0) {
          executeShot();
        }
        if (e.code === 'KeyM') {
