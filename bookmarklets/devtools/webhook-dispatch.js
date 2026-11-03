/**
 * @name 📮 Webhook Bookmarklet Builder
 * @category devtools
 * @description Bakes your webhook URL and payload template into a bookmarklet of your own; the bookmarklet fires on any page and shows a toast saying whether the webhook accepted it.
 * @tags webhook, zapier, make, builder, automation, json, integration, post
 * @traits network, self-contained
 * @added 2026-10-28
 * @featured false
 */
(() => {
  const TOKENS = ["url", "title", "host", "selection", "time"];
  const METHODS = ["POST", "PUT", "PATCH", "GET"];
  const DEFAULT_TEMPLATE = [
    "{",
    '  "source": "Bookmarklet Library",',
    '  "url": "{{url}}",',
    '  "title": "{{title}}",',
    '  "host": "{{host}}",',
    '  "selected": "{{selection}}",',
    '  "sentAt": "{{time}}"',
    "}",
  ].join("\n");

  function isHttpUrl(raw) {
    try {
      const url = new URL(String(raw).trim());
      return /^https?:$/.test(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  // Placeholders sit inside JSON strings, so a value has to be escaped the way
  // JSON escapes it — quotes, backslashes and newlines — or the payload the
  // bookmarklet sends is malformed.
  function jsonValue(value) {
    return JSON.stringify(String(value ?? "")).slice(1, -1);
  }

  function fillWebhookTemplate(template, page = {}) {
    return String(template).replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(page, key) ? jsonValue(page[key]) : match,
    );
  }

  function unresolvedTokens(template, page = {}) {
    return [...String(template).matchAll(/\{\{\s*(\w+)\s*\}\}/g)]
      .map((match) => match[1])
      .filter((key) => !Object.prototype.hasOwnProperty.call(page, key));
  }

  // The generated bookmarklet carries the endpoint, the method and the template
  // as literals: no storage, no setup on the page it runs on. It reports back
  // with a toast because a bookmarklet that fails silently is impossible to
  // debug.
  function buildWebhookBookmarklet({ endpoint, method = "POST", template = DEFAULT_TEMPLATE, sample = {} } = {}) {
    const url = isHttpUrl(endpoint);
    if (!url) throw new Error("Enter a valid http(s) webhook URL.");
    const verb = String(method).toUpperCase();
    if (!METHODS.includes(verb)) throw new Error(`Use one of ${METHODS.join(", ")}.`);
    const sendsBody = verb !== "GET";

    if (sendsBody) {
      const unknown = unresolvedTokens(template, { ...sample, url: "", title: "", host: "", selection: "", time: "" });
      if (unknown.length) throw new Error(`Unknown placeholder ${unknown.map((key) => `{{${key}}}`).join(", ")}.`);
      try {
        JSON.parse(fillWebhookTemplate(template, { url: "", title: "", host: "", selection: "", time: "" }));
      } catch {
        throw new Error("The payload is not valid JSON once the placeholders are filled.");
      }
    }

    const request = sendsBody
      ? `{method:${JSON.stringify(verb)},mode:"cors",headers:{"Content-Type":"application/json"},body:JSON.stringify(JSON.parse(fill(${JSON.stringify(template)})))}`
      : `{method:${JSON.stringify(verb)},mode:"cors"}`;

    const code = [
      "(async()=>{",
      'const page={url:location.href,title:document.title,host:location.host,selection:String(window.getSelection?window.getSelection():"").replace(/\\s+/g," ").trim().slice(0,5000),time:new Date().toISOString()};',
      'const esc=v=>JSON.stringify(String(v==null?"":v)).slice(1,-1);',
      "const fill=s=>s.replace(/\\{\\{\\s*(\\w+)\\s*\\}\\}/g,(m,k)=>Object.prototype.hasOwnProperty.call(page,k)?esc(page[k]):m);",
      'const toast=(ok,msg)=>{const d=document.createElement("div");d.textContent=msg;d.style.cssText="position:fixed;right:18px;bottom:18px;z-index:2147483647;max-width:340px;padding:11px 14px;border:1px solid "+(ok?"#116b3a":"#a11")+";background:"+(ok?"#e8f5ec":"#fdeaea")+";color:"+(ok?"#116b3a":"#7a1111")+";font:13px/1.4 ui-sans-serif,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25)";document.body.appendChild(d);setTimeout(()=>d.remove(),4500);};',
      "try{",
      `const r=await fetch(${JSON.stringify(url)},${request});`,
      'if(!r.ok)throw new Error("HTTP "+r.status);',
      'toast(true,"Webhook sent · "+r.status);',
      '}catch(e){toast(false,"Webhook failed · "+((e&&e.message)||e));}',
      "})()",
    ].join("");

    return { href: "javascript:" + encodeURIComponent(code), code, method: verb, endpoint: url };
  }

  function mount() {
    const ID = "bl-webhook-host";
    const existing = document.getElementById(ID);
    if (existing) {
      existing.shadowRoot?.querySelector("#webhook-url")?.focus();
      return;
    }

    const saved = (() => {
      try {
        const raw = localStorage.getItem("bl:webhook");
        if (!raw) return {};
        if (raw.trim().startsWith("{")) return JSON.parse(raw);
        return { url: raw };
      } catch {
        return {};
      }
    })();

    const host = document.createElement("div");
    host.id = ID;
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>
      :host{color-scheme:light dark;font:14px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
      *{box-sizing:border-box}
      .scrim{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(0,0,0,.52)}
      .panel{width:min(680px,100%);max-height:min(860px,calc(100vh - 44px));display:flex;flex-direction:column;background:#fff;color:#111;border:1px solid #111;box-shadow:0 24px 80px rgba(0,0,0,.35)}
      @media(prefers-color-scheme:dark){.scrim{background:rgba(0,0,0,.72)}.panel{background:#111;color:#f5f5f5;border-color:#f5f5f5}}
      header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px 14px;border-bottom:1px solid #bbb}
      @media(prefers-color-scheme:dark){header{border-bottom-color:#3a3a3a}}
      .kicker{margin:0 0 4px;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.62}
      h2{margin:0;font-size:20px;line-height:1.2;font-weight:600}
      .close{width:34px;height:34px;flex:none;border:1px solid #bbb;background:transparent;color:inherit;font-size:22px;line-height:1;cursor:pointer}
      .body{padding:16px 20px 8px;overflow:auto;display:flex;flex-direction:column;gap:12px}
      label{display:flex;flex-direction:column;gap:5px;font:10px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;opacity:.7}
      input[type=url],select{border:1px solid #bbb;background:transparent;color:inherit;padding:8px 9px;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;width:100%}
      input[type=url]:focus,select:focus,textarea:focus{outline:2px solid currentColor;outline-offset:1px}
      @media(prefers-color-scheme:dark){input[type=url],select,textarea{border-color:#3a3a3a}}
      textarea{resize:vertical;border:1px solid #bbb;background:transparent;color:inherit;padding:8px 9px;font:10.5px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;width:100%}
      #webhook-template{min-height:132px}
      #webhook-preview{min-height:88px;opacity:.85}
      #webhook-code{min-height:64px}
      .tokens{display:flex;flex-wrap:wrap;gap:6px}
      .token{border:1px solid #bbb;background:transparent;color:inherit;padding:3px 7px;font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;cursor:pointer}
      .token:hover{border-color:currentColor}
      .note{margin:0;font-size:11px;line-height:1.5;opacity:.62}
      .status{min-height:17px;font-size:12px;opacity:.68}.status[data-kind=ok]{color:#086b3a;opacity:1}.status[data-kind=error]{color:#a11;opacity:1}
      @media(prefers-color-scheme:dark){.status[data-kind=ok]{color:#7ee2a8}.status[data-kind=error]{color:#ff8d8d}}
      .out{display:flex;flex-direction:column;gap:8px;padding:11px;border:1px solid #bbb}
      @media(prefers-color-scheme:dark){.out{border-color:#3a3a3a}}
      .out[hidden]{display:none}
      .install{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:9px 13px;border:1px solid currentColor;background:transparent;color:inherit;font:600 12px/1 ui-sans-serif,system-ui,sans-serif;text-decoration:none;cursor:grab}
      .install:active{cursor:grabbing}
      footer{padding:12px 20px 18px;border-top:1px solid #bbb;display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
      @media(prefers-color-scheme:dark){footer{border-top-color:#3a3a3a}}
      .btn{border:1px solid #bbb;background:transparent;color:inherit;padding:8px 12px;font-size:12px;font-weight:600;cursor:pointer}
      .btn:hover:not(:disabled){border-color:currentColor}.btn:disabled{opacity:.4;cursor:not-allowed}
      .primary{background:#111;border-color:#111;color:#fff}
      @media(prefers-color-scheme:dark){.primary{background:#f5f5f5;border-color:#f5f5f5;color:#111}}
      @media(max-width:560px){.scrim{padding:10px}.panel{max-height:calc(100vh - 20px)}header,.body,footer{padding-left:14px;padding-right:14px}}
    </style>
    <div class="scrim">
      <section class="panel" role="dialog" aria-modal="true" aria-labelledby="webhook-title">
        <header><div><p class="kicker">Build once · hardcoded · one click after</p><h2 id="webhook-title">Webhook Bookmarklet Builder</h2></div><button class="close" type="button" aria-label="Close">×</button></header>
        <div class="body">
          <label for="webhook-url">Webhook URL <span style="text-transform:none;letter-spacing:0;opacity:.7">(must accept a JSON body and allow CORS)</span></label>
          <input id="webhook-url" type="url" spellcheck="false" autocomplete="off" placeholder="https://hooks.zapier.com/...">
          <label for="webhook-method">Method</label>
          <select id="webhook-method">
            <option>POST</option><option>PUT</option><option>PATCH</option><option>GET</option>
          </select>
          <label for="webhook-template">Payload template <span style="text-transform:none;letter-spacing:0;opacity:.7">(placeholders are filled when the bookmarklet runs)</span></label>
          <div class="tokens" id="webhook-tokens"></div>
          <textarea id="webhook-template" spellcheck="false"></textarea>
          <label for="webhook-preview">Filled with this page's values</label>
          <textarea id="webhook-preview" readonly></textarea>
          <p class="note">The endpoint and this template are baked into the bookmarklet as literals, so it works with no setup on any page — and it can be read by anyone who opens the bookmark. If the URL carries a secret, keep the bookmark private. A failed request says why: a CORS refusal, a CSP block or the status the endpoint returned.</p>
          <p class="status" id="webhook-status" role="status" aria-live="polite"></p>
          <div class="out" id="webhook-out-wrap" hidden>
            <label>Your bookmarklet <span style="text-transform:none;letter-spacing:0;opacity:.7">(drag it to the bookmarks bar)</span></label>
            <a class="install" id="webhook-out" draggable="true" href="#">📮 Send to webhook</a>
            <label for="webhook-code">The code inside it</label>
            <textarea id="webhook-code" readonly spellcheck="false"></textarea>
          </div>
        </div>
        <footer><button class="btn" id="webhook-copy" type="button" disabled>Copy code</button><button class="btn primary" id="webhook-build" type="button">Build bookmarklet</button></footer>
      </section>
    </div>`;

    const urlInput = root.querySelector("#webhook-url");
    const methodInput = root.querySelector("#webhook-method");
    const templateBox = root.querySelector("#webhook-template");
    const previewBox = root.querySelector("#webhook-preview");
    const status = root.querySelector("#webhook-status");
    const outWrap = root.querySelector("#webhook-out-wrap");
    const out = root.querySelector("#webhook-out");
    const codeBox = root.querySelector("#webhook-code");
    const copyButton = root.querySelector("#webhook-copy");
    const buildButton = root.querySelector("#webhook-build");

    urlInput.value = saved.url || "";
    if (saved.method && METHODS.includes(saved.method)) methodInput.value = saved.method;
    templateBox.value = typeof saved.template === "string" && saved.template.trim() ? saved.template : DEFAULT_TEMPLATE;

    const tokenRow = root.querySelector("#webhook-tokens");
    for (const token of TOKENS) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "token";
      chip.textContent = `{{${token}}}`;
      chip.addEventListener("click", () => {
        const start = templateBox.selectionStart ?? templateBox.value.length;
        const end = templateBox.selectionEnd ?? templateBox.value.length;
        const text = `{{${token}}}`;
        templateBox.value = templateBox.value.slice(0, start) + text + templateBox.value.slice(end);
        templateBox.focus();
        templateBox.selectionStart = templateBox.selectionEnd = start + text.length;
        update();
      });
      tokenRow.append(chip);
    }

    const pageNow = () => ({
      url: location.href,
      title: document.title,
      host: location.host,
      selection: String(window.getSelection?.() ?? "").replace(/\s+/g, " ").trim().slice(0, 5000),
      time: new Date().toISOString(),
    });

    function setStatus(text, kind = "") {
      status.textContent = text;
      status.dataset.kind = kind;
    }

    function update() {
      const filled = fillWebhookTemplate(templateBox.value, pageNow());
      try {
        previewBox.value = JSON.stringify(JSON.parse(filled), null, 2);
      } catch {
        previewBox.value = filled;
      }
    }

    function save() {
      try {
        localStorage.setItem("bl:webhook", JSON.stringify({ url: urlInput.value.trim(), method: methodInput.value, template: templateBox.value }));
      } catch {
        /* storage can be blocked; the builder still works */
      }
    }

    function build() {
      try {
        const result = buildWebhookBookmarklet({
          endpoint: urlInput.value,
          method: methodInput.value,
          template: templateBox.value,
        });
        out.setAttribute("href", result.href);
        codeBox.value = result.href;
        outWrap.hidden = false;
        // The result is the point of the build, so bring it into view rather
        // than leaving it below the fold of a tall form.
        outWrap.scrollIntoView({ block: "nearest" });
        copyButton.disabled = false;
        save();
        setStatus(`Built for ${result.method} ${result.endpoint}. Drag the button to your bookmarks bar.`, "ok");
        return result;
      } catch (error) {
        outWrap.hidden = true;
        copyButton.disabled = true;
        setStatus(error.message || String(error), "error");
        return null;
      }
    }

    async function copyCode() {
      const text = codeBox.value;
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setStatus("Bookmarklet code copied. Paste it into a bookmark's URL field.", "ok");
      } catch {
        codeBox.focus();
        codeBox.select();
        setStatus("Copy was blocked. The code is selected for manual copy.", "error");
      }
    }

    const close = () => {
      root.removeEventListener("keydown", onKey);
      document.removeEventListener("keydown", onKey, true);
      host.remove();
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };

    for (const field of [urlInput, methodInput, templateBox]) field.addEventListener("input", update);
    urlInput.addEventListener("change", save);
    methodInput.addEventListener("change", save);
    templateBox.addEventListener("change", save);
    root.querySelector(".close").addEventListener("click", close);
    root.querySelector(".scrim").addEventListener("click", (event) => {
      if (event.target === root.querySelector(".scrim")) close();
    });
    buildButton.addEventListener("click", build);
    copyButton.addEventListener("click", copyCode);
    root.addEventListener("keydown", onKey);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("pagehide", close, { once: true });

    update();
    (document.body || document.documentElement).appendChild(host);
    urlInput.focus();
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.webhookBuilder = {
      TOKENS,
      METHODS,
      DEFAULT_TEMPLATE,
      isHttpUrl,
      fillWebhookTemplate,
      unresolvedTokens,
      buildWebhookBookmarklet,
    };
  } else if (document?.body) {
    mount();
  }
})();
