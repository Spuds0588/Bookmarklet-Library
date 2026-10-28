/**
 * @name 🏗️ Environment & Route Switcher
 * @category devtools
 * @description Jump between the same route on production, staging and localhost while keeping the path, query and hash.
 * @tags environment, staging, localhost, route, switch, qa, dev
 * @added 2026-10-28
 * @featured false
 */
(() => {
  const ID = "bl-env-host";
  const existing = document.getElementById(ID);
  if (existing) {
    existing.shadowRoot?.querySelector("input")?.focus();
    return;
  }

  const normalize = (value) => {
    let text = String(value || "").trim();
    if (!text) return null;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
      text = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(text) ? `http://${text}` : `https://${text}`;
    }
    try {
      const url = new URL(text);
      if (!/^https?:$/.test(url.protocol)) return null;
      return url.origin;
    } catch {
      return null;
    }
  };
  const targetFor = (origin) => `${origin}${location.pathname}${location.search}${location.hash}`;
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem("bl:envs") || "{}"); } catch { return {}; }
  })();
  const host = location.hostname;
  const base = host.replace(/^(staging|dev|test)\./i, "");
  const defaults = {
    production: saved.production || (/^(staging|dev|test)\./i.test(host) ? `${location.protocol}//${base}` : location.origin),
    staging: saved.staging || (base === "localhost" || base === "127.0.0.1" ? "http://localhost:3000" : `${location.protocol}//staging.${base}`),
    local: saved.local || "http://localhost:3000",
  };

  const hostElement = document.createElement("div");
  hostElement.id = ID;
  hostElement.style.cssText = "position:fixed;inset:0;z-index:2147483647";
  const root = hostElement.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host{color-scheme:light dark;font:14px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
    *{box-sizing:border-box}
    .scrim{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(0,0,0,.52)}
    .panel{width:min(600px,100%);max-height:min(780px,calc(100vh - 44px));display:flex;flex-direction:column;background:#fff;color:#111;border:1px solid #111;box-shadow:0 24px 80px rgba(0,0,0,.35)}
    @media(prefers-color-scheme:dark){.scrim{background:rgba(0,0,0,.72)}.panel{background:#111;color:#f5f5f5;border-color:#f5f5f5}}
    header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px 14px;border-bottom:1px solid #bbb}
    @media(prefers-color-scheme:dark){header{border-color:#3a3a3a}}
    .kicker{margin:0 0 4px;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.62}
    h2{margin:0;font-size:20px;line-height:1.2;font-weight:600}
    .close{width:34px;height:34px;flex:none;border:1px solid #bbb;background:transparent;color:inherit;font-size:22px;line-height:1;cursor:pointer}
    .body{padding:16px 20px 8px;overflow:auto;display:flex;flex-direction:column;gap:13px}
    .note{margin:0;font-size:11px;line-height:1.5;opacity:.62}
    .current{padding:8px 10px;border:1px solid #bbb;font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow-wrap:anywhere}
    .row{display:grid;grid-template-columns:78px 1fr auto;gap:8px;align-items:center}
    label{font:10px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;opacity:.68}
    input{min-width:0;border:1px solid #bbb;background:transparent;color:inherit;padding:7px 8px;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    @media(prefers-color-scheme:dark){input,.current{border-color:#3a3a3a}}
    input:focus{outline:2px solid currentColor;outline-offset:1px}
    .go{border:1px solid #bbb;color:inherit;text-decoration:none;padding:7px 10px;font:600 11px/1.2 ui-sans-serif,system-ui,sans-serif;white-space:nowrap}
    .go:hover{border-color:currentColor}
    .go[aria-disabled=true]{opacity:.4;pointer-events:none}
    .status{min-height:17px;font-size:12px;opacity:.68}.status[data-kind=error]{color:#a11;opacity:1}
    @media(prefers-color-scheme:dark){.status[data-kind=error]{color:#ff8d8d}}
    @media(max-width:560px){.scrim{padding:10px}.panel{max-height:calc(100vh - 20px)}header,.body{padding-left:14px;padding-right:14px}.row{grid-template-columns:64px 1fr}.go{grid-column:2;justify-self:end}}
  </style>
  <div class="scrim">
    <section class="panel" role="dialog" aria-modal="true" aria-labelledby="env-title">
      <header><div><p class="kicker">Same route · three homes</p><h2 id="env-title">Environment &amp; Route Switcher</h2></div><button class="close" type="button" aria-label="Close">×</button></header>
      <div class="body">
        <p class="note">The path, query and hash stay as they are. Origins are kept in this browser under <code>bl:envs</code>; nothing is sent anywhere.</p>
        <div class="current" id="env-current"></div>
        ${["production", "staging", "local"].map((key) => `<div class="row"><label for="env-${key}">${key}</label><input id="env-${key}" data-env="${key}" spellcheck="false" autocomplete="off"><a class="go" data-env="${key}" href="#" rel="noreferrer">Go</a></div>`).join("")}
        <p class="status" id="env-status" role="status" aria-live="polite"></p>
      </div>
    </section>
  </div>`;

  const status = root.querySelector("#env-status");
  const current = root.querySelector("#env-current");
  const inputs = [...root.querySelectorAll("input[data-env]")];
  const links = [...root.querySelectorAll("a.go[data-env]")];
  current.textContent = targetFor(location.origin);
  const close = () => {
    root.removeEventListener("keydown", onKey);
    document.removeEventListener("keydown", onKey, true);
    hostElement.remove();
    if (window.__blEnvClose === close) window.__blEnvClose = null;
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };
  const refresh = () => {
    let valid = true;
    for (const input of inputs) {
      const origin = normalize(input.value);
      const link = links.find((item) => item.dataset.env === input.dataset.env);
      link.setAttribute("aria-disabled", String(!origin));
      if (origin) link.href = targetFor(origin);
      else {
        link.href = "#";
        valid = false;
      }
    }
    if (!valid) {
      status.textContent = "One origin is not a valid http(s) URL. Fix it before switching.";
      status.dataset.kind = "error";
    } else {
      status.textContent = "Choose an environment to open this route there.";
      status.dataset.kind = "";
    }
  };
  const save = () => {
    const map = {};
    for (const input of inputs) map[input.dataset.env] = normalize(input.value) || "";
    try { localStorage.setItem("bl:envs", JSON.stringify(map)); } catch {}
  };
  for (const input of inputs) {
    input.value = defaults[input.dataset.env] || "";
    input.addEventListener("input", refresh);
  }
  for (const link of links) {
    link.addEventListener("click", (event) => {
      const input = inputs.find((item) => item.dataset.env === link.dataset.env);
      if (!normalize(input.value)) {
        event.preventDefault();
        status.textContent = "That origin is not a valid http(s) URL.";
        status.dataset.kind = "error";
        input.focus();
        return;
      }
      save();
    });
  }
  root.querySelector(".close").addEventListener("click", close);
  root.querySelector(".scrim").addEventListener("click", (event) => {
    if (event.target === root.querySelector(".scrim")) close();
  });
  root.addEventListener("keydown", onKey);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("pagehide", close, { once: true });
  window.__blEnvClose = close;
  refresh();
  (document.body || document.documentElement).appendChild(hostElement);
  inputs[0].focus();
})();
