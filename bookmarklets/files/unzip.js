/**
 * @name 📂 Unzip
 * @category files
 * @description Open a ZIP, download files individually, or extract the whole folder; folder writing needs Chrome or Edge.
 * @tags zip, unzip, extract, browse, folder, download
 * @added 2026-10-26
 * @featured false
 */
(() => {
  const MAX_TOTAL = 4294967295;
  const MAX_ENTRIES = 65535;
  const decoder = new TextDecoder("utf-8");

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

  function crcFinish(crc) {
    return (crc ^ 0xffffffff) >>> 0;
  }

  function abortError() {
    const error = new Error("Canceled");
    error.name = "AbortError";
    return error;
  }

  function u16(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }

  function u32(bytes, offset) {
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
  }

  function cleanEntryPath(value) {
    const raw = String(value || "").replace(/\\/g, "/");
    if (!raw || raw.startsWith("/") || /^[A-Za-z]:/.test(raw) || raw.includes("\0")) {
      throw new Error("The ZIP contains an unsafe path.");
    }
    const parts = raw.split("/").filter(Boolean);
    if (!parts.length) throw new Error("The ZIP contains an empty path.");
    for (const part of parts) {
      if (part === "." || part === "..") throw new Error("The ZIP contains an unsafe path.");
    }
    return parts.join("/");
  }

  function safeFolderName(value) {
    return String(value || "")
      .replace(/\.zip$/i, "")
      .replace(/[\\/:*?"<>|\0]/g, "-")
      .replace(/^[.\s]+|[.\s]+$/g, "")
      .slice(0, 80) || "unzipped";
  }

  async function readZip(file) {
    if (!file || !Number.isFinite(file.size) || file.size < 22) throw new Error("This file is not a ZIP archive.");
    const tailSize = Math.min(file.size, 65535 + 22);
    const tail = new Uint8Array(await file.slice(file.size - tailSize).arrayBuffer());
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (u32(tail, i) !== 0x06054b50) continue;
      const commentLength = u16(tail, i + 20);
      if (i + 22 + commentLength <= tail.length) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error("This file is not a ZIP archive or the end record is missing.");
    const disk = u16(tail, eocd + 4);
    const centralDisk = u16(tail, eocd + 6);
    const entriesOnDisk = u16(tail, eocd + 8);
    const totalEntries = u16(tail, eocd + 10);
    const centralSize = u32(tail, eocd + 12);
    const centralOffset = u32(tail, eocd + 16);
    if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== totalEntries) {
      throw new Error("Split and multi-disk ZIP archives are not supported.");
    }
    if (totalEntries === 65535 || centralSize === 4294967295 || centralOffset === 4294967295) {
      throw new Error("ZIP64 archives are not supported. This tool reads ZIP32 archives only.");
    }
    if (!totalEntries) throw new Error("The ZIP archive is empty.");
    if (centralOffset + centralSize > file.size) throw new Error("The ZIP central directory is outside the file.");
    const central = new Uint8Array(await file.slice(centralOffset, centralOffset + centralSize).arrayBuffer());
    const entries = [];
    const seen = new Set();
    let position = 0;
    let totalSize = 0;
    let totalCompressed = 0;

    for (let index = 0; index < totalEntries; index++) {
      if (position + 46 > central.length) throw new Error("The ZIP central directory is truncated.");
      if (u32(central, position) !== 0x02014b50) throw new Error("The ZIP central directory is malformed.");
      const flags = u16(central, position + 8);
      const method = u16(central, position + 10);
      const checksum = u32(central, position + 16);
      const compressedSize = u32(central, position + 20);
      const size = u32(central, position + 24);
      const nameLength = u16(central, position + 28);
      const extraLength = u16(central, position + 30);
      const commentLength = u16(central, position + 32);
      const diskStart = u16(central, position + 34);
      const external = u32(central, position + 38);
      const localOffset = u32(central, position + 42);
      const end = position + 46 + nameLength + extraLength + commentLength;
      if (end > central.length) throw new Error("The ZIP central directory is truncated.");
      if (compressedSize === 4294967295 || size === 4294967295 || localOffset === 4294967295) {
        throw new Error("ZIP64 archives are not supported. This tool reads ZIP32 archives only.");
      }
      if (flags & 1) throw new Error("Encrypted ZIP archives are not supported.");
      if (method !== 0 && method !== 8) throw new Error(`This ZIP uses unsupported compression method ${method}.`);
      if (diskStart !== 0) throw new Error("Split and multi-disk ZIP archives are not supported.");
      if (((external >>> 16) & 0xf000) === 0xa000) throw new Error("Symbolic links are not extracted from ZIP archives.");
      const rawName = decoder.decode(central.subarray(position + 46, position + 46 + nameLength));
      const isDirectory = rawName.endsWith("/") || (external & 0x10) !== 0;
      const path = cleanEntryPath(rawName.replace(/\/+$/, ""));
      if (seen.has(path)) throw new Error(`The ZIP contains a duplicate path: ${path}`);
      seen.add(path);
      if (totalSize + size > MAX_TOTAL) throw new Error("This ZIP expands beyond the 4 GB ZIP32 limit.");
      totalSize += size;
      totalCompressed += compressedSize;
      entries.push({
        path,
        name: path.split("/").at(-1),
        isDirectory,
        size,
        compressedSize,
        crc: checksum,
        method,
        flags,
        localOffset,
      });
      position = end;
    }
    if (entries.length > MAX_ENTRIES) throw new Error("This ZIP has too many entries for the 65,535-entry limit.");
    entries.sort((a, b) => a.path.localeCompare(b.path));
    return {
      name: file.name || "archive.zip",
      file,
      entries,
      files: entries.filter((entry) => !entry.isDirectory),
      folders: entries.filter((entry) => entry.isDirectory),
      totalSize,
      totalCompressed,
    };
  }

  async function entryStream(file, entry) {
    const local = new Uint8Array(await file.slice(entry.localOffset, entry.localOffset + 30).arrayBuffer());
    if (local.length < 30 || u32(local, 0) !== 0x04034b50) throw new Error(`The local header for ${entry.path} is missing.`);
    const nameLength = u16(local, 26);
    const extraLength = u16(local, 28);
    const dataStart = entry.localOffset + 30 + nameLength + extraLength;
    if (dataStart + entry.compressedSize > file.size) throw new Error(`The data for ${entry.path} is outside the ZIP.`);
    const source = file.slice(dataStart, dataStart + entry.compressedSize).stream();
    if (entry.method === 8) {
      if (typeof DecompressionStream !== "function") throw new Error("This browser cannot decompress ZIP files.");
      return source.pipeThrough(new DecompressionStream("deflate-raw"));
    }
    return source;
  }

  async function streamEntry(file, entry, onChunk, signal) {
    const stream = await entryStream(file, entry);
    const reader = stream.getReader();
    let crc = 0xffffffff;
    let total = 0;
    try {
      for (;;) {
        if (signal?.aborted) throw abortError();
        const { done, value } = await reader.read();
        if (done) break;
        crc = crcUpdate(crc, value);
        total += value.length;
        if (total > MAX_TOTAL) throw new Error("This ZIP expands beyond the 4 GB ZIP32 limit.");
        if (onChunk) await onChunk(value);
      }
    } finally {
      reader.releaseLock();
    }
    if (total !== entry.size || crcFinish(crc) !== entry.crc) {
      throw new Error(`The checksum for ${entry.path} does not match. The archive may be damaged.`);
    }
    return total;
  }

  async function extractEntry(file, entry) {
    if (entry.isDirectory) throw new Error("That ZIP entry is a folder.");
    const chunks = [];
    await streamEntry(file, entry, async (chunk) => { chunks.push(chunk); });
    return new Blob(chunks, { type: "application/octet-stream" });
  }

  async function uniqueFolder(root, base) {
    for (let index = 1; ; index++) {
      const name = index === 1 ? base : `${base} (${index})`;
      try {
        await root.getDirectoryHandle(name);
      } catch (error) {
        if (error.name === "NotFoundError") return name;
        throw error;
      }
    }
  }

  async function ensureDirectory(root, parts) {
    let current = root;
    for (const part of parts) current = await current.getDirectoryHandle(part, { create: true });
    return current;
  }

  // An archive that already has one top-level folder often names it after the
  // archive. Creating both would produce project/project/...; in that case the
  // chosen folder becomes the root and the duplicate level is left out.
  function redundantRoot(entries, folderName) {
    if (!entries.length) return "";
    const roots = new Set(entries.map((entry) => entry.path.split("/")[0]));
    if (roots.size !== 1) return "";
    const [shared] = roots;
    if (!entries.every((entry) => entry.path === shared || entry.path.startsWith(`${shared}/`))) return "";
    if (!entries.some((entry) => entry.isDirectory && entry.path === shared)) return "";
    return shared.toLowerCase() === safeFolderName(folderName).toLowerCase() ? shared : "";
  }

  async function extractAll(file, root, folderName, entries, options = {}) {
    const signal = options.signal;
    const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
    const base = safeFolderName(folderName);
    const strip = redundantRoot(entries, folderName);
    const folder = await uniqueFolder(root, base);
    const destination = await root.getDirectoryHandle(folder, { create: true });
    const files = entries.filter((entry) => !entry.isDirectory);
    let done = 0;
    let bytes = 0;
    try {
      for (const entry of entries) {
        if (signal?.aborted) throw abortError();
        const relative = strip ? entry.path.slice(strip.length + 1) : entry.path;
        if (!relative) continue;
        const parts = relative.split("/");
        if (entry.isDirectory) {
          await ensureDirectory(destination, parts);
          continue;
        }
        const name = parts.pop();
        const directory = await ensureDirectory(destination, parts);
        const handle = await directory.getFileHandle(name, { create: true });
        const writable = await handle.createWritable();
        try {
          await streamEntry(file, entry, async (chunk) => {
            await writable.write(chunk);
            bytes += chunk.length;
          }, signal);
          await writable.close();
        } catch (error) {
          try { await writable.abort(); } catch {}
          try { await directory.removeEntry(name); } catch {}
          throw error;
        }
        done++;
        onProgress({ done, total: files.length, name: entry.path, bytes: entry.size, phase: "done" });
      }
      return { folder, files: files.length, bytes };
    } catch (error) {
      try { await root.removeEntry(folder, { recursive: true }); } catch {}
      throw error;
    }
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.unzip = { readZip, extractEntry, extractAll, cleanEntryPath, safeFolderName };
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
.bl-drop[hidden]{display:none}
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
.bl-tree{border:1px solid var(--line);max-height:300px;overflow:auto;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
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

    const startWindow = (win) => {
      if (!win || win.closed) throw new Error("panel window closed");
      uiWindow = win;
      try {
        win.document.title = spec.title;
        win.document.body.innerHTML = "";
        cleanup = spec.render(win, win.document.body, close) || (() => {});
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
        alert("This page blocked the ZIP panel. Allow popups for this site, then click the bookmarklet again.");
        return;
      }
      try {
        win.document.open();
        win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${spec.title}</title></head><body></body></html>`);
        win.document.close();
        startWindow(win);
      } catch {
        try { win.close(); } catch {}
        alert("This page blocked the ZIP panel. Allow popups for this site, then click the bookmarklet again.");
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
        <section class="bl-panel bl-panel-wide" role="dialog" aria-modal="true" aria-labelledby="bl-unzip-title">
          <header class="bl-head">
            <div><p class="bl-kicker">Bookmarklet</p><h2 id="bl-unzip-title">📂 Unzip</h2></div>
            <button class="bl-close" type="button" data-close aria-label="Close">×</button>
          </header>
          <div class="bl-body">
            <div class="bl-drop" data-drop tabindex="0" role="button" aria-label="Drop a ZIP here">
              <span class="bl-drop-icon">＋</span>
              <strong>Drop a ZIP archive</strong>
              <span>or choose one to inspect. Nothing is uploaded.</span>
            </div>
            <div class="bl-archive" data-archive hidden>
              <div class="bl-summary"><span data-zip-name></span><span data-zip-meta></span></div>
              <div class="bl-actions"><button class="bl-btn bl-btn-quiet" type="button" data-pick-another>Choose another ZIP</button></div>
              <div class="bl-tree" data-tree></div>
              <p class="bl-note">Download files individually below, or save the whole tree into a folder. Folder writing asks for permission to change the folder you choose.</p>
              <div class="bl-warning" data-warning></div>
            </div>
            <p class="bl-status" data-status aria-live="polite"></p>
          </div>
          <footer class="bl-foot">
            <div class="bl-progress" data-progress hidden><div class="bl-bar"><span data-bar></span></div><p data-progress-text></p></div>
            <div class="bl-foot-actions">
              <button class="bl-btn bl-btn-primary" type="button" data-save disabled>Save all to folder</button>
              <button class="bl-btn bl-btn-danger" type="button" data-cancel hidden>Cancel</button>
            </div>
          </footer>
          <span data-probe></span>
        </section>
      </div>`;

    const $ = (selector) => root.querySelector(selector);
    const drop = $("[data-drop]");
    const archiveView = $("[data-archive]");
    const tree = $("[data-tree]");
    const nameNode = $("[data-zip-name]");
    const metaNode = $("[data-zip-meta]");
    const warning = $("[data-warning]");
    const saveButton = $("[data-save]");
    const cancelButton = $("[data-cancel]");
    const progress = $("[data-progress]");
    const progressBar = $("[data-bar]");
    const progressText = $("[data-progress-text]");
    const status = $("[data-status]");
    let current = null;
    let archive = null;
    let busy = false;
    let controller = null;
    const canWrite = Boolean(uiWindow.isSecureContext && typeof uiWindow.showDirectoryPicker === "function");

    const fileInput = doc.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".zip,application/zip";
    fileInput.style.display = "none";
    root.append(fileInput);

    function setStatus(message, kind = "") {
      status.textContent = message || "";
      status.dataset.kind = kind;
    }

    function setWarning() {
      warning.textContent = canWrite
        ? "Chrome or Edge will ask for permission to save changes in the folder you choose. That permission belongs to this page, not the bookmarklet."
        : "Folder writing needs Chrome or Edge on a secure page. You can still download files individually.";
    }

    function setBusy(value, cancellable = false) {
      busy = value;
      saveButton.disabled = value || !archive || !canWrite;
      cancelButton.hidden = !(value && cancellable);
      tree.querySelectorAll("button[data-download]").forEach((button) => { button.disabled = value; });
    }

    function setProgress(value, text) {
      progress.hidden = !value;
      if (!value) return;
      progressBar.style.width = `${text?.percentage ?? 0}%`;
      progressText.textContent = text?.label || "";
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

    function nodeFor(rootNode, name) {
      if (!rootNode.folders.has(name)) rootNode.folders.set(name, { folders: new Map(), files: [] });
      return rootNode.folders.get(name);
    }

    function buildTree(entries) {
      const rootNode = { folders: new Map(), files: [] };
      for (const entry of entries) {
        const parts = entry.path.split("/");
        if (entry.isDirectory) {
          let node = rootNode;
          for (const part of parts) node = nodeFor(node, part);
          continue;
        }
        const name = parts.pop();
        let node = rootNode;
        for (const part of parts) node = nodeFor(node, part);
        node.files.push({ name, entry });
      }
      return rootNode;
    }

    function renderTree(node) {
      const fragment = doc.createDocumentFragment();
      const folders = [...node.folders.entries()].sort(([a], [b]) => a.localeCompare(b));
      for (const [name, child] of folders) {
        const details = doc.createElement("details");
        details.open = true;
        const summary = doc.createElement("summary");
        summary.textContent = `${name}/`;
        details.append(summary, renderTree(child));
        fragment.append(details);
      }
      const files = node.files.sort((a, b) => a.name.localeCompare(b.name));
      for (const { name, entry } of files) {
        const row = doc.createElement("div");
        row.className = "bl-row";
        row.dataset.path = entry.path;
        const label = doc.createElement("span");
        label.className = "bl-row-name";
        label.textContent = name;
        label.title = entry.path;
        const size = doc.createElement("span");
        size.className = "bl-size";
        size.textContent = formatBytes(entry.size);
        const button = doc.createElement("button");
        button.type = "button";
        button.className = "bl-btn";
        button.dataset.download = entry.path;
        button.textContent = "Download";
        button.addEventListener("click", () => downloadEntry(entry));
        row.append(label, size, button);
        fragment.append(row);
      }
      return fragment;
    }

    async function loadZip(file) {
      if (!file) return;
      if (busy) return;
      current = file;
      archive = null;
      setBusy(false);
      archiveView.hidden = true;
      setStatus(`Reading ${file.name}...`);
      try {
        const result = await readZip(file);
        archive = result;
        drop.hidden = true;
        archiveView.hidden = false;
        nameNode.textContent = result.name;
        metaNode.textContent = `${result.files.length.toLocaleString()} files · ${formatBytes(result.totalSize)} unpacked`;
        tree.replaceChildren(renderTree(buildTree(result.entries)));
        setWarning();
        setBusy(false);
        setStatus(`Loaded ${result.entries.length.toLocaleString()} entries.`, "ok");
      } catch (error) {
        archiveView.hidden = true;
        drop.hidden = false;
        tree.replaceChildren();
        setStatus(error.message || "The ZIP could not be read.", "error");
        setBusy(false);
      }
    }

    async function downloadEntry(entry) {
      if (busy || !current) return;
      setBusy(true);
      setStatus(`Preparing ${entry.name}...`);
      try {
        const blob = await extractEntry(current, entry);
        download(blob, entry.name);
        setStatus(`Downloaded ${entry.name}.`, "ok");
      } catch (error) {
        setStatus(error.message || `Could not download ${entry.name}.`, "error");
      } finally {
        setBusy(false);
      }
    }

    async function saveAll() {
      if (busy || !archive || !canWrite) return;
      setBusy(true, true);
      controller = new AbortController();
      setProgress(true, { percentage: 0, label: "Choose a folder..." });
      setStatus("Choose a destination folder.");
      try {
        const root = await uiWindow.showDirectoryPicker({ mode: "readwrite" });
        const result = await extractAll(current, root, current.name, archive.entries, {
          signal: controller.signal,
          onProgress: ({ done, total, name }) => {
            setProgress(true, {
              percentage: total ? Math.round((done / total) * 100) : 0,
              label: `${done} of ${total} · ${name}`,
            });
          },
        });
        setProgress(false);
        setStatus(`Saved ${result.files} files to ${result.folder}.`, "ok");
      } catch (error) {
        setProgress(false);
        if (error.name === "AbortError") setStatus("Canceled. The partial folder was removed.", "");
        else if (error.name === "NotAllowedError") setStatus("Folder permission was not granted. Individual downloads still work.", "");
        else setStatus(error.message || "The ZIP could not be extracted.", "error");
      } finally {
        controller = null;
        setBusy(false);
      }
    }

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (file) loadZip(file);
    });
    drop.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fileInput.click();
      }
    });
    drop.addEventListener("click", () => fileInput.click());
    $("[data-pick-another]").addEventListener("click", () => fileInput.click());
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
      const file = event.dataTransfer?.files?.[0];
      if (file) loadZip(file);
      else setStatus("Drop a ZIP file to open it.", "error");
    });
    saveButton.addEventListener("click", saveAll);
    cancelButton.addEventListener("click", () => controller?.abort());
    $("[data-close]").addEventListener("click", close);
    const onKey = (event) => { if (event.key === "Escape") close(); };
    doc.addEventListener("keydown", onKey);
    setWarning();
    setBusy(false);

    return () => {
      controller?.abort();
      doc.removeEventListener("keydown", onKey);
    };
  }

  mountPanel({
    hostId: "bl-unzip-host",
    title: "Unzip",
    windowName: "bl_unzip_files",
    render,
  });
})();
