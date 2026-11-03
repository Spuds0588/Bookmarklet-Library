/**
 * @name 💻 Edit code on Page
 * @category devtools
 * @description Opens a runnable code editor over the page, preloaded with the page's own HTML or your selection: in a modal by default, then a floating picture-in-picture window, then a popup.
 * @tags code, editor, sandbox, html, playground, js, onecompiler
 * @traits network, web-app
 * @added 2026-11-03
 * @featured false
 * @testing true
 */
(() => {
  // OneCompiler's editor is documented as an embeddable iframe with a
  // postMessage handoff, needs no key, and sends no framing restriction.
  const BASE = "https://onecompiler.com/embed/html";
  const EMBED = `${BASE}?listenToEvents=true&codeChangeEvent=true&hideTitle=true&theme=dark`;
  const ORIGIN = "https://onecompiler.com";
  // A page's markup can be megabytes; the editor is a modal, not a build step.
  const LIMIT_BYTES = 200 * 1024;
  const HOLD_MS = 4000;
  const FRAME_MS = 12000;
  const SURFACES = ["iframe", "float", "popup"];
  const PIP_OPTIONS = { width: 1000, height: 760 };

  /** Which surfaces are worth trying, given what this browser offers. */
  const fallbackOrder = (caps = {}) => {
    const order = [];
    if (caps.documentPictureInPicture) order.push("float");
    if (caps.open !== false) order.push("popup");
    return order;
  };

  const clip = (text, limit = LIMIT_BYTES) => {
    const bytes = new TextEncoder().encode(text);
    if (bytes.length <= limit) return { text, truncated: false, bytes: bytes.length };
    // Cut on a character boundary the decoder can take, then say so in the code
    // rather than handing the editor half a tag with no explanation.
    const kept = new TextDecoder().decode(bytes.slice(0, limit));
    return {
      text: `<!-- ${bytes.length} bytes of page markup; kept the first ${limit}. -->\n${kept}`,
      truncated: true,
      // The original size, so the status line reports the page rather than the clip.
      bytes: bytes.length,
    };
  };

  /** The selection when there is one, the whole document otherwise. */
  const markupFor = (doc) => {
    let selection = "";
    try {
      selection = String(doc.getSelection ? doc.getSelection() : "").trim();
    } catch {
      selection = "";
    }
    const source = selection.length > 40 ? selection : doc.documentElement.outerHTML;
    const clipped = clip(source);
    return {
      source: selection.length > 40 ? "selection" : "page",
      text: clipped.text,
      truncated: clipped.truncated,
      bytes: clipped.bytes,
    };
  };

  // The name matters: the editor's preview runs its entry point, and it only
  // recognises index.html, so a page handed over as page.html previews nothing.
  const populateMessage = (text) => ({
    eventType: "populateCode",
    language: "html",
    files: [{ name: "index.html", content: text }],
  });

  // The editor answers with its own state object once it is listening, which is
  // the only confirmation it offers that the handoff landed.
  const isEditorMessage = (data) => Boolean(data) && typeof data === "object" && typeof data.language === "string";

  function connect(win, frame) {
    const listeners = new Set();
    const state = { heard: false };
    const onMessage = (event) => {
      if (event.origin !== ORIGIN) return;
      if (isEditorMessage(event.data)) state.heard = true;
      for (const fn of listeners) fn(event.data, state);
    };
    win.addEventListener("message", onMessage);

    const on = (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    };

    return {
      state,
      on,
      post: (payload) => {
        const target = frame.contentWindow;
        if (!target) return false;
        target.postMessage(payload, "*");
        return true;
      },
      // The editor does not announce itself, so the handoff is sent on load and
      // repeated once if nothing came back: populateCode is idempotent.
      hand: (payload, win2 = frame) =>
        new Promise((resolve) => {
          const send = () => {
            const target = win2.contentWindow;
            if (target) target.postMessage(payload, "*");
          };
          send();
          let off = () => {};
          const stop = setTimeout(() => {
            off();
            resolve(state.heard);
          }, HOLD_MS);
          off = on(() => {
            if (!state.heard) return;
            clearTimeout(stop);
            off();
            resolve(true);
          });
          setTimeout(() => {
            if (!state.heard) send();
          }, 1500);
        }),
      close: () => win.removeEventListener("message", onMessage),
    };
  }

  const el = (doc, tag, cls, text) => {
    const node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };

  const MODAL_CSS = [
    ":host{all:initial}",
    ".scrim{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(17,17,17,.55)}",
    ".card{display:flex;flex-direction:column;width:min(1040px,100%);height:min(86vh,880px);border:1px solid #111;background:#fbfaf8;color:#111;font:13px/1.4 system-ui,-apple-system,sans-serif;outline:none}",
    ".bar{display:flex;gap:10px;align-items:center;padding:10px 12px;border-bottom:1px solid #111}",
    ".name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:24vw}",
    ".status{margin-left:auto;opacity:.75;text-align:right;max-width:38vw}",
    "button{border:1px solid #111;background:#fbfaf8;color:#111;font:inherit;padding:6px 10px;cursor:pointer;white-space:nowrap}",
    "button:hover{background:#111;color:#fbfaf8}",
    "button[disabled]{opacity:.45;cursor:default}",
    "button[disabled]:hover{background:#fbfaf8;color:#111}",
    ".stage{flex:1;min-height:0;display:flex}",
    ".stage iframe{flex:1;width:100%;border:0;background:#fff}",
  ].join("\n");

  const EMBED_STYLE = "width:100%;height:100vh;border:0;background:#fff";

  function makeFrame(doc, style) {
    const frame = doc.createElement("iframe");
    frame.src = EMBED;
    frame.title = "OneCompiler editor";
    frame.setAttribute("allow", "clipboard-write; clipboard-read");
    if (style) frame.style.cssText = style;
    return frame;
  }

  function openEditor(markup) {
    const host = document.createElement("div");
    host.setAttribute("data-code-editor-local", "");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = MODAL_CSS;

    const scrim = el(document, "div", "scrim");
    const card = el(document, "div", "card");
    card.tabIndex = -1;
    const bar = el(document, "div", "bar");
    const label = el(document, "span", "name", markup.source === "selection" ? "selection" : document.title || "page");
    const status = el(document, "span", "status", "Opening editor…");
    const copyBtn = el(document, "button", "", "Copy code");
    const floatBtn = el(document, "button", "", "Float");
    const popupBtn = el(document, "button", "", "Popup");
    const closeBtn = el(document, "button", "", "Close");
    for (const button of [copyBtn, floatBtn, popupBtn, closeBtn]) button.type = "button";
    const stage = el(document, "div", "stage");

    bar.append(label, status, copyBtn, floatBtn, popupBtn, closeBtn);
    card.append(bar, stage);
    scrim.append(card);
    root.append(style, scrim);
    document.documentElement.appendChild(host);
    card.focus();

    const size = markup.bytes >= 1024 ? `${Math.round(markup.bytes / 1024)} KB` : `${markup.bytes} bytes`;
    const note = markup.truncated ? `${size}, truncated` : size;

    let link = null;
    let handoff = null;

    const loadInto = async (win, frame, limit) => {
      if (link) link.close();
      link = connect(win, frame);
      status.textContent = "Opening editor…";
      await new Promise((resolve) => {
        const target = frame;
        if (target.contentDocument && target.contentDocument.readyState === "complete") {
          resolve();
          return;
        }
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        target.addEventListener("load", finish, { once: true });
        setTimeout(finish, limit);
      });
      // The frame is up (or the page is blocking it); the handoff is the only
      // thing that can tell the difference, because a blocked frame is silent.
      const heard = await link.hand(populateMessage(markup.text), frame);
      handoff = heard ? "sent" : "unknown";
      status.textContent = heard
        ? `${markup.source === "selection" ? "selection" : "page"} · ${note}`
        : `editor open · ${note} · Copy code if it is empty`;
      return heard;
    };

    const closeAll = () => {
      if (link) link.close();
      link = null;
      host.remove();
    };

    const copyCode = async () => {
      try {
        await navigator.clipboard.writeText(markup.text);
        status.textContent = `Copied ${note}`;
      } catch {
        status.textContent = "The clipboard refused; select the code in the editor instead.";
      }
    };

    const tryFloat = async () => {
      const pip = window.documentPictureInPicture;
      if (!pip || typeof pip.requestWindow !== "function") {
        status.textContent = "This browser has no floating window support.";
        return false;
      }
      let win;
      try {
        win = await pip.requestWindow(PIP_OPTIONS);
      } catch {
        // Document PiP needs a live user gesture; a timeout-driven fallback has
        // none, which is why Float is also a button.
        return false;
      }
      win.document.body.style.cssText = "margin:0;height:100vh;background:#fbfaf8";
      const frame = makeFrame(win.document, EMBED_STYLE);
      win.document.body.append(frame);
      win.addEventListener("pagehide", () => {
        status.textContent = "Floating window closed.";
      });
      status.textContent = "Loading in a floating window…";
      if (await loadInto(win, frame, FRAME_MS)) return true;
      status.textContent = "The floating window could not load the editor.";
      try {
        win.close();
      } catch {
        /* already gone */
      }
      return false;
    };

    const tryPopup = async () => {
      const win = window.open("", "code-editor-local", "popup,width=1000,height=760");
      if (!win) return false;
      win.document.title = "OneCompiler — page markup";
      win.document.body.style.cssText = "margin:0;height:100vh;background:#fbfaf8";
      const frame = makeFrame(win.document, EMBED_STYLE);
      win.document.body.append(frame);
      status.textContent = "Loading in a popup…";
      const ok = await loadInto(win, frame, FRAME_MS);
      if (!ok) status.textContent = "The popup could not load the editor.";
      return ok;
    };

    copyBtn.addEventListener("click", copyCode);
    floatBtn.addEventListener("click", () => {
      floatBtn.disabled = true;
      tryFloat().finally(() => {
        floatBtn.disabled = false;
      });
    });
    popupBtn.addEventListener("click", () => {
      popupBtn.disabled = true;
      tryPopup().finally(() => {
        popupBtn.disabled = false;
      });
    });
    closeBtn.addEventListener("click", closeAll);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAll();
    });

    const frame = makeFrame(document);
    stage.append(frame);

    (async () => {
      if (await loadInto(window, frame, FRAME_MS)) return;
      status.textContent = "This page blocks the embedded editor — use Float or Popup.";
      const order = fallbackOrder({
        documentPictureInPicture: Boolean(window.documentPictureInPicture),
        open: typeof window.open === "function",
      });
      for (const surface of order) {
        if (surface === "float" && (await tryFloat())) return;
        if (surface === "popup" && (await tryPopup())) return;
      }
      status.textContent = "This page blocks the embedded editor — use Float or Popup.";
    })();

    return { host, closeAll, status, loadInto, tryFloat, tryPopup, copyCode, get handoff() { return handoff; } };
  }

  function toast(message) {
    const node = document.createElement("div");
    node.textContent = message;
    node.style.cssText =
      "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;max-width:min(440px,90vw);padding:12px 16px;border:1px solid #111;background:#fbfaf8;color:#111;font:13px/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)";
    (document.body || document.documentElement).appendChild(node);
    setTimeout(() => node.remove(), 4500);
  }

  function run() {
    if (!document.body) {
      toast("This page has no body to read.");
      return;
    }
    openEditor(markupFor(document));
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.codeEditorLocal = {
      clip,
      markupFor,
      populateMessage,
      isEditorMessage,
      fallbackOrder,
      EMBED,
      BASE,
      ORIGIN,
      SURFACES,
      FRAME_MS,
      HOLD_MS,
      LIMIT_BYTES,
    };
  } else if (document?.body) {
    run();
  }
})();
