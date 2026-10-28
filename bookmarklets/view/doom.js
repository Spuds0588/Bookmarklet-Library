/**
 * @name 💥 Will it run Doom?
 * @category view
 * @description Drop a playable E1M1-inspired raycaster over the page, with imps, a pistol and procedural audio.
 * @tags doom, game, raycaster, canvas, fun, easter egg, audio
 * @added 2026-10-28
 * @featured false
 */
(() => {
  try { window.__blDoomClose?.(); } catch {}
  if (document.getElementById("doom-overlay")) return;

  const log = (area, ...args) => console.log(`[WillItRunDoom:${area}]`, ...args);
  log("Init", "Booting Micro-DOOM.");
  const ID = "doom-overlay";
  const W = 320;
  const H = 200;
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
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
  ];
  const wallAt = (x, y) => {
    const mx = Math.floor(x);
    const my = Math.floor(y);
    if (mx < 0 || my < 0 || mx >= 16 || my >= 16) return 1;
    return MAP[my * 16 + mx];
  };
  const player = { x: 2.5, y: 1.5, dirX: 1, dirY: 0, planeX: 0, planeY: 0.66, health: 100, ammo: 50 };
  const enemies = [
    { x: 5.5, y: 1.5, hp: 30, alive: true, attack: 0, flash: 0 },
    { x: 13.5, y: 8.5, hp: 30, alive: true, attack: 0, flash: 0 },
    { x: 4.5, y: 12.5, hp: 30, alive: true, attack: 0, flash: 0 },
  ];
  let dead = false;
  let kills = 0;
  let muzzleUntil = 0;
  let lastShot = 0;
  let damageUntil = 0;
  let closed = false;

  /* Audio --------------------------------------------------------------- */
  const AudioSys = {
    ctx: null,
    timer: null,
    muted: false,
    step: 0,
    notes: [40, 40, 52, 40, 40, 50, 40, 40, 48, 40, 40, 46, 40, 40, 47, 48],
    init() {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = Ctx ? new Ctx() : null;
        log("Audio", "Initialized.", this.ctx?.state);
      } catch (error) {
        log("Audio", "Initialization failed.", error.message);
      }
    },
    resume() {
      if (this.ctx?.state === "suspended") {
        this.ctx.resume().then(() => log("Audio", "Resumed.")).catch(() => {});
      }
    },
    note(midi) { return 440 * Math.pow(2, (midi - 69) / 12); },
    pistol() {
      if (!this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;
      const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.14), this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.022));
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1100, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + 0.14);
      source.connect(filter).connect(this.ctx.destination);
      source.start(t);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(28, t + 0.12);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
      log("Audio", "Pistol SFX.");
    },
    imp() {
      if (!this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(210, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.24);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.24);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
      log("Audio", "Imp SFX.");
    },
    startMusic() {
      if (!this.ctx || this.timer) return;
      this.step = 0;
      this.timer = setInterval(() => {
        if (this.muted || !this.ctx || this.ctx.state !== "running") return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(this.note(this.notes[this.step++ % this.notes.length]), t);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(720, t);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
        osc.connect(filter).connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
      }, 135);
      log("Audio", "E1M1 sequencer active.");
    },
    stopMusic() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
        log("Audio", "E1M1 sequencer halted.");
      }
    },
    close() {
      this.stopMusic();
      try { this.ctx?.close(); } catch {}
      this.ctx = null;
    },
  };
  AudioSys.init();

  /* Overlay ------------------------------------------------------------- */
  const overlay = document.createElement("div");
  overlay.id = ID;
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", zIndex: "2147483647", display: "flex",
    alignItems: "center", justifyContent: "center", flexDirection: "column",
    background: "rgba(0,0,0,.88)", color: "#f2f2f2",
    fontFamily: "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
  });
  const frame = document.createElement("div");
  Object.assign(frame.style, {
    position: "relative", width: "min(960px,96vw)", background: "#000",
    border: "2px solid #8d2a1f", boxShadow: "0 0 40px rgba(141,42,31,.45)",
  });
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  canvas.setAttribute("aria-label", "Doom game canvas");
  Object.assign(canvas.style, {
    display: "block", width: "100%", height: "auto", imageRendering: "pixelated",
    cursor: "crosshair", background: "#000",
  });
  const ctx = canvas.getContext("2d");
  const hud = document.createElement("div");
  Object.assign(hud.style, {
    display: "flex", flexWrap: "wrap", gap: "8px 18px", alignItems: "center",
    padding: "8px 11px", borderTop: "1px solid #3a3a3a", background: "#151515",
    color: "#e9c46a", fontSize: "11px", letterSpacing: ".04em",
  });
  hud.innerHTML = `<span>AMMO <b id="doom-ammo">50</b></span><span>HEALTH <b id="doom-health">100%</b></span><span>KILLS <b id="doom-kills">0</b></span><span id="doom-status" style="color:#bbb;font-weight:400">Press a key or click to start audio</span><span style="margin-left:auto;color:#888">[WASD] move · [M] music · [ESC] exit</span>`;
  frame.append(canvas, hud);
  const flash = document.createElement("div");
  Object.assign(flash.style, {
    position: "absolute", inset: "0", pointerEvents: "none",
    background: "rgba(180,20,20,.35)", opacity: "0",
  });
  frame.appendChild(flash);
  overlay.appendChild(frame);
  (document.body || document.documentElement).appendChild(overlay);
  log("DOM", "Overlay attached.", `${W}x${H}`);

  /* Sprites ------------------------------------------------------------- */
  const imp = document.createElement("canvas");
  imp.width = 32;
  imp.height = 40;
  const impCtx = imp.getContext("2d");
  impCtx.fillStyle = "#7b2c16";
  impCtx.fillRect(10, 4, 12, 10);
  impCtx.fillStyle = "#4a170e";
  impCtx.fillRect(7, 2, 4, 6);
  impCtx.fillRect(21, 2, 4, 6);
  impCtx.fillStyle = "#d6a23c";
  impCtx.fillRect(12, 8, 3, 2);
  impCtx.fillRect(18, 8, 3, 2);
  impCtx.fillStyle = "#8d351b";
  impCtx.fillRect(8, 14, 16, 14);
  impCtx.fillStyle = "#5c2113";
  impCtx.fillRect(4, 16, 4, 11);
  impCtx.fillRect(24, 16, 4, 11);
  impCtx.fillStyle = "#642014";
  impCtx.fillRect(10, 27, 5, 11);
  impCtx.fillRect(17, 27, 5, 11);
  impCtx.fillStyle = "#2b100c";
  impCtx.fillRect(11, 39, 4, 1);
  impCtx.fillRect(18, 39, 4, 1);

  /* State --------------------------------------------------------------- */
  const keys = Object.create(null);
  const zBuffer = new Float32Array(W);
  let frameId = 0;
  let last = performance.now();
  let statusTimer = 0;
  const status = hud.querySelector("#doom-status");
  const ammoLabel = hud.querySelector("#doom-ammo");
  const healthLabel = hud.querySelector("#doom-health");
  const killsLabel = hud.querySelector("#doom-kills");
  const say = (text) => {
    status.textContent = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      if (!closed && !dead) status.textContent = "Clear the room. Find the imps.";
    }, 2600);
  };
  const updateHud = () => {
    ammoLabel.textContent = String(player.ammo);
    healthLabel.textContent = `${Math.max(0, player.health)}%`;
    healthLabel.style.color = player.health < 35 ? "#ff6b6b" : "";
    killsLabel.textContent = String(kills);
  };

  const blocked = (x0, y0, x1, y1) => {
    const distance = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(distance / 0.12));
    for (let i = 1; i < steps; i++) {
      if (wallAt(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps)) return true;
    }
    return false;
  };

  const shoot = (now) => {
    if (dead || player.ammo <= 0 || now - lastShot < 220) return;
    player.ammo--;
    lastShot = now;
    muzzleUntil = now + 90;
    AudioSys.pistol();
    let hit = null;
    let best = Infinity;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const forward = dx * player.dirX + dy * player.dirY;
      const side = Math.abs(-dx * player.dirY + dy * player.dirX);
      if (forward > 0 && forward < 9 && side < 0.62 && forward < best && !blocked(player.x, player.y, enemy.x, enemy.y)) {
        best = forward;
        hit = enemy;
      }
    }
    if (hit) {
      hit.hp -= 10;
      hit.flash = now + 110;
      AudioSys.imp();
      if (hit.hp <= 0) {
        hit.alive = false;
        kills++;
        say("Imp down.");
        log("Combat", "Kill. Imps left:", enemies.filter((enemy) => enemy.alive).length);
      } else {
        say(`Hit. Imp has ${hit.hp} HP.`);
        log("Combat", "Hit. Remaining HP:", hit.hp);
      }
    } else {
      say("Miss. Watch the angle.");
      log("Combat", "Miss.");
    }
    updateHud();
  };

  const move = (dt) => {
    if (dead) return;
    AudioSys.resume();
    AudioSys.startMusic();
    const speed = 2.8 * dt;
    const turn = 2.1 * dt;
    if (keys.KeyW || keys.ArrowUp) {
      const nx = player.x + player.dirX * speed;
      const ny = player.y + player.dirY * speed;
      if (!wallAt(nx, player.y)) player.x = nx;
      if (!wallAt(player.x, ny)) player.y = ny;
    }
    if (keys.KeyS || keys.ArrowDown) {
      const nx = player.x - player.dirX * speed;
      const ny = player.y - player.dirY * speed;
      if (!wallAt(nx, player.y)) player.x = nx;
      if (!wallAt(player.x, ny)) player.y = ny;
    }
    if (keys.KeyA || keys.ArrowLeft) {
      const cos = Math.cos(-turn);
      const sin = Math.sin(-turn);
      const dx = player.dirX;
      player.dirX = dx * cos - player.dirY * sin;
      player.dirY = dx * sin + player.dirY * cos;
      const px = player.planeX;
      player.planeX = px * cos - player.planeY * sin;
      player.planeY = px * sin + player.planeY * cos;
    }
    if (keys.KeyD || keys.ArrowRight) {
      const cos = Math.cos(turn);
      const sin = Math.sin(turn);
      const dx = player.dirX;
      player.dirX = dx * cos - player.dirY * sin;
      player.dirY = dx * sin + player.dirY * cos;
      const px = player.planeX;
      player.planeX = px * cos - player.planeY * sin;
      player.planeY = px * sin + player.planeY * cos;
    }
  };

  const enemiesThink = (now, dt) => {
    if (dead) return;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 7 || blocked(enemy.x, enemy.y, player.x, player.y)) continue;
      if (distance > 1.1) {
        const step = Math.min(0.9 * dt, distance - 1);
        const nx = enemy.x + (dx / distance) * step;
        const ny = enemy.y + (dy / distance) * step;
        if (!wallAt(nx, enemy.y)) enemy.x = nx;
        if (!wallAt(enemy.x, ny)) enemy.y = ny;
      } else if (now > enemy.attack) {
        enemy.attack = now + 850;
        player.health -= 6;
        damageUntil = now + 130;
        AudioSys.imp();
        updateHud();
        if (player.health <= 0) {
          dead = true;
          say("You died. Press Esc, then run it again.");
          log("Combat", "Player died.");
        }
      }
    }
  };

  const render = (now) => {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H / 2);
    ctx.fillStyle = "#171411";
    ctx.fillRect(0, H / 2, W, H / 2);
    for (let x = 0; x < W; x++) {
      const cameraX = (2 * x) / W - 1;
      const rayX = player.dirX + player.planeX * cameraX;
      const rayY = player.dirY + player.planeY * cameraX;
      let mapX = Math.floor(player.x);
      let mapY = Math.floor(player.y);
      const deltaX = Math.abs(1 / (rayX || 0.0001));
      const deltaY = Math.abs(1 / (rayY || 0.0001));
      const stepX = rayX < 0 ? -1 : 1;
      const stepY = rayY < 0 ? -1 : 1;
      let sideX = (rayX < 0 ? player.x - mapX : mapX + 1 - player.x) * deltaX;
      let sideY = (rayY < 0 ? player.y - mapY : mapY + 1 - player.y) * deltaY;
      let side = 0;
      let hit = 0;
      for (let steps = 0; steps < 48 && !hit; steps++) {
        if (sideX < sideY) {
          sideX += deltaX;
          mapX += stepX;
          side = 0;
        } else {
          sideY += deltaY;
          mapY += stepY;
          side = 1;
        }
        hit = wallAt(mapX, mapY);
      }
      const perp = side === 0
        ? (mapX - player.x + (1 - stepX) / 2) / (rayX || 0.0001)
        : (mapY - player.y + (1 - stepY) / 2) / (rayY || 0.0001);
      const distance = Math.max(0.05, perp);
      zBuffer[x] = distance;
      const lineHeight = Math.floor(H / distance);
      const start = Math.max(0, Math.floor(H / 2 - lineHeight / 2));
      const end = Math.min(H, Math.floor(H / 2 + lineHeight / 2));
      const palette = hit === 2 ? [105, 67, 38] : hit === 3 ? [42, 91, 56] : [116, 116, 112];
      const light = Math.max(0.16, 1 - distance / 11) * (side ? 0.72 : 1);
      const rgb = palette.map((value) => Math.max(0, Math.min(255, Math.floor(value * light))));
      ctx.fillStyle = `rgb(${rgb.join(",")})`;
      ctx.fillRect(x, start, 1, end - start);
      if (distance < 10) {
        const wallX = side === 0 ? player.y + perp * rayY : player.x + perp * rayX;
        if (Math.floor((wallX - Math.floor(wallX)) * 8) % 3 === 0) {
          ctx.fillStyle = `rgba(255,255,255,${0.08 * (1 - distance / 10)})`;
          ctx.fillRect(x, start, 1, end - start);
        }
      }
    }
    const visible = enemies.filter((enemy) => enemy.alive).sort((a, b) => Math.hypot(b.x - player.x, b.y - player.y) - Math.hypot(a.x - player.x, a.y - player.y));
    const invDet = 1 / (player.planeX * player.dirY - player.dirX * player.planeY);
    for (const enemy of visible) {
      const sx = enemy.x - player.x;
      const sy = enemy.y - player.y;
      const transformX = invDet * (player.dirY * sx - player.dirX * sy);
      const transformY = invDet * (-player.planeY * sx + player.planeX * sy);
      if (transformY <= 0.15) continue;
      const screenX = Math.floor((W / 2) * (1 + transformX / transformY));
      const height = Math.abs(H / transformY);
      const width = height * 0.7;
      const top = (H - height) / 2;
      for (let stripe = Math.max(0, Math.floor(screenX - width / 2)); stripe < Math.min(W, Math.ceil(screenX + width / 2)); stripe++) {
        if (transformY >= zBuffer[stripe]) continue;
        const textureX = Math.floor(((stripe - (screenX - width / 2)) / width) * 32);
        ctx.drawImage(imp, Math.max(0, Math.min(31, textureX)), 0, 1, 40, stripe, top, 1, height);
      }
      if (enemy.flash > now) {
        ctx.fillStyle = "rgba(255,230,180,.38)";
        ctx.fillRect(screenX - width / 2, top, width, height);
      }
    }
    // Pistol.
    const gunX = W / 2;
    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(gunX - 26, H - 52, 12, 36);
    ctx.fillRect(gunX + 14, H - 52, 12, 36);
    ctx.fillStyle = "#5a5a5a";
    ctx.fillRect(gunX - 9, H - 42, 18, 44);
    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(gunX - 4, H - 25, 8, 18);
    if (now < muzzleUntil) {
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.moveTo(gunX, H - 66);
      ctx.lineTo(gunX - 12, H - 49);
      ctx.lineTo(gunX + 12, H - 49);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff3c4";
      ctx.fillRect(gunX - 3, H - 60, 6, 10);
    }
    ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.fillRect(W / 2, H / 2 - 1, 1, 3);
    ctx.fillRect(W / 2 - 1, H / 2, 3, 1);
    flash.style.opacity = now < damageUntil ? "1" : "0";
  };

  const loop = (now) => {
    if (closed) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    move(dt);
    enemiesThink(now, dt);
    render(now);
    frameId = requestAnimationFrame(loop);
  };

  const close = () => {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(frameId);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("pagehide", close);
    canvas.removeEventListener("mousedown", onPointer);
    AudioSys.close();
    overlay.remove();
    if (window.__blDoomClose === close) window.__blDoomClose = null;
    log("Teardown", "Overlay removed and audio closed.");
  };
  const onKeyDown = (event) => {
    if (event.code === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
    if (event.code === "KeyM" && !event.repeat) {
      AudioSys.muted = !AudioSys.muted;
      if (AudioSys.muted) {
        AudioSys.stopMusic();
        say("Music off.");
      } else {
        AudioSys.startMusic();
        say("Music on.");
      }
      return;
    }
    keys[event.code] = true;
    AudioSys.resume();
    AudioSys.startMusic();
    if (event.code === "Space" && !event.repeat) shoot(performance.now());
  };
  const onKeyUp = (event) => { keys[event.code] = false; };
  const onBlur = () => { for (const key of Object.keys(keys)) keys[key] = false; };
  const onPointer = (event) => {
    event.preventDefault();
    canvas.focus();
    AudioSys.resume();
    AudioSys.startMusic();
    shoot(performance.now());
  };

  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("blur", onBlur);
  window.addEventListener("pagehide", close);
  canvas.addEventListener("mousedown", onPointer);
  window.__blDoomClose = close;
  updateHud();
  say("Clear the room. Find the imps.");
  frameId = requestAnimationFrame(loop);
  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.doom = { player, enemies, map: MAP, audio: AudioSys, close, state: () => ({ dead, kills }) };
  }
})();
