/**
 * @name 💥 Will it run Doom?
 * @category view
 * @description Open actual shareware Doom, Episode 1, in a full-screen panel with a real WAD and WebAssembly engine.
 * @tags doom, game, wasm, shareware, fun, easter egg
 * @added 2026-10-28
 * @featured false
 */
(() => {
  try { window.__blDoomClose?.(); } catch {}
  if (document.getElementById("bl-doom-host")) return;

  const base = globalThis.__BL_DOOM_BASE__ || "https://spuds0588.github.io/Bookmarklet-Library/doom/";
  const host = document.createElement("div");
  host.id = "bl-doom-host";
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host{display:block}
    *{box-sizing:border-box}
    .wrap{position:fixed;inset:0;display:flex;flex-direction:column;background:#000;color:#eee;font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    header{flex:none;display:flex;align-items:center;gap:18px;padding:10px 14px;background:#0c0c0c;border-bottom:1px solid #2b2b2b}
    .brand{display:flex;flex-direction:column;gap:2px;min-width:0}
    .kicker{font-size:9px;line-height:1.2;letter-spacing:.16em;text-transform:uppercase;color:#b08a3e}
    h2{margin:0;font-size:15px;line-height:1.2;font-weight:600;color:#f4f4f4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .actions{margin-left:auto;display:flex;align-items:center;gap:8px;flex:none}
    .open{display:inline-flex;align-items:center;gap:6px;border:1px solid #3a3a3a;padding:7px 9px;color:#d8b25a;font-size:11px;text-decoration:none;white-space:nowrap}
    .open:hover{border-color:#d8b25a}
    .close{width:34px;height:34px;flex:none;border:1px solid #3a3a3a;background:transparent;color:#ddd;font-size:22px;line-height:1;cursor:pointer}
    .close:hover{border-color:#d8b25a;color:#fff}
    .stage{position:relative;flex:1;min-height:0;background:#000}
    iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;z-index:2}
    .loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;padding:24px;text-align:center;background:#000;color:#aaa;z-index:1}
    .loading[hidden]{display:none}
    .spinner{width:36px;height:36px;border:3px solid #2b2b2b;border-top-color:#d8b25a;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .loading p{margin:0;color:#ddd;font-size:13px}
    .loading small{max-width:40ch;color:#777;font-size:10px;line-height:1.5}
    @media(max-width:560px){
      header{gap:10px;padding:8px 10px}
      .kicker{display:none}
      h2{font-size:13px}
      .open{padding:6px 7px;font-size:10px}
      .close{width:30px;height:30px}
    }
  </style>
  <div class="wrap">
    <header>
      <div class="brand">
        <span class="kicker">Shareware Episode 1 · WebAssembly</span>
        <h2>💥 Will it run Doom?</h2>
      </div>
      <div class="actions">
        <a class="open" href="${base}" target="_blank" rel="noopener">Open in tab ↗</a>
        <button class="close" type="button" aria-label="Close Doom">×</button>
      </div>
    </header>
    <div class="stage">
      <div class="loading" id="loading">
        <div class="spinner" aria-hidden="true"></div>
        <p>Loading actual Doom…</p>
        <small>The first load pulls about 7 MB of engine and game data. If this panel stays black, this page blocks frames; use Open in tab.</small>
      </div>
      <iframe title="Doom" allow="autoplay; fullscreen; gamepad"></iframe>
    </div>
  </div>`;

  const loading = root.querySelector("#loading");
  const frame = root.querySelector("iframe");
  const page = document.documentElement;
  const previousOverflow = page.style.overflow;
  page.style.overflow = "hidden";
  const close = () => {
    clearTimeout(slow);
    page.style.overflow = previousOverflow;
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("pagehide", close);
    host.remove();
    if (window.__blDoomClose === close) window.__blDoomClose = null;
  };
  const onKey = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    close();
  };
  const slow = setTimeout(() => {
    const note = loading.querySelector("p");
    if (note) note.textContent = "Still loading. If this page blocks frames, use Open in tab.";
  }, 20000);

  frame.addEventListener("load", () => {
    loading.hidden = true;
    clearTimeout(slow);
    try { frame.focus(); } catch {}
  });
  frame.src = base;
  root.querySelector(".close").addEventListener("click", close);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("pagehide", close, { once: true });
  window.__blDoomClose = close;
  (document.body || document.documentElement).appendChild(host);
  if (globalThis.__BL_TEST__) globalThis.__BL_TEST__.doom = { close, frame, src: base };
})();
