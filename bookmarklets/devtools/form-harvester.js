/**
 * @name 📋 Form Harvester
 * @category devtools
 * @description Copy a form's field names, labels and values as JSON for the Form Stamper to replay.
 * @tags forms, harvest, data entry, json, demo, automation
 * @added 2026-10-28
 * @featured false
 */
(() => {
  const ID = "bl-form-harvest-host";
  const existing = document.getElementById(ID);
  if (existing) {
    existing.shadowRoot?.querySelector("button")?.focus();
    return;
  }

  const labelFor = (field) => {
    const label = field.labels?.[0] || field.closest("label");
    return String(label?.innerText || field.getAttribute("aria-label") || field.placeholder || "").replace(/\s+/g, " ").trim();
  };
  const selectorFor = (field) => {
    if (field.id) return `#${CSS.escape(field.id)}`;
    if (field.name) {
      const selector = `${field.tagName.toLowerCase()}[name="${String(field.name).replace(/"/g, '\\"')}"]`;
      if (document.querySelectorAll(selector).length === 1) return selector;
    }
    return "";
  };
  const fields = [];
  for (const field of document.querySelectorAll("input,textarea,select")) {
    if (field.disabled) continue;
    const type = field.tagName === "SELECT" ? "select" : field.tagName === "TEXTAREA" ? "textarea" : (field.type || "text").toLowerCase();
    if (["password", "file", "submit", "button", "reset", "image"].includes(type)) continue;
    fields.push({
      index: fields.length,
      id: field.id || "",
      name: field.name || "",
      type,
      value: String(field.value ?? "").slice(0, 2000),
      checked: field.type === "checkbox" || field.type === "radio" ? Boolean(field.checked) : undefined,
      label: labelFor(field),
      placeholder: field.placeholder || "",
      selector: selectorFor(field),
      form: field.form?.id || field.form?.getAttribute("name") || "",
    });
  }
  const payload = {
    version: 1,
    title: document.title,
    url: location.href,
    harvested: new Date().toISOString(),
    fields,
  };
  const json = JSON.stringify(payload, null, 2);
  try { localStorage.setItem("bl:form", json); } catch {}
  const copied = navigator.clipboard?.writeText(json);
  if (copied) copied.catch(() => {});

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
    .body{padding:16px 20px 8px;overflow:auto;display:flex;flex-direction:column;gap:12px}
    .note{margin:0;font-size:11px;line-height:1.5;opacity:.64}
    .meta{font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;opacity:.68}
    .list{list-style:none;margin:0;padding:0;border:1px solid #bbb;max-height:300px;overflow:auto}
    @media(prefers-color-scheme:dark){.list{border-color:#3a3a3a}}
    .list li{padding:8px 10px;border-bottom:1px solid #ddd;min-width:0}
    .list li:last-child{border-bottom:0}
    @media(prefers-color-scheme:dark){.list li{border-color:#333}}
    .field{display:flex;align-items:baseline;gap:8px}
    .field b{font-size:10px;letter-spacing:.06em;text-transform:uppercase;opacity:.55;flex:none;width:62px}
    .field span{font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .value{margin:3px 0 0 70px;color:#555;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    @media(prefers-color-scheme:dark){.value{color:#aaa}}
    .empty{color:#666;padding:14px;font-size:12px}
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
    <section class="panel" role="dialog" aria-modal="true" aria-labelledby="harvest-title">
      <header><div><p class="kicker">JSON for the stamper</p><h2 id="harvest-title">Form Harvester</h2></div><button class="close" type="button" aria-label="Close">×</button></header>
      <div class="body">
        <p class="meta">${fields.length} field${fields.length === 1 ? "" : "s"} · saved for this site · password and file fields skipped</p>
        <ul class="list">${fields.length ? fields.map((field) => `<li><div class="field"><b>${field.type}</b><span>${escapeHtml(field.label || field.name || field.id || `Field ${field.index + 1}`)}</span></div><p class="value">${escapeHtml(field.checked === undefined ? field.value : field.checked ? "checked" : "unchecked")}</p></li>`).join("") : `<li class="empty">No form fields found on this page.</li>`}</ul>
        <p class="note">The JSON is on your clipboard and in <code>localStorage</code> under <code>bl:form</code>. Open the target form and run <b>Form Stamper</b>.</p>
        <p class="status" id="harvest-status" role="status" aria-live="polite">Saved for this site. Use the button if the clipboard copy was blocked.</p>
      </div>
      <footer><button class="btn" id="harvest-close" type="button">Close</button><button class="btn primary" id="harvest-copy" type="button" ${fields.length ? "" : "disabled"}>Copy JSON</button></footer>
    </section>
  </div>`;

  const status = root.querySelector("#harvest-status");
  const close = () => {
    root.removeEventListener("keydown", onKey);
    document.removeEventListener("keydown", onKey, true);
    host.remove();
    if (window.__blHarvestClose === close) window.__blHarvestClose = null;
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };
  root.querySelector(".close").addEventListener("click", close);
  root.querySelector("#harvest-close").addEventListener("click", close);
  root.querySelector(".scrim").addEventListener("click", (event) => {
    if (event.target === root.querySelector(".scrim")) close();
  });
  root.querySelector("#harvest-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(json);
      status.textContent = "Field data copied.";
      status.dataset.kind = "ok";
    } catch {
      status.textContent = "Clipboard copy was blocked by this page.";
      status.dataset.kind = "error";
    }
  });
  root.addEventListener("keydown", onKey);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("pagehide", close, { once: true });
  window.__blHarvestClose = close;
  (document.body || document.documentElement).appendChild(host);
  root.querySelector("#harvest-copy")?.focus();

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }
})();
