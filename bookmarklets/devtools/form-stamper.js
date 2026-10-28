/**
 * @name 🧾 Form Stamper
 * @category devtools
 * @description Fill a form from the Form Harvester's JSON, with editable values and native input events for React and Vue.
 * @tags forms, stamp, fill, data entry, demo, automation, react
 * @added 2026-10-28
 * @featured false
 */
(() => {
  const ID = "bl-form-stamp-host";
  const existing = document.getElementById(ID);
  if (existing) {
    existing.shadowRoot?.querySelector("button")?.focus();
    return;
  }

  const labelFor = (field) => {
    const label = field.labels?.[0] || field.closest("label");
    return String(label?.innerText || field.getAttribute("aria-label") || field.placeholder || "").replace(/\s+/g, " ").trim().toLowerCase();
  };
  const targetFields = () => [...document.querySelectorAll("input,textarea,select")].filter((field) => {
    if (field.disabled) return false;
    const type = (field.type || "").toLowerCase();
    return !["file", "submit", "button", "reset", "image", "password"].includes(type);
  });
  const setValue = (field, value) => {
    if (field.tagName === "SELECT") {
      field.value = value;
      if (field.value !== value) {
        const option = [...field.options].find((item) => item.value === value || item.textContent.trim() === value);
        if (option) field.value = option.value;
      }
    } else if (field.type === "checkbox" || field.type === "radio") {
      const checked = /^(true|1|yes|on|checked)$/i.test(value) || value === field.value;
      field.checked = checked;
    } else {
      const prototype = field.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      if (setter) setter.call(field, value);
      else field.value = value;
    }
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    field.dispatchEvent(new Event("blur", { bubbles: true }));
  };
  const findTarget = (field) => {
    const all = targetFields();
    if (field.selector) {
      try {
        const node = document.querySelector(field.selector);
        if (node && all.includes(node)) return node;
      } catch {}
    }
    if (field.id) {
      const node = document.getElementById(field.id);
      if (node && all.includes(node)) return node;
    }
    if (field.name) {
      const node = all.find((candidate) => candidate.name === field.name);
      if (node) return node;
    }
    if (field.label) {
      const node = all.find((candidate) => labelFor(candidate) === String(field.label).toLowerCase());
      if (node) return node;
    }
    if (field.placeholder) {
      const node = all.find((candidate) => candidate.placeholder === field.placeholder);
      if (node) return node;
    }
    return all[field.index] || null;
  };

  const host = document.createElement("div");
  host.id = ID;
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host{color-scheme:light dark;font:14px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
    *{box-sizing:border-box}
    .scrim{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(0,0,0,.52)}
    .panel{width:min(660px,100%);max-height:min(800px,calc(100vh - 44px));display:flex;flex-direction:column;background:#fff;color:#111;border:1px solid #111;box-shadow:0 24px 80px rgba(0,0,0,.35)}
    @media(prefers-color-scheme:dark){.scrim{background:rgba(0,0,0,.72)}.panel{background:#111;color:#f5f5f5;border-color:#f5f5f5}}
    header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px 14px;border-bottom:1px solid #bbb}
    @media(prefers-color-scheme:dark){header{border-color:#3a3a3a}}
    .kicker{margin:0 0 4px;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.62}
    h2{margin:0;font-size:20px;line-height:1.2;font-weight:600}
    .close{width:34px;height:34px;flex:none;border:1px solid #bbb;background:transparent;color:inherit;font-size:22px;line-height:1;cursor:pointer}
    .body{padding:16px 20px 8px;overflow:auto;display:flex;flex-direction:column;gap:12px}
    .note{margin:0;font-size:11px;line-height:1.5;opacity:.64}
    .meta{font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;opacity:.68;overflow-wrap:anywhere}
    .paste{display:flex;flex-direction:column;gap:6px;font:10px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;opacity:.78}
    .paste[hidden]{display:none}
    textarea{min-height:110px;resize:vertical;border:1px solid #bbb;background:transparent;color:inherit;padding:8px 9px;font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:none;letter-spacing:0}
    @media(prefers-color-scheme:dark){textarea{border-color:#3a3a3a}}
    .list{list-style:none;margin:0;padding:0;border:1px solid #bbb;max-height:330px;overflow:auto}
    @media(prefers-color-scheme:dark){.list{border-color:#3a3a3a}}
    .list li{display:flex;align-items:center;gap:9px;padding:8px 10px;border-bottom:1px solid #ddd}
    .list li:last-child{border-bottom:0}
    @media(prefers-color-scheme:dark){.list li{border-color:#333}}
    .list input[type=checkbox]{width:15px;height:15px;flex:none;accent-color:currentColor}
    .field{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
    .field span{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.8}
    .field input{width:100%;min-width:0;border:1px solid #ccc;background:transparent;color:inherit;padding:5px 7px;font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    .field input:focus{outline:2px solid currentColor;outline-offset:1px}
    .empty{padding:14px;color:#666;font-size:12px}
    .check{display:flex;align-items:center;gap:7px;font-size:12px;opacity:.8}
    .check input{width:15px;height:15px;accent-color:currentColor}
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
    <section class="panel" role="dialog" aria-modal="true" aria-labelledby="stamp-title">
      <header><div><p class="kicker">Replay a harvest</p><h2 id="stamp-title">Form Stamper</h2></div><button class="close" type="button" aria-label="Close">×</button></header>
      <div class="body">
        <p class="meta" id="stamp-meta"></p>
        <div class="paste" id="stamp-paste"><label for="stamp-json">Paste harvested JSON</label><textarea id="stamp-json" placeholder='{"fields":[{"label":"Region","value":"North"}]}'></textarea><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="stamp-load" type="button">Load JSON</button><button class="btn" id="stamp-read" type="button">Read clipboard</button></div></div>
        <ul class="list" id="stamp-list"></ul>
        <label class="check"><input type="checkbox" id="stamp-empty"> Only fill empty fields</label>
        <p class="note">Values are editable before you fill. The panel dispatches native <code>input</code> and <code>change</code> events, so React and Vue forms see the change too. Password fields are never filled.</p>
        <p class="status" id="stamp-status" role="status" aria-live="polite"></p>
      </div>
      <footer><button class="btn" id="stamp-close" type="button">Close</button><button class="btn primary" id="stamp-apply" type="button" disabled>Fill fields</button></footer>
    </section>
  </div>`;

  const list = root.querySelector("#stamp-list");
  const paste = root.querySelector("#stamp-paste");
  const meta = root.querySelector("#stamp-meta");
  const status = root.querySelector("#stamp-status");
  const applyButton = root.querySelector("#stamp-apply");
  const onlyEmpty = root.querySelector("#stamp-empty");
  let payload = null;

  const close = () => {
    root.removeEventListener("keydown", onKey);
    document.removeEventListener("keydown", onKey, true);
    host.remove();
    if (window.__blStampClose === close) window.__blStampClose = null;
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };
  const setStatus = (text, kind = "") => {
    status.textContent = text;
    status.dataset.kind = kind;
  };
  const render = () => {
    list.textContent = "";
    if (!payload?.fields?.length) {
      list.hidden = true;
      paste.hidden = false;
      applyButton.disabled = true;
      meta.textContent = "No harvest yet. Run Form Harvester on the source form, or paste its JSON here.";
      return;
    }
    list.hidden = false;
    paste.hidden = true;
    meta.textContent = `${payload.fields.length} field${payload.fields.length === 1 ? "" : "s"}${payload.title ? ` · ${payload.title}` : ""}${payload.harvested ? ` · ${String(payload.harvested).slice(0, 10)}` : ""}`;
    for (const [index, field] of payload.fields.entries()) {
      const item = document.createElement("li");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.dataset.index = String(index);
      checkbox.setAttribute("aria-label", `Include ${field.label || field.name || `field ${index + 1}`}`);
      const holder = document.createElement("div");
      holder.className = "field";
      const label = document.createElement("span");
      label.textContent = field.label || field.name || field.id || `Field ${index + 1} (${field.type || "text"})`;
      const input = document.createElement("input");
      input.value = field.checked !== undefined ? String(field.checked) : String(field.value ?? "");
      input.dataset.index = String(index);
      input.setAttribute("aria-label", label.textContent);
      holder.append(label, input);
      item.append(checkbox, holder);
      list.append(item);
    }
    applyButton.disabled = false;
  };
  const load = (text) => {
    try {
      const next = JSON.parse(text);
      if (!next || !Array.isArray(next.fields)) throw new Error("JSON has no fields array");
      payload = next;
      setStatus(`Loaded ${payload.fields.length} field${payload.fields.length === 1 ? "" : "s"}.`, "ok");
      render();
    } catch (error) {
      setStatus(`Could not load that JSON: ${error.message}`, "error");
    }
  };
  const apply = () => {
    if (!payload) return;
    const all = targetFields();
    let filled = 0;
    let skipped = 0;
    for (const item of list.querySelectorAll("li")) {
      const checkbox = item.querySelector('input[type="checkbox"]');
      if (!checkbox.checked) continue;
      const index = Number(checkbox.dataset.index);
      const field = payload.fields[index];
      const input = item.querySelector(".field input");
      if (!field || !input) continue;
      const target = findTarget(field);
      if (!target) {
        skipped++;
        continue;
      }
      if (onlyEmpty.checked) {
        if (target.type === "checkbox" || target.type === "radio" ? target.checked : String(target.value || "").trim()) {
          skipped++;
          continue;
        }
      }
      setValue(target, input.value);
      filled++;
    }
    setStatus(filled ? `Filled ${filled} field${filled === 1 ? "" : "s"}${skipped ? `; skipped ${skipped}` : ""}.` : "No matching fields were found on this page.", filled ? "ok" : "error");
  };

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem("bl:form") || "null"); } catch { return null; }
  })();
  if (saved?.fields?.length) {
    payload = saved;
    setStatus("Loaded the harvest saved for this site.");
  }
  render();

  root.querySelector(".close").addEventListener("click", close);
  root.querySelector("#stamp-close").addEventListener("click", close);
  root.querySelector(".scrim").addEventListener("click", (event) => {
    if (event.target === root.querySelector(".scrim")) close();
  });
  root.querySelector("#stamp-load").addEventListener("click", () => load(root.querySelector("#stamp-json").value));
  root.querySelector("#stamp-read").addEventListener("click", async () => {
    try {
      load(await navigator.clipboard.readText());
    } catch {
      setStatus("Clipboard read was blocked. Paste the JSON into the box instead.", "error");
    }
  });
  applyButton.addEventListener("click", apply);
  root.addEventListener("keydown", onKey);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("pagehide", close, { once: true });
  window.__blStampClose = close;
  (document.body || document.documentElement).appendChild(host);
  root.querySelector("#stamp-apply")?.focus();
})();
