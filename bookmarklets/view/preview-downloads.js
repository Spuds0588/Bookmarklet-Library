/**
 * @name 📄 Preview downloads
 * @category view
 * @description Catch clicks on media, PDF and Office links and show the file in a panel instead of downloading it.
 * @tags download, preview, media, office, pdf, image, video, audio, viewer, modal
 * @traits network, self-contained
 * @added 2026-11-03
 * @featured false
 */
(() => {
  const HOST_ID = "bl-preview-host";
  const KINDS = {
    image: ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg"],
    video: ["mp4", "webm", "mov", "m4v", "ogv"],
    audio: ["mp3", "wav", "m4a", "ogg", "oga", "aac", "flac"],
    pdf: ["pdf"],
    text: ["txt", "csv", "tsv", "md", "markdown", "json", "log"],
    office: ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf"],
  };

  const base = () => globalThis.location?.href || "http://localhost/";

  function extensionOf(url) {
    try {
      const path = new URL(url, base()).pathname;
      const last = path.split("/").pop() || "";
      const dot = last.lastIndexOf(".");
      return dot < 0 ? "" : last.slice(dot + 1).toLowerCase();
    } catch {
      return "";
    }
  }

  function kindOf(extension) {
    for (const [kind, list] of Object.entries(KINDS)) {
      if (list.includes(extension)) return kind;
    }
    return null;
  }

  // Only links this tool can actually show are taken over. An archive it cannot
  // preview would just be a slower way to download.
  function isFileLink(href) {
    if (!href) return false;
    let url;
    try {
      url = new URL(href, base());
    } catch {
      return false;
    }
    if (!["http:", "https:", "blob:", "data:"].includes(url.protocol)) return false;
    return Boolean(kindOf(extensionOf(url.href)));
  }

  function nameFor(url, disposition = "") {
    const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition);
    if (star) {
      try {
        return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
      } catch {}
    }
    const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(disposition);
    if (plain) return plain[1].trim();
    let path = "";
    try {
      path = new URL(url, base()).pathname;
    } catch {}
    const last = path.split("/").filter(Boolean).pop() || "";
    try {
      return decodeURIComponent(last) || "download";
    } catch {
      return last || "download";
    }
  }

  function sizeLabel(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB"];
    let value = bytes / 1024;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index++;
    }
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
  }

  const CSS = `
    .wrap { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,.72); font: 14px/1.5 system-ui, -apple-system, sans-serif; color: #111; }
    .panel { display: flex; flex-direction: column; width: min(860px, 92vw); height: min(640px, 88vh);
      background: #fbfaf8; border: 1px solid #111; box-shadow: 0 24px 60px rgba(0,0,0,.45); }
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 12px 14px;
      border-bottom: 1px solid #111; }
    .title { margin: 0; font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
    .meta { margin: 3px 0 0; font: 600 9.5px/1.4 ui-monospace, monospace; letter-spacing: .08em;
      text-transform: uppercase; color: #666; }
    .close { flex: none; padding: 4px 8px; border: 1px solid #111; background: transparent; color: #111;
      font: 600 10px/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
    .body { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center;
      overflow: auto; background: #fff; }
    .body img, .body video { max-width: 100%; max-height: 100%; display: block; }
    .body audio { width: min(520px, 90%); }
    .body iframe { width: 100%; height: 100%; border: 0; }
    .body pre { align-self: stretch; width: 100%; margin: 0; padding: 14px; box-sizing: border-box;
      overflow: auto; font: 12px/1.6 ui-monospace, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
    .note { max-width: 44ch; padding: 18px; color: #444; text-align: center; }
    .note b { display: block; margin-bottom: 6px; color: #111; }
    .foot { display: flex; gap: 8px; justify-content: flex-end; padding: 10px 14px; border-top: 1px solid #111; }
    .foot a, .foot button { padding: 6px 10px; border: 1px solid #111; background: transparent; color: #111;
      font: 600 10px/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase;
      text-decoration: none; cursor: pointer; }
    .foot .primary { background: #111; color: #fbfaf8; }
  `;

  function stylesApply(host) {
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
    return getComputedStyle(host).position === "fixed";
  }

  // A panel in the page is the whole point of the tool, so it is tried first;
  // a page that strips the styles or a blocked pop-up still gets the file.
  function mountOverlay() {
    document.getElementById(HOST_ID)?.remove();
    const host = document.createElement("div");
    host.id = HOST_ID;
    document.body.append(host);
    const root = host.attachShadow ? host.attachShadow({ mode: "open" }) : null;
    if (!root || !stylesApply(host)) {
      host.remove();
      return null;
    }
    return {
      kind: "overlay",
      host,
      root,
      doc: document,
      add(node) {
        root.append(node);
      },
      onKey(handler) {
        window.addEventListener("keydown", handler, true);
      },
      offKey(handler) {
        window.removeEventListener("keydown", handler, true);
      },
      close() {
        host.remove();
      },
    };
  }

  async function mountPip() {
    if (!("documentPictureInPicture" in window)) return null;
    const pip = await documentPictureInPicture.requestWindow({ width: 860, height: 640 });
    const doc = pip.document;
    doc.body.style.cssText = "margin:0;background:#fbfaf8";
    return {
      kind: "pip",
      doc,
      root: doc.body,
      add(node) {
        (node.tagName === "STYLE" ? doc.head : doc.body).append(node);
      },
      onKey(handler) {
        doc.addEventListener("keydown", handler, true);
      },
      offKey(handler) {
        doc.removeEventListener("keydown", handler, true);
      },
      close() {
        pip.close();
      },
    };
  }

  function mountPopup() {
    const popup = window.open("", "BL_Preview", "popup=yes,width=860,height=640");
    if (!popup) return null;
    const doc = popup.document;
    doc.title = "Preview";
    doc.body.style.cssText = "margin:0;background:#fbfaf8";
    return {
      kind: "popup",
      doc,
      root: doc.body,
      add(node) {
        (node.tagName === "STYLE" ? doc.head : doc.body).append(node);
      },
      onKey(handler) {
        doc.addEventListener("keydown", handler, true);
      },
      offKey(handler) {
        doc.removeEventListener("keydown", handler, true);
      },
      close() {
        popup.close();
      },
    };
  }

  let active = null;

  async function openPreview(url) {
    if (active) return;
    const frame = mountOverlay() ?? (await mountPip().catch(() => null)) ?? mountPopup();
    if (!frame) {
      alert("[Preview] Allow pop-ups for this site, then click the file link again.");
      return;
    }
    const state = {
      url,
      kind: kindOf(extensionOf(url)),
      name: nameFor(url),
      size: null,
      note: "",
      display: url,
      text: null,
      objectUrl: null,
    };
    active = { frame, state, media: null };

    const style = frame.doc.createElement("style");
    style.textContent = CSS;
    frame.add(style);
    const wrap = frame.doc.createElement("div");
    wrap.className = "wrap";
    const panel = frame.doc.createElement("div");
    panel.className = "panel";
    wrap.append(panel);
    frame.add(wrap);
    wrap.addEventListener("click", (event) => {
      if (event.target === wrap) close();
    });

    function close() {
      active = null;
      const media = panel.querySelector("video, audio");
      if (media) {
        try {
          media.pause();
          media.removeAttribute("src");
        } catch {}
      }
      frame.offKey(onKey);
      if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
      frame.close();
    }
    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    }
    frame.onKey(onKey);

    function meta() {
      const bits = [state.kind ?? "file"];
      if (state.size !== null) bits.push(sizeLabel(state.size));
      if (state.note) bits.push(state.note);
      return bits.join(" · ");
    }

    function draw() {
      panel.replaceChildren();

      const head = frame.doc.createElement("div");
      head.className = "head";
      const titles = frame.doc.createElement("div");
      const title = frame.doc.createElement("h2");
      title.className = "title";
      title.textContent = state.name;
      const sub = frame.doc.createElement("p");
      sub.className = "meta";
      sub.textContent = meta();
      titles.append(title, sub);
      const closeButton = frame.doc.createElement("button");
      closeButton.className = "close";
      closeButton.type = "button";
      closeButton.textContent = "Close";
      closeButton.addEventListener("click", close);
      head.append(titles, closeButton);

      const body = frame.doc.createElement("div");
      body.className = "body";
      const preview = previewNode(frame.doc, state);
      if (preview) body.append(preview);

      const foot = frame.doc.createElement("div");
      foot.className = "foot";
      const open = frame.doc.createElement("a");
      open.href = state.display;
      open.target = "_blank";
      open.rel = "noreferrer noopener";
      open.textContent = "Open in tab";
      const save = frame.doc.createElement("a");
      save.className = "primary";
      save.href = state.display;
      save.download = state.name;
      save.textContent = "Download";
      foot.append(open, save);

      panel.append(head, body, foot);
    }

    draw();

    // Reading the bytes is what makes a text preview and a save possible; when
    // CORS refuses, the file is still shown straight from its URL.
    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const header = response.headers.get("content-type") ?? "";
      const disposition = response.headers.get("content-disposition") ?? "";
      const fromHeader = header.split("/")[1]?.split(";")[0]?.toLowerCase();
      if (!state.kind && kindOf(fromHeader)) state.kind = kindOf(fromHeader);
      state.name = nameFor(url, disposition) || state.name;
      state.size = blob.size;
      state.objectUrl = URL.createObjectURL(blob);
      state.display = state.objectUrl;
      if (state.kind === "text") state.text = (await blob.text()).slice(0, 400000);
      draw();
    } catch (error) {
      state.note = "shown from the link; the bytes could not be read";
      draw();
    }
  }

  function previewNode(doc, state) {
    if (state.kind === "image") {
      const img = doc.createElement("img");
      img.src = state.display;
      img.alt = state.name;
      return img;
    }
    if (state.kind === "video") {
      const video = doc.createElement("video");
      video.controls = true;
      video.preload = "metadata";
      video.src = state.display;
      return video;
    }
    if (state.kind === "audio") {
      const audio = doc.createElement("audio");
      audio.controls = true;
      audio.src = state.display;
      return audio;
    }
    if (state.kind === "pdf") {
      const iframe = doc.createElement("iframe");
      iframe.src = state.display;
      iframe.title = state.name;
      return iframe;
    }
    if (state.kind === "text" && state.text !== null) {
      const pre = doc.createElement("pre");
      pre.textContent = state.text;
      return pre;
    }
    const note = doc.createElement("p");
    note.className = "note";
    const lead = doc.createElement("b");
    lead.textContent = state.kind === "office" ? "No preview for Office files" : "No preview for this file";
    note.append(lead, doc.createTextNode("Save it or open it in a tab from the buttons below."));
    return note;
  }

  function onClick(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target?.closest?.("a[href]");
    if (!anchor || anchor.closest(`#${HOST_ID}`)) return;
    const href = anchor.getAttribute("href") || "";
    if (!isFileLink(href)) return;
    event.preventDefault();
    event.stopPropagation();
    void openPreview(new URL(href, base()).href);
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.preview = { extensionOf, kindOf, isFileLink, nameFor, sizeLabel };
  } else if (document?.addEventListener) {
    document.addEventListener("click", onClick, true);
  }
})();
