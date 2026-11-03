/**
 * @name 📷 Edit photo on Page
 * @category files
 * @description Opens a photo from your disk in Photopea's editor: in a modal by default, then a floating picture-in-picture window, then a popup, and saves the result as a PNG.
 * @tags photo, image, editor, local, retouch, crop, photopea
 * @traits network, web-app
 * @added 2026-11-03
 * @featured false
 * @testing true
 */
(() => {
  // Photopea is the editor that is built to be framed: no X-Frame-Options, no
  // CSP, and a documented messaging API that takes a file as an ArrayBuffer.
  const EMBED = "https://www.photopea.com/";
  const ORIGIN = "https://www.photopea.com";
  const READY_MS = 30000;
  // A page whose CSP forbids frame-src fails silently, so the modal attempt
  // gives up early enough to leave time for a surface the user can see.
  const FRAME_MS = 12000;
  const SAVE_MS = 20000;

  const SURFACES = ["iframe", "float", "popup"];
  const PIP_OPTIONS = { width: 1000, height: 760 };

  const isImageFile = (name = "", type = "") =>
    /^image\//i.test(type) || /\.(png|jpe?g|gif|webp|avif|bmp|svg|psd)$/i.test(name);

  const editedName = (name = "") => `${String(name).replace(/\.[^.\\/]+$/, "") || "image"}-edited.png`;

  /** Which surfaces are worth trying, given what this browser offers. */
  const fallbackOrder = (caps = {}) => {
    const order = [];
    if (caps.documentPictureInPicture) order.push("float");
    if (caps.open !== false) order.push("popup");
    return order;
  };

  const parseSize = (data) => {
    if (typeof data !== "string") return null;
    const match = data.match(/^size:(\d{1,5})x(\d{1,5})$/);
    return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
  };

  // Photopea announces itself with "done" and repeats it after every message,
  // so readiness is a message to wait for rather than a probe to poll.
  const askSize = 'app.echoToOE("size:" + app.activeDocument.width + "x" + app.activeDocument.height);';
  const askPng = 'app.activeDocument.saveToOE("png");';

  function connect(win, frame) {
    const listeners = new Set();
    const state = { done: 0 };
    const onMessage = (event) => {
      if (event.origin !== ORIGIN) return;
      if (event.data === "done") state.done++;
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
      ready: (limit) =>
        new Promise((resolve) => {
          if (state.done > 0) {
            resolve(true);
            return;
          }
          let off = () => {};
          const stop = setTimeout(() => {
            off();
            resolve(false);
          }, limit);
          off = on((data) => {
            if (data !== "done") return;
            clearTimeout(stop);
            off();
            resolve(true);
          });
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
    ".name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:30vw}",
    ".status{margin-left:auto;opacity:.75;text-align:right;max-width:36vw}",
    "button{border:1px solid #111;background:#fbfaf8;color:#111;font:inherit;padding:6px 10px;cursor:pointer;white-space:nowrap}",
    "button:hover{background:#111;color:#fbfaf8}",
    "button[disabled]{opacity:.45;cursor:default}",
    "button[disabled]:hover{background:#fbfaf8;color:#111}",
    ".stage{flex:1;min-height:0;display:flex}",
    ".stage iframe{flex:1;width:100%;border:0;background:#fff}",
  ].join("\n");

  const EMBED_STYLE = "width:100%;height:100vh;border:0;background:#fff";

  // Photopea refuses to start in a frame that hides its referrer, so this frame
  // deliberately leaves the browser's default policy alone.
  function makeFrame(doc, style) {
    const frame = doc.createElement("iframe");
    frame.src = EMBED;
    frame.title = "Photopea editor";
    frame.setAttribute("allow", "clipboard-write; clipboard-read");
    if (style) frame.style.cssText = style;
    return frame;
  }

  function download(win, bytes, name) {
    const blob = new Blob([bytes], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    const anchor = win.document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    win.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function openEditor(bytes, name) {
    const host = document.createElement("div");
    host.setAttribute("data-photo-editor-local", "");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = MODAL_CSS;

    const scrim = el(document, "div", "scrim");
    const card = el(document, "div", "card");
    card.tabIndex = -1;
    const bar = el(document, "div", "bar");
    const label = el(document, "span", "name", name || "image");
    const status = el(document, "span", "status", "Opening editor…");
    const saveBtn = el(document, "button", "", "Save PNG");
    const floatBtn = el(document, "button", "", "Float");
    const popupBtn = el(document, "button", "", "Popup");
    const closeBtn = el(document, "button", "", "Close");
    for (const button of [saveBtn, floatBtn, popupBtn, closeBtn]) button.type = "button";
    saveBtn.disabled = true;
    const stage = el(document, "div", "stage");

    bar.append(label, status, saveBtn, floatBtn, popupBtn, closeBtn);
    card.append(bar, stage);
    scrim.append(card);
    root.append(style, scrim);
    document.documentElement.appendChild(host);
    card.focus();

    let link = null;
    let owner = window;
    let loaded = null;

    // Every surface runs the same handoff, because the editor's replies are
    // dispatched to the frame's parent: the page, the PiP document, or the popup.
    const loadInto = async (win, frame, limit) => {
      if (link) link.close();
      link = connect(win, frame);
      owner = win;
      loaded = null;
      saveBtn.disabled = true;
      if (!(await link.ready(limit))) return null;
      status.textContent = "Sending the photo…";
      // The bytes never leave the browser. Messages are queued in order, so the
      // size echo lands on the document this file just became.
      link.post(bytes);
      link.post(askSize);
      const size = await new Promise((resolve) => {
        let off = () => {};
        const stop = setTimeout(() => {
          off();
          resolve(null);
        }, limit);
        off = link.on((data) => {
          const parsed = parseSize(data);
          if (!parsed) return;
          clearTimeout(stop);
          off();
          resolve(parsed);
        });
      });
      if (!size) return null;
      loaded = size;
      saveBtn.disabled = false;
      status.textContent = `${size.width}×${size.height} · edit, then Save PNG`;
      return size;
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
      if (await loadInto(win, frame, READY_MS)) return true;
      status.textContent = "The floating window could not load the editor.";
      try {
        win.close();
      } catch {
        /* already gone */
      }
      return false;
    };

    const tryPopup = async () => {
      const win = window.open("", "photo-editor-local", "popup,width=1000,height=760");
      if (!win) return false;
      win.document.title = `Photopea — ${name || "image"}`;
      win.document.body.style.cssText = "margin:0;height:100vh;background:#fbfaf8";
      const frame = makeFrame(win.document, EMBED_STYLE);
      win.document.body.append(frame);
      status.textContent = "Loading in a popup…";
      const ok = Boolean(await loadInto(win, frame, READY_MS));
      if (!ok) status.textContent = "The popup could not load the editor.";
      return ok;
    };

    const save = async () => {
      if (!link || !loaded) return;
      saveBtn.disabled = true;
      status.textContent = "Exporting the PNG…";
      const back = await new Promise((resolve) => {
        let off = () => {};
        const stop = setTimeout(() => {
          off();
          resolve(null);
        }, SAVE_MS);
        off = link.on((data) => {
          if (!(data instanceof ArrayBuffer)) return;
          clearTimeout(stop);
          off();
          resolve(data);
        });
        link.post(askPng);
      });
      saveBtn.disabled = false;
      if (!back) {
        status.textContent = "The editor did not return an image.";
        return;
      }
      download(owner, back, editedName(name));
      status.textContent = `Saved ${editedName(name)}`;
    };

    saveBtn.addEventListener("click", () => {
      save();
    });
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

    return { host, closeAll, status, tryFloat, tryPopup, save, loadInto };
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
    input.accept = "image/*,.psd";
    input.style.cssText = "position:fixed;left:-9999px;top:0";
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      input.remove();
      if (!file) return;
      if (!isImageFile(file.name, file.type)) {
        toast("That file is not an image.");
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => toast("Could not read that file.");
      reader.onload = () => openEditor(reader.result, file.name);
      reader.readAsArrayBuffer(file);
    });
    document.body.appendChild(input);
    input.click();
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.photoEditorLocal = {
      isImageFile,
      editedName,
      fallbackOrder,
      parseSize,
      askSize,
      askPng,
      openEditor,
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
