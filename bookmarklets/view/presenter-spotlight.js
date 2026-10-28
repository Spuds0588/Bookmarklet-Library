/**
 * @name 🔦 Focus Spotlight presenter
 * @category view
 * @description Dim the page except a circle that follows the pointer; right-click toggles the dimming and Esc exits.
 * @tags presenter, spotlight, focus, demo, screen, pointer
 * @added 2026-10-28
 * @featured false
 */
(() => {
  try { window.__blSpotlightClose?.(); } catch {}
  const ID = "bl-spotlight";
  document.getElementById(ID)?.remove();

  const host = document.createElement("div");
  host.id = ID;
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host{color-scheme:light dark}
    *{box-sizing:border-box}
    .spot{position:fixed;inset:0;background:radial-gradient(circle var(--r,150px) at var(--x,50%) var(--y,50%),transparent 0,rgba(0,0,0,.82) 100%)}
    .bar{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);max-width:calc(100vw - 24px);padding:7px 11px;background:#111;color:#fff;font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.04em;text-align:center;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.3)}
    @media(prefers-color-scheme:dark){.bar{background:#f5f5f5;color:#111}}
    @media(max-width:560px){.bar{white-space:normal}}
  </style><div class="spot"></div><div class="bar">Presenter spotlight · Right-click toggles dimming · Esc exits</div>`;

  const spot = root.querySelector(".spot");
  const bar = root.querySelector(".bar");
  let radius = 150;
  let dimmed = true;
  const place = (x, y) => {
    spot.style.setProperty("--x", `${x}px`);
    spot.style.setProperty("--y", `${y}px`);
  };
  const paint = () => {
    spot.style.background = dimmed
      ? "radial-gradient(circle var(--r,150px) at var(--x,50%) var(--y,50%),transparent 0,rgba(0,0,0,.82) 100%)"
      : "none";
    bar.textContent = dimmed
      ? "Presenter spotlight · Right-click toggles dimming · Esc exits"
      : "Dimming off · Right-click restores it · Esc exits";
  };
  const onMove = (event) => place(event.clientX, event.clientY);
  const onContext = (event) => {
    event.preventDefault();
    dimmed = !dimmed;
    paint();
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
    if (event.key === "[" || event.key === "]") {
      radius = Math.max(60, Math.min(480, radius + (event.key === "]" ? 30 : -30)));
      spot.style.setProperty("--r", `${radius}px`);
    }
  };
  const close = () => {
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("contextmenu", onContext, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("pagehide", close);
    host.remove();
    if (window.__blSpotlightClose === close) window.__blSpotlightClose = null;
  };

  place(window.innerWidth / 2, window.innerHeight / 2);
  spot.style.setProperty("--r", `${radius}px`);
  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("contextmenu", onContext, true);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("pagehide", close);
  window.__blSpotlightClose = close;
  (document.body || document.documentElement).appendChild(host);
})();
