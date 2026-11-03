/**
 * @name 👾 Neon Hell
 * @category games
 * @description Play a Geometry Wars inspired neon arena shooter entirely contained in one bookmarklet.
 * @tags game, arcade, shooter, twin-stick, bullet hell, geometry wars, canvas, neon, fun
 * @traits offline, self-contained, no-cors, private-safe
 * @added 2026-10-28
 * @featured false
 */
(() => {
  if (document.getElementById("nh-root")) return;
  const KEY = "NEON_HELL_HS";
  const getBest = () => { try { return +localStorage.getItem(KEY) || 0; } catch { return 0; } };
  const setBest = (value) => { try { localStorage.setItem(KEY, value); } catch { } };
  const fmt = (value) => String(Math.max(0, Math.floor(value))).padStart(6, "0");
  let best = getBest();
  const previousFocus = document.activeElement;
  const previousOverflow = document.documentElement.style.overflow;

  const host = document.createElement("div");
  host.id = "nh-root";
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>:host{all:initial;display:block}*{box-sizing:border-box}.overlay{position:fixed;inset:0;display:grid;place-items:center;padding:16px;background:#020308b8;pointer-events:auto;font:12px monospace;color:#e8f7ff}.overlay.full{padding:0;background:#000}.overlay.paused{pointer-events:none;background:#02030859}.overlay.paused .modal{pointer-events:auto}.modal{display:flex;flex-direction:column;width:min(960px,90vw);height:min(600px,85vh);min-width:280px;min-height:240px;border:1px solid #00d9ff;background:#05050a;box-shadow:0 0 30px #0ff4;overflow:hidden;pointer-events:auto}.overlay.full .modal{width:100vw;height:100vh;border:0;box-shadow:none}header{flex:none;display:flex;align-items:center;gap:10px;padding:7px 8px 7px 12px;background:#080b12;border-bottom:1px solid #0d5666}.status{margin-left:auto;font-size:9px;letter-spacing:.15em;color:#7ff;white-space:nowrap}button{width:30px;height:28px;flex:none;border:1px solid #1a6675;background:#06151c;color:#9df;font:15px monospace;cursor:pointer}button:hover{border-color:#00e5ff;color:#fff}button:focus-visible{outline:1px solid #fff;outline-offset:2px}.stage{position:relative;flex:1;min-height:0;background:#05050a}canvas{position:absolute;inset:0;display:block;width:100%;height:100%;cursor:crosshair;touch-action:none;outline:none;background:#05050a}footer{flex:none;padding:5px 8px;border-top:1px solid #0d5666;background:#080b12;color:#5d8290;font-size:9px;line-height:1.4;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}@media(max-width:560px){.overlay{padding:8px}.modal{width:94vw;height:88vh}footer{font-size:8px}}</style><div class=overlay><section class=modal role=dialog aria-modal=true aria-label='Neon Hell, a Geometry Wars inspired arena shooter'><header><span class=status id=state>READY</span><button id=full type=button aria-label='Expand to full screen'>F</button><button id=close type=button aria-label='Close Neon Hell'>x</button></header><div class=stage><canvas tabindex=0 aria-label='Neon Hell game canvas'></canvas></div><footer>WASD move · arrows aim · Space fire · X bomb · mouse/LMB · pad L/R sticks · Esc pause · F expand</footer></section></div>`;

  const overlay = root.querySelector(".overlay");
  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const stateEl = root.querySelector("#state");
  const fullBtn = root.querySelector("#full");
  const ac = new AbortController();
  const signal = ac.signal;
  let W = 960;
  let H = 600;
  let dpr = 1;
  let started = false;
  let raf = 0;
  let last = 0;
  let padPoll = 0;

  const P = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 11, cool: 0, inv: 0 };
  const G = { t: 0, score: 0, lives: 3, mult: 1, kills: 0, bombs: 0, over: false, paused: true, ready: true, full: false, spawn: .35, power: 4.5, shake: 0, bossAt: 40, bossCount: 0, boss: null, bossBanner: 0, lastBoss: -1 };
  const POWER_R = 19;
  const keys = new Set();
  const mouse = { x: W / 2 + 80, y: H / 2, down: false };
  const aim = { source: "mouse", dx: 1, dy: 0 };
  const pad = { connected: false, moveX: 0, moveY: 0, fire: false, bomb: false, bombPrev: false, startPrev: false };
  const bullets = [];
  const enemies = [];
  const shots = [];
  const blasts = [];
  const pickups = [];
  const effects = { rapid: 0, spread: 0, shield: false, chain: 0, mortar: 0 };
  const parts = Array.from({ length: 360 }, () => ({ life: 0, x: 0, y: 0, vx: 0, vy: 0, c: "#fff" }));
  let partAt = 0;
  let wave = null;

  const TYPES = [
    { r: 10, hp: 1, score: 100, c: "#ff3b6b", sides: 4, speed: 58 },
    { r: 8, hp: 1, score: 120, c: "#21e6ff", sides: 3, speed: 128 },
    { r: 16, hp: 3, score: 350, c: "#b06bff", sides: 8, speed: 32 },
    { r: 5, hp: 1, score: 40, c: "#ff7bd5", sides: 4, speed: 105 },
  ];
  const POWERS = [
    { id: "rapid", label: "RAPID", glyph: "R", c: "#ffd34d", time: 9 },
    { id: "spread", label: "SPREAD", glyph: "W", c: "#ff7bd5", time: 9 },
    { id: "shield", label: "SHIELD", glyph: "S", c: "#6ef6ff", time: 0 },
    { id: "bomb", label: "BOMB", glyph: "B", c: "#ff9f43", time: 0 },
    { id: "chain", label: "CHAIN", glyph: "C", c: "#b48cff", time: 10 },
    { id: "mortar", label: "MORTAR", glyph: "M", c: "#ffd166", time: 10 },
  ];
  const BOSSES = [
    { id: "warden", name: "PRISM WARDEN", hp: 54, r: 44, score: 2400, c: "#ff3b6b", sides: [4, 3], pattern: "ring" },
    { id: "helix", name: "HELIX CORE", hp: 64, r: 42, score: 2800, c: "#b06bff", sides: [6, 4], pattern: "spiral" },
    { id: "hive", name: "HIVE MOTHER", hp: 72, r: 50, score: 3200, c: "#ff7bd5", sides: [8, 3], pattern: "hive" },
  ];
  const GAME_KEYS = new Set(["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "f", " ", "x"]);
  const rnd = (min, max) => min + Math.random() * (max - min);
  const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function aimDirection() {
    if (aim.source === "mouse") {
      const dx = mouse.x - P.x;
      const dy = mouse.y - P.y;
      const length = Math.hypot(dx, dy) || 1;
      return { dx: dx / length, dy: dy / length, angle: Math.atan2(dy, dx) };
    }
    return { dx: aim.dx, dy: aim.dy, angle: Math.atan2(aim.dy, aim.dx) };
  }

  function aimFromKeys() {
    const dx = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
    const dy = (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0);
    if (!dx && !dy) return;
    const length = Math.hypot(dx, dy);
    aim.source = "keys";
    aim.dx = dx / length;
    aim.dy = dy / length;
  }

  function readPad() {
    let gamepad = null;
    try {
      gamepad = [...(navigator.getGamepads?.() || [])].find((candidate) => candidate?.connected) || null;
    } catch { }
    pad.connected = Boolean(gamepad);
    if (!gamepad) {
      pad.moveX = pad.moveY = 0;
      pad.fire = false;
      pad.bomb = false;
      pad.bombPrev = false;
      pad.startPrev = false;
      return;
    }
    const dead = (value) => Math.abs(value) < .2 ? 0 : value;
    const pressed = (index) => Boolean(gamepad.buttons?.[index]?.pressed);
    let moveX = dead(gamepad.axes?.[0] || 0);
    let moveY = dead(gamepad.axes?.[1] || 0);
    if (pressed(14)) moveX -= 1;
    if (pressed(15)) moveX += 1;
    if (pressed(12)) moveY -= 1;
    if (pressed(13)) moveY += 1;
    const length = Math.hypot(moveX, moveY);
    if (length > 1) { moveX /= length; moveY /= length; }
    pad.moveX = moveX;
    pad.moveY = moveY;

    const ax = dead(gamepad.axes?.[2] || 0);
    const ay = dead(gamepad.axes?.[3] || 0);
    const aimLength = Math.hypot(ax, ay);
    if (aimLength > .28) {
      aim.source = "pad";
      aim.dx = ax / aimLength;
      aim.dy = ay / aimLength;
    }
    pad.fire = aimLength > .28 || pressed(0) || pressed(7) || pressed(5);
    pad.bomb = pressed(1) || pressed(2);

    const start = pressed(9);
    if (start && !pad.startPrev) {
      if (G.over) restart();
      else if (G.paused) resume();
      else pause();
    }
    pad.startPrev = start;

    if (pad.bomb && !pad.bombPrev && !G.paused && !G.over) dropBomb();
    pad.bombPrev = pad.bomb;
  }

  function remove(list, index) {
    list[index] = list[list.length - 1];
    list.pop();
  }

  function scroll(lock) {
    document.documentElement.style.overflow = lock ? "hidden" : previousOverflow;
  }

  function fit() {
    if (!canvas.isConnected) return;
    const w = Math.max(280, canvas.clientWidth | 0);
    const h = Math.max(180, canvas.clientHeight | 0);
    dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = w;
    H = h;
    P.x = clamp(P.x, P.r, W - P.r);
    P.y = clamp(P.y, P.r, H - P.r);
    if (!started) {
      P.x = W / 2;
      P.y = H / 2;
      mouse.x = W / 2 + 80;
      mouse.y = H / 2;
      started = true;
    }
    ctx.fillStyle = "#05050a";
    ctx.fillRect(0, 0, W, H);
    if (G.paused) drawPause();
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const p = parts[partAt++ % parts.length];
      const angle = rnd(0, Math.PI * 2);
      const speed = rnd(35, 260);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = rnd(.28, .85);
      p.c = color;
    }
  }

  function addEnemy(kind, x, y, vx = 0, vy = 0) {
    const type = TYPES[kind];
    const e = {
      kind, x, y, vx, vy, rot: rnd(0, Math.PI * 2), r: type.r, hp: type.hp,
      score: type.score, c: type.c, sides: type.sides,
      speed: type.speed + (kind === 3 ? 0 : G.t * (kind === 2 ? .2 : .55)),
    };
    if (kind === 1) {
      const angle = Math.atan2(P.y - y, P.x - x) + rnd(-.55, .55);
      e.vx = Math.cos(angle) * e.speed;
      e.vy = Math.sin(angle) * e.speed;
    }
    enemies.push(e);
  }

  function spawn() {
    if (enemies.length >= Math.min(G.boss ? 34 : 80, 10 + Math.floor(G.t * 1.2))) return;
    const kind = Math.random() < .16 ? 2 : Math.random() < .38 ? 1 : 0;
    const pad = 28;
    let x, y;
    for (let attempt = 0; attempt < 8; attempt++) {
      const side = (Math.random() * 4) | 0;
      if (side === 0) { x = rnd(pad, W - pad); y = pad; }
      else if (side === 1) { x = W - pad; y = rnd(pad, H - pad); }
      else if (side === 2) { x = rnd(pad, W - pad); y = H - pad; }
      else { x = pad; y = rnd(pad, H - pad); }
      if (dist2(x, y, P.x, P.y) > 125 ** 2) break;
    }
    if (dist2(x, y, P.x, P.y) <= 90 ** 2) return;
    addEnemy(kind, x, y);
  }

  function spawnPower() {
    if (pickups.length >= 2) return;
    const def = POWERS[(Math.random() * POWERS.length) | 0];
    let x = 0;
    let y = 0;
    let placed = false;
    for (let attempt = 0; attempt < 24; attempt++) {
      x = rnd(60, W - 60);
      y = rnd(70, H - 60);
      if (dist2(x, y, P.x, P.y) < 120 ** 2) continue;
      if (pickups.some((p) => dist2(p.x, p.y, x, y) < 95 ** 2)) continue;
      placed = true;
      break;
    }
    if (!placed) return;
    const angle = rnd(0, Math.PI * 2);
    const speed = rnd(38, 70);
    pickups.push({
      ...def, x, y, r: POWER_R, life: 8, rot: rnd(0, Math.PI * 2),
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    });
  }

  function applyPower(kind) {
    const def = POWERS.find((power) => power.id === kind);
    if (!def) return;
    if (def.id === "shield") effects.shield = true;
    else if (def.id === "bomb") G.bombs = Math.min(3, G.bombs + 1);
    else effects[def.id] = Math.max(effects[def.id], def.time);
    G.score += 50;
    if (G.score > best) best = G.score;
    burst(P.x, P.y, def.c, 26);
  }

  function chainBurst(e, depth) {
    if (effects.chain <= 0 || depth >= 2 || bullets.length >= 260) return;
    for (let i = 0; i < 3; i++) {
      const angle = rnd(0, Math.PI * 2);
      const speed = rnd(300, 460);
      bullets.push({
        x: e.x, y: e.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        c: "#b48cff", shard: true, bounce: 2, depth: depth + 1,
      });
    }
  }

  function pushShot(x, y, angle, speed, color) {
    if (shots.length >= 320) return;
    shots.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 4.2, c: color, life: 9 });
  }

  function nextBoss() {
    let index = (Math.random() * BOSSES.length) | 0;
    if (BOSSES.length > 1 && index === G.lastBoss) index = (index + 1 + ((Math.random() * (BOSSES.length - 1)) | 0)) % BOSSES.length;
    G.lastBoss = index;
    return BOSSES[index];
  }

  function spawnBoss() {
    if (G.over || G.boss) return false;
    const def = nextBoss();
    G.bossCount++;
    const boss = {
      boss: true, kind: -1, name: def.name, pattern: def.pattern,
      x: W / 2, y: -def.r, r: def.r, hp: def.hp + G.bossCount * 8, maxHp: def.hp + G.bossCount * 8,
      score: def.score, c: def.c, sides: def.sides, rot: rnd(0, Math.PI * 2), seed: rnd(0, 9),
      entering: true, fire: 1, fire2: 2.4, age: 0,
    };
    G.boss = boss;
    G.bossAt = G.t + 50;
    G.bossBanner = 2.6;
    G.shake = .45;
    enemies.push(boss);
    return true;
  }

  function updateBoss(e, dt) {
    if (e.entering) {
      e.y += 118 * dt;
      if (e.y >= 96) {
        e.y = 96;
        e.entering = false;
        e.fire = .8;
        e.fire2 = 2.2;
      }
      return;
    }
    e.age += dt;
    e.rot += dt * (e.pattern === "spiral" ? 1.8 : .55);
    e.x = W / 2 + Math.sin((G.t + e.seed) * .55) * Math.min(W * .24, 190);
    e.y = 96 + Math.sin((G.t + e.seed) * .9) * 8;
    e.fire -= dt;
    e.fire2 -= dt;
    const aimed = Math.atan2(P.y - e.y, P.x - e.x);

    if (e.pattern === "ring") {
      if (e.fire <= 0) {
        e.fire = 1.25;
        const count = 12 + Math.min(8, G.bossCount * 2);
        for (let i = 0; i < count; i++) pushShot(e.x, e.y, e.rot + (i * Math.PI * 2) / count, 178, e.c);
      }
      if (e.fire2 <= 0) {
        e.fire2 = 2.7;
        for (let i = -2; i <= 2; i++) pushShot(e.x, e.y, aimed + i * .16, 230, e.c);
      }
    } else if (e.pattern === "spiral") {
      if (e.fire <= 0) {
        e.fire = .16;
        pushShot(e.x, e.y, e.rot * 2.4, 195, e.c);
        pushShot(e.x, e.y, e.rot * 2.4 + Math.PI, 195, e.c);
      }
      if (e.fire2 <= 0) {
        e.fire2 = 2.8;
        for (let i = -3; i <= 3; i++) pushShot(e.x, e.y, aimed + i * .12, 232, e.c);
      }
    } else {
      if (e.fire <= 0) {
        e.fire = 1.6;
        for (let i = -3; i <= 3; i++) pushShot(e.x, e.y, aimed + i * .14, 212, e.c);
      }
      if (e.fire2 <= 0) {
        e.fire2 = 3.4;
        addEnemy(3, e.x - 34, e.y + 22);
        addEnemy(3, e.x + 34, e.y + 22);
        burst(e.x, e.y + 20, e.c, 18);
      }
    }
  }

  function hurt(index, amount, depth = 0, x, y) {
    const e = enemies[index];
    if (!e) return false;
    e.hp -= amount;
    if (e.hp <= 0) {
      kill(index, depth);
      return true;
    }
    burst(x ?? e.x, y ?? e.y, "#fff", e.boss ? 6 : 4);
    return false;
  }

  function detonateMortar(b) {
    const radius = b.aoe;
    blasts.push({ x: b.x, y: b.y, r: 0, max: radius, life: .42, maxLife: .42, c: "#ffd166" });
    burst(b.x, b.y, "#ffd166", 36);
    G.shake = Math.max(G.shake, .16);
    for (let j = enemies.length - 1; j >= 0; j--) {
      if (dist2(b.x, b.y, enemies[j].x, enemies[j].y) < radius ** 2) hurt(j, 3, b.depth || 0, b.x, b.y);
    }
  }

  function dropBomb() {
    if (G.over || G.paused || G.bombs <= 0) return;
    G.bombs--;
    P.inv = Math.max(P.inv, .45);
    G.shake = .55;
    wave = { x: P.x, y: P.y, r: 0, life: .5, max: 220 };
    burst(P.x, P.y, "#ff9f43", 52);
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (dist2(e.x, e.y, P.x, P.y) >= 220 ** 2) continue;
      if (e.boss) hurt(i, 12, 0, e.x, e.y);
      else kill(i, 0);
    }
  }

  function kill(index, depth = 0) {
    const e = enemies[index];
    remove(enemies, index);
    G.score += e.score * G.mult;
    if (G.score > best) best = G.score;
    G.kills++;
    if (G.kills % 8 === 0) G.mult = Math.min(9, G.mult + 1);
    if (e.boss) {
      G.boss = null;
      G.bossBanner = 0;
      G.bossAt = Math.max(G.bossAt, G.t + 20);
      G.shake = .8;
      shots.length = 0;
      burst(e.x, e.y, e.c, 78);
      blasts.push({ x: e.x, y: e.y, r: 0, max: 180, life: .65, maxLife: .65, c: e.c });
    } else {
      burst(e.x, e.y, e.c, e.kind === 2 ? 24 : 16);
      if (e.kind === 2) {
        for (let i = 0; i < 3; i++) addEnemy(3, e.x + rnd(-12, 12), e.y + rnd(-12, 12));
      }
    }
    chainBurst(e, depth);
  }

  function damage() {
    if (P.inv > 0 || G.over) return;
    if (effects.shield) {
      effects.shield = false;
      P.inv = .9;
      G.shake = .22;
      burst(P.x, P.y, "#6ef6ff", 28);
      return;
    }
    G.lives--;
    G.mult = 1;
    G.kills = 0;
    G.shake = .38;
    P.inv = 1.4;
    burst(P.x, P.y, "#ff3b6b", 32);
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.boss) continue;
      if (dist2(e.x, e.y, P.x, P.y) < 165 ** 2) {
        burst(e.x, e.y, e.c, 8);
        remove(enemies, i);
      }
    }
    if (G.lives <= 0) gameOver();
  }

  function gameOver() {
    G.over = true;
    G.paused = false;
    mouse.down = false;
    keys.clear();
    stateEl.textContent = "GAME OVER";
    if (best < G.score) best = G.score;
    setBest(best);
  }

  function restart() {
    G.t = 0;
    G.score = 0;
    G.lives = 3;
    G.mult = 1;
    G.kills = 0;
    G.bombs = 0;
    G.over = false;
    G.paused = false;
    G.ready = false;
    G.spawn = .35;
    G.power = 4.5;
    G.shake = 0;
    G.bossAt = 40;
    G.bossCount = 0;
    G.boss = null;
    G.bossBanner = 0;
    G.lastBoss = -1;
    bullets.length = 0;
    enemies.length = 0;
    shots.length = 0;
    blasts.length = 0;
    pickups.length = 0;
    effects.rapid = 0;
    effects.spread = 0;
    effects.shield = false;
    effects.chain = 0;
    effects.mortar = 0;
    wave = null;
    for (const p of parts) p.life = 0;
    P.x = W / 2;
    P.y = H / 2;
    P.vx = P.vy = 0;
    P.cool = P.inv = 0;
    mouse.down = false;
    keys.clear();
    pad.fire = false;
    pad.bombPrev = pad.startPrev = false;
    aim.source = "mouse";
    overlay.classList.remove("paused");
    stateEl.textContent = "RUNNING";
    scroll(true);
    canvas.focus({ preventScroll: true });
    stopPadPoll();
    start();
  }

  function pause() {
    if (G.paused || G.over) return;
    G.paused = true;
    G.ready = false;
    mouse.down = false;
    keys.clear();
    pad.fire = false;
    last = 0;
    stateEl.textContent = "PAUSED";
    overlay.classList.add("paused");
    scroll(false);
    setBest(best);
    canvas.blur();
    stop();
    startPadPoll();
    drawPause();
  }

  function resume() {
    if (!G.paused || G.over) return;
    G.paused = false;
    G.ready = false;
    last = 0;
    stopPadPoll();
    overlay.classList.remove("paused");
    stateEl.textContent = "RUNNING";
    scroll(true);
    canvas.focus({ preventScroll: true });
    start();
  }

  function setFull(next) {
    G.full = next;
    overlay.classList.toggle("full", next);
    fullBtn.textContent = "F";
    fullBtn.setAttribute("aria-label", next ? "Restore the window" : "Expand to full screen");
    requestAnimationFrame(fit);
  }

  function drawPause() {
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "rgba(2,3,8,.74)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#00e5ff";
    ctx.font = "600 26px monospace";
    ctx.fillText(G.ready ? "CLICK TO PLAY" : "PAUSED", W / 2, H / 2 - 12);
    ctx.fillStyle = "#9ad";
    ctx.font = "11px monospace";
    ctx.fillText(G.ready ? "THE PAGE KEEPS ITS MOUSE AND KEYS UNTIL YOU START" : "CLICK TO RESUME / THE PAGE HAS THE KEYS", W / 2, H / 2 + 14);
    ctx.fillStyle = "#5d8290";
    ctx.font = "9px monospace";
    ctx.fillText("WASD MOVE · ARROWS AIM · SPACE FIRE · X BOMB · PAD L/R STICKS", W / 2, H / 2 + 34);
    ctx.restore();
  }

  function drawPoly(x, y, radius, sides, angle, color) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = angle + (i * Math.PI * 2) / sides;
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  function drawPickups() {
    for (const k of pickups) {
      if (k.life < 2.5 && Math.floor(G.t * 10) % 2 === 0) continue;
      const pulse = 1 + Math.sin(G.t * 3 + k.rot) * .12;
      ctx.save();
      ctx.translate(k.x, k.y);
      ctx.rotate(k.rot);
      ctx.scale(pulse, pulse);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2;
        const x = Math.cos(angle) * k.r;
        const y = Math.sin(angle) * k.r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = k.c + "22";
      ctx.fill();
      ctx.strokeStyle = k.c;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.fillStyle = k.c;
      ctx.font = "700 13px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(k.glyph, k.x, k.y + 1);
      ctx.restore();
    }
  }

  function drawHud() {
    ctx.textAlign = "left";
    ctx.fillStyle = "#bdf7ff";
    ctx.font = "600 12px monospace";
    ctx.fillText("SCORE " + fmt(G.score), 12, 20);
    ctx.fillStyle = "#5d8290";
    ctx.font = "9px monospace";
    ctx.fillText("SITE BEST " + fmt(best), 12, 34);
    ctx.fillStyle = "#5d8290";
    ctx.font = "9px monospace";
    ctx.fillText("ARENA 01", 12, 48);
    let effectLine = 62;
    for (const power of POWERS) {
      const left = effects[power.id];
      if (!left) continue;
      ctx.fillStyle = power.c;
      ctx.font = "600 9px monospace";
      ctx.fillText(power.label + (power.time ? " " + Math.ceil(left) + "s" : ""), 12, effectLine);
      effectLine += 12;
    }
    ctx.fillStyle = "#ff6b81";
    ctx.font = "600 12px monospace";
    ctx.fillText("◆".repeat(Math.max(0, G.lives)), 12, H - 12);
    ctx.textAlign = "right";
    ctx.fillStyle = "#b48cff";
    ctx.fillText("x" + G.mult, W - 12, 20);
    if (G.bombs > 0) {
      ctx.fillStyle = "#ff9f43";
      ctx.font = "600 10px monospace";
      ctx.fillText("BOMB x" + G.bombs, W - 12, 34);
    }
    if (G.boss) {
      const barWidth = Math.min(300, W * .44);
      const barX = W / 2 - barWidth / 2;
      const ratio = clamp(G.boss.hp / G.boss.maxHp, 0, 1);
      ctx.fillStyle = "#220d16";
      ctx.fillRect(barX, 9, barWidth, 6);
      ctx.fillStyle = G.boss.c;
      ctx.fillRect(barX, 9, barWidth * ratio, 6);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f3c6d7";
      ctx.font = "600 9px monospace";
      ctx.fillText(G.boss.name + "  " + Math.max(0, Math.ceil(G.boss.hp)) + "/" + G.boss.maxHp, W / 2, 28);
      if (G.bossBanner > 0) {
        ctx.globalAlpha = Math.min(1, G.bossBanner);
        ctx.fillStyle = "#ffd166";
        ctx.fillText("⚠ " + G.boss.name + " INBOUND", W / 2, 44);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawOver() {
    ctx.save();
    ctx.fillStyle = "rgba(2,3,8,.72)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff3b6b";
    ctx.font = "600 26px monospace";
    ctx.fillText("SIGNAL LOST", W / 2, H / 2 - 24);
    ctx.fillStyle = "#e8f7ff";
    ctx.font = "12px monospace";
    ctx.fillText("SCORE " + fmt(G.score) + " · SITE BEST " + fmt(best), W / 2, H / 2 + 4);
    ctx.fillStyle = "#00e5ff";
    ctx.fillText("CLICK TO RESTART", W / 2, H / 2 + 30);
    ctx.restore();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "rgba(5,5,10,.3)";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (G.shake > 0) {
      const amount = G.shake * 14;
      ctx.translate(rnd(-amount, amount), rnd(-amount, amount));
    }
    ctx.globalCompositeOperation = "lighter";

    for (const p of parts) {
      if (p.life <= 0) continue;
      ctx.globalAlpha = Math.min(1, p.life * 1.8);
      ctx.strokeStyle = p.c;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * .025, p.y - p.vy * .025);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (wave) {
      ctx.globalAlpha = Math.max(0, wave.life / .5);
      ctx.strokeStyle = "#ff9f43";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = Math.max(0, wave.life / .8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.r * .72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const b of blasts) {
      const fade = Math.max(0, b.life / b.maxLife);
      ctx.globalAlpha = fade;
      ctx.strokeStyle = b.c;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = fade * .55;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * .64, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    drawPickups();

    for (const e of enemies) {
      if (e.boss) {
        drawPoly(e.x, e.y, e.r, e.sides[0], e.rot, e.c);
        drawPoly(e.x, e.y, e.r * .66, e.sides[1], -e.rot * .8, e.c);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * .18, 0, Math.PI * 2);
        ctx.fillStyle = e.c;
        ctx.fill();
      } else {
        drawPoly(e.x, e.y, e.r, e.sides, e.rot, e.c);
      }
    }

    for (const s of shots) {
      ctx.globalAlpha = .38;
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * .55, 0, Math.PI * 2);
      ctx.fill();
    }

    const shipAim = aimDirection();
    if (!G.over && (P.inv <= 0 || (G.t * 20 | 0) % 2)) {
      drawPoly(P.x, P.y, P.r + 2, 3, shipAim.angle, "#00e5ff");
    }
    if (effects.shield && !G.over) {
      ctx.beginPath();
      ctx.arc(P.x, P.y, P.r + 7, 0, Math.PI * 2);
      ctx.strokeStyle = "#6ef6ff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    for (const b of bullets) {
      if (!b.mortar) continue;
      ctx.globalAlpha = .35;
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff6c7";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    for (const b of bullets) {
      if (b.shard || b.mortar) continue;
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * .018, b.y - b.vy * .018);
    }
    ctx.strokeStyle = "#6ef6ff";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    for (const b of bullets) {
      if (!b.shard) continue;
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * .024, b.y - b.vy * .024);
    }
    ctx.strokeStyle = "#b48cff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();

    const reticleX = aim.source === "mouse" ? mouse.x : P.x + shipAim.dx * 72;
    const reticleY = aim.source === "mouse" ? mouse.y : P.y + shipAim.dy * 72;
    ctx.strokeStyle = aim.source === "mouse" ? "rgba(200,255,255,.75)" : "rgba(255,209,102,.85)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(reticleX - 7, reticleY);
    ctx.lineTo(reticleX + 7, reticleY);
    ctx.moveTo(reticleX, reticleY - 7);
    ctx.lineTo(reticleX, reticleY + 7);
    ctx.stroke();

    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
    drawHud();
    if (G.over) drawOver();
  }

  function input() {
    let moveX = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0) + pad.moveX;
    let moveY = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0) + pad.moveY;
    const length = Math.hypot(moveX, moveY);
    if (length > 1) { moveX /= length; moveY /= length; }
    const direction = aimDirection();
    return {
      moveX, moveY,
      aimX: P.x + direction.dx * 120,
      aimY: P.y + direction.dy * 120,
      angle: direction.angle,
      firing: mouse.down || keys.has(" ") || pad.fire,
    };
  }

  function update(dt) {
    if (G.over) {
      for (const p of parts) {
        if (p.life <= 0) continue;
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      G.shake = Math.max(0, G.shake - dt);
      return;
    }

    G.t += dt;
    P.inv = Math.max(0, P.inv - dt);
    const move = input();
    P.vx += move.moveX * 1250 * dt;
    P.vy += move.moveY * 1250 * dt;
    // Low drag keeps the ship sliding after the keys are released. The cap
    // leaves enough speed to cross the arena, not enough to lose control.
    const drag = Math.exp(-2.8 * dt);
    P.vx *= drag;
    P.vy *= drag;
    const speed = Math.hypot(P.vx, P.vy);
    if (speed > 300) { P.vx = P.vx / speed * 300; P.vy = P.vy / speed * 300; }
    P.x = clamp(P.x + P.vx * dt, P.r, W - P.r);
    P.y = clamp(P.y + P.vy * dt, P.r, H - P.r);
    // Do not keep pushing into a wall once the hull is there; the next input
    // should move away immediately instead of spending the stored velocity.
    if (P.x <= P.r || P.x >= W - P.r) P.vx = 0;
    if (P.y <= P.r || P.y >= H - P.r) P.vy = 0;

    for (const key of ["rapid", "spread", "chain", "mortar"]) effects[key] = Math.max(0, effects[key] - dt);
    G.bossBanner = Math.max(0, G.bossBanner - dt);
    if (wave) {
      wave.life -= dt;
      wave.r = wave.max * clamp(1 - wave.life / .5, 0, 1);
      if (wave.life <= 0) wave = null;
    }
    for (let i = blasts.length - 1; i >= 0; i--) {
      const blast = blasts[i];
      blast.life -= dt;
      blast.r = blast.max * clamp(1 - blast.life / blast.maxLife, 0, 1);
      if (blast.life <= 0) remove(blasts, i);
    }

    G.power -= dt;
    if (G.power <= 0) {
      spawnPower();
      G.power = rnd(14, 22);
    }
    for (let i = pickups.length - 1; i >= 0; i--) {
      const k = pickups[i];
      k.life -= dt;
      k.rot += dt * 1.7;
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      if (k.x < k.r || k.x > W - k.r) {
        k.vx *= -1;
        k.x = clamp(k.x, k.r, W - k.r);
      }
      if (k.y < k.r || k.y > H - k.r) {
        k.vy *= -1;
        k.y = clamp(k.y, k.r, H - k.r);
      }
      if (dist2(k.x, k.y, P.x, P.y) < (P.r + k.r + 2) ** 2) {
        applyPower(k.id);
        remove(pickups, i);
      } else if (k.life <= 0) {
        remove(pickups, i);
      }
    }

    P.cool -= dt;
    if (move.firing && P.cool <= 0) {
      if (effects.mortar > 0) {
        P.cool = .5;
        bullets.push({
          x: P.x + Math.cos(move.angle) * 18, y: P.y + Math.sin(move.angle) * 18,
          vx: Math.cos(move.angle) * 360, vy: Math.sin(move.angle) * 360,
          mortar: true, travel: 0, range: 250, aoe: 82,
        });
      } else {
        P.cool = effects.rapid > 0 ? .055 : .1;
        const offsets = effects.spread > 0 ? [-.15, 0, .15] : [0];
        for (const offset of offsets) {
          bullets.push({ x: P.x + Math.cos(move.angle + offset) * 15, y: P.y + Math.sin(move.angle + offset) * 15, vx: Math.cos(move.angle + offset) * 620, vy: Math.sin(move.angle + offset) * 620 });
        }
      }
    }

    G.spawn -= dt;
    if (G.spawn <= 0) {
      spawn();
      G.spawn = Math.max(.2, 1.2 - G.t * .015);
    }
    if (!G.boss && G.t >= G.bossAt) spawnBoss();

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.boss) {
        updateBoss(e, dt);
      } else if (e.kind === 1) {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.x < e.r || e.x > W - e.r) { e.vx *= -1; e.x = clamp(e.x, e.r, W - e.r); }
        if (e.y < e.r || e.y > H - e.r) { e.vy *= -1; e.y = clamp(e.y, e.r, H - e.r); }
      } else {
        const angle = Math.atan2(P.y - e.y, P.x - e.x);
        e.x += Math.cos(angle) * e.speed * dt;
        e.y += Math.sin(angle) * e.speed * dt;
      }
      if (!e.boss) e.rot += dt * (e.kind === 1 ? 2 : .8);
      if (dist2(e.x, e.y, P.x, P.y) < (e.r + P.r) ** 2) {
        if (e.boss) {
          const away = Math.atan2(P.y - e.y, P.x - e.x);
          P.x = clamp(P.x + Math.cos(away) * 38, P.r, W - P.r);
          P.y = clamp(P.y + Math.sin(away) * 38, P.r, H - P.r);
          if (P.inv <= 0) damage();
          P.inv = Math.max(P.inv, .6);
        } else {
          remove(enemies, i);
          damage();
        }
      }
    }

    for (let i = shots.length - 1; i >= 0; i--) {
      const shot = shots[i];
      shot.life -= dt;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      if (shot.life <= 0 || shot.x < -20 || shot.x > W + 20 || shot.y < -20 || shot.y > H + 20) {
        remove(shots, i);
        continue;
      }
      if (dist2(shot.x, shot.y, P.x, P.y) < (P.r + shot.r) ** 2) {
        remove(shots, i);
        damage();
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.mortar) {
        b.travel += Math.hypot(b.vx, b.vy) * dt;
        if (b.travel >= b.range) {
          detonateMortar(b);
          remove(bullets, i);
          continue;
        }
      }
      if (b.bounce > 0) {
        if (b.x < 3 || b.x > W - 3) {
          b.x = clamp(b.x, 3, W - 3);
          b.vx *= -1;
          b.bounce--;
        }
        if (b.y < 3 || b.y > H - 3) {
          b.y = clamp(b.y, 3, H - 3);
          b.vy *= -1;
          b.bounce--;
        }
      }
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
        if (b.mortar) {
          b.x = clamp(b.x, 0, W);
          b.y = clamp(b.y, 0, H);
          detonateMortar(b);
        }
        remove(bullets, i);
        continue;
      }
      if (b.mortar) continue;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (dist2(b.x, b.y, e.x, e.y) < (e.r + 3) ** 2) {
          remove(bullets, i);
          hurt(j, 1, b.depth || 0, b.x, b.y);
          break;
        }
      }
    }

    for (const p of parts) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= .98;
      p.vy *= .98;
    }
    G.shake = Math.max(0, G.shake - dt);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    readPad();
    if (G.paused) return;
    const dt = last ? Math.min(.033, (now - last) / 1000) : 0;
    last = now;
    update(dt);
    render();
  }

  function start() {
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(loop);
    }
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function startPadPoll() {
    if (!padPoll) padPoll = setInterval(readPad, 120);
  }

  function stopPadPoll() {
    if (padPoll) clearInterval(padPoll);
    padPoll = 0;
  }

  function close() {
    if (!host.isConnected) return;
    stop();
    stopPadPoll();
    observer.disconnect();
    ac.abort();
    scroll(false);
    if (best < G.score) best = G.score;
    setBest(best);
    host.remove();
    if (globalThis.__BL_TEST__?.neonHell?.close === close) delete globalThis.__BL_TEST__.neonHell;
    if (previousFocus?.isConnected) {
      try { previousFocus.focus({ preventScroll: true }); } catch { }
    }
  }

  function onKey(event) {
    if (G.paused || G.over) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) pause();
      return;
    }
    if (key === " ") {
      event.preventDefault();
      event.stopPropagation();
      keys.add(" ");
      return;
    }
    if (key === "x") {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) dropBomb();
      return;
    }
    if (key === "f") {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) setFull(!G.full);
      return;
    }
    if (GAME_KEYS.has(key)) {
      event.preventDefault();
      event.stopPropagation();
      keys.add(key);
      if (key.startsWith("Arrow")) aimFromKeys();
    }
  }

  function onKeyUp(event) {
    if (G.paused || G.over) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (GAME_KEYS.has(key)) {
      event.preventDefault();
      event.stopPropagation();
      keys.delete(key);
      if (key.startsWith("Arrow")) aimFromKeys();
    }
  }

  function aimAt(event) {
    const box = canvas.getBoundingClientRect();
    mouse.x = clamp(event.clientX - box.left, 0, W);
    mouse.y = clamp(event.clientY - box.top, 0, H);
    aim.source = "mouse";
  }

  function pointerDown(event) {
    if (event.button !== 0) return;
    if (G.over) { restart(); return; }
    if (G.paused) { resume(); return; }
    aimAt(event);
    mouse.down = true;
  }

  function pointerUp() {
    mouse.down = false;
  }

  function pointerMove(event) {
    aimAt(event);
  }

  canvas.addEventListener("pointermove", pointerMove, { signal });
  canvas.addEventListener("pointerdown", pointerDown, { signal });
  canvas.addEventListener("pointerleave", pointerUp, { signal });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault(), { signal });
  window.addEventListener("pointerup", pointerUp, { capture: true, signal });
  window.addEventListener("keydown", onKey, { capture: true, signal });
  window.addEventListener("keyup", onKeyUp, { capture: true, signal });
  window.addEventListener("pagehide", close, { signal });
  window.addEventListener("blur", () => { if (!G.paused && !G.over) pause(); }, { signal });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !G.paused && !G.over) pause();
  }, { signal });

  fullBtn.addEventListener("click", () => setFull(!G.full), { signal });
  root.querySelector("#close").addEventListener("click", close, { signal });
  const observer = new ResizeObserver(fit);
  observer.observe(root.querySelector(".stage"));
  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.neonHell = {
      game: G, player: P, enemies, bullets, shots, blasts, parts, pickups, effects, keys, pad, aim,
      close, pause, resume, restart, damage, spawn, spawnPower, applyPower, dropBomb, spawnBoss, addEnemy, hurt,
    };
  }

  overlay.classList.add("paused");
  (document.body || document.documentElement).appendChild(host);
  scroll(false);
  fit();
  startPadPoll();
})();
