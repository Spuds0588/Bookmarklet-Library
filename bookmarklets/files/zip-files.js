/**
 * @name 🗜️ Zip files
 * @category files
 * @description Drop files and folders, or pick them, and download one standard ZIP.
 * @tags zip, archive, compress, files, folder, drop
 * @added 2026-10-26
 * @featured false
 */
(() => {
  const MAX_BYTES = 1000000000;
  const MAX_ENTRIES = 65535;
  const MAX32 = 4294967295;
  const encoder = new TextEncoder();

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crcUpdate(crc, bytes) {
    let value = crc >>> 0;
    for (let i = 0; i < bytes.length; i++) value = CRC_TABLE[(value ^ bytes[i]) & 255] ^ (value >>> 8);
    return value >>> 0;
  }

  function crc32(bytes) {
    return (crcUpdate(0xffffffff, bytes) ^ 0xffffffff) >>> 0;
  }

  function abortError() {
    const error = new Error("Canceled");
    error.name = "AbortError";
    return error;
  }

  function normalizedPath(value) {
    return String(value || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .split("/")
      .filter((part) => part && part !== "." && part !== "..")
      .join("/");
  }

  function uniquePath(path, used) {
    let candidate = path || "file";
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    const slash = candidate.lastIndexOf("/");
    const directory = slash >= 0 ? candidate.slice(0, slash + 1) : "";
    const name = slash >= 0 ? candidate.slice(slash + 1) : candidate;
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : "";
    let count = 2;
    do {
      candidate = `${directory}${stem} (${count})${extension}`;
      count++;
    } while (used.has(candidate));
    used.add(candidate);
    return candidate;
  }

  function dosTime(value) {
    const date = new Date(value);
    const safe = Number.isNaN(date.getTime()) ? new Date() : date;
    const year = Math.max(1980, safe.getFullYear());
    return {
      time: (safe.getHours() << 11) | (safe.getMinutes() << 5) | Math.floor(safe.getSeconds() / 2),
      date: ((year - 1980) << 9) | ((safe.getMonth() + 1) << 5) | safe.getDate(),
    };
  }

  async function deflateRaw(bytes) {
    if (typeof CompressionStream !== "function") {
      throw new Error("This browser cannot compress ZIP files. Use a current Chrome, Edge, Firefox or Safari.");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function createZip(entries, options = {}) {
    const signal = options.signal;
    const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
    const files = [];
    const used = new Set();

    for (const item of entries || []) {
      if (signal?.aborted) throw abortError();
      if (!item || !item.file) continue;
      const path = uniquePath(normalizedPath(item.path || item.file.name) || "file", used);
      const size = Number(item.file.size) || 0;
      if (size > MAX_BYTES) throw new Error(`"${path}" is too large for this tool. The total limit is 1 GB.`);
      files.push({ path, file: item.file, size, modified: item.file.lastModified || Date.now() });
      if (files.length > MAX_ENTRIES) throw new Error(`This tool supports up to ${MAX_ENTRIES.toLocaleString()} files.`);
    }

    const directories = new Set();
    for (const item of files) {
      const parts = item.path.split("/");
      for (let i = 1; i < parts.length; i++) directories.add(parts.slice(0, i).join("/"));
    }
    for (const value of options.directories || []) {
      const path = normalizedPath(value);
      if (!path) continue;
      const parts = path.split("/");
      for (let i = 1; i <= parts.length; i++) directories.add(parts.slice(0, i).join("/"));
    }

    const filePaths = new Set(files.map((item) => item.path));
    const directoryList = [...directories].filter((path) => !filePaths.has(path)).sort();
    if (!files.length && !directoryList.length) throw new Error("Nothing to zip yet.");
    if (files.length + directoryList.length > MAX_ENTRIES) {
      throw new Error(`This tool supports up to ${MAX_ENTRIES.toLocaleString()} entries.`);
    }

    const totalSize = files.reduce((sum, item) => sum + item.size, 0);
    if (totalSize > MAX_BYTES) throw new Error("This selection is over the 1 GB limit for this tool.");

    const parts = [];
    let offset = 0;
    const central = [];
    const push = (bytes) => {
      parts.push(bytes);
      offset += bytes.length;
    };
    const addEntry = (path, isDirectory, data, checksum, modified) => {
      const name = encoder.encode(path);
      if (name.length > 65535) throw new Error("A file name is too long for a ZIP entry.");
      const method = isDirectory ? 0 : data.method;
      const compressed = isDirectory ? new Uint8Array(0) : data.compressed;
      const size = isDirectory ? 0 : data.size;
      const crc = isDirectory ? 0 : checksum;
      const stamp = dosTime(modified);
      const flags = 0x0800;
      const localOffset = offset;
      const local = new Uint8Array(30 + name.length);
      const view = new DataView(local.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, flags, true);
      view.setUint16(8, method, true);
      view.setUint16(10, stamp.time, true);
      view.setUint16(12, stamp.date, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, compressed.length, true);
      view.setUint32(22, size, true);
      view.setUint16(26, name.length, true);
      view.setUint16(28, 0, true);
      local.set(name, 30);
      push(local);
      if (compressed.length) push(compressed);
      const cd = new Uint8Array(46 + name.length);
      const entry = new DataView(cd.buffer);
      entry.setUint32(0, 0x02014b50, true);
      entry.setUint16(4, 20, true);
      entry.setUint16(6, 20, true);
      entry.setUint16(8, flags, true);
      entry.setUint16(10, method, true);
      entry.setUint16(12, stamp.time, true);
      entry.setUint16(14, stamp.date, true);
      entry.setUint32(16, crc, true);
      entry.setUint32(20, compressed.length, true);
      entry.setUint32(24, size, true);
      entry.setUint16(28, name.length, true);
      entry.setUint16(30, 0, true);
      entry.setUint16(32, 0, true);
      entry.setUint16(34, 0, true);
      entry.setUint16(36, 0, true);
      entry.setUint32(38, isDirectory ? 0x10 : 0, true);
      entry.setUint32(42, localOffset, true);
      cd.set(name, 46);
      central.push(cd);
    };

    for (const path of directoryList) addEntry(`${path}/`, true, null, 0, Date.now());

    let done = 0;
    for (const item of files) {
      if (signal?.aborted) throw abortError();
      onProgress({ done, total: files.length, name: item.path, bytes: item.size, phase: "read" });
      const data = new Uint8Array(await item.file.arrayBuffer());
      const checksum = crc32(data);
      let compressed = data;
      let method = 0;
      if (data.length) {
        const deflated = await deflateRaw(data);
        if (deflated.length < data.length) {
          compressed = deflated;
          method = 8;
        }
      }
      addEntry(item.path, false, { compressed, size: data.length, method }, checksum, item.modified);
      done++;
      onProgress({ done, total: files.length, name: item.path, bytes: item.size, phase: "done" });
    }

    const centralOffset = offset;
    for (const entry of central) push(entry);
    const centralSize = offset - centralOffset;
    if (offset > MAX32) throw new Error("This ZIP is larger than the ZIP32 format allows.");
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, files.length + directoryList.length, true);
    endView.setUint16(10, files.length + directoryList.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, centralOffset, true);
    push(end);
    return new Blob(parts, { type: "application/zip" });
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.zipFiles = { createZip, crc32, normalizedPath, uniquePath };
    return;
  }

  const CSS = `
:host{color-scheme:light dark;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.bl-backdrop{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.5);color:#111;--bg:#fff;--fg:#111;--muted:#666;--line:#d9d9d9;--soft:#f4f4f4;--accent:#111;--accent-fg:#fff;--err:#a11;--ok:#086b3a;font-size:14px;line-height:1.45}
@media (prefers-color-scheme:dark){.bl-backdrop{background:rgba(0,0,0,.7);color:#f5f5f5;--bg:#111;--fg:#f5f5f5;--muted:#aaa;--line:#3a3a3a;--soft:#1b1b1b;--accent:#f5f5f5;--accent-fg:#111;--err:#ff8d8d;--ok:#7ee2a8}}
.bl-backdrop *,.bl-backdrop *::before,.bl-backdrop *::after{box-sizing:border-box}
.bl-panel{width:min(660px,100%);max-height:min(780px,calc(100vh - 48px));display:flex;flex-direction:column;background:var(--bg);border:1px solid var(--fg);box-shadow:0 24px 80px rgba(0,0,0,.4)}
.bl-panel-wide{width:min(820px,100%)}
.bl-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px 14px;border-bottom:1px solid var(--line)}
.bl-kicker{margin:0 0 3px;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.bl-head h2{margin:0;font-size:20px;line-height:1.2;letter-spacing:-.01em}
.bl-close{width:34px;height:34px;flex:none;border:1px solid var(--line);background:transparent;color:var(--fg);font-size:22px;line-height:1;cursor:pointer}
.bl-close:hover{border-color:var(--fg)}
.bl-body{padding:18px 20px;overflow:auto;display:flex;flex-direction:column;gap:14px}
.bl-drop{min-height:148px;border:1px dashed var(--muted);background:var(--soft);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:22px;text-align:center;outline:none}
.bl-drop:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.bl-drop strong{font-size:15px}
.bl-drop span{color:var(--muted);font-size:12px}
.bl-drop-icon{font:300 30px/1 ui-sans-serif,system-ui,sans-serif;color:var(--muted)}
.bl-actions{display:flex;flex-wrap:wrap;gap:8px}
.bl-btn{appearance:none;border:1px solid var(--line);background:transparent;color:var(--fg);padding:8px 12px;font:600 12px/1.2 ui-sans-serif,system-ui,sans-serif;cursor:pointer}
.bl-btn:hover:not(:disabled){border-color:var(--fg)}
.bl-btn:disabled{opacity:.45;cursor:not-allowed}
.bl-btn-primary{background:var(--accent);border-color:var(--accent);color:var(--accent-fg)}
.bl-btn-primary:hover:not(:disabled){filter:opacity(.86)}
.bl-btn-quiet{color:var(--muted)}
.bl-btn-danger{color:var(--err);border-color:var(--err)}
.bl-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;font:11px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.bl-list{list-style:none;margin:0;padding:0;border:1px solid var(--line);max-height:210px;overflow:auto}
.bl-list li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid var(--line);min-width:0}
.bl-list li:last-child{border-bottom:0}
.bl-path{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:12px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.bl-size{flex:none;color:var(--muted);font:10px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.bl-remove{flex:none;border:0;background:transparent;color:var(--muted);font-size:16px;line-height:1;cursor:pointer;padding:2px 4px}
.bl-remove:hover{color:var(--err)}
.bl-empty{color:var(--muted);font-size:12px;justify-content:center;padding:16px!important}
.bl-note{margin:0;color:var(--muted);font-size:11px;line-height:1.5}
.bl-status{min-height:18px;font-size:12px;line-height:1.4;color:var(--muted)}
.bl-status[data-kind=error]{color:var(--err)}
.bl-status[data-kind=ok]{color:var(--ok)}
.bl-foot{border-top:1px solid var(--line);padding:14px 20px 18px;display:flex;flex-direction:column;gap:10px}
.bl-foot-actions{display:flex;justify-content:flex-end;gap:8px}
.bl-progress{display:flex;flex-direction:column;gap:6px}
.bl-progress[hidden]{display:none}
.bl-bar{height:5px;background:var(--line);overflow:hidden}
.bl-bar span{display:block;height:100%;width:0;background:var(--fg);transition:width .15s linear}
.bl-progress p{margin:0;font:10px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-probe]{display:flex;position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none}
.bl-tree{border:1px solid var(--line);max-height:280px;overflow:auto;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.bl-tree details{border-bottom:1px solid var(--line)}
.bl-tree details:last-child{border-bottom:0}
.bl-tree summary{cursor:pointer;padding:7px 10px;list-style:none;color:var(--muted)}
.bl-tree summary::-webkit-details-marker{display:none}
.bl-tree summary:before{content:"▸";display:inline-block;width:14px;color:var(--muted)}
.bl-tree details[open] > summary:before{content:"▾"}
.bl-row{display:flex;align-items:center;gap:10px;padding:7px 10px 7px 24px;border-top:1px solid var(--line);min-width:0}
.bl-row-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bl-row .bl-btn{padding:4px 7px;font-size:10px}
.bl-archive{display:flex;flex-direction:column;gap:12px}
.bl-archive[hidden]{display:none}
.bl-warning{border:1px solid var(--line);background:var(--soft);padding:10px 12px;font-size:11px;line-height:1.5;color:var(--muted)}
.bl-warning strong{color:var(--fg)}
@media (prefers-reduced-motion:reduce){.bl-bar span{transition:none}}
@media (max-width:560px){.bl-backdrop{padding:10px}.bl-panel{max-height:calc(100vh - 20px)}.bl-head,.bl-body,.bl-foot{padding-left:14px;padding-right:14px}}
`;

  function formatBytes(value) {
    let number = Number(value) || 0;
    if (number < 1024) return `${number} B`;
    const units = ["KB", "MB", "GB"];
    let index = -1;
    do {
      number /= 1024;
      index++;
    } while (number >= 1024 && index < units.length - 1);
    return `${number >= 10 ? number.toFixed(0) : number.toFixed(1)} ${units[index]}`;
  }

  function archiveName(entries, directories) {
    if (!entries.length) return "archive.zip";
    const roots = new Set();
    for (const item of entries) roots.add(item.path.split("/")[0]);
    for (const item of directories) roots.add(item.split("/")[0]);
    if (roots.size === 1) {
      const root = [...roots][0];
      if (entries.every((item) => item.path.startsWith(`${root}/`))) return `${root}.zip`;
    }
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `archive-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.zip`;
  }

  function mountPanel(spec) {
    document.getElementById(spec.hostId)?.remove();
    let host = null;
    let uiWindow = null;
    let cleanup = () => {};
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      try { cleanup(); } catch {}
      if (host) {
        host.remove();
        host = null;
      }
      if (uiWindow) {
        try { uiWindow.close(); } catch {}
        uiWindow = null;
      }
    };

    try {
      host = document.createElement("div");
      host.id = spec.hostId;
      host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
      (document.body || document.documentElement).append(host);
      const shadow = host.attachShadow({ mode: "open" });
      cleanup = spec.render(window, shadow, close) || (() => {});
      const probe = shadow.querySelector("[data-probe]");
      if (!probe || getComputedStyle(probe).display !== "flex") throw new Error("panel styles blocked");
      window.addEventListener("pagehide", () => { try { cleanup(); } catch {} }, { once: true });
      return;
    } catch {
      try { cleanup(); } catch {}
      if (host) host.remove();
      host = null;
    }

    // A popup opened from a page with style-src 'none' starts as about:blank
    // and inherits that CSP, so its <style> is dropped. A constructable sheet
    // is not subject to style-src; use one before giving up on the panel.
    const styleWindow = (win) => {
      const probe = win.document.querySelector("[data-probe]");
      if (!probe) throw new Error("panel did not render");
      if (win.getComputedStyle(probe).display === "flex") return;
      if (typeof win.CSSStyleSheet !== "function" || !("adoptedStyleSheets" in win.document)) {
        throw new Error("This page blocks the panel styles.");
      }
      const sheet = new win.CSSStyleSheet();
      sheet.replaceSync(CSS);
      win.document.adoptedStyleSheets = [...win.document.adoptedStyleSheets, sheet];
      if (win.getComputedStyle(probe).display !== "flex") {
        throw new Error("This page blocks the panel styles.");
      }
    };

    const startWindow = (win) => {
      if (!win || win.closed) throw new Error("panel window closed");
      uiWindow = win;
      try {
        win.document.title = spec.title;
        win.document.body.innerHTML = "";
        cleanup = spec.render(win, win.document.body, close) || (() => {});
        styleWindow(win);
        win.addEventListener("pagehide", () => { try { cleanup(); } catch {} }, { once: true });
      } catch (error) {
        try { win.close(); } catch {}
        uiWindow = null;
        throw error;
      }
    };

    const popup = () => {
      let win = null;
      try {
        win = window.open("", spec.windowName, "popup=yes,width=660,height=760,resizable=yes,scrollbars=yes");
      } catch {}
      if (!win) {
        alert(`This page blocked the ${spec.title} panel. Allow popups for this site, then click the bookmarklet again.`);
        return;
      }
      try {
        win.document.open();
        win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${spec.title}</title></head><body></body></html>`);
        win.document.close();
        startWindow(win);
      } catch {
        try { win.close(); } catch {}
        alert(`This page blocked the ${spec.title} panel. Allow popups for this site, then click the bookmarklet again.`);
      }
    };

    const pip = window.documentPictureInPicture;
    if (pip && typeof pip.requestWindow === "function") {
      try {
        Promise.resolve(pip.requestWindow({ width: 660, height: 760 }))
          .then((win) => { try { startWindow(win); } catch { popup(); } })
          .catch(() => popup());
        return;
      } catch {}
    }
    popup();
  }

  function render(uiWindow, root, close) {
    const doc = uiWindow.document;
    root.innerHTML = `<style>${CSS}</style>
      <div class="bl-backdrop">
        <section class="bl-panel" role="dialog" aria-modal="true" aria-labelledby="bl-zip-title">
          <header class="bl-head">
            <div><p class="bl-kicker">Bookmarklet</p><h2 id="bl-zip-title">🗜️ Zip files</h2></div>
            <button class="bl-close" type="button" data-close aria-label="Close">×</button>
          </header>
          <div class="bl-body">
            <div class="bl-drop" data-drop tabindex="0" role="button" aria-label="Drop files and folders here">
              <span class="bl-drop-icon">＋</span>
              <strong>Drop files or folders</strong>
              <span>or choose them below. Folder paths are kept.</span>
            </div>
            <div class="bl-actions">
              <button class="bl-btn" type="button" data-files>Choose files</button>
              <button class="bl-btn" type="button" data-folder>Choose folder</button>
              <button class="bl-btn bl-btn-quiet" type="button" data-clear>Clear</button>
            </div>
            <div class="bl-summary"><span data-count>0 files</span><span data-size>0 B</span></div>
            <ul class="bl-list" data-list></ul>
            <p class="bl-note">Standard ZIP, no password. Up to 1 GB and 65,535 entries. Files stay on this device.</p>
          </div>
          <footer class="bl-foot">
            <div class="bl-progress" data-progress hidden><div class="bl-bar"><span data-bar></span></div><p data-progress-text></p></div>
            <p class="bl-status" data-status aria-live="polite"></p>
            <div class="bl-foot-actions">
              <button class="bl-btn bl-btn-primary" type="button" data-create disabled>Create ZIP</button>
              <button class="bl-btn bl-btn-danger" type="button" data-cancel hidden>Cancel</button>
            </div>
          </footer>
          <span data-probe></span>
        </section>
      </div>`;

    const $ = (selector) => root.querySelector(selector);
    const list = $("[data-list]");
    const count = $("[data-count]");
    const size = $("[data-size]");
    const createButton = $("[data-create]");
    const cancelButton = $("[data-cancel]");
    const progress = $("[data-progress]");
    const progressBar = $("[data-bar]");
    const progressText = $("[data-progress-text]");
    const status = $("[data-status]");
    const drop = $("[data-drop]");
    let entries = [];
    let directories = new Set();
    let controller = null;
    let busy = false;

    const fileInput = doc.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.style.display = "none";
    root.append(fileInput);

    const folderInput = doc.createElement("input");
    folderInput.type = "file";
    folderInput.multiple = true;
    folderInput.webkitdirectory = true;
    folderInput.setAttribute("webkitdirectory", "");
    folderInput.style.display = "none";
    root.append(folderInput);

    function setStatus(message, kind = "") {
      status.textContent = message || "";
      status.dataset.kind = kind;
    }

    function normalize(path) {
      return normalizedPath(path);
    }

    function addFile(file, path) {
      if (!file) return;
      const clean = normalize(path || file.webkitRelativePath || file.name) || "file";
      const used = new Set(entries.map((item) => item.path));
      const finalPath = uniquePath(clean, used);
      entries.push({ path: finalPath, file, size: file.size || 0 });
      const parts = finalPath.split("/");
      for (let i = 1; i < parts.length; i++) directories.add(parts.slice(0, i).join("/"));
    }

    function addFiles(files) {
      for (const file of files) addFile(file, file.webkitRelativePath || file.name);
      draw();
    }

    async function readEntries(reader) {
      const result = [];
      for (;;) {
        const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
        if (!batch.length) return result;
        result.push(...batch);
      }
    }

    async function walk(entry) {
      if (!entry) return;
      if (entry.isFile) {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        addFile(file, entry.fullPath || file.name);
        return;
      }
      if (entry.isDirectory) {
        const path = normalize(entry.fullPath || entry.name);
        if (path) directories.add(path);
        const children = await readEntries(entry.createReader());
        for (const child of children) await walk(child);
      }
    }

    async function addDrop(dataTransfer) {
      const items = dataTransfer?.items ? [...dataTransfer.items] : [];
      if (items.length && typeof items[0].webkitGetAsEntry === "function") {
        setStatus("Reading dropped folders...", "");
        for (const item of items) {
          const entry = item.webkitGetAsEntry();
          if (entry) await walk(entry);
          else {
            const file = item.getAsFile?.();
            if (file) addFile(file, file.name);
          }
        }
      } else {
        addFiles([...(dataTransfer?.files || [])]);
      }
      draw();
      setStatus("");
    }

    function draw() {
      const total = entries.reduce((sum, item) => sum + item.size, 0);
      count.textContent = `${entries.length.toLocaleString()} ${entries.length === 1 ? "file" : "files"}${directories.size ? ` · ${directories.size.toLocaleString()} folders` : ""}`;
      size.textContent = formatBytes(total);
      list.innerHTML = "";
      if (!entries.length) {
        const empty = doc.createElement("li");
        empty.className = "bl-empty";
        empty.textContent = "No files yet. Drop a folder or use the buttons above.";
        list.append(empty);
      } else {
        entries.forEach((item, index) => {
          const row = doc.createElement("li");
          const path = doc.createElement("span");
          path.className = "bl-path";
          path.textContent = item.path;
          path.title = item.path;
          const bytes = doc.createElement("span");
          bytes.className = "bl-size";
          bytes.textContent = formatBytes(item.size);
          const remove = doc.createElement("button");
          remove.type = "button";
          remove.className = "bl-remove";
          remove.setAttribute("aria-label", `Remove ${item.path}`);
          remove.textContent = "×";
          remove.addEventListener("click", () => {
            if (busy) return;
            entries.splice(index, 1);
            draw();
          });
          row.append(path, bytes, remove);
          list.append(row);
        });
      }
      const totalEntries = entries.length + directories.size;
      const tooLarge = total > MAX_BYTES || totalEntries > MAX_ENTRIES;
      createButton.disabled = busy || totalEntries === 0 || tooLarge;
      if (tooLarge) setStatus("The selection is over the 1 GB or 65,535-entry limit.", "error");
      else if (status.dataset.kind === "error" && status.textContent.includes("limit")) setStatus("");
    }

    function download(blob, name) {
      const url = uiWindow.URL.createObjectURL(blob);
      const link = doc.createElement("a");
      link.href = url;
      link.download = name;
      link.style.display = "none";
      doc.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => uiWindow.URL.revokeObjectURL(url), 30000);
    }

    async function build() {
      if (busy || (!entries.length && !directories.size)) return;
      busy = true;
      controller = new AbortController();
      createButton.disabled = true;
      cancelButton.hidden = false;
      progress.hidden = false;
      progressBar.style.width = "0%";
      progressText.textContent = "Preparing...";
      setStatus("");
      try {
        const blob = await createZip(entries, {
          directories: [...directories],
          signal: controller.signal,
          onProgress: ({ done, total, name }) => {
            const percentage = total ? Math.round((done / total) * 100) : 0;
            progressBar.style.width = `${percentage}%`;
            progressText.textContent = `${done} of ${total} · ${name}`;
          },
        });
        const name = archiveName(entries, [...directories]);
        download(blob, name);
        progressBar.style.width = "100%";
        progressText.textContent = `${entries.length} ${entries.length === 1 ? "file" : "files"} · ${formatBytes(blob.size)}`;
        setStatus(`ZIP downloaded: ${name}`, "ok");
      } catch (error) {
        if (error.name === "AbortError") setStatus("Canceled. Nothing was downloaded.", "");
        else setStatus(error.message || "The ZIP could not be created.", "error");
      } finally {
        busy = false;
        controller = null;
        cancelButton.hidden = true;
        draw();
      }
    }

    fileInput.addEventListener("change", () => {
      if (fileInput.files?.length) addFiles([...fileInput.files]);
      fileInput.value = "";
    });
    folderInput.addEventListener("change", () => {
      if (folderInput.files?.length) addFiles([...folderInput.files]);
      folderInput.value = "";
    });
    $("[data-files]").addEventListener("click", () => fileInput.click());
    $("[data-folder]").addEventListener("click", () => folderInput.click());
    $("[data-clear]").addEventListener("click", () => {
      if (busy) return;
      entries = [];
      directories = new Set();
      draw();
      setStatus("");
    });
    createButton.addEventListener("click", build);
    cancelButton.addEventListener("click", () => controller?.abort());
    $("[data-close]").addEventListener("click", close);
    drop.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fileInput.click();
      }
    });
    for (const type of ["dragenter", "dragover"]) {
      drop.addEventListener(type, (event) => {
        event.preventDefault();
        event.stopPropagation();
        drop.style.borderColor = "var(--fg)";
      });
    }
    drop.addEventListener("dragleave", () => { drop.style.borderColor = ""; });
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      drop.style.borderColor = "";
      if (!busy) addDrop(event.dataTransfer).catch((error) => setStatus(error.message || "Could not read the dropped items.", "error"));
    });
    const onKey = (event) => { if (event.key === "Escape") close(); };
    doc.addEventListener("keydown", onKey);
    draw();

    return () => {
      controller?.abort();
      doc.removeEventListener("keydown", onKey);
    };
  }

  mountPanel({
    hostId: "bl-zip-host",
    title: "Zip files",
    windowName: "bl_zip_files",
    render,
  });
})();
