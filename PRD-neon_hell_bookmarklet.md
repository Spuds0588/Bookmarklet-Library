# Master Engineering Specification & Implementation Guide: Neon Hell Bookmarklet

---

## 1. Product Requirements Document (PRD)

### 1.1 Executive Summary
**Neon Hell** is a zero-install, client-side, procedural bullet-hell shooter delivered entirely inside a draggable browser bookmarklet. The game injects a sleek, windowed modal canvas over any active webpage, allowing users to play an arcade twin-stick shooter without navigating away from their current work. It features additive vector graphics, an escalating procedural difficulty curve, site-scoped persistent high scores, and host-page isolation.

### 1.2 Target Delivery & Constraints
* **Distribution Format:** Single draggable hyperlink (`<a href="javascript:...">`) for the browser bookmark bar.
* **Payload Footprint:** Target $\le$ 8 KB minified and URI-encoded (Absolute hard ceiling: 16 KB) to prevent drag-and-drop clipping across Chromium, Firefox, and WebKit.
* **Runtime Constraints:** 100% self-contained. Zero external CDN dependencies, remote scripts, image assets, or style sheets (enabling execution on pages with strict `script-src` / CSP rules).
* **Frame Budget:** Rock-solid 60 FPS on standard modern integrated GPUs (Canvas 2D, zero CPU-bound Gaussian blurs).

### 1.3 Core Features & Requirements

#### F-1: Windowed Modal Viewport with Expand Option
* **Default Mode (Windowed Modal):** The game mounts in a centered, floating viewport (default: `960px × 600px`, responsive to smaller viewports at `90vw × 85vh`). The underlying host page remains visible behind a semi-transparent, dark backdrop.
* **Expand / Fullscreen Toggle:** An on-screen UI button (and shortcut key `F`) toggles between the windowed modal and true borderless 100vw × 100vh display.
* **Responsive Resize:** Canvas pixel dimensions dynamically sync with the modal size to maintain a crisp 1:1 pixel rendering ratio.

#### F-2: Non-Destructive Pause & Focus Release (`Escape`)
* **Focus Release Mechanics:** Pressing `Escape` pauses the physics engine, halts continuous firing, and immediately releases mouse/keyboard event traps.
* **Host Coexistence:** While paused, the user can freely interact with the underlying host web page. 
* **Resume:** Clicking inside the game canvas or pressing `Escape` again re-engages input traps and resumes gameplay seamlessly.
* **Session Teardown:** A dedicated "Exit" button (`[X]`) on the modal header completely unmounts the game, clears all memory references, removes event listeners, and restores host styles.

#### F-3: Twin-Stick Combat & Controls
* **Movement:** WASD or Arrow keys driving smooth acceleration/damping physics.
* **Aiming & Firing:** Mouse cursor aims; holding Left Mouse Button fires a steady stream of vector bolts.
* **Future Proofing:** Input ingestion pipeline accepts a normalized vector object `{ moveX, moveY, aimX, aimY, firing }` to enable Gamepad API hookup post-MVP without refactoring.

#### F-4: Three Procedural Enemy Archetypes
1. **The Chaser (Red Diamond):** Direct homing vector tracking the player. Steady, medium speed.
2. **The Drifter (Cyan Triangle):** High-speed linear trajectories that ricochet off the modal arena boundaries.
3. **The Grunt (Purple Octagon):** Heavy, slow-moving tank. Absorbs 3 shots; explodes into 3 micro-chasers upon death.

#### F-5: Procedural Intensity Curve
* No rigid wave files. Spawn rates, enemy top speeds, and concurrent enemy limits scale continuously as a function of elapsed session time ($T$):
  $$\text{Enemy Cap} = \min(80, 10 + \lfloor T \times 1.2 \rfloor)$$
  $$\text{Spawn Interval (ms)} = \max(200, 1200 - (T \times 15))$$

#### F-6: Site-Scoped High Score Persistence
* Tracks current run score and local best.
* Persists to `localStorage` keyed by origin (e.g., `NEON_HELL_HS`).
* **Resilience:** All storage access must be safely wrapped in a one-line fallback to prevent fatal crashes on storage-disabled or sandboxed origins.

---

## 2. Technical Architecture & Implementation Spec

### 2.1 DOM Injection & Containment Pipeline
To prevent CSS style bleeding from the host page (e.g., `canvas { filter: ... }` or reset stylesheets), all injected nodes apply explicit inline style resets (`!important` where needed).

```
document.body
  │
  └── Overlay Container (#nh-root) [position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,0.6)]
        │
        └── Modal Window (#nh-modal) [position: absolute; center-aligned; border: 1px solid #00f3ff; box-shadow]
              ├── Control Bar (Pause Indicator, Fullscreen Toggle [⛶], Close Button [✕])
              └── <canvas> [Game Surface: dynamic buffer size matching CSS layout]
```

### 2.2 Event Interception & Focus State Machine

```
              ┌────────────────────────┐
              │      UNMOUNTED         │
              └───────────┬────────────┘
                          │ Injected via Bookmarklet
                          ▼
              ┌────────────────────────┐
     ┌───────►│    ACTIVE / RUNNING    │◄────────┐
     │        └───────────┬────────────┘         │
     │                    │                      │
'Esc' Pressed             │ 'Esc' Pressed        │ Click Canvas / 'Esc'
(Re-engages traps)        ▼                      │
     │        ┌────────────────────────┐         │
     └────────┤   PAUSED / UNTRAPPED   ├─────────┘
              └───────────┬────────────┘
                          │
                          │ Click [X] Close Button
                          ▼
              ┌────────────────────────┐
              │     FULL TEARDOWN      │
              │  (Zero event leaks)    │
              └────────────────────────┘
```

* **Trapping Active:** When `state === 'RUNNING'`, registered key listeners run `e.preventDefault()` and `e.stopPropagation()` strictly for game-relevant keys (WASD, Arrows, Space, F, Esc).
* **Trapping Inactive:** When `state === 'PAUSED'`, all key events bypass game logic and bubble naturally to the host document.

### 2.3 Render Pipeline (No `shadowBlur`)
To hit 60 FPS consistently:
1. **Trail Decay:** Instead of `ctx.clearRect()`, fill canvas with `rgba(5, 5, 10, 0.25)` to create neon phosphor persistence trails.
2. **Additive Composition:** Switch blend mode to `ctx.globalCompositeOperation = 'lighter'`.
3. **Multi-Pass Core Stroke:**
   * Outer pass: `ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(R, G, B, 0.4)';`
   * Core pass: `ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff';`
4. **Particle Pool:** Fast decaying velocity particles. Expired particles are swapped and popped from a single flat array to eliminate garbage collection pauses.

### 2.4 Teardown Integrity Check
On unmount:
1. `cancelAnimationFrame(gameLoopId)`
2. Remove event listeners explicitly via stored named function references.
3. Remove `#nh-root` node from DOM.
4. Output teardown metrics to console.

---

## 3. Developer Implementation Guide

### 3.1 Architectural Structure (Single Scope Execution)
The entire codebase resides in a single self-executing closure to keep variables out of the global window scope:

```javascript
(function () {
  'use strict';
  // 1. Guard check: prevent duplicate instances
  if (document.getElementById('nh-root')) return;

  // 2. Structured Debug Logging Helper
  const LOG = (msg, data = '') => console.log(`[NEON-HELL] ${msg}`, data);

  // 3. State Management & Host Backup
  // 4. Safe Storage Provider
  // 5. DOM & UI Construction
  // 6. Input Manager & Traps
  // 7. Entity & Particle Engine
  // 8. Collision & Math Utilities
  // 9. Loop & Render Pipeline
  // 10. Clean Teardown Routine
})();
```

### 3.2 Safe Storage Routine
```javascript
const Storage = {
  get: (k, fb = 0) => { try { return +localStorage.getItem(k) || fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
};
```

### 3.3 Additive Vector Helper Pattern
Every dynamic entity exposes a simple `draw(ctx)` utilizing native canvas path operations:
```javascript
function drawVector(ctx, x, y, radius, sides, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i * 2 * Math.PI) / sides;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * radius, Math.sin(a) * radius);
  }
  ctx.closePath();
  // Pass 1: Glow Halo
  ctx.lineWidth = 4;
  ctx.strokeStyle = color;
  ctx.stroke();
  // Pass 2: Sharp Core
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.restore();
}
```

### 3.4 Packaging & Minification Pipeline
1. Write the clean development code (`neon-hell.js`).
2. Run through **Terser** or **esbuild** with the following flags:
   * `mangle: true`
   * `compress: { passes: 2, drop_debugger: true }`
3. Wrap result in `javascript:` and URI-encode unsafe URL characters:
   ```bash
   npx terser neon-hell.js -c -m | tr -d '\n' | jq -sRr @uri
   ```
4. Output ready to be wrapped in `<a href="javascript:...">Neon Hell</a>`.

---

## 4. Development Task List

### Phase 1: Windowed Shell, Modal Container, & State Machine
- [ ] **Task 1.1: DOM Shell Injection**
  - Inject `#nh-root` overlay with semi-transparent backdrop and modal container `#nh-modal`.
  - Default size: `min(960px, 90vw)` width, `min(600px, 85vh)` height.
  - Add control chrome: title, pause badge, fullscreen toggle (`[⛶]`), close button (`[✕]`).
  - *Acceptance Criteria:* Shell mounts centered on any website with unaffected host layout.
- [ ] **Task 1.2: Resize & Fullscreen Toggle Engine**
  - Implement dynamic modal size switching (Windowed vs `100vw × 100vh`).
  - Listen for container resize and update `canvas.width` and `canvas.height` 1:1 with client bounds.
  - *Acceptance Criteria:* Fullscreen toggle functions via button or `F` key without visual stretching.
- [ ] **Task 1.3: Total Teardown & Lifecycle Controller**
  - Store function bindings for all listeners.
  - Implement full cleanup sequence on `[✕]` click: cancel rAF, detach all listeners, remove DOM nodes.
  - *Acceptance Criteria:* Running game and exiting leaves zero event listeners on `window` and no orphaned nodes in DOM.

### Phase 2: Input Interception, Focus Release & Esc Pause
- [ ] **Task 2.1: Scoped Input Trap**
  - Track `keysDown` for WASD, Arrows, Space, and mouse position relative to canvas bounding rect.
  - Conditionally run `e.preventDefault()` on game keys only when state is `RUNNING`.
  - *Acceptance Criteria:* Pressing Space or Arrow keys inside game does not scroll host page.
- [ ] **Task 2.2: Focus Release State (`Escape`)**
  - Pressing `Escape` toggles `PAUSED` state.
  - When `PAUSED`, release input interception, dim canvas, and render visible "PAUSED - Click to Resume" banner.
  - Clicking canvas re-engages `RUNNING` mode and resumes game ticks.
  - *Acceptance Criteria:* User can pause with `Esc`, click links on the background host page, and click back into the modal to resume.

### Phase 3: Core Physics, Player Mechanics & Weapon Pipeline
- [ ] **Task 3.1: Player Inertia Model**
  - Implement 2D vector physics for player: velocity, acceleration from input, and natural drag/friction.
  - Clamp player position strictly within modal arena boundaries.
  - *Acceptance Criteria:* Player moves smoothly with responsive slide, stopping naturally upon releasing movement keys.
- [ ] **Task 3.2: Firing System & Bullet Pool**
  - Hold LMB to auto-fire vector bolts toward mouse coordinate at fixed cooldown (100ms).
  - Bullets travel in straight trajectories, expiring upon hitting arena edges.
  - *Acceptance Criteria:* Stream of bolts streams accurately toward cursor, terminating cleanly at boundaries without memory leaks.

### Phase 4: Procedural Enemies, Difficulty Scaling & Collisions
- [ ] **Task 4.1: Enemy Archetype Logic**
  - Implement **Chasers** (tracking player vector).
  - Implement **Drifters** (ricocheting boundary bouncers).
  - Implement **Grunts** (3-hit multi-split tank).
  - *Acceptance Criteria:* All 3 archetypes visually identifiable and behaving according to specs.
- [ ] **Task 4.2: Procedural Spawn Director**
  - Spawn entities just outside player perimeter or at arena edge walls.
  - Scale frequency and maximum concurrency against active session clock.
  - *Acceptance Criteria:* Game starts gentle and scales smoothly to bullet-hell density by 90 seconds.
- [ ] **Task 4.3: Radial Collision & Additive Particle Bursts**
  - Circle-circle intersection detection for bullets vs enemies and player vs enemies.
  - Enemy destruction spawns 16-24 additive neon spark lines with randomized velocity vectors and linear decay.
  - *Acceptance Criteria:* Satisfying explosions, zero frame drops during heavy particle bursts.

### Phase 5: HUD, Safe LocalStorage & Juice
- [ ] **Task 5.1: Vector HUD Layer**
  - Render live Score, Multiplier, and Lives counter directly on canvas surface in vector styling.
  - *Acceptance Criteria:* Crisp UI visible in both windowed and expanded modes.
- [ ] **Task 5.2: Safe Origin High-Score Hook**
  - On game over or score tick, read/write high score via safe `localStorage` adapter.
  - Render "SITE BEST: [Score]" on HUD.
  - *Acceptance Criteria:* Works seamlessly across valid origins; safely defaults to memory-only score on blocked/sandboxed storage origins.
- [ ] **Task 5.3: Camera Shake & Flash**
  - Apply brief 4-frame random translate offset to canvas context on player impact.
  - Mini-bomb clear radius triggered when player loses a life.
  - *Acceptance Criteria:* High impact sensory feedback on damage without desyncing canvas rendering coordinates.

### Phase 6: Minification, Cross-Host Verification & Packaging
- [ ] **Task 6.1: Cross-Site Host Hardening**
  - Test modal overlay across edge-case sites: Wikipedia (dense CSS), GitHub (strict CSP), YouTube (active video layers), and Reddit.
  - Fix any style leakage or stacking-context bugs.
  - *Acceptance Criteria:* Flawless layout and performance on all test targets.
- [ ] **Task 6.2: Final Minification & Bookmarklet Link Generation**
  - Compile single file through Terser pipeline.
  - Ensure total encoded bookmarklet size remains under 10 KB.
  - Generate HTML distribution template containing drag-and-drop link.
  - *Acceptance Criteria:* User can drag `<a href="javascript:...">` directly to Chrome/Firefox bookmark bar and launch on any page.