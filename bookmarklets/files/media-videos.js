/**
 * @name 🎬 Download all videos
 * @category files
 * @description Save the video files a page loads into a folder you choose, and flag streams it cannot.
 * @tags videos, download, bulk, save, folder, media, mp4, webm
 * @added 2026-11-01
 * @featured false
 */
// Generated from bookmarklets/src by scripts/compose.mjs. Edit the source, not this file.
(() => {
const BL = {};
/* ---- media-grab ---- */
/* Media grabber ----------------------------------------------------------
 * The page already holds the file URLs; this reads them from the document,
 * fetches only what the browser is allowed to read, and writes into a folder
 * the user picks with the File System Access API. Without that API it hands
 * each file to the browser's own downloads instead. Nothing is uploaded.
 * ---------------------------------------------------------------------- */
BL.mediaGrabCore = (() => {
  const KINDS = {
    image: "png,jpg,jpeg,jfif,gif,webp,avif,apng,svg,bmp,ico,tif,tiff,heic,heif",
    video: "mp4,m4v,webm,ogv,mov,avi,mkv,mpeg,mpg,3gp,flv,ts,m3u8,mpd",
    audio: "mp3,wav,ogg,oga,m4a,aac,flac,opus,weba,mid,midi,wma,aiff,aif,m3u8,mpd",
  };
  const FILE_ONLY = "pdf,zip,csv,tsv,doc,docx,xls,xlsx,ppt,pptx,txt,md,markdown,json,xml,rtf,odt,ods,odp,epub,7z,rar,gz,tgz,tar,bz2,ics,vcf,kml,gpx,srt,vtt,sql,log,yaml,yml,psd,ai,sketch,fig,dwg,dxf";
  const STREAMS = new Set(["m3u8", "mpd"]);
  const set = (value) => new Set(String(value).split(",").filter(Boolean));
  const IMAGE = set(KINDS.image);
  const VIDEO = set(KINDS.video);
  const AUDIO = set(KINDS.audio);
  const FILE = set(`${FILE_ONLY},${KINDS.image},${KINDS.video},${KINDS.audio}`);
  const KIND_SETS = { image: IMAGE, video: VIDEO, audio: AUDIO };
  const TYPE_EXT = {
    "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/gif": "gif",
    "image/webp": "webp", "image/avif": "avif", "image/svg+xml": "svg", "image/bmp": "bmp",
    "image/tiff": "tif", "image/x-icon": "ico",
    "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "video/ogg": "ogv",
    "video/mpeg": "mpg", "video/x-matroska": "mkv",
    "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a",
    "audio/aac": "aac", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-wav": "wav",
    "audio/flac": "flac", "audio/webm": "weba", "audio/opus": "opus",
    "application/pdf": "pdf", "application/zip": "zip", "text/csv": "csv", "text/plain": "txt",
    "text/markdown": "md", "application/json": "json", "text/html": "html",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.oasis.opendocument.text": "odt",
    "application/vnd.oasis.opendocument.spreadsheet": "ods",
  };

  function extensionOf(value) {
    const clean = String(value || "").split(/[?#]/)[0];
    const base = clean.split("/").pop() || "";
    const dot = base.lastIndexOf(".");
    return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
  }

  function mimeExtension(value) {
    const mime = String(value || "").toLowerCase().split(";")[0].trim();
    return TYPE_EXT[mime] || "";
  }

  function kindOf(url, type) {
    const extension = extensionOf(url);
    for (const kind of ["image", "video", "audio"]) if (KIND_SETS[kind].has(extension)) return kind;
    const mime = String(type || "").toLowerCase().split(";")[0].trim();
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    return FILE.has(extension) ? "file" : "";
  }

  function isStream(url, type) {
    return STREAMS.has(extensionOf(url)) || /mpegurl|dash\+xml/i.test(String(type || ""));
  }

  function isFileUrl(url, download) {
    return Boolean(download) || FILE.has(extensionOf(url));
  }

  // A saved name has to survive Windows, macOS and a picky file manager. The
  // extension is kept when a long name is cut, because it is what a later tool
  // uses to recognise the file.
  function safeName(value, fallback = "file") {
    let name = String(value ?? "");
    try {
      name = decodeURIComponent(name);
    } catch {}
    name = name
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/[\u0000-\u001f\u007f]+/g, "")
      .replace(/\s+/g, " ")
      .replace(/^[.\-\s]+/, "")
      .trim();
    if (name.length > 96) {
      const dot = name.lastIndexOf(".");
      const extension = dot > 0 ? name.slice(dot).slice(0, 14) : "";
      name = name.slice(0, 96 - extension.length).trim() + extension;
    }
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(name)) name = `_${name}`;
    return name && name !== "." && name !== ".." ? name : fallback;
  }

  // 1 is the plain name; 2 and up add a suffix before the extension.
  function numbered(name, index) {
    if (index <= 1) return name;
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : "";
    return `${stem}-${index}${extension}`;
  }

  function ensureExtension(name, type, kind) {
    if (extensionOf(name)) return name;
    const extension = mimeExtension(type) || { image: "img", video: "mp4", audio: "mp3" }[kind] || "bin";
    return `${name}.${extension}`;
  }

  function fileNameFromUrl(url, type, fallback) {
    const source = String(url || "");
    if (source.startsWith("data:")) {
      const semicolon = source.indexOf(";");
      const comma = source.indexOf(",");
      const end = semicolon > 0 ? semicolon : comma > 0 ? comma : source.length;
      return `${safeName(fallback || "file", "file")}.${mimeExtension(source.slice(5, end)) || "bin"}`;
    }
    let path = source;
    try {
      path = new URL(source).pathname;
    } catch {}
    let name = safeName(path.split("/").filter(Boolean).pop() || "", "");
    if (!extensionOf(name)) {
      const extension = mimeExtension(type);
      if (extension) name = `${name || fallback || "file"}.${extension}`;
    }
    return name || fallback || "file";
  }

  // A candidate is a URL, then an optional descriptor, then a comma. A data
  // URL carries commas of its own, so it runs until whitespace instead.
  function parseSrcset(value) {
    const source = String(value || "");
    const list = [];
    let index = 0;
    while (index < source.length) {
      while (index < source.length && /[\s,]/.test(source[index])) index++;
      if (index >= source.length) break;
      const data = source.startsWith("data:", index);
      let url = "";
      while (index < source.length) {
        const character = source[index];
        if (/\s/.test(character) || (character === "," && !data)) break;
        url += character;
        index++;
      }
      if (url) list.push(url);
      while (index < source.length && source[index] !== ",") index++;
    }
    return list;
  }

  function describe(url) {
    if (/^https?:/i.test(url)) {
      try {
        const parsed = new URL(url);
        return parsed.host + (parsed.pathname === "/" ? "" : parsed.pathname);
      } catch {}
    }
    if (/^data:/i.test(url)) return "data: URL";
    if (/^blob:/i.test(url)) return "blob: URL";
    return url.slice(0, 80);
  }

  function collect(doc, kind) {
    const base = doc.baseURI || doc.location?.href || "https://example.invalid/";
    const found = [];
    const seen = new Set();
    const nodes = (selector) => Array.from(doc.querySelectorAll(selector) || []);

    const add = (raw, options = {}) => {
      const value = String(raw ?? "").trim();
      if (!value || /^(#|javascript:|mailto:|tel:|sms:|about:|chrome:)/i.test(value)) return;
      let url;
      try {
        url = new URL(value, base).href.split("#")[0];
      } catch {
        return;
      }
      if (!/^(https?|data|blob):/i.test(url) || seen.has(url)) return;
      const type = options.type || "";
      if (kind !== "file") {
        if (kindOf(url, type) !== kind) return;
      } else if (!isFileUrl(url, options.download)) {
        return;
      }
      seen.add(url);
      found.push({
        url,
        name: fileNameFromUrl(url, type, kind),
        type,
        source: describe(url),
        stream: isStream(url, type),
      });
    };

    const srcset = (node) => {
      for (const url of parseSrcset(node.getAttribute("srcset"))) add(url, { type: node.getAttribute("type") || "" });
    };

    // The linked-files tool is for what the page links to, not for the images
    // and players it renders, so it reads anchors only.
    if (kind !== "file") {
      for (const node of nodes("img")) {
        add(node.currentSrc);
        add(node.getAttribute("src"));
        for (const attribute of ["data-src", "data-original", "data-lazy-src", "data-url"]) add(node.getAttribute(attribute));
        srcset(node);
      }
      for (const node of nodes("picture source")) srcset(node);
      for (const node of nodes('meta[property="og:image"], meta[name="twitter:image"]')) add(node.getAttribute("content"));
      for (const node of nodes("video")) {
        add(node.currentSrc);
        add(node.getAttribute("src"));
        for (const child of Array.from(node.querySelectorAll("source") || [])) {
          add(child.getAttribute("src"), { type: child.getAttribute("type") || "" });
        }
      }
      for (const node of nodes("audio")) {
        add(node.currentSrc);
        add(node.getAttribute("src"));
        for (const child of Array.from(node.querySelectorAll("source") || [])) {
          add(child.getAttribute("src"), { type: child.getAttribute("type") || "" });
        }
      }
    }
    for (const node of nodes("a[href]")) {
      add(node.getAttribute("href") || node.href, {
        download: node.hasAttribute("download"),
        type: node.getAttribute("type") || "",
      });
    }
    return found;
  }

  return { collect, kindOf, isStream, safeName, numbered, ensureExtension, fileNameFromUrl, parseSrcset };
})();

BL.mediaGrab = function (options) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const core = BL.mediaGrabCore;
  const kind = options.kind;
  const ID = `bl-${options.slug}-host`;
  if (document.getElementById(ID)) return;

  const MAX_BYTES = 600 * 1024 * 1024;
  const previousFocus = document.activeElement;
  let entries = [];
  let busy = false;
  let closed = false;
  const usedNames = new Set();

  const CSS = `
    :host{all:initial;--ink:#17181a;--paper:#fbfaf8;--line:#d6d2c9;--scrim:rgba(15,15,15,.55);--soft:#6f6a61;--good:#2f6b3a;--bad:#a11;--warn:#7a5200}
    @media(prefers-color-scheme:dark){:host{--ink:#f2f2f2;--paper:#121212;--line:#3a3a3a;--scrim:rgba(0,0,0,.68);--soft:#a8a8a8;--good:#7fcf95;--bad:#ff8d8d;--warn:#f4c26e}}
    *{box-sizing:border-box}
    [hidden]{display:none!important}
    .scrim{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--scrim);overflow:auto}
    .panel{width:min(660px,100%);max-height:calc(100vh - 40px);display:flex;flex-direction:column;background:var(--paper);color:var(--ink);border:1px solid var(--ink);box-shadow:0 24px 80px rgba(0,0,0,.35);outline:none}
    header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px 14px;border-bottom:1px solid var(--line)}
    .kicker{margin:0 0 4px;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.62}
    h2{margin:0;font-size:20px;line-height:1.2;font-weight:600}
    button{font:inherit;color:inherit}
    .close{width:32px;height:32px;flex:none;border:1px solid var(--line);background:transparent;font-size:20px;line-height:1;cursor:pointer}
    .close:hover{border-color:currentColor}
    .summary{padding:14px 20px 12px;border-bottom:1px solid var(--line)}
    .count{margin:0;font-size:12px}
    .count.empty{font-size:11px;line-height:1.5;opacity:.7}
    .hint{margin:8px 0 0;font-size:10px;line-height:1.45;color:var(--warn)}
    .list{list-style:none;margin:0;padding:0;max-height:44vh;overflow:auto}
    .list:empty{display:none}
    .list li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 12px;align-items:baseline;padding:9px 20px;border-bottom:1px solid var(--line)}
    .name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:12px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    .where{grid-column:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:9.5px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;opacity:.52}
    .state{grid-column:2;grid-row:1;font:9px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;opacity:.55;white-space:nowrap}
    .state.good{color:var(--good);opacity:1}
    .state.bad{color:var(--bad);opacity:1}
    .state.warn{color:var(--warn);opacity:1}
    .open{color:inherit;font-size:9px;text-decoration:underline;text-underline-offset:2px;text-transform:none}
    .actions{display:flex;align-items:center;gap:10px;padding:16px 20px;border-top:1px solid var(--line);flex-wrap:wrap}
    .btn{display:inline-flex;align-items:baseline;gap:8px;border:1px solid var(--line);background:transparent;padding:9px 13px;font-size:12px;font-weight:600;cursor:pointer}
    .btn:hover:not(:disabled){border-color:currentColor}
    .btn:disabled{opacity:.4;cursor:not-allowed}
    .primary{background:var(--ink);border-color:var(--ink);color:var(--paper)}
    .ghost{border:0;background:transparent;padding:4px 0;font-size:11px;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
    footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 20px;border-top:1px solid var(--line)}
    .note{font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;opacity:.62}
    @media(max-width:560px){.list li{padding-left:14px;padding-right:14px}header,.summary,.actions,footer{padding-left:14px;padding-right:14px}.state{display:none}}
  `;

  const host = document.createElement("div");
  host.id = ID;
  host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

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

  root.innerHTML = `
    <div class="scrim" data-scrim>
      <section class="panel" role="dialog" aria-modal="true" aria-label="${options.title}" tabindex="-1">
        <header>
          <div>
            <p class="kicker">LOCAL DOWNLOAD</p>
            <h2>${options.title}</h2>
          </div>
          <button class="close" type="button" data-close aria-label="Close">×</button>
        </header>
        <div class="summary">
          <p class="count" data-count>Looking for ${options.noun}…</p>
          <p class="hint" data-hint hidden></p>
        </div>
        <ul class="list" data-list aria-label="Files found"></ul>
        <div class="actions">
          <button class="btn primary" type="button" data-save hidden>Save all to folder…</button>
          <button class="btn" type="button" data-download>Download each</button>
          <button class="ghost" type="button" data-rescan>Scan again</button>
        </div>
        <footer>
          <span class="note" data-status aria-live="polite">Files stay on this device.</span>
          <button class="ghost" type="button" data-close>Close</button>
        </footer>
      </section>
    </div>
  `;

  const scrim = root.querySelector("[data-scrim]");
  const panel = root.querySelector(".panel");
  const list = root.querySelector("[data-list]");
  const count = root.querySelector("[data-count]");
  const hint = root.querySelector("[data-hint]");
  const status = root.querySelector("[data-status]");
  const saveButton = root.querySelector("[data-save]");
  const downloadButton = root.querySelector("[data-download]");
  const rescanButton = root.querySelector("[data-rescan]");

  const supportsFolder = typeof window.showDirectoryPicker === "function";
  if (supportsFolder) saveButton.hidden = false;
  else {
    downloadButton.classList.add("primary");
    hint.textContent = "This browser cannot choose a folder, so Download each uses its downloads folder. Chrome or Edge can save into a folder you pick.";
    hint.hidden = false;
  }

  function setRow(entry, text, tone) {
    if (!entry.row) return;
    entry.row.state.className = "state" + (tone ? ` ${tone}` : "");
    entry.row.state.textContent = text;
  }

  function addOpen(entry, text) {
    if (!entry.row) return;
    const link = document.createElement("a");
    link.className = "open";
    link.href = entry.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open";
    entry.row.state.textContent = `${text} `;
    entry.row.state.append(link);
  }

  function refreshSummary() {
    const total = entries.length;
    count.textContent = total ? `${total} ${total === 1 ? options.singular : options.noun} found` : options.empty;
    count.classList.toggle("empty", !total);
    saveButton.disabled = busy || !total;
    downloadButton.disabled = busy || !total;
    rescanButton.disabled = busy;
  }

  function renderList() {
    list.textContent = "";
    for (const entry of entries) {
      const item = document.createElement("li");
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = entry.name;
      name.title = entry.name;
      const state = document.createElement("span");
      state.className = "state";
      state.textContent = entry.stream ? "Stream playlist" : "Ready";
      const where = document.createElement("span");
      where.className = "where";
      where.textContent = entry.source;
      where.title = entry.url;
      item.append(name, state, where);
      list.append(item);
      entry.row = { item, state };
    }
    refreshSummary();
  }

  function scan() {
    entries = core.collect(document, kind);
    renderList();
    status.textContent = entries.length ? "Files stay on this device." : "Nothing to save on this page.";
  }

  function setBusy(value) {
    busy = value;
    saveButton.disabled = value || !entries.length;
    downloadButton.disabled = value || !entries.length;
    rescanButton.disabled = value;
    saveButton.textContent = value ? "Saving…" : "Save all to folder…";
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function megabytes(bytes) {
    return `${(bytes / (1024 * 1024)).toFixed(bytes > 1024 * 1024 * 100 ? 0 : 1)} MB`;
  }

  // The folder picker will not overwrite, so probe for an existing name and
  // number past it; the same set keeps two URLs with one filename apart.
  async function freeName(base, directory) {
    for (let index = 1; index <= 1000; index++) {
      const name = core.numbered(base, index);
      const key = name.toLowerCase();
      if (usedNames.has(key)) continue;
      if (!directory) {
        usedNames.add(key);
        return name;
      }
      try {
        await directory.getFileHandle(name);
      } catch (error) {
        if (error.name === "NotFoundError") {
          usedNames.add(key);
          return name;
        }
        throw error;
      }
    }
    const fallback = core.numbered(base, Date.now());
    usedNames.add(fallback.toLowerCase());
    return fallback;
  }

  async function saveOne(entry, directory) {
    if (entry.stream) {
      setRow(entry, "Stream playlist", "warn");
      return "skipped";
    }
    setRow(entry, "Fetching", "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    let response;
    try {
      response = await fetch(entry.url, { signal: controller.signal, credentials: "same-origin" });
    } catch {
      clearTimeout(timer);
      addOpen(entry, "Blocked");
      return "failed";
    }
    clearTimeout(timer);
    if (!response.ok) {
      addOpen(entry, `HTTP ${response.status}`);
      return "failed";
    }
    const length = Number(response.headers.get("content-length") || 0);
    if (length > MAX_BYTES) {
      addOpen(entry, `Too large (${megabytes(length)})`);
      return "skipped";
    }
    const blob = await response.blob().catch(() => null);
    if (!blob || !blob.size) {
      addOpen(entry, "Unreadable");
      return "failed";
    }
    if (blob.size > MAX_BYTES) {
      addOpen(entry, `Too large (${megabytes(blob.size)})`);
      return "skipped";
    }
    let name;
    try {
      name = await freeName(core.ensureExtension(entry.name, blob.type || entry.type, kind), directory);
    } catch {
      setRow(entry, "Folder refused", "bad");
      return "failed";
    }
    if (!directory) {
      download(blob, name);
      setRow(entry, `Downloaded as ${name}`, "good");
      return "saved";
    }
    let writable;
    try {
      const handle = await directory.getFileHandle(name, { create: true });
      writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      setRow(entry, `Saved as ${name}`, "good");
      return "saved";
    } catch (error) {
      if (writable) await writable.abort().catch(() => {});
      setRow(entry, error.name === "QuotaExceededError" ? "No space left" : "Could not save", "bad");
      return "failed";
    }
  }

  async function run(toFolder) {
    if (busy || !entries.length) return;
    setBusy(true);
    usedNames.clear();
    const totals = { saved: 0, failed: 0, skipped: 0 };
    let directory = null;

    if (toFolder && supportsFolder) {
      try {
        directory = await window.showDirectoryPicker({
          id: `bl-media-${kind}`,
          mode: "readwrite",
          startIn: options.startIn || "downloads",
        });
      } catch (error) {
        setBusy(false);
        status.textContent = error.name === "AbortError" ? "Folder picker cancelled." : `Could not open a folder: ${error.message}`;
        return;
      }
    }

    let cursor = 0;
    const worker = async () => {
      while (!closed) {
        const index = cursor++;
        if (index >= entries.length) return;
        const outcome = await saveOne(entries[index], directory);
        totals[outcome] += 1;
        const done = totals.saved + totals.failed + totals.skipped;
        status.textContent = `${done} of ${entries.length} · ${totals.saved} ${directory ? "saved" : "downloaded"}${
          totals.failed ? ` · ${totals.failed} blocked` : ""
        }`;
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, entries.length) }, worker));
    if (closed) return;

    const parts = [`${totals.saved} ${directory ? "saved" : "downloaded"}`];
    if (totals.failed) parts.push(`${totals.failed} blocked`);
    if (totals.skipped) parts.push(`${totals.skipped} skipped`);
    const where = directory ? ` to "${directory.name}"` : "";
    status.textContent = `${parts.join(" · ")}${where}. ${totals.failed ? "Blocked files have an Open link." : "Files stay on this device."}`;
    setBusy(false);
  }

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKey, true);
    host.remove();
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus({ preventScroll: true });
  }

  function onKey(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  scrim.addEventListener("click", (event) => {
    if (event.target === scrim) close();
  });
  for (const button of root.querySelectorAll("[data-close]")) button.addEventListener("click", close);
  saveButton.addEventListener("click", () => run(true));
  downloadButton.addEventListener("click", () => run(false));
  rescanButton.addEventListener("click", () => {
    if (!busy) scan();
  });
  document.addEventListener("keydown", onKey, true);

  scan();
  panel.focus({ preventScroll: true });
};
const startTool = BL.startTool;
BL.mediaGrab({
  slug: "media-videos",
  kind: "video",
  title: "Download videos",
  noun: "videos",
  singular: "video",
  startIn: "videos",
  empty:
    "No video files found. This reads video elements, their source fallbacks and links to video files; a player fed by JavaScript is not a file it can fetch.",
});
if (globalThis.__BL_TEST__) globalThis.__BL_TEST__.BL = BL;
})();
