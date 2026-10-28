/**
 * @name 📮 Context Webhook Dispatcher
 * @category devtools
 * @description POST the page URL, title and selected text to a webhook, with a clipboard fallback when CORS or CSP blocks it.
 * @tags webhook, zapier, make, slack, integration, automation, post, json
 * @added 2026-10-28
 * @featured false
 */
(() => {
  const ID = "bl-webhook-host";
  const existing = document.getElementById(ID);
  if (existing) {
    existing.shadowRoot?.querySelector("#webhook-url")?.focus();
    return;
  }

  const savedUrl = (() => {
    try { return localStorage.getItem("bl:webhook") || ""; } catch { return ""; }
  })();
  const description = document.querySelector('meta[name="description"]')?.content || "";
  const selected = String(window.getSelection?.() ?? "").replace(/\s+/g, " ").trim().slice(0, 5000);

  const host = document.createElement("div");
  host.id = ID;
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host{color-scheme:light dark;font:14px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
    *{box-sizing:border-box}
    .scrim{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(0,0,0,.52)}
    .panel{width:min(650px,100%);max-height:min(800px,calc(100vh - 44px));display:flex;flex-direction:column;background:#fff;color:#111;border:1px solid #111;box-shadow:0 24px 80px rgba(0,0,0,.35)}
    @media(prefers-color-scheme:dark){.scrim{background:rgba(0,0,0,.72)}.panel{background:#111;color:#f5f5f5;border-color:#f5f5f5}}
    header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px 14px;border-bottom:1px solid #bbb}
    @media(prefers-color-scheme:dark){header{border-color:#3a3a3a}}
    .kicker{margin:0 0 4px;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.62}
    h2{margin:0;font-size:20px;line-height:1.2;font-weight:600}
    .close{width:34px;height:34px;flex:none;border:1px solid #bbb;background:transparent;color:inherit;font-size:22px;line-height:1;cursor:pointer}
    .body{padding:16px 20px 8px;overflow:auto;display:flex;flex-direction:column;gap:12px}
    label{display:flex;flex-direction:column;gap:5px;font:10px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;opacity:.7}
    input[type=url]{border:1px solid #bbb;background:transparent;color:inherit;padding:8px 9px;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;width:100%}
    input[type=url]:focus{outline:2px solid currentColor;outline-offset:1px}
    @media(prefers-color-scheme:dark){input[type=url]{border-color:#3a3a3a}}
    .checks{display:flex;flex-wrap:wrap;gap:12px 18px}
    .check{display:flex;flex-direction:row;align-items:center;gap:7px;font-size:12px;text-transform:none;letter-spacing:0;opacity:.85}
    .check input{width:15px;height:15px;accent-color:currentColor}
    .check[data-empty=true]{opacity:.4}
    textarea{min-height:112px;resize:vertical;border:1px solid #bbb;background:transparent;color:inherit;padding:8px 9px;font:10px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;width:100%}
    @media(prefers-color-scheme:dark){textarea{border-color:#3a3a3a}}
    .note{margin:0;font-size:11px;line-height:1.5;opacity:.62}
    .status{min-height:17px;font-size:12px;opacity:.68}.status[data-kind=ok]{color:#086b3a;opacity:1}.status[data-kind=error]{color:#a11;opacity:1}
    @media(prefers-color-scheme:dark){.status[data-kind=ok]{color:#7ee2a8}.status[data-kind=error]{color:#ff8d8d}}
    footer{padding:12px 20px 18px;border-top:1px solid #bbb;display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
    @media(prefers-color-scheme:dark){footer{border-color:#3a3a3a}}
    .btn{border:1px solid #bbb;background:transparent;color:inherit;padding:8px 12px;font-size:12px;font-weight:600;cursor:pointer}
    .btn:hover:not(:disabled){border-color:currentColor}.btn:disabled{opacity:.4;cursor:not-allowed}
    .primary{background:#111;border-color:#111;color:#fff}
    @media(prefers-color-scheme:dark){.primary{background:#f5f5f5;border-color:#f5f5f5;color:#111}}
    @media(max-width:560px){.scrim{padding:10px}.panel{max-height:calc(100vh - 20px)}header,.body,footer{padding-left:14px;padding-right:14px}}
  </style>
  <div class="scrim">
    <section class="panel" role="dialog" aria-modal="true" aria-labelledby="webhook-title">
      <header><div><p class="kicker">Zapier · Make · your endpoint</p><h2 id="webhook-title">Context Webhook Dispatcher</h2></div><button class="close" type="button" aria-label="Close">×</button></header>
      <div class="body">
        <label for="webhook-url">Webhook URL <span style="text-transform:none;letter-spacing:0;opacity:.7">(must accept a JSON POST)</span></label>
        <input id="webhook-url" type="url" spellcheck="false" autocomplete="off" placeholder="https://hooks.zapier.com/...">
        <div class="checks">
          <label class="check"><input type="checkbox" id="hook-url" checked> Page URL</label>
          <label class="check"><input type="checkbox" id="hook-title" checked> Page title</label>
          <label class="check" id="hook-selection-label" data-empty="${selected ? "false" : "true"}"><input type="checkbox" id="hook-selection" ${selected ? "checked" : ""} ${selected ? "" : "disabled"}> Selected text</label>
          <label class="check"><input type="checkbox" id="hook-meta" checked> Metadata</label>
        </div>
        <label for="webhook-payload">Payload preview</label>
        <textarea id="webhook-payload" readonly></textarea>
        <p class="note">The request goes straight from this page. If the site's <code>connect-src</code> CSP or the endpoint's CORS policy blocks it, the payload is copied to your clipboard so you can paste it into the receiver's test form. Nothing is stored except the URL, in <code>bl:webhook</code>.</p>
        <p class="status" id="webhook-status" role="status" aria-live="polite"></p>
      </div>
      <footer><button class="btn" id="webhook-copy" type="button">Copy payload</button><button class="btn primary" id="webhook-send" type="button">Send</button></footer>
    </section>
  </div>`;

  const urlInput = root.querySelector("#webhook-url");
  const payloadBox = root.querySelector("#webhook-payload");
  const status = root.querySelector("#webhook-status");
  const sendButton = root.querySelector("#webhook-send");
  const include = {
    url: root.querySelector("#hook-url"),
    title: root.querySelector("#hook-title"),
    selection: root.querySelector("#hook-selection"),
    meta: root.querySelector("#hook-meta"),
  };
  urlInput.value = savedUrl;

  const build = () => {
    const payload = { source: "Bookmarklet Library" };
    if (include.url.checked) payload.url = location.href;
    if (include.title.checked) payload.title = document.title;
    if (include.selection.checked && selected) payload.selected = selected;
    if (include.meta.checked) {
      payload.meta = {
        host: location.host,
        referrer: document.referrer || "",
        description: description.slice(0, 500),
        capturedAt: new Date().toISOString(),
      };
    }
    return JSON.stringify(payload, null, 2);
  };
  const update = () => {
    payloadBox.value = build();
  };
  const setStatus = (text, kind = "") => {
    status.textContent = text;
    status.dataset.kind = kind;
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payloadBox.value);
      return true;
    } catch {
      payloadBox.focus();
      payloadBox.select();
      return false;
    }
  };
  const valid = () => {
    try {
      const url = new URL(urlInput.value.trim());
      return /^https?:$/.test(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  };

  const close = () => {
    root.removeEventListener("keydown", onKey);
    document.removeEventListener("keydown", onKey, true);
    host.remove();
    if (window.__blWebhookClose === close) window.__blWebhookClose = null;
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  for (const checkbox of Object.values(include)) checkbox.addEventListener("change", update);
  urlInput.addEventListener("input", update);
  root.querySelector(".close").addEventListener("click", close);
  root.querySelector(".scrim").addEventListener("click", (event) => {
    if (event.target === root.querySelector(".scrim")) close();
  });
  root.querySelector("#webhook-copy").addEventListener("click", async () => {
    const ok = await copy();
    setStatus(ok ? "Payload copied." : "Copy was blocked. The payload is selected for manual copy.", ok ? "ok" : "error");
  });
  sendButton.addEventListener("click", async () => {
    const endpoint = valid();
    if (!endpoint) {
      setStatus("Enter a valid http(s) webhook URL.", "error");
      urlInput.focus();
      return;
    }
    try { localStorage.setItem("bl:webhook", endpoint); } catch {}
    sendButton.disabled = true;
    setStatus("Sending…");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: payloadBox.value,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setStatus(`Sent. The receiver answered ${response.status}.`, "ok");
    } catch (error) {
      const copied = await copy();
      setStatus(
        copied
          ? `The request was blocked (${error.message || "network error"}). The payload is on your clipboard.`
          : `The request was blocked (${error.message || "network error"}). Copy the payload manually from the box.`,
        "error",
      );
    } finally {
      sendButton.disabled = false;
    }
  });
  root.addEventListener("keydown", onKey);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("pagehide", close, { once: true });
  window.__blWebhookClose = close;
  update();
  (document.body || document.documentElement).appendChild(host);
  urlInput.focus();
})();
