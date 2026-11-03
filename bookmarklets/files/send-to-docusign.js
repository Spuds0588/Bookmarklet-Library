/**
 * @name 🚀 Send PDF to DocuSign
 * @category files
 * @description Push the PDF open in this tab into a DocuSign draft envelope and open the sender view ready for tagging.
 * @tags docusign, pdf, esignature, envelope, send, api, byok, oauth
 * @traits network, self-contained
 * @added 2026-11-03
 * @featured false
 */
(() => {
  const KEY = "bl:docusign";
  const SOURCE_SELECTORS = [
    'embed[type="application/pdf"]',
    'object[type="application/pdf"]',
    'embed[src*=".pdf"]',
    'object[data*=".pdf"]',
    'iframe[src*=".pdf"]',
  ];
  const ENVS = {
    demo: { api: "https://demo.docusign.net/restapi", web: "https://demo.docusign.net", label: "Developer (demo)" },
    production: { api: "https://www.docusign.net/restapi", web: "https://www.docusign.net", label: "Production" },
  };

  function isPdfHref(href) {
    if (!href) return false;
    if (/^data:application\/pdf/i.test(href)) return true;
    try {
      const url = new URL(href, globalThis.location?.href || "https://example.com/");
      if (url.protocol === "blob:") return true;
      return /\.pdf$/i.test(url.pathname);
    } catch {
      return false;
    }
  }

  // DocuSign shows this name in the envelope, so it should look like a file and
  // not like a web page title with slashes and a site suffix in it.
  function fileNameFor(title, href) {
    let name = String(title || "").replace(/\s+/g, " ").trim();
    if (!name) {
      try {
        name = decodeURIComponent(new URL(href, "https://example.com/").pathname.split("/").pop() || "");
      } catch {}
    }
    name = name
      .replace(/\.pdf$/i, "")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s*-\s*/g, "-")
      .replace(/^[-.\s]+|[-.\s]+$/g, "")
      .slice(0, 90);
    return `${name || "Document"}.pdf`;
  }

  function envelopeBody({ name, base64, email, subject }) {
    const body = {
      emailSubject: String(subject || "").trim() || "Please sign this document",
      documents: [{ documentId: "1", name, fileExtension: "pdf", documentBase64: base64 }],
      status: "created",
    };
    const signerEmail = String(email || "").trim();
    if (signerEmail) {
      body.recipients = {
        signers: [{ email: signerEmail, name: "Signer", recipientId: "1", routingOrder: "1" }],
      };
    }
    return body;
  }

  function looksLikePdf(bytes) {
    if (!bytes || bytes.length < 5) return false;
    const limit = Math.min(bytes.length, 1024) - 4;
    for (let index = 0; index < limit; index++) {
      if (bytes[index] === 0x25 && bytes[index + 1] === 0x50 && bytes[index + 2] === 0x44 && bytes[index + 3] === 0x46) {
        return true;
      }
    }
    return false;
  }

  function tokenHint(token) {
    const value = String(token || "").trim();
    if (!value) return "empty";
    return /^[\w-]+\.[\w-]+\.[\w-]+$/.test(value) ? "jwt" : "odd";
  }

  function accountHint(accountId) {
    const value = String(accountId || "").trim();
    if (!value) return "empty";
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? "guid" : "odd";
  }

  function toBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let index = 0; index < bytes.length; index += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
    }
    return btoa(binary);
  }

  const CSS = `
    .wrap { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,.72); font: 14px/1.5 system-ui, -apple-system, sans-serif; color: #111; }
    .panel { display: flex; flex-direction: column; width: min(540px, 92vw); max-height: 90vh; background: #fbfaf8;
      border: 1px solid #111; box-shadow: 0 24px 60px rgba(0,0,0,.45); }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px;
      border-bottom: 1px solid #111; }
    .title { margin: 0; font-size: 14px; font-weight: 600; }
    .meta { margin: 2px 0 0; font: 600 9.5px/1.4 ui-monospace, monospace; letter-spacing: .08em;
      text-transform: uppercase; color: #666; }
    .close { padding: 4px 8px; border: 1px solid #111; background: transparent; color: #111;
      font: 600 10px/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
    .body { display: flex; flex-direction: column; gap: 12px; padding: 14px; overflow: auto; }
    .doc { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 9px 10px;
      border: 1px solid #111; background: #fff; }
    .doc b { font-size: 13px; overflow-wrap: anywhere; }
    .doc span { flex: none; font: 600 9.5px/1.4 ui-monospace, monospace; letter-spacing: .08em;
      text-transform: uppercase; color: #666; }
    .row { display: flex; gap: 10px; }
    .field { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
    .field > label { font: 600 9.5px/1.4 ui-monospace, monospace; letter-spacing: .08em;
      text-transform: uppercase; color: #666; }
    .field input, .field select { padding: 7px 8px; border: 1px solid #111; background: #fff; color: #111;
      font: 13px system-ui, sans-serif; border-radius: 0; width: 100%; box-sizing: border-box; }
    .check { display: flex; gap: 8px; align-items: flex-start; font-size: 12px; color: #444; }
    .check input { margin-top: 2px; }
    .hint { margin: 0; font-size: 11.5px; color: #666; }
    .status { margin: 0; padding: 9px 10px; border: 1px solid #111; background: #fff; font-size: 12.5px;
      overflow-wrap: anywhere; }
    .status.error { border-style: dashed; }
    .status a { color: #111; }
    .foot { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; padding: 10px 14px;
      border-top: 1px solid #111; }
    .foot button, .foot label { padding: 6px 10px; border: 1px solid #111; background: transparent; color: #111;
      font: 600 10px/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase;
      cursor: pointer; text-align: center; }
    .foot .primary { background: #111; color: #fbfaf8; }
    .foot .primary:disabled { opacity: .45; cursor: default; }
    .foot .plain { border-color: transparent; text-decoration: underline; padding-inline: 2px; }
    .foot input[type="file"] { display: none; }
  `;

  function findSource() {
    if (isPdfHref(location.href) && !/^https?:/i.test(document.contentType || "")) {
      return { url: location.href, kind: "tab" };
    }
    if (/pdf/i.test(document.contentType || "")) return { url: location.href, kind: "tab" };
    for (const selector of SOURCE_SELECTORS) {
      const node = document.querySelector(selector);
      if (!node) continue;
      const raw = node.getAttribute("src") || node.getAttribute("data") || "";
      if (!raw) continue;
      try {
        return { url: new URL(raw, location.href).href, kind: "tab" };
      } catch {}
    }
    return null;
  }

  // A PDF tab is titled with the file name, but a page that embeds one is
  // titled with the article, so the file's own name is the better hint.
  function sourceName(source) {
    if (source?.url) {
      try {
        const last = decodeURIComponent(new URL(source.url, location.href).pathname.split("/").pop() || "");
        if (/\.pdf$/i.test(last)) return last;
      } catch {}
    }
    return globalThis.document?.title || "";
  }

  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function open() {
    document.getElementById("bl-docusign-host")?.remove();
    const host = document.createElement("div");
    host.id = "bl-docusign-host";
    document.body.append(host);
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;
    root.append(style);

    const saved = loadSettings();
    const found = findSource();
    const state = {
      env: saved.env === "production" ? "production" : "demo",
      accountId: saved.accountId || "",
      token: saved.token || "",
      email: saved.email || "",
      subject: saved.subject || "Please sign this document",
      remember: saved.rememberToken === true,
      file: null,
      source: found,
      busy: false,
    };

    function el(tag, props = {}, text) {
      const node = document.createElement(tag);
      for (const [name, value] of Object.entries(props)) {
        if (name === "class") node.className = value;
        else if (name === "text") node.textContent = value;
        else node.setAttribute(name, value);
      }
      if (text) node.textContent = text;
      return node;
    }

    const wrap = el("div", { class: "wrap" });
    const panel = el("div", { class: "panel" });
    wrap.append(panel);
    wrap.addEventListener("click", (event) => {
      if (event.target === wrap) close();
    });
    root.append(wrap);

    const head = el("div", { class: "head" });
    const titles = el("div");
    titles.append(
      el("h2", { class: "title" }, "Send this PDF to DocuSign"),
      el("p", { class: "meta" }, "Draft envelope · sender view"),
    );
    const closeButton = el("button", { class: "close", type: "button" }, "Close");
    closeButton.addEventListener("click", () => close());
    head.append(titles, closeButton);

    const body = el("div", { class: "body" });
    const doc = el("div", { class: "doc" });
    const docName = el("b");
    const docMeta = el("span");
    doc.append(docName, docMeta);

    const docHint = el("p", { class: "hint" });

    const envField = el("div", { class: "field" });
    const envLabel = el("label", {}, "Account environment");
    const envSelect = el("select");
    for (const [value, config] of Object.entries(ENVS)) {
      const option = el("option", { value }, config.label);
      if (value === state.env) option.selected = true;
      envSelect.append(option);
    }
    envField.append(envLabel, envSelect);

    const accountField = el("div", { class: "field" });
    const accountInput = el("input", { type: "text", autocomplete: "off", spellcheck: "false" });
    accountInput.value = state.accountId;
    accountInput.placeholder = "00000000-0000-0000-0000-000000000000";
    accountField.append(el("label", {}, "Account ID"), accountInput);

    const tokenField = el("div", { class: "field" });
    const tokenInput = el("input", { type: "password", autocomplete: "off", spellcheck: "false" });
    tokenInput.placeholder = state.token ? "Saved token — paste a new one to replace it" : "Paste an OAuth access token";
    tokenField.append(el("label", {}, "Access token"), tokenInput);

    const rowOne = el("div", { class: "row" });
    rowOne.append(envField, accountField);

    const rowTwo = el("div", { class: "row" });
    const emailField = el("div", { class: "field" });
    const emailInput = el("input", { type: "email", autocomplete: "off", spellcheck: "false" });
    emailInput.value = state.email;
    emailInput.placeholder = "signer@example.com";
    emailField.append(el("label", {}, "Signer email (optional)"), emailInput);

    const subjectField = el("div", { class: "field" });
    const subjectInput = el("input", { type: "text", autocomplete: "off" });
    subjectInput.value = state.subject;
    subjectField.append(el("label", {}, "Email subject"), subjectInput);
    rowTwo.append(emailField, subjectField);

    const rememberRow = el("label", { class: "check" });
    const rememberInput = el("input", { type: "checkbox" });
    rememberInput.checked = state.remember;
    rememberRow.append(
      rememberInput,
      el("span", {}, "Remember the token in this browser (this site's storage only — any script on this site can read it)."),
    );

    const status = el("p", { class: "status" });
    status.hidden = true;

    body.append(doc, docHint, rowOne, tokenField, rowTwo, rememberRow, status);

    const foot = el("div", { class: "foot" });
    const pickLabel = el("label", {}, "Choose a PDF");
    const pickInput = el("input", { type: "file", accept: "application/pdf,.pdf" });
    pickLabel.append(pickInput);
    const sendButton = el("button", { class: "primary", type: "button" }, "Create draft");
    const forgetButton = el("button", { class: "plain", type: "button" }, "Forget saved settings");
    foot.append(forgetButton, pickLabel, sendButton);

    panel.append(head, body, foot);

    function close() {
      window.removeEventListener("keydown", onKey, true);
      host.remove();
    }
    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    }
    window.addEventListener("keydown", onKey, true);

    function describeSource() {
      if (state.file) {
        docName.textContent = state.file.name;
        docMeta.textContent = `${Math.max(1, Math.round(state.file.size / 1024))} KB · chosen file`;
        docHint.textContent = "This file will be uploaded straight from the browser.";
        return;
      }
      if (state.source) {
        docName.textContent = fileNameFor(sourceName(state.source), state.source.url);
        docMeta.textContent = state.source.kind === "tab" ? "PDF from this tab" : "PDF in this page";
        docHint.textContent = "The file is read when you press Create draft.";
        return;
      }
      docName.textContent = "No PDF in this tab";
      docMeta.textContent = "choose one";
      docHint.textContent =
        "A browser will not run a bookmarklet on its own PDF tab, so pick the file here or open a page that embeds the PDF.";
    }

    function persist() {
      try {
        const payload = {
          env: state.env,
          accountId: state.accountId,
          email: state.email,
          subject: state.subject,
          rememberToken: state.remember,
          ...(state.remember && state.token ? { token: state.token } : {}),
        };
        localStorage.setItem(KEY, JSON.stringify(payload));
      } catch {}
    }

    function showStatus(text, error = false, link) {
      status.hidden = false;
      status.className = error ? "status error" : "status";
      status.replaceChildren(document.createTextNode(text));
      if (link) {
        const anchor = el("a", { href: link, target: "_blank", rel: "noreferrer noopener" }, " Open the sender view");
        status.append(anchor);
      }
    }

    function reads() {
      state.env = envSelect.value === "production" ? "production" : "demo";
      state.accountId = accountInput.value.trim();
      state.email = emailInput.value.trim();
      state.subject = subjectInput.value;
      state.remember = rememberInput.checked;
      if (tokenInput.value.trim()) state.token = tokenInput.value.trim();
    }

    async function readPdf() {
      if (state.file) return new Uint8Array(await state.file.arrayBuffer());
      if (!state.source) throw new Error("Choose a PDF first.");
      const response = await fetch(state.source.url, { credentials: "include", cache: "no-store" });
      if (!response.ok) {
        throw new Error(`The browser would not hand over this PDF (HTTP ${response.status}). Choose the file instead.`);
      }
      return new Uint8Array(await response.arrayBuffer());
    }

    function apiError(response, data, raw, token) {
      const code = data?.errorCode || "";
      const message = data?.message || raw.slice(0, 200) || response.statusText;
      if (response.status === 401) {
        return `DocuSign refused the token (401). Temporary tokens expire after 8 hours, and a demo token will not work against production. ${message}`;
      }
      if (response.status === 403) {
        return `DocuSign refused the request (403). The token needs the signature scope, and the account must have the eSignature API enabled. ${message}`;
      }
      return `DocuSign answered ${response.status}${code ? ` (${code})` : ""}: ${message}`;
    }

    async function send() {
      if (state.busy) return;
      reads();
      const env = ENVS[state.env];

      if (accountHint(state.accountId) === "empty") return showStatus("An Account ID is needed. It is on the Apps and Keys page.", true);
      if (tokenHint(state.token) === "empty") return showStatus("An access token is needed. Copy one from Apps and Keys.", true);
      if (!state.file && !state.source) {
        showStatus("Choose a PDF to send.", true);
        return;
      }

      state.busy = true;
      sendButton.disabled = true;
      sendButton.textContent = "Sending…";
      showStatus("Reading the PDF…");

      try {
        const bytes = await readPdf();
        if (!looksLikePdf(bytes)) {
          throw new Error("Those bytes are not a PDF, so DocuSign would reject them. Open the PDF itself or choose the file.");
        }
        const name = fileNameFor(state.file ? state.file.name : sourceName(state.source), state.source?.url || "");
        showStatus(`Uploading ${name} (${Math.max(1, Math.round(bytes.length / 1024))} KB)…`);

        const headers = { Authorization: `Bearer ${state.token}`, "Content-Type": "application/json" };
        const created = await fetch(`${env.api}/v2.1/accounts/${encodeURIComponent(state.accountId)}/envelopes`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            ...envelopeBody({ name, base64: toBase64(bytes), email: state.email, subject: state.subject }),
          }),
        });
        const createdRaw = await created.text();
        let createdData = null;
        try {
          createdData = JSON.parse(createdRaw);
        } catch {}
        if (!created.ok) throw new Error(apiError(created, createdData, createdRaw, state.token));
        const envelopeId = createdData?.envelopeId;
        if (!envelopeId) throw new Error("DocuSign created nothing and returned no envelope id.");

        persist();
        showStatus(`Draft envelope created (${envelopeId.slice(0, 8)}…). Opening the sender view…`);

        const returnUrl = /^https?:/i.test(location.href) ? location.href : env.web;
        const view = await fetch(
          `${env.api}/v2.1/accounts/${encodeURIComponent(state.accountId)}/envelopes/${encodeURIComponent(envelopeId)}/views/sender`,
          { method: "POST", headers, body: JSON.stringify({ returnUrl }) },
        );
        const viewRaw = await view.text();
        let viewData = null;
        try {
          viewData = JSON.parse(viewRaw);
        } catch {}
        const viewUrl = viewData?.url;
        if (!view.ok || !viewUrl) {
          showStatus(
            `Draft created, but the sender view did not open. Envelope ${envelopeId}. ${view.ok ? "" : apiError(view, viewData, viewRaw, state.token)}`,
            true,
            `${env.web}/`,
          );
          return;
        }
        const tab = window.open(viewUrl, "_blank", "noopener");
        if (tab) {
          showStatus(`Draft created and the sender view opened in a new tab. Envelope ${envelopeId}.`);
        } else {
          showStatus(`Draft created. The browser blocked the new tab, so open the sender view here. Envelope ${envelopeId}.`, false, viewUrl);
        }
      } catch (error) {
        showStatus(String(error?.message || error), true);
      } finally {
        state.busy = false;
        sendButton.disabled = false;
        sendButton.textContent = "Create draft";
      }
    }

    envSelect.addEventListener("change", reads);
    accountInput.addEventListener("change", reads);
    emailInput.addEventListener("change", reads);
    subjectInput.addEventListener("change", reads);
    rememberInput.addEventListener("change", reads);
    tokenInput.addEventListener("change", reads);
    pickInput.addEventListener("change", () => {
      state.file = pickInput.files?.[0] || null;
      describeSource();
      showStatus(state.file ? `${state.file.name} ready to send.` : "No file chosen.");
    });
    forgetButton.addEventListener("click", () => {
      try {
        localStorage.removeItem(KEY);
      } catch {}
      state.token = "";
      state.accountId = "";
      state.email = "";
      state.remember = false;
      accountInput.value = "";
      emailInput.value = "";
      tokenInput.value = "";
      rememberInput.checked = false;
      showStatus("Saved settings cleared from this site's storage.");
    });
    sendButton.addEventListener("click", () => void send());

    describeSource();
    if (found) showStatus("PDF found. Add your DocuSign details once, then create the draft.");
    else if (state.file) showStatus("Choose a PDF, then create the draft.");
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.docusign = { isPdfHref, fileNameFor, sourceName, envelopeBody, looksLikePdf, tokenHint, accountHint };
  } else if (document?.body) {
    open();
  }
})();
