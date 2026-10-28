/**
 * @name 💥 Will it run Doom?
 * @category games
 * @description Open actual shareware Doom, Episode 1, in a window with a real WAD and WebAssembly engine.
 * @tags doom, game, wasm, shareware, fun, easter egg
 * @added 2026-10-28
 * @featured false
 */
(() => {
  try { window.__blDoomClose?.(); } catch { }
  if (document.getElementById("bl-doom-host")) return;

  const base = globalThis.__BL_DOOM_BASE__ || "https://spuds0588.github.io/Bookmarklet-Library/doom/";
  const host = document.createElement("div");
  host.id = "bl-doom-host";
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host{display:block}
    *{box-sizing:border-box}
    .overlay{position:fixed;inset:0;display:grid;place-items:center;padding:16px;background:rgba(5,5,5,.64)}
    .wrap{display:flex;flex-direction:column;width:min(960px,calc(100vw - 32px),calc((100vh - 120px) * 1.6));min-width:0;border:1px solid #333;background:#000;color:#eee;font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;box-shadow:0 30px 80px rgba(0,0,0,.7)}
    .overlay.full{padding:0;background:#000}
    .wrap.full{width:100vw;height:100vh;border:0;box-shadow:none}
    header{flex:none;display:flex;align-items:center;gap:16px;padding:8px 10px 8px 14px;background:#0c0c0c;border-bottom:1px solid #2b2b2b}
    .brand{display:flex;flex-direction:column;gap:2px;min-width:0}
    .kicker{font-size:9px;line-height:1.2;letter-spacing:.16em;text-transform:uppercase;color:#b08a3e}
    h2{margin:0;font-size:15px;line-height:1.2;font-weight:600;color:#f4f4f4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .actions{margin-left:auto;display:flex;align-items:center;gap:8px;flex:none}
    .expand,.open{display:inline-flex;align-items:center;gap:6px;border:1px solid #3a3a3a;background:transparent;padding:7px 9px;color:#d8b25a;font:inherit;font-size:11px;line-height:1;text-decoration:none;white-space:nowrap;cursor:pointer}
    .expand:hover,.open:hover{border-color:#d8b25a;color:#fff}
    .expand[aria-pressed="true"]{border-color:#d8b25a;background:#1a1710;color:#f5df9a}
    .narrow{display:none}
    .close{width:34px;height:34px;flex:none;border:1px solid #3a3a3a;background:transparent;color:#ddd;font-size:22px;line-height:1;cursor:pointer}
    .close:hover{border-color:#d8b25a;color:#fff}
    .stage{position:relative;flex:1;min-height:0;aspect-ratio:16/10;background:#000}
    .wrap.full .stage{aspect-ratio:auto}
    iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;z-index:2}
    .controls{flex:none;padding:8px 14px;border-top:1px solid #2b2b2b;background:#0c0c0c;color:#8b8b8b;font-size:10px;line-height:1.6;letter-spacing:.02em;text-align:center}
    .loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;padding:24px;text-align:center;background:#000;color:#aaa;z-index:1}
    .loading[hidden]{display:none}
    .spinner{width:36px;height:36px;border:3px solid #2b2b2b;border-top-color:#d8b25a;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .loading p{margin:0;color:#ddd;font-size:13px}
    .loading small{max-width:40ch;color:#777;font-size:10px;line-height:1.5}
    @media(max-width:620px){
      .overlay{padding:8px}
      header{gap:8px;padding:6px 8px}
      .kicker{display:none}
      h2{font-size:13px}
      .actions{gap:6px}
      .expand,.open{padding:6px 7px;font-size:10px}
      .close{width:30px;height:30px}
      .wide{display:none}
      .narrow{display:inline}
      .controls{padding:7px 8px;font-size:9.5px}
    }
  </style>
  <div class="overlay">
    <section class="wrap" role="dialog" aria-modal="true" aria-label="Will it run Doom?">
      <header>
        <div class="brand">
          <span class="kicker">Shareware Episode 1 · WebAssembly</span>
          <h2>💥 Will it run Doom?</h2>
        </div>
        <div class="actions">
          <button class="expand" type="button" aria-pressed="false" aria-label="Expand Doom to the full window">Expand ⤢</button>
          <a class="open" href="${base}" target="_blank" rel="noopener"><span class="wide">Open in tab</span><span class="narrow">Tab</span> ↗</a>
          <button class="close" type="button" aria-label="Close Doom">×</button>
        </div>
      </header>
      <div class="stage">
        <div class="loading" id="loading">
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading actual Doom…</p>
          <small>The first load pulls about 7 MB of engine and game data. If this window stays black, this page blocks frames; use Open in tab.</small>
        </div>
        <iframe title="Doom" allow="autoplay; fullscreen; gamepad; pointer-lock"></iframe>
      </div>
      <div class="controls">WASD moves · ←/→ turns · mouse looks · Ctrl / click fires · Space opens · Shift runs · Tab map · Esc pauses · Close exits</div>
    </section>
  </div>`;

  const overlay = root.querySelector(".overlay");
  const wrap = root.querySelector(".wrap");
  const loading = root.querySelector("#loading");
  const frame = root.querySelector("iframe");
  const expand = root.querySelector(".expand");
  const page = document.documentElement;
  const previousOverflow = page.style.overflow;
  const previousFocus = document.activeElement;
  page.style.overflow = "hidden";
  let full = false;

  const releasePointer = () => {
    try {
      frame.contentWindow?.postMessage({ source: "bl-doom", type: "release" }, "*");
    } catch { }
  };
  const setFull = (next) => {
    full = next;
    wrap.classList.toggle("full", full);
    overlay.classList.toggle("full", full);
    expand.setAttribute("aria-pressed", String(full));
    expand.setAttribute("aria-label", full ? "Restore the Doom window" : "Expand Doom to the full window");
    expand.textContent = full ? "Shrink ⤡" : "Expand ⤢";
  };
  const close = () => {
    clearTimeout(slow);
    releasePointer();
    page.style.overflow = previousOverflow;
    window.removeEventListener("pagehide", close);
    host.remove();
    if (window.__blDoomClose === close) window.__blDoomClose = null;
    if (previousFocus?.isConnected) {
      try { previousFocus.focus({ preventScroll: true }); } catch { }
    }
  };
  const slow = setTimeout(() => {
    const note = loading.querySelector("p");
    if (note) note.textContent = "Still loading. If this page blocks frames, use Open in tab.";
  }, 20000);

  frame.addEventListener("load", () => {
    loading.hidden = true;
    clearTimeout(slow);
  });
  frame.src = base;
  expand.addEventListener("click", () => setFull(!full));
  root.querySelector(".close").addEventListener("click", close);
  window.addEventListener("pagehide", close, { once: true });
  window.__blDoomClose = close;
  (document.body || document.documentElement).appendChild(host);
  if (globalThis.__BL_TEST__) globalThis.__BL_TEST__.doom = { close, frame, src: base, setFull, isFull: () => full };
})();
