/**
 * @name 📝 Edit a Local PDF
 * @category files
 * @description Opens a PDF from your disk in SimplePDF's editor: in a modal by default, then a floating picture-in-picture window, then a popup, whichever the page allows.
 * @tags pdf, editor, local, annotate, sign, simplepdf
 * @traits network, web-app
 * @added 2026-11-03
 * @featured false
 */
(() => {
  // The embeddable host: simplepdf.com/editor refuses to be framed
  // (frame-ancestors 'self'), this one does not.
  const EMBED = "https://embed.simplepdf.com/editor";
  const ORIGIN = "https://embed.simplepdf.com";
  const PROBE_MS = 500;
  const READY_MS = 30000;
  // A host page whose CSP forbids frame-src fails silently: no message ever
  // arrives, so the modal attempt gives up well before the hard timeout.
  const FRAME_MS = 12000;
  const REPLY_MS = 60000;

  // Surfaces in the order they are tried. The second and third escape the host
  // page's CSP entirely, because they own their document.
  const SURFACES = ["iframe", "float", "popup"];
  const PIP_OPTIONS = { width: 1000, height: 760 };

  const rid = () => Math.random().toString(36).slice(2, 10);

  const isPdfFile = (name = "", type = "") => /^application\/pdf$/i.test(type) || /\.pdf$/i.test(name);

  const buildRequest = (type, data, requestId) => JSON.stringify({ type, request_id: requestId, data });

  /** Which surfaces are worth trying, given what this browser offers. */
  const fallbackOrder = (caps = {}) => {
    const order = [];
    if (caps.documentPictureInPicture) order.push("float");
    if (caps.open !== false) order.push("popup");
    return order;
  };

  // The editor replies with a JSON string on the snow_case wire; anything else
  // belongs to some other frame and is ignored.
  function parseReply(raw) {
    let payload = raw;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        return null;
      }
    }
    if (!payload || payload.type !== "REQUEST_RESULT") return null;
    const id = payload.data && payload.data.request_id;
    if (typeof id !== "string") return null;
    return { id, result: payload.data.result };
  }

  // `win` is the window that owns the frame: the page itself for the modal,
  // the PiP document or the popup for the fallbacks. Replies are dispatched
  // there, not here.
  function connect(win, frame) {
    const pending = new Map();
    const onMessage = (event) => {
      if (event.origin !== ORIGIN) return;
      const reply = parseReply(event.data);
      if (!reply || !pending.has(reply.id)) return;
      const settle = pending.get(reply.id);
      pending.delete(reply.id);
      settle(reply.result);
    };
    win.addEventListener("message", onMessage);

    const send = (type, data, timeout = REPLY_MS) =>
      new Promise((resolve) => {
        const id = rid();
        const target = frame.contentWindow;
        if (!target) {
          resolve({ success: false, error: { code: "unexpected:no_frame", message: "the frame is not attached" } });
          return;
        }
        pending.set(id, resolve);
        target.postMessage(buildRequest(type, data, id), ORIGIN);
        setTimeout(() => {
          if (pending.delete(id)) {
            resolve({ success: false, error: { code: "unexpected:timeout", message: `no reply to ${type}` } });
          }
        }, timeout);
      });

    // The editor never announces itself, so readiness is discovered by asking
    // for its field list until something answers. Any reply means the bridge is
    // up; the answer may still be a refusal, which is fine at this stage.
    const ready = (limit = READY_MS) =>
      new Promise((resolve) => {
        let settled = false;
        let timer = 0;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          clearInterval(timer);
          resolve(value);
        };
        const probe = async () => {
          if (settled) return;
          const reply = await send("GET_FIELDS", {}, 8000);
          const timedOut = reply && reply.error && reply.error.code === "unexpected:timeout";
          if (!timedOut) finish(reply || { success: true });
        };
        const deadline = setTimeout(() => finish(null), limit);
        timer = setInterval(probe, PROBE_MS);
        probe();
        setTimeout(() => clearTimeout(deadline), limit + 1000);
      });

    return { send, ready, close: () => win.removeEventListener("message", onMessage) };
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
    ".name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:36vw}",
    ".status{margin-left:auto;opacity:.75;text-align:right;max-width:34vw}",
    "button{border:1px solid #111;background:#fbfaf8;color:#111;font:inherit;padding:6px 10px;cursor:pointer;white-space:nowrap}",
    "button:hover{background:#111;color:#fbfaf8}",
    ".stage{flex:1;min-height:0;display:flex}",
    ".stage iframe{flex:1;width:100%;border:0;background:#fff}",
  ].join("\n");

  const EMBED_STYLE = "width:100%;height:100vh;border:0;background:#fff";

  function makeFrame(doc, style) {
    const frame = doc.createElement("iframe");
    frame.src = EMBED;
    frame.title = "SimplePDF editor";
    frame.setAttribute("allow", "clipboard-write");
    frame.setAttribute("referrerpolicy", "no-referrer");
    if (style) frame.style.cssText = style;
    return frame;
  }

  // The bytes never leave the browser: they are handed to the framed editor as
  // a data URL, which is what LOAD_DOCUMENT accepts besides an http(s) URL.
  function openLocal(dataUrl, name) {
    const host = document.createElement("div");
    host.setAttribute("data-simplepdf-local", "");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = MODAL_CSS;

    const scrim = el(document, "div", "scrim");
    const card = el(document, "div", "card");
    card.tabIndex = -1;
    const bar = el(document, "div", "bar");
    const label = el(document, "span", "name", name || "PDF");
    const status = el(document, "span", "status", "Opening editor…");
    const floatBtn = el(document, "button", "", "Float");
    const popupBtn = el(document, "button", "", "Popup");
    const closeBtn = el(document, "button", "", "Close");
    for (const button of [floatBtn, popupBtn, closeBtn]) button.type = "button";
    const stage = el(document, "div", "stage");

    bar.append(label, status, floatBtn, popupBtn, closeBtn);
    card.append(bar, stage);
    scrim.append(card);
    root.append(style, scrim);
    document.documentElement.appendChild(host);
    card.focus();

    let link = null;

    const bind = (win, frame) => {
      if (link) link.close();
      link = connect(win, frame);
      return link;
    };

    const loadInto = async (win, frame, limit) => {
      const current = bind(win, frame);
      const reply = await current.ready(limit);
      if (!reply) return false;
      const result = await current.send("LOAD_DOCUMENT", { data_url: dataUrl, name: name || undefined });
      return Boolean(result && result.success);
    };

    const closeAll = () => {
      if (link) link.close();
      link = null;
      host.remove();
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
        // Document PiP needs a live user gesture; a timeout-driven fallback
        // does not have one, so the button is the reliable route.
        return false;
      }
      win.document.body.style.cssText = "margin:0;height:100vh;background:#fbfaf8";
      const frame = makeFrame(win.document, EMBED_STYLE);
      win.document.body.append(frame);
      win.addEventListener("pagehide", () => {
        status.textContent = "Floating window closed.";
      });
      status.textContent = "Loading in a floating window…";
      const ok = await loadInto(win, frame, READY_MS);
      if (ok) {
        status.textContent = "";
        return true;
      }
      status.textContent = "The floating window could not load the editor.";
      try {
        win.close();
      } catch {
        /* already gone */
      }
      return false;
    };

    const tryPopup = async () => {
      const win = window.open("", "simplepdf-local-editor", "popup,width=1000,height=760");
      if (!win) return false;
      win.document.title = `SimplePDF — ${name || "PDF"}`;
      win.document.body.style.cssText = "margin:0;height:100vh;background:#fbfaf8";
      const frame = makeFrame(win.document, EMBED_STYLE);
      win.document.body.append(frame);
      status.textContent = "Loading in a popup…";
      const ok = await loadInto(win, frame, READY_MS);
      status.textContent = ok ? "" : "The popup could not load the editor.";
      return ok;
    };

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

    const frame = makeFrame(stage);
    stage.append(frame);

    (async () => {
      if (await loadInto(window, frame, FRAME_MS)) {
        status.textContent = "";
        return;
      }
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

    return { host, closeAll, status, tryFloat, tryPopup };
  }

  function toast(message) {
    const node = document.createElement("div");
    node.textContent = message;
    node.style.cssText =
      "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;max-width:min(440px,90vw);padding:12px 16px;border:1px solid #111;background:#fbfaf8;color:#111;font:13px/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)";
    (document.body || document.documentElement).appendChild(node);
    setTimeout(() => node.remove(), 4500);
  }

  function choose() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,.pdf";
    input.style.cssText = "position:fixed;left:-9999px;top:0";
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      input.remove();
      if (!file) return;
      if (!isPdfFile(file.name, file.type)) {
        toast("That file is not a PDF.");
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => toast("Could not read that file.");
      reader.onload = () => openLocal(String(reader.result || ""), file.name);
      reader.readAsDataURL(file);
    });
    document.body.appendChild(input);
    input.click();
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.simplepdfLocal = {
      isPdfFile,
      buildRequest,
      parseReply,
      fallbackOrder,
      openLocal,
      EMBED,
      ORIGIN,
      SURFACES,
      FRAME_MS,
      READY_MS,
    };
  } else if (document?.body) {
    choose();
  }
})();
