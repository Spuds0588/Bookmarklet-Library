/**
 * @name 📝 Edit a Local PDF
 * @category files
 * @description Opens a PDF from your disk in SimplePDF's editor without uploading it first: you pick the file, and its bytes go straight into the embedded editor.
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
  const REPLY_MS = 60000;

  const rid = () => Math.random().toString(36).slice(2, 10);

  const isPdfFile = (name = "", type = "") => /^application\/pdf$/i.test(type) || /\.pdf$/i.test(name);

  const buildRequest = (type, data, requestId) => JSON.stringify({ type, request_id: requestId, data });

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

  function connect(frame) {
    const pending = new Map();
    const onMessage = (event) => {
      if (event.origin !== ORIGIN) return;
      const reply = parseReply(event.data);
      if (!reply || !pending.has(reply.id)) return;
      const settle = pending.get(reply.id);
      pending.delete(reply.id);
      settle(reply.result);
    };
    addEventListener("message", onMessage);

    const send = (type, data, timeout = REPLY_MS) =>
      new Promise((resolve) => {
        const id = rid();
        pending.set(id, resolve);
        frame.contentWindow.postMessage(buildRequest(type, data, id), ORIGIN);
        setTimeout(() => {
          if (pending.delete(id)) {
            resolve({ success: false, error: { code: "unexpected:timeout", message: `no reply to ${type}` } });
          }
        }, timeout);
      });

    // The editor never announces itself, so readiness is discovered by asking
    // for its field list until something answers. Any reply means the bridge is
    // up; the answer may still be a refusal, which is fine at this stage.
    const ready = () =>
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
        timer = setInterval(probe, PROBE_MS);
        probe();
        setTimeout(() => finish(null), READY_MS);
      });

    return { send, ready, close: () => removeEventListener("message", onMessage) };
  }

  function overlay(name) {
    const host = document.createElement("div");
    host.setAttribute("data-simplepdf-local", "");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = [
      ":host{all:initial}",
      ".wrap{position:fixed;inset:0;display:flex;flex-direction:column;background:#fbfaf8;color:#111;font:13px/1.4 system-ui,-apple-system,sans-serif}",
      ".bar{display:flex;gap:12px;align-items:center;padding:10px 14px;border-bottom:1px solid #111}",
      ".name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:50vw}",
      ".status{margin-left:auto;opacity:.75;font-variant-numeric:tabular-nums}",
      "button{border:1px solid #111;background:#fbfaf8;color:#111;font:inherit;padding:6px 10px;cursor:pointer}",
      "button:hover{background:#111;color:#fbfaf8}",
      "iframe{flex:1;width:100%;border:0;background:#fff}",
    ].join("\n");
    const wrap = document.createElement("div");
    wrap.className = "wrap";
    const bar = document.createElement("div");
    bar.className = "bar";
    const label = document.createElement("span");
    label.className = "name";
    label.textContent = name || "PDF";
    const status = document.createElement("span");
    status.className = "status";
    status.textContent = "Opening editor…";
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    const frame = document.createElement("iframe");
    frame.src = EMBED;
    frame.title = "SimplePDF editor";
    bar.append(label, status, close);
    wrap.append(bar, frame);
    root.append(style, wrap);
    document.documentElement.appendChild(host);

    const link = connect(frame);
    close.addEventListener("click", () => {
      link.close();
      host.remove();
    });
    return { link, status, host };
  }

  // The bytes never leave the browser: they are handed to the framed editor as
  // a data URL, which is what LOAD_DOCUMENT accepts besides an http(s) URL.
  function openLocal(dataUrl, name) {
    const view = overlay(name);
    view.link.ready().then(async (reply) => {
      if (!reply) {
        view.status.textContent = "The editor did not answer.";
        return;
      }
      view.status.textContent = "Loading…";
      const result = await view.link.send("LOAD_DOCUMENT", { data_url: dataUrl, name: name || undefined });
      if (result && result.success) {
        view.status.textContent = "";
        return;
      }
      const code = (result && result.error && result.error.code) || "unknown";
      view.status.textContent = `Could not load it (${code}).`;
    });
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
    globalThis.__BL_TEST__.simplepdfLocal = { isPdfFile, buildRequest, parseReply, openLocal, EMBED, ORIGIN };
  } else if (document?.body) {
    choose();
  }
})();
