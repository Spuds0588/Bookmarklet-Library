/**
 * @name 🕶️ Demo PII & Sensitive Data Masker
 * @category privacy
 * @description Replace names, terms and email addresses on the page with dummy text, with an optional blur and one-click restore.
 * @tags pii, privacy, redact, mask, demo, blur, email
 * @added 2026-10-28
 * @featured false
 */
(() => {
  const ID = "bl-pii-host";
  const existing = document.getElementById(ID);
  if (existing) {
    existing.shadowRoot?.querySelector("#pii-terms")?.focus();
    return;
  }
  const state = (window.__blPii ??= { changes: [] });

  const host = document.createElement("div");
  host.id = ID;
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host{color-scheme:light dark;font:14px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
    *{box-sizing:border-box}
    .scrim{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(0,0,0,.52)}
    .panel{width:min(620px,100%);max-height:min(780px,calc(100vh - 44px));display:flex;flex-direction:column;background:#fff;color:#111;border:1px solid #111;box-shadow:0 24px 80px rgba(0,0,0,.35)}
    @media(prefers-color-scheme:dark){.scrim{background:rgba(0,0,0,.72)}.panel{background:#111;color:#f5f5f5;border-color:#f5f5f5}}
    header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px 14px;border-bottom:1px solid #bbb}
    @media(prefers-color-scheme:dark){header{border-color:#3a3a3a}}
    .kicker{margin:0 0 4px;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.62}
    h2{margin:0;font-size:20px;line-height:1.2;font-weight:600}
    .close{width:34px;height:34px;flex:none;border:1px solid #bbb;background:transparent;color:inherit;font-size:22px;line-height:1;cursor:pointer}
    .body{padding:16px 20px 8px;overflow:auto;display:flex;flex-direction:column;gap:13px}
    .note{margin:0;font-size:11px;line-height:1.5;opacity:.62}
    label{display:flex;flex-direction:column;gap:5px;font:10px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;opacity:.72}
    textarea,input[type=number]{border:1px solid #bbb;background:transparent;color:inherit;padding:8px 9px;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;width:100%}
    textarea{min-height:58px;resize:vertical}
    @media(prefers-color-scheme:dark){textarea,input[type=number]{border-color:#3a3a3a}}
    .row{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end}
    .check{display:flex;align-items:center;gap:7px;font:12px/1.4 ui-sans-serif,system-ui,sans-serif;text-transform:none;letter-spacing:0;opacity:1}
    .check input{width:15px;height:15px;accent-color:currentColor}
    .radius{width:86px!important}
    .status{min-height:18px;font-size:12px;opacity:.68}.status[data-kind=ok]{color:#086b3a;opacity:1}.status[data-kind=error]{color:#a11;opacity:1}
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
    <section class="panel" role="dialog" aria-modal="true" aria-labelledby="pii-title">
      <header><div><p class="kicker">Local edit · nothing is uploaded</p><h2 id="pii-title">Demo PII &amp; Sensitive Data Masker</h2></div><button class="close" type="button" aria-label="Close">×</button></header>
      <div class="body">
        <p class="note">Replace the text that should not appear in a screenshot or a shared demo. Close keeps the mask in place; reopen this bookmarklet and choose <b>Restore page</b> to undo it.</p>
        <label for="pii-terms">Names and terms to replace <span style="text-transform:none;letter-spacing:0;opacity:.7">(one per line or comma-separated)</span></label>
        <textarea id="pii-terms" placeholder="Acme Corp, Initech, Jane Doe">Acme Corp, Initech</textarea>
        <label for="pii-patterns">Extra regular expressions <span style="text-transform:none;letter-spacing:0;opacity:.7">(optional, one per line)</span></label>
        <textarea id="pii-patterns" placeholder="\\b\\d{3}-\\d{2}-\\d{4}\\b"></textarea>
        <div class="row">
          <label class="check"><input type="checkbox" id="pii-emails" checked> Mask email addresses</label>
          <label class="check"><input type="checkbox" id="pii-blur"> Blur matching elements</label>
          <label for="pii-radius">Blur radius (px) <input class="radius" id="pii-radius" type="number" min="0" max="24" step="1" value="4"></label>
        </div>
        <p class="status" id="pii-status" role="status" aria-live="polite">Nothing applied yet.</p>
      </div>
      <footer><button class="btn" id="pii-restore" type="button" disabled>Restore page</button><button class="btn primary" id="pii-apply" type="button">Mask page</button></footer>
    </section>
  </div>`;

  const status = root.querySelector("#pii-status");
  const restoreButton = root.querySelector("#pii-restore");
  const applyButton = root.querySelector("#pii-apply");
  const terms = root.querySelector("#pii-terms");
  const patterns = root.querySelector("#pii-patterns");
  const emails = root.querySelector("#pii-emails");
  const blur = root.querySelector("#pii-blur");
  const radius = root.querySelector("#pii-radius");
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };
  const close = () => {
    root.removeEventListener("keydown", onKey);
    document.removeEventListener("keydown", onKey, true);
    host.remove();
    if (window.__blPiiClose === close) window.__blPiiClose = null;
  };
  restoreButton.disabled = state.changes.length === 0;

  const restore = () => {
    for (const change of state.changes.slice().reverse()) {
      try {
        change.node.nodeValue = change.original;
        if (change.element) change.element.style.filter = change.filter;
      } catch {}
    }
    state.changes = [];
    restoreButton.disabled = true;
    status.textContent = "Page restored.";
    status.dataset.kind = "ok";
  };
  const record = (node, element) => {
    if (!state.changes.some((change) => change.node === node)) {
      state.changes.push({ node, original: node.nodeValue, element, filter: element?.style.filter ?? "" });
    }
  };
  const apply = () => {
    if (state.changes.length) restore();
    const list = terms.value.split(/[\n,]+/).map((term) => term.trim()).filter(Boolean);
    const invalid = [];
    const expressions = [];
    for (const line of patterns.value.split("\n").map((line) => line.trim()).filter(Boolean)) {
      try {
        expressions.push(new RegExp(line, "gi"));
      } catch (error) {
        invalid.push(`${line}: ${error.message}`);
      }
    }
    if (invalid.length) {
      status.textContent = `Fix the regular expression${invalid.length > 1 ? "s" : ""}: ${invalid.join("; ")}`;
      status.dataset.kind = "error";
      return;
    }
    if (!list.length && !emails.checked && !expressions.length) {
      status.textContent = "Add a term, an expression, or turn on email masking first.";
      status.dataset.kind = "error";
      return;
    }
    const termPattern = list.length
      ? new RegExp(`(${list.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi")
      : null;
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (parent.closest("script,style,noscript,textarea,option,select")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let changed = 0;
    let blurred = new Set();
    for (const node of nodes) {
      let value = node.nodeValue;
      // Mask the whole address before a company name can split its domain.
      if (emails.checked) value = value.replace(emailPattern, "[email]");
      if (termPattern) value = value.replace(termPattern, "[redacted]");
      for (const expression of expressions) value = value.replace(expression, "[redacted]");
      if (value === node.nodeValue) continue;
      const element = node.parentElement;
      record(node, element);
      node.nodeValue = value;
      changed++;
      if (blur.checked && Number(radius.value) > 0 && element && !blurred.has(element)) {
        blurred.add(element);
        element.style.filter = `blur(${Math.max(1, Math.min(24, Number(radius.value) || 4))}px)`;
      }
    }
    status.textContent = changed
      ? `${changed} text node${changed === 1 ? "" : "s"} masked. Nothing left this page.`
      : "No matches found on this page. The terms are case-insensitive.";
    status.dataset.kind = changed ? "ok" : "error";
    restoreButton.disabled = state.changes.length === 0;
  };

  root.querySelector(".close").addEventListener("click", close);
  root.querySelector(".scrim").addEventListener("click", (event) => {
    if (event.target === root.querySelector(".scrim")) close();
  });
  restoreButton.addEventListener("click", restore);
  applyButton.addEventListener("click", apply);
  root.addEventListener("keydown", onKey);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("pagehide", close, { once: true });
  window.__blPiiClose = close;
  (document.body || document.documentElement).appendChild(host);
  root.querySelector("#pii-terms").focus();
})();
