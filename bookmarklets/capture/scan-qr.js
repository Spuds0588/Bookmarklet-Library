/**
 * @name 🔎 Scan QR from screen
 * @category capture
 * @description Drag a box around a QR code on screen, then open the link, open it in a new tab or copy the text.
 * @tags qr, qr code, scan, reader, screen, link, clipboard
 * @added 2026-10-28
 * @featured false
 */
(() => {
  "use strict";

  const DEFAULT_READER = "https://spuds0588.github.io/Bookmarklet-Library/qr-reader/";
  const HOST_ID = "bl-readqr-host";
  let reader;
  try {
    reader = new URL(globalThis.__BL_QR_READER_BASE__ || DEFAULT_READER, location.href);
  } catch {
    reader = new URL(DEFAULT_READER);
  }
  if (!reader.pathname.endsWith("/")) reader.pathname += "/";
  const readerHref = reader.href;
  const readerOrigin = reader.origin;
  const targetOrigin = readerOrigin === "null" ? "*" : readerOrigin;

  const state = {
    popup: null,
    overlay: null,
    stream: null,
    activeElement: null,
    previousOverflow: "",
    scale: 1,
    ready: false,
    pending: null,
    watch: 0,
    disposed: false,
  };
  let api = null;

  if (globalThis.__blQrReader) {
    try {
      globalThis.__blQrReader.dispose();
    } catch {}
  }

  function cleanupOverlay() {
    if (!state.overlay) return;
    document.removeEventListener("keydown", onKey, true);
    document.documentElement.style.overflow = state.previousOverflow;
    state.overlay.remove();
    state.overlay = null;
    const active = state.activeElement;
    state.activeElement = null;
    if (active && active.isConnected) {
      try {
        active.focus({ preventScroll: true });
      } catch {}
    }
  }

  function stopStream() {
    if (!state.stream) return;
    try {
      state.stream.getTracks().forEach((track) => track.stop());
    } catch {}
    state.stream = null;
  }

  function dispose() {
    if (state.disposed) return;
    state.disposed = true;
    clearInterval(state.watch);
    window.removeEventListener("message", onMessage);
    cleanupOverlay();
    stopStream();
    const popup = state.popup;
    state.popup = null;
    state.pending = null;
    if (popup && !popup.closed) {
      try {
        popup.close();
      } catch {}
    }
    if (globalThis.__blQrReader === api) delete globalThis.__blQrReader;
  }

  function onKey(event) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    dispose();
  }

  function focusPopup() {
    if (!state.popup || state.popup.closed) return;
    try {
      state.popup.focus();
    } catch {}
  }

  function post(payload) {
    if (state.disposed || !state.popup || state.popup.closed) return false;
    try {
      state.popup.postMessage(payload, targetOrigin);
      return true;
    } catch {
      return false;
    }
  }

  function send(payload) {
    if (state.ready) return post(payload);
    state.pending = payload;
    return true;
  }

  function flush() {
    if (!state.ready || !state.pending) return;
    const payload = state.pending;
    state.pending = null;
    post(payload);
  }

  function sendError(message) {
    if (state.popup && !state.popup.closed) {
      send({ type: "bl-qr-error", message });
      focusPopup();
      return;
    }
    alert(message);
  }

  function onMessage(event) {
    if (!state.popup || event.source !== state.popup) return;
    if (event.origin !== readerOrigin) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "bl-qr-ready") {
      state.ready = true;
      post({ type: "bl-qr-ready-ack" });
      flush();
      return;
    }
    if (data.type === "bl-qr-open") {
      if (typeof data.url !== "string") return;
      let url;
      try {
        url = new URL(data.url);
      } catch {
        return;
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      location.href = url.href;
    }
  }

  function openPopup() {
    const screenWidth = screen.availWidth || screen.width || 1200;
    const screenHeight = screen.availHeight || screen.height || 800;
    const width = Math.min(560, Math.max(420, screenWidth - 48));
    const height = Math.min(660, Math.max(520, screenHeight - 80));
    const left = Math.max(0, screenWidth - width - 24);
    const top = Math.max(0, Math.round((screenHeight - height) / 2));
    return window.open(
      readerHref,
      "bl-qr-reader",
      `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
    );
  }

  function attachPopup(popup) {
    clearInterval(state.watch);
    window.removeEventListener("message", onMessage);
    state.popup = popup;
    state.ready = false;
    state.pending = null;
    window.addEventListener("message", onMessage);
    state.watch = setInterval(() => {
      if (state.popup && state.popup.closed) dispose();
    }, 600);
    // The reader is a separate window; bring the page back so the pointer can
    // start the selection instead of landing in the waiting reader.
    window.focus();
  }

  function ensurePopup() {
    if (state.disposed) return false;
    if (state.popup && !state.popup.closed) return true;
    const popup = openPopup();
    if (!popup) return false;
    attachPopup(popup);
    return true;
  }

  function showSelection(source) {
    if (state.disposed) return;
    const host = document.createElement("div");
    host.id = HOST_ID;
    host.style.cssText = "all:initial;display:block;position:fixed;inset:0;z-index:2147483647";
    const root = host.attachShadow({ mode: "open" });
    const CSS = `
        :host {
          --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
          --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
        }
        * { box-sizing: border-box; }
        .overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0b0b0b;
          font-family: var(--sans);
          user-select: none;
        }
        .bar {
          position: fixed;
          left: 50%;
          top: 18px;
          transform: translateX(-50%);
          z-index: 2;
          max-width: calc(100vw - 24px);
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 10px 12px 10px 14px;
          border: 1px solid #0b0b0b;
          background: #ffffff;
          color: #0b0b0b;
          font: 13px/1.2 var(--sans);
          box-shadow: 0 8px 30px rgba(0, 0, 0, .45);
        }
        .bar b { font-weight: 600; }
        .sep { margin: 0 7px; color: #777777; }
        .cancel {
          flex: none;
          padding: 6px 9px;
          border: 1px solid #0b0b0b;
          background: #ffffff;
          color: #0b0b0b;
          font: 600 10px/1 var(--mono);
          letter-spacing: .08em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .cancel:hover { background: #0b0b0b; color: #ffffff; }
        .stage {
          position: relative;
          flex: none;
          overflow: hidden;
          background: #000000;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, .28), 0 20px 80px rgba(0, 0, 0, .55);
          cursor: crosshair;
          touch-action: none;
        }
        .view { display: block; width: 100%; height: 100%; }
        .box {
          position: absolute;
          display: none;
          border: 1.5px solid #ffffff;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, .55);
          pointer-events: none;
        }`;
    if ("adoptedStyleSheets" in root && typeof CSSStyleSheet === "function") {
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(CSS);
        root.adoptedStyleSheets = [sheet];
      } catch {}
    }
    if (!root.adoptedStyleSheets?.length) {
      const style = document.createElement("style");
      style.textContent = CSS;
      root.appendChild(style);
    }
    root.append(document.createRange().createContextualFragment(`
      <div class="overlay">
        <div class="bar">
          <span><b>Drag around the QR code</b><span class="sep">·</span>Esc cancels</span>
          <button class="cancel" type="button">Cancel</button>
        </div>
        <div class="stage"><canvas class="view"></canvas><div class="box"></div></div>
      </div>`));
    document.documentElement.appendChild(host);
    state.overlay = host;
    state.activeElement = document.activeElement;
    state.previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", onKey, true);

    const stage = root.querySelector(".stage");
    const view = root.querySelector(".view");
    const box = root.querySelector(".box");
    const maxWidth = Math.max(160, innerWidth - 64);
    const maxHeight = Math.max(160, innerHeight - 140);
    const fit = Math.min(maxWidth / source.width, maxHeight / source.height, 1);
    const width = Math.max(1, Math.round(source.width * fit));
    const height = Math.max(1, Math.round(source.height * fit));
    stage.style.width = `${width}px`;
    stage.style.height = `${height}px`;
    view.width = width;
    view.height = height;
    state.scale = width / source.width;
    const context = view.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    let start = null;

    function paint(next) {
      context.globalCompositeOperation = "source-over";
      context.drawImage(source, 0, 0, width, height);
      context.fillStyle = "rgba(8, 8, 8, .62)";
      context.fillRect(0, 0, width, height);
      if (next && next.w > 1 && next.h > 1) {
        context.save();
        context.beginPath();
        context.rect(next.x, next.y, next.w, next.h);
        context.clip();
        context.drawImage(source, 0, 0, width, height);
        context.restore();
        box.style.display = "block";
        box.style.left = `${next.x}px`;
        box.style.top = `${next.y}px`;
        box.style.width = `${next.w}px`;
        box.style.height = `${next.h}px`;
      } else {
        box.style.display = "none";
      }
    }

    function point(event) {
      const rect = stage.getBoundingClientRect();
      return {
        x: Math.min(Math.max(event.clientX - rect.left, 0), rect.width),
        y: Math.min(Math.max(event.clientY - rect.top, 0), rect.height),
      };
    }

    function rectangle(a, b) {
      return {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        w: Math.abs(b.x - a.x),
        h: Math.abs(b.y - a.y),
      };
    }

    function crop(next) {
      if (state.disposed) return;
      const scale = state.scale;
      const naturalWidth = next.w / scale;
      const naturalHeight = next.h / scale;
      const pad = Math.min(72, Math.max(6, Math.round(Math.max(naturalWidth, naturalHeight) * 0.12)));
      const sx = Math.max(0, Math.round(next.x / scale) - pad);
      const sy = Math.max(0, Math.round(next.y / scale) - pad);
      const sw = Math.min(source.width - sx, Math.round(naturalWidth) + pad * 2);
      const sh = Math.min(source.height - sy, Math.round(naturalHeight) + pad * 2);
      if (sw < 8 || sh < 8) {
        paint(null);
        return;
      }
      const limit = 1600;
      const ratio = Math.min(1, limit / Math.max(sw, sh));
      const out = document.createElement("canvas");
      out.width = Math.max(1, Math.round(sw * ratio));
      out.height = Math.max(1, Math.round(sh * ratio));
      const outContext = out.getContext("2d");
      outContext.imageSmoothingEnabled = ratio < 1;
      outContext.imageSmoothingQuality = "high";
      outContext.drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height);
      let dataUrl;
      try {
        dataUrl = out.toDataURL("image/png");
      } catch {
        cleanupOverlay();
        sendError("The selected area could not be encoded. Try a smaller box.");
        focusPopup();
        return;
      }
      stopStream();
      cleanupOverlay();
      if (!ensurePopup()) {
        alert("Allow pop-ups for this page, then run the bookmarklet again.");
        return;
      }
      send({ type: "bl-qr-image", dataUrl });
      focusPopup();
    }

    stage.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      start = point(event);
      paint({ x: start.x, y: start.y, w: 0, h: 0 });
      stage.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    stage.addEventListener("pointermove", (event) => {
      if (!start) return;
      paint(rectangle(start, point(event)));
    });

    const end = (event) => {
      if (!start) return;
      const next = rectangle(start, point(event));
      start = null;
      if (next.w < 12 || next.h < 12) {
        paint(null);
        return;
      }
      paint(next);
      crop(next);
    };
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", () => {
      start = null;
      paint(null);
    });
    stage.addEventListener("dragstart", (event) => event.preventDefault());
    host.addEventListener("contextmenu", (event) => event.preventDefault());
    root.querySelector(".cancel").addEventListener("click", dispose);

    paint(null);
  }

  async function processStream(stream) {
    if (state.disposed) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    state.stream = stream;
    let video = null;
    try {
      video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
      const ready = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("the capture stream did not start")), 5000);
        video.onloadedmetadata = () => {
          video.play().then(() => {
            clearTimeout(timer);
            resolve();
          }, (error) => {
            clearTimeout(timer);
            reject(error);
          });
        };
        video.onerror = () => {
          clearTimeout(timer);
          reject(new Error("the capture stream could not be read"));
        };
      });
      document.body.appendChild(video);
      video.srcObject = stream;
      await ready;
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (state.disposed) {
        video.remove();
        return;
      }
      const source = document.createElement("canvas");
      source.width = video.videoWidth;
      source.height = video.videoHeight;
      if (!source.width || !source.height) {
        video.remove();
        throw new Error("the capture was empty");
      }
      source.getContext("2d").drawImage(video, 0, 0);
      video.pause();
      video.srcObject = null;
      video.remove();
      stopStream();
      showSelection(source);
    } catch (error) {
      if (video) {
        try {
          video.pause();
          video.srcObject = null;
          video.remove();
        } catch {}
      }
      stopStream();
      if (state.disposed) return;
      sendError(`The screen could not be read: ${error && error.message ? error.message : "unknown error"}`);
      focusPopup();
    }
  }

  function start() {
    api = { dispose };
    globalThis.__blQrReader = api;
    const media = navigator.mediaDevices;
    if (!media || typeof media.getDisplayMedia !== "function") {
      delete globalThis.__blQrReader;
      alert("This browser does not offer screen capture. Try Chrome, Edge or Firefox.");
      return;
    }
    let request;
    try {
      // Ask for the screen before opening the reader. Opening a window first can
      // consume the click activation that getDisplayMedia needs.
      request = media.getDisplayMedia({ video: { frameRate: 10 }, audio: false });
    } catch (error) {
      delete globalThis.__blQrReader;
      alert(`Screen capture could not start: ${error && error.message ? error.message : "the browser refused it"}`);
      return;
    }
    const popup = openPopup();
    if (popup) attachPopup(popup);
    request.then(processStream, (error) => {
      if (state.disposed) return;
      const cancelled = error && (error.name === "NotAllowedError" || error.name === "AbortError");
      sendError(
        cancelled
          ? "Screen capture was cancelled. Close this window and run the bookmarklet again."
          : `Screen capture failed: ${error && error.message ? error.message : "the browser refused it"}`,
      );
      focusPopup();
    });
  }

  start();
})();
