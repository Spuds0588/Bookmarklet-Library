/**
 * @name 📝 RTF to ODT
 * @category files
 * @description Open RTF files as .odt, keeping formatting, tables and PNG or JPEG images.
 * @tags rtf, odt, libreoffice, opendocument, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// Generated from bookmarklets/src by scripts/compose.mjs. Edit the source, not this file.
(() => {
const BL = {};
/* ---- ui ---- */
/* Shared panel, queue and bulk-save UI for the Office converters. */

BL.escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

BL.formatBytes = (value) => {
  let number = Number(value) || 0;
  if (number < 1024) return `${Math.round(number)} B`;
  const units = ["KB", "MB", "GB"];
  let index = -1;
  do {
    number /= 1024;
    index++;
  } while (number >= 1024 && index < units.length - 1);
  return `${number >= 10 ? number.toFixed(0) : number.toFixed(1)} ${units[index]}`;
};

BL.safeName = (value, fallback = "file") => {
  const name = String(value || "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 120);
  return name || fallback;
};

BL.baseName = (name) => String(name || "file").replace(/\.[^./\\]+$/, "") || "file";

BL.mergeRuns = (runs) => {
  const merged = [];
  const keys = ["bold", "italic", "underline", "strike", "code", "link", "superscript", "subscript", "size", "font"];
  for (const run of runs || []) {
    if (run.image !== undefined) { merged.push(run); continue; }
    const previous = merged.at(-1);
    const same = previous && previous.image === undefined && keys.every((key) => previous[key] === run[key]);
    if (same) previous.text = String(previous.text || "") + String(run.text || "");
    else merged.push({ ...run });
  }
  return merged;
};

BL.uniqueName = (name, used) => {
  let candidate = name;
  if (!used.has(candidate.toLowerCase())) {
    used.add(candidate.toLowerCase());
    return candidate;
  }
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  for (let index = 2; ; index++) {
    candidate = `${stem} (${index})${extension}`;
    if (!used.has(candidate.toLowerCase())) {
      used.add(candidate.toLowerCase());
      return candidate;
    }
  }
};

const CONVERTER_CSS = `
:host{color-scheme:light dark;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.bl-backdrop{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.5);color:#111;--bg:#fff;--fg:#111;--muted:#666;--line:#d9d9d9;--soft:#f4f4f4;--accent:#111;--accent-fg:#fff;--err:#a11;--ok:#086b3a;font-size:14px;line-height:1.45}
@media (prefers-color-scheme:dark){.bl-backdrop{background:rgba(0,0,0,.7);color:#f5f5f5;--bg:#111;--fg:#f5f5f5;--muted:#aaa;--line:#3a3a3a;--soft:#1b1b1b;--accent:#f5f5f5;--accent-fg:#111;--err:#ff8d8d;--ok:#7ee2a8}}
.bl-backdrop *,.bl-backdrop *::before,.bl-backdrop *::after{box-sizing:border-box}
[data-probe]{display:flex;position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none}
.bl-panel{width:min(660px,100%);max-height:min(780px,calc(100vh - 48px));display:flex;flex-direction:column;background:var(--bg);border:1px solid var(--fg);box-shadow:0 24px 80px rgba(0,0,0,.4)}
.bl-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px 14px;border-bottom:1px solid var(--line)}
.bl-kicker{margin:0 0 3px;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.bl-head h2{margin:0;font-size:20px;line-height:1.2;letter-spacing:-.01em}
.bl-close{width:34px;height:34px;flex:none;border:1px solid var(--line);background:transparent;color:var(--fg);font-size:22px;line-height:1;cursor:pointer}
.bl-close:hover{border-color:var(--fg)}
.bl-body{padding:18px 20px;overflow:auto;display:flex;flex-direction:column;gap:13px}
.bl-drop{min-height:104px;border:1px dashed var(--muted);background:var(--soft);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:16px;text-align:center;outline:none}
.bl-drop:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.bl-drop strong{font-size:15px}
.bl-drop span{color:var(--muted);font-size:12px}
.bl-drop[hidden]{display:none}
.bl-drop-icon{font:300 26px/1 ui-sans-serif,system-ui,sans-serif;color:var(--muted)}
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
.bl-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:12px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.bl-meta{flex:none;color:var(--muted);font:10px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.bl-remove{flex:none;border:0;background:transparent;color:var(--muted);font-size:16px;line-height:1;cursor:pointer;padding:2px 4px}
.bl-remove:hover{color:var(--err)}
.bl-empty{color:var(--muted);font-size:12px;justify-content:center;padding:16px!important}
.bl-note{margin:0;color:var(--muted);font-size:11px;line-height:1.5}
.bl-options{display:flex;flex-wrap:wrap;gap:10px}
.bl-field{display:flex;flex-direction:column;gap:4px;font:10px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.bl-field select{border:1px solid var(--line);background:var(--bg);color:var(--fg);padding:7px 9px;font:12px/1.2 ui-sans-serif,system-ui,sans-serif;text-transform:none;letter-spacing:0}
.bl-status{min-height:18px;font-size:12px;line-height:1.4;color:var(--muted)}
.bl-status[data-kind=error]{color:var(--err)}
.bl-status[data-kind=ok]{color:var(--ok)}
.bl-foot{border-top:1px solid var(--line);padding:14px 20px 18px;display:flex;flex-direction:column;gap:10px}
.bl-foot-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px}
.bl-progress{display:flex;flex-direction:column;gap:6px}
.bl-progress[hidden]{display:none}
.bl-bar{height:6px;background:var(--soft);border:1px solid var(--line);overflow:hidden}
.bl-bar span{display:block;height:100%;width:0;background:var(--fg);transition:width .16s ease}
.bl-progress p{margin:0;color:var(--muted);font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.bl-outputs{display:flex;flex-direction:column;gap:6px}
.bl-outputs[hidden]{display:none}
@media (prefers-reduced-motion:reduce){.bl-bar span{transition:none}}
@media (max-width:560px){.bl-backdrop{padding:10px}.bl-panel{max-height:calc(100vh - 20px)}.bl-head,.bl-body,.bl-foot{padding-left:14px;padding-right:14px}}
`;

BL.mountPanel = (spec) => {
  document.getElementById(spec.hostId)?.remove();
  let host = null;
  let uiWindow = null;
  let cleanup = () => {};
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    try { cleanup(); } catch {}
    if (host) { host.remove(); host = null; }
    if (uiWindow) { try { uiWindow.close(); } catch {} uiWindow = null; }
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

  // about:blank inherits the opener's CSP, so a blocked <style> is replaced
  // with a constructable sheet before the panel is abandoned.
  const styleWindow = (win) => {
    const probe = win.document.querySelector("[data-probe]");
    if (!probe) throw new Error("panel did not render");
    if (win.getComputedStyle(probe).display === "flex") return;
    if (typeof win.CSSStyleSheet !== "function" || !("adoptedStyleSheets" in win.document)) {
      throw new Error("This page blocks the panel styles.");
    }
    const sheet = new win.CSSStyleSheet();
    sheet.replaceSync(CONVERTER_CSS);
    win.document.adoptedStyleSheets = [...win.document.adoptedStyleSheets, sheet];
    if (win.getComputedStyle(probe).display !== "flex") throw new Error("This page blocks the panel styles.");
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
    try { win = window.open("", spec.windowName, "popup=yes,width=680,height=780,resizable=yes,scrollbars=yes"); } catch {}
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
      Promise.resolve(pip.requestWindow({ width: 680, height: 780 }))
        .then((win) => { try { startWindow(win); } catch { popup(); } })
        .catch(() => popup());
      return;
    } catch {}
  }
  popup();
};

BL.startTool = (config) => {
  if (globalThis.__BL_TEST__) return;
  const MAX_FILES = 100;
  const MAX_FILE_BYTES = 100 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 300 * 1024 * 1024;
  const accept = config.accept;
  const LEGACY = { ".doc": ".docx", ".xls": ".xlsx" };

  const render = (uiWindow, root, close) => {
    const doc = uiWindow.document;
    const hostId = `bl-${config.slug}-host`;
    root.innerHTML = `<style>${CONVERTER_CSS}</style>
      <div class="bl-backdrop">
        <section class="bl-panel" role="dialog" aria-modal="true" aria-labelledby="${hostId}-title">
          <header class="bl-head">
            <div><p class="bl-kicker">Bookmarklet</p><h2 id="${hostId}-title">${BL.escapeHtml(config.title)}</h2></div>
            <button class="bl-close" type="button" data-close aria-label="Close">×</button>
          </header>
          <div class="bl-body">
            <div class="bl-drop" data-drop tabindex="0" role="button" aria-label="Drop files here">
              <span class="bl-drop-icon">＋</span>
              <strong>${BL.escapeHtml(config.dropTitle || "Drop files")}</strong>
              <span>${BL.escapeHtml(config.hint || "or choose them below.")}</span>
            </div>
            <div class="bl-actions">
              <button class="bl-btn" type="button" data-pick>Choose files</button>
              <button class="bl-btn bl-btn-quiet" type="button" data-clear>Clear</button>
            </div>
            <div class="bl-options" data-options hidden></div>
            <div class="bl-summary"><span data-count>0 files</span><span data-size>0 B</span></div>
            <ul class="bl-list" data-list></ul>
            <p class="bl-note">${BL.escapeHtml(config.note || "Files stay on this device. Nothing is uploaded.")}</p>
          </div>
          <footer class="bl-foot">
            <div class="bl-progress" data-progress hidden><div class="bl-bar"><span data-bar></span></div><p data-progress-text></p></div>
            <p class="bl-status" data-status aria-live="polite"></p>
            <div class="bl-outputs" data-outputs hidden>
              <div class="bl-summary"><span data-output-count></span><span></span></div>
              <div class="bl-actions">
                <button class="bl-btn" type="button" data-folder hidden>Save all to folder</button>
                <button class="bl-btn" type="button" data-zip>Download ZIP</button>
              </div>
            </div>
            <div class="bl-foot-actions">
              <button class="bl-btn bl-btn-primary" type="button" data-convert disabled>${BL.escapeHtml(config.action || "Convert")}</button>
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
    const convertButton = $("[data-convert]");
    const cancelButton = $("[data-cancel]");
    const progress = $("[data-progress]");
    const progressBar = $("[data-bar]");
    const progressText = $("[data-progress-text]");
    const status = $("[data-status]");
    const drop = $("[data-drop]");
    const optionsRoot = $("[data-options]");
    const outputsBox = $("[data-outputs]");
    const outputCount = $("[data-output-count]");
    const zipButton = $("[data-zip]");
    const folderButton = $("[data-folder]");
    let entries = [];
    let outputs = [];
    let controller = null;
    let busy = false;

    const input = doc.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = accept;
    input.style.display = "none";
    root.append(input);

    const optionState = {};
    for (const option of config.options || []) {
      const field = doc.createElement("label");
      field.className = "bl-field";
      field.textContent = option.label;
      const select = doc.createElement("select");
      for (const value of option.values) {
        const choice = doc.createElement("option");
        choice.value = value.value;
        choice.textContent = value.label;
        select.append(choice);
      }
      select.value = option.value;
      select.addEventListener("change", () => {
        optionState[option.id] = select.value;
      });
      optionState[option.id] = option.value;
      field.append(select);
      optionsRoot.append(field);
    }
    optionsRoot.hidden = !(config.options || []).length;

    const setStatus = (message, kind = "") => {
      status.textContent = message || "";
      status.dataset.kind = kind;
    };
    const setBusy = (value) => {
      busy = value;
      convertButton.disabled = value || !entries.length;
      cancelButton.hidden = !value;
      input.disabled = value;
      for (const button of root.querySelectorAll("[data-remove]")) button.disabled = value;
    };
    const updateProgress = ({ done, total, name }) => {
      if (!total) return;
      const percent = Math.round((done / total) * 100);
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${done} of ${total}${name ? ` · ${name}` : ""}`;
    };
    const normalize = (file) => accept.split(",").some((item) => {
      const extension = item.trim().toLowerCase();
      if (!extension.startsWith(".")) return false;
      return file.name.toLowerCase().endsWith(extension);
    });
    const addFiles = (files) => {
      if (busy) return;
      setStatus("");
      for (const file of files) {
        if (!normalize(file)) {
          const dot = file.name.lastIndexOf(".");
          const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
          const replacement = LEGACY[extension];
          if (replacement && accept.split(",").map((item) => item.trim()).includes(replacement)) {
            setStatus(`"${file.name}" is a legacy ${extension} file. Save it as ${replacement} and try again.`, "error");
          } else {
            setStatus(`"${file.name}" is not one of the formats this tool reads (${accept}).`, "error");
          }
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          setStatus(`"${file.name}" is over the 100 MB per-file limit.`, "error");
          continue;
        }
        if (entries.length >= MAX_FILES) {
          setStatus(`This tool takes up to ${MAX_FILES} files at a time.`, "error");
          break;
        }
        if (entries.some((entry) => entry.file.name === file.name && entry.file.size === file.size)) continue;
        entries.push({ file, state: "waiting", message: "" });
      }
      const totalBytes = entries.reduce((sum, entry) => sum + entry.file.size, 0);
      if (totalBytes > MAX_TOTAL_BYTES) {
        entries = entries.slice(0, Math.max(0, entries.length - 1));
        setStatus("The batch is over the 300 MB total limit.", "error");
      }
      outputs = [];
      outputsBox.hidden = true;
      draw();
    };
    const draw = () => {
      list.innerHTML = "";
      if (!entries.length) {
        const empty = doc.createElement("li");
        empty.className = "bl-empty";
        empty.textContent = config.empty || "No files yet. Drop them above or choose them.";
        list.append(empty);
      } else {
        entries.forEach((entry, index) => {
          const row = doc.createElement("li");
          const name = doc.createElement("span");
          name.className = "bl-name";
          name.textContent = entry.file.name;
          name.title = entry.file.name;
          const meta = doc.createElement("span");
          meta.className = "bl-meta";
          meta.textContent = entry.state === "done" ? "done" : entry.state === "error" ? "failed" : BL.formatBytes(entry.file.size);
          if (entry.message) meta.title = entry.message;
          const remove = doc.createElement("button");
          remove.type = "button";
          remove.className = "bl-remove";
          remove.dataset.remove = "true";
          remove.setAttribute("aria-label", `Remove ${entry.file.name}`);
          remove.textContent = "×";
          remove.addEventListener("click", () => {
            if (busy) return;
            entries.splice(index, 1);
            outputs = [];
            outputsBox.hidden = true;
            draw();
          });
          row.append(name, meta, remove);
          list.append(row);
        });
      }
      const totalBytes = entries.reduce((sum, entry) => sum + entry.file.size, 0);
      count.textContent = `${entries.length} ${entries.length === 1 ? "file" : "files"}`;
      size.textContent = BL.formatBytes(totalBytes);
      convertButton.disabled = busy || !entries.length;
    };

    const download = (blob, name) => {
      const url = uiWindow.URL.createObjectURL(blob);
      const link = doc.createElement("a");
      link.href = url;
      link.download = name;
      link.style.display = "none";
      doc.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => uiWindow.URL.revokeObjectURL(url), 30000);
    };

    const showOutputs = () => {
      outputCount.textContent = `${outputs.length} files ready`;
      outputsBox.hidden = false;
      folderButton.hidden = !(uiWindow.isSecureContext && typeof uiWindow.showDirectoryPicker === "function");
    };

    const run = async () => {
      if (busy || !entries.length) return;
      outputs = [];
      outputsBox.hidden = true;
      setStatus("");
      progress.hidden = false;
      progressBar.style.width = "0%";
      controller = new AbortController();
      const signal = controller.signal;
      setBusy(true);
      let done = 0;
      const notes = [];
      const failures = [];
      try {
        for (const entry of entries) {
          if (signal.aborted) break;
          entry.state = "working";
          setStatus(`Converting ${entry.file.name}…`);
          progressText.textContent = `${done} of ${entries.length} · ${entry.file.name}`;
          draw();
          try {
            const result = await config.convert(entry.file, { ...optionState }, { signal, uiWindow });
            const produced = Array.isArray(result) ? result : result?.files || [];
            if (result?.note) notes.push(result.note);
            if (!produced.length) throw new Error("The conversion produced no file.");
            for (const item of produced) {
              if (!item || !item.blob) continue;
              outputs.push({ name: BL.safeName(item.name, "converted"), blob: item.blob });
            }
            entry.state = "done";
            entry.message = "";
          } catch (error) {
            entry.state = "error";
            entry.message = error?.name === "AbortError" ? "Canceled" : error?.message || "Conversion failed.";
            if (error?.name !== "AbortError") {
              failures.push({ name: entry.file.name, message: entry.message });
              setStatus(`${entry.file.name}: ${entry.message}`, "error");
            }
          }
          done++;
          updateProgress({ done, total: entries.length, name: entry.file.name });
          draw();
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (signal.aborted) {
          setStatus("Canceled. Nothing was saved.", "");
          outputs = [];
        } else if (!outputs.length) {
          const first = failures[0];
          setStatus(
            first ? `${first.name}: ${first.message}` : "Nothing could be converted. Check the file types and try again.",
            "error",
          );
        } else {
          const failed = entries.filter((entry) => entry.state === "error").length;
          const suffix = notes.filter(Boolean).join("").slice(0, 240);
          if (outputs.length === 1) {
            download(outputs[0].blob, outputs[0].name);
            setStatus(`Downloaded ${outputs[0].name}.${failed ? ` ${failed} file(s) failed.` : ""}${suffix}`, failed ? "error" : "ok");
          } else {
            showOutputs();
            setStatus(`Converted ${outputs.length} files.${failed ? ` ${failed} file(s) failed.` : ""} Save them to a folder or download one ZIP.${suffix}`, failed ? "error" : "ok");
          }
        }
      } finally {
        controller = null;
        progressBar.style.width = "100%";
        progress.hidden = true;
        setBusy(false);
      }
    };

    input.addEventListener("change", () => {
      if (input.files?.length) addFiles([...input.files]);
      input.value = "";
    });
    $("[data-pick]").addEventListener("click", () => input.click());
    $("[data-clear]").addEventListener("click", () => {
      if (busy) return;
      entries = [];
      outputs = [];
      outputsBox.hidden = true;
      setStatus("");
      draw();
    });
    convertButton.addEventListener("click", run);
    cancelButton.addEventListener("click", () => controller?.abort());
    $("[data-close]").addEventListener("click", close);
    drop.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
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
      if (event.dataTransfer?.files?.length) addFiles([...event.dataTransfer.files]);
    });
    zipButton.addEventListener("click", async () => {
      if (!outputs.length) return;
      try {
        setStatus("Building the ZIP…");
        const used = new Set();
        const blob = await BL.makeZip(outputs.map((output) => ({ name: BL.uniqueName(output.name, used), blob: output.blob })));
        download(blob, `converted-${new Date().toISOString().slice(0, 10)}.zip`);
        setStatus(`Downloaded converted-${new Date().toISOString().slice(0, 10)}.zip with ${outputs.length} files.`, "ok");
      } catch (error) {
        setStatus(error.message || "The ZIP could not be built.", "error");
      }
    });
    folderButton.addEventListener("click", async () => {
      if (!outputs.length) return;
      try {
        setStatus("Choose a folder for the converted files.");
        const rootHandle = await uiWindow.showDirectoryPicker({ mode: "readwrite" });
        const used = new Set();
        const files = outputs.map((output) => ({ ...output, name: BL.uniqueName(output.name, used) }));
        let done = 0;
        const existing = async (name) => {
          try { await rootHandle.getFileHandle(name); return true; } catch (error) { if (error.name === "NotFoundError") return false; throw error; }
        };
        for (const output of files) {
          let name = output.name;
          if (await existing(name)) {
            const dot = name.lastIndexOf(".");
            const stem = dot > 0 ? name.slice(0, dot) : name;
            const extension = dot > 0 ? name.slice(dot) : "";
            let index = 2;
            while (await existing(`${stem} (${index})${extension}`)) index++;
            name = `${stem} (${index})${extension}`;
          }
          const handle = await rootHandle.getFileHandle(name, { create: true });
          const writable = await handle.createWritable();
          await writable.write(output.blob);
          await writable.close();
          done++;
          setStatus(`Saved ${done} of ${files.length} files…`);
        }
        setStatus(`Saved ${files.length} files to the chosen folder.`, "ok");
      } catch (error) {
        if (error.name === "AbortError") setStatus("Folder saving was canceled. The ZIP is still available.", "");
        else if (error.name === "NotAllowedError") setStatus("Folder permission was not granted. The ZIP is still available.", "");
        else setStatus(error.message || "The files could not be saved to that folder.", "error");
      }
    });
    const onKey = (event) => { if (event.key === "Escape") close(); };
    doc.addEventListener("keydown", onKey);
    draw();

    return () => {
      controller?.abort();
      doc.removeEventListener("keydown", onKey);
    };
  };

  BL.mountPanel({
    hostId: `bl-${config.slug}-host`,
    title: config.title,
    windowName: `bl_${config.slug}`,
    render,
  });
};
/* ---- zip ---- */
/* Minimal ZIP32 reader and store-only writer used by the Office converters. */

BL.CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

BL.crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index++) crc = BL.CRC_TABLE[(crc ^ bytes[index]) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

BL.abortError = () => {
  const error = new Error("Canceled");
  error.name = "AbortError";
  return error;
};

BL.u16 = (bytes, offset) => bytes[offset] | (bytes[offset + 1] << 8);
BL.u32 = (bytes, offset) => (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;

BL.unzip = async (file, options = {}) => {
  const maxBytes = options.maxBytes ?? 100 * 1024 * 1024;
  const maxTotal = options.maxTotal ?? 300 * 1024 * 1024;
  const maxEntries = options.maxEntries ?? 20000;
  if (!file || !Number.isFinite(file.size) || file.size < 22) throw new Error("This is not a ZIP-based Office file.");
  if (file.size > maxBytes) throw new Error(`This file is over the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`);
  const tailSize = Math.min(file.size, 65535 + 22);
  const tail = new Uint8Array(await file.slice(file.size - tailSize).arrayBuffer());
  let eocd = -1;
  for (let index = tail.length - 22; index >= 0; index--) {
    if (BL.u32(tail, index) !== 0x06054b50) continue;
    if (index + 22 + BL.u16(tail, index + 20) <= tail.length) { eocd = index; break; }
  }
  if (eocd < 0) throw new Error("This file is not a ZIP archive, or it is password-protected.");
  const disk = BL.u16(tail, eocd + 4);
  const centralDisk = BL.u16(tail, eocd + 6);
  const onDisk = BL.u16(tail, eocd + 8);
  const total = BL.u16(tail, eocd + 10);
  const centralSize = BL.u32(tail, eocd + 12);
  const centralOffset = BL.u32(tail, eocd + 16);
  // 0xffff and 0xffffffff are ZIP64 placeholders, so they are read before the
  // split archive test: a ZIP64 file that only sets the entry counts is still
  // not a split archive.
  if ([disk, centralDisk, onDisk, total].includes(65535) || centralSize === 4294967295 || centralOffset === 4294967295) {
    throw new Error("ZIP64 Office files are not supported. Save a standard .docx or .xlsx.");
  }
  if (disk !== 0 || centralDisk !== 0 || onDisk !== total) throw new Error("Split ZIP archives are not supported.");
  if (!total) throw new Error("This Office file is empty.");
  if (total > maxEntries) throw new Error("This Office file contains too many parts.");
  if (centralOffset + centralSize > file.size) throw new Error("The ZIP directory is outside the file.");
  const central = new Uint8Array(await file.slice(centralOffset, centralOffset + centralSize).arrayBuffer());
  const records = [];
  const seen = new Set();
  let position = 0;
  let declaredTotal = 0;
  const decoder = new TextDecoder("utf-8");
  for (let index = 0; index < total; index++) {
    if (position + 46 > central.length || BL.u32(central, position) !== 0x02014b50) {
      throw new Error("The ZIP directory is malformed.");
    }
    const flags = BL.u16(central, position + 8);
    const method = BL.u16(central, position + 10);
    const crc = BL.u32(central, position + 16);
    const compressedSize = BL.u32(central, position + 20);
    const size = BL.u32(central, position + 24);
    const nameLength = BL.u16(central, position + 28);
    const extraLength = BL.u16(central, position + 30);
    const commentLength = BL.u16(central, position + 32);
    const diskStart = BL.u16(central, position + 34);
    const localOffset = BL.u32(central, position + 42);
    const end = position + 46 + nameLength + extraLength + commentLength;
    if (end > central.length) throw new Error("The ZIP directory is truncated.");
    if (size === 4294967295 || compressedSize === 4294967295 || localOffset === 4294967295) {
      throw new Error("ZIP64 Office files are not supported.");
    }
    if (flags & 1) throw new Error("Encrypted Office files are not supported.");
    if (method !== 0 && method !== 8) throw new Error(`Unsupported ZIP compression method ${method}.`);
    if (diskStart !== 0) throw new Error("Split ZIP archives are not supported.");
    const path = decoder.decode(central.subarray(position + 46, position + 46 + nameLength)).replace(/\\/g, "/");
    if (!path || path.startsWith("/") || path.split("/").some((part) => part === ".." || part === ".")) {
      throw new Error("The Office file contains an unsafe part name.");
    }
    if (seen.has(path)) throw new Error(`The Office file contains a duplicate part: ${path}`);
    seen.add(path);
    declaredTotal += size;
    if (declaredTotal > maxTotal) throw new Error("This Office file expands beyond the 300 MB limit.");
    if (!path.endsWith("/")) records.push({ path, method, crc, size, compressedSize, localOffset });
    position = end;
  }
  const decoderText = new TextDecoder("utf-8");
  const parts = new Map();
  for (const record of records) {
    if (options.signal?.aborted) throw BL.abortError();
    const local = new Uint8Array(await file.slice(record.localOffset, record.localOffset + 30).arrayBuffer());
    if (local.length < 30 || BL.u32(local, 0) !== 0x04034b50) throw new Error(`The local header for ${record.path} is missing.`);
    const start = record.localOffset + 30 + BL.u16(local, 26) + BL.u16(local, 28);
    if (start + record.compressedSize > file.size) throw new Error(`The data for ${record.path} is outside the file.`);
    let bytes;
    if (record.method === 8) {
      if (typeof DecompressionStream !== "function") throw new Error("This browser cannot read compressed Office files.");
      const stream = file.slice(start, start + record.compressedSize).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else {
      bytes = new Uint8Array(await file.slice(start, start + record.compressedSize).arrayBuffer());
    }
    if (bytes.length !== record.size || BL.crc32(bytes) !== record.crc) {
      throw new Error(`The checksum for ${record.path} does not match. The Office file may be damaged.`);
    }
    parts.set(record.path, bytes);
  }
  return {
    parts,
    text: (name) => {
      const bytes = parts.get(name);
      if (!bytes) return "";
      if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
      return decoderText.decode(bytes);
    },
    has: (name) => parts.has(name),
  };
};

const dosTime = (date) => {
  const safe = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return {
    time: (safe.getHours() << 11) | (safe.getMinutes() << 5) | Math.floor(safe.getSeconds() / 2),
    date: ((Math.max(1980, safe.getFullYear()) - 1980) << 9) | ((safe.getMonth() + 1) << 5) | safe.getDate(),
  };
};

BL.makeZip = async (items) => {
  const encoder = new TextEncoder();
  const files = [];
  const used = new Set();
  let total = 0;
  for (const item of items || []) {
    if (!item?.blob) continue;
    const name = String(item.name || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!name || name.split("/").some((part) => !part || part === "." || part === "..")) {
      throw new Error("A file name in this ZIP is not valid.");
    }
    if (used.has(name)) throw new Error(`This ZIP has a duplicate entry: ${name}`);
    used.add(name);
    const bytes = new Uint8Array(await item.blob.arrayBuffer());
    total += bytes.length;
    if (files.length >= 65535) throw new Error("This ZIP has too many entries.");
    if (total > 0xffffffff) throw new Error("This ZIP is larger than ZIP32 allows.");
    files.push({ name, bytes });
  }
  if (!files.length) throw new Error("There is nothing to zip.");
  const stamp = dosTime(new Date());
  const chunks = [];
  const central = [];
  let offset = 0;
  const push = (bytes) => { chunks.push(bytes); offset += bytes.length; };
  for (const file of files) {
    const name = encoder.encode(file.name);
    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, stamp.time, true);
    view.setUint16(12, stamp.date, true);
    view.setUint32(14, BL.crc32(file.bytes), true);
    view.setUint32(18, file.bytes.length, true);
    view.setUint32(22, file.bytes.length, true);
    view.setUint16(26, name.length, true);
    local.set(name, 30);
    const localOffset = offset;
    push(local);
    push(file.bytes);
    const cd = new Uint8Array(46 + name.length);
    const entry = new DataView(cd.buffer);
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, stamp.time, true);
    entry.setUint16(14, stamp.date, true);
    entry.setUint32(16, BL.crc32(file.bytes), true);
    entry.setUint32(20, file.bytes.length, true);
    entry.setUint32(24, file.bytes.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, localOffset, true);
    cd.set(name, 46);
    central.push(cd);
  }
  const centralOffset = offset;
  for (const entry of central) push(entry);
  const centralSize = offset - centralOffset;
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, files.length, true);
  view.setUint16(10, files.length, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  push(end);
  return new Blob(chunks, { type: "application/zip" });
};
/* ---- xml ---- */
/* Small, non-validating XML reader for OOXML. No external entities. */

BL.decodeEntities = (value) => String(value || "").replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (match, body) => {
  if (body === "amp") return "&";
  if (body === "lt") return "<";
  if (body === "gt") return ">";
  if (body === "quot") return '"';
  if (body === "apos") return "'";
  const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
  return Number.isFinite(code) ? String.fromCodePoint(code) : match;
});

BL.parseXml = (source) => {
  const text = String(source || "");
  const root = { name: "#document", attrs: {}, children: [], text: "" };
  const stack = [root];
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf("<", index);
    if (open < 0) {
      stack.at(-1).text += BL.decodeEntities(text.slice(index));
      break;
    }
    if (open > index) stack.at(-1).text += BL.decodeEntities(text.slice(index, open));
    if (text.startsWith("<!--", open)) {
      const end = text.indexOf("-->", open + 4);
      index = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith("<![CDATA[", open)) {
      const end = text.indexOf("]]>", open + 9);
      stack.at(-1).text += text.slice(open + 9, end < 0 ? text.length : end);
      index = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith("<?", open)) {
      const end = text.indexOf("?>", open + 2);
      index = end < 0 ? text.length : end + 2;
      continue;
    }
    if (text.startsWith("<!", open)) {
      const end = text.indexOf(">", open + 2);
      index = end < 0 ? text.length : end + 1;
      continue;
    }
    const close = text.indexOf(">", open + 1);
    if (close < 0) break;
    let inside = text.slice(open + 1, close).trim();
    index = close + 1;
    if (!inside) continue;
    if (inside.startsWith("/")) {
      const name = inside.slice(1).trim().toLowerCase();
      for (let depth = stack.length - 1; depth > 0; depth--) {
        if (stack[depth].name === name) {
          stack.length = depth;
          break;
        }
      }
      continue;
    }
    const selfClosing = inside.endsWith("/");
    if (selfClosing) inside = inside.slice(0, -1).trim();
    const space = inside.search(/\s/);
    const name = (space < 0 ? inside : inside.slice(0, space)).toLowerCase();
    const attrs = {};
    if (space >= 0) {
      const rest = inside.slice(space + 1);
      const pattern = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
      let match;
      while ((match = pattern.exec(rest))) {
        attrs[match[1].toLowerCase()] = BL.decodeEntities(match[3] ?? match[4] ?? "");
      }
    }
    const node = { name, attrs, children: [], text: "" };
    stack.at(-1).children.push(node);
    if (!selfClosing) stack.push(node);
  }
  return root.children[0] || root;
};

BL.resolvePart = (base, target) => {
  const raw = String(target || "").replace(/\\/g, "/");
  const stack = raw.startsWith("/") ? [] : String(base || "").split("/").filter(Boolean);
  for (const part of raw.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
};

BL.docxRels = (xml) => {
  const rels = {};
  if (!xml) return rels;
  const root = BL.parseXml(xml);
  for (const rel of BL.children(root, "relationship")) {
    rels[rel.attrs.id] = { target: rel.attrs.target, mode: rel.attrs.targetmode || "" };
  }
  return rels;
};

BL.child = (node, name) => (node?.children || []).find((child) => child.name === name);
BL.children = (node, name) => (node?.children || []).filter((child) => child.name === name);
BL.attr = (node, name, fallback = "") => node?.attrs?.[name] ?? fallback;
BL.localName = (name) => String(name || "").split(":").at(-1);
BL.textContent = (node) => {
  if (!node) return "";
  let value = node.text || "";
  for (const child of node.children) value += BL.textContent(child);
  return value;
};
BL.findAll = (node, name, out = []) => {
  if (!node) return out;
  if (node.name === name) out.push(node);
  for (const child of node.children || []) BL.findAll(child, name, out);
  return out;
};
BL.findFirst = (node, name) => {
  if (!node) return null;
  if (node.name === name) return node;
  for (const child of node.children || []) {
    const found = BL.findFirst(child, name);
    if (found) return found;
  }
  return null;
};

BL.xmlEscape = (value) => String(value ?? "")
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");
/* ---- images ---- */
/* Image helpers: MIME and size sniffing, data URLs and hex for RTF. */

BL.imageMime = (path) => {
  const extension = String(path || "").toLowerCase().split(".").at(-1);
  return { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", bmp: "image/bmp", webp: "image/webp" }[extension] || "";
};

BL.imageExtension = (mime) => ({
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/webp": "webp",
}[mime] || "bin");

BL.imageSize = (bytes) => {
  if (!bytes || bytes.length < 10) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { width: BL.u32(bytes, 16), height: BL.u32(bytes, 20) };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue; }
      const marker = bytes[offset + 1];
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { height: (bytes[offset + 5] << 8) | bytes[offset + 6], width: (bytes[offset + 7] << 8) | bytes[offset + 8] };
      }
      offset += 2 + (length || 2);
    }
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { width: bytes[6] | (bytes[7] << 8), height: bytes[8] | (bytes[9] << 8) };
  }
  if (bytes[0] === 0x42 && bytes[1] === 0x4d && bytes.length >= 26) {
    return { width: bytes[18] | (bytes[19] << 8) | (bytes[20] << 16) | (bytes[21] << 24), height: bytes[22] | (bytes[23] << 8) | (bytes[24] << 16) | (bytes[25] << 24) };
  }
  return null;
};

BL.bytesToBase64 = (bytes) => {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
};

BL.base64ToBytes = (value) => {
  const binary = atob(String(value || "").replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

BL.dataUrl = (bytes, mime) => `data:${mime || "application/octet-stream"};base64,${BL.bytesToBase64(bytes)}`;

BL.decodeDataUrl = (url) => {
  const match = /^data:([^;,]+)?((?:;[^,]*)*),([\s\S]*)$/i.exec(String(url || ""));
  if (!match) return null;
  const mime = (match[1] || "application/octet-stream").toLowerCase();
  if (!/;base64(;|$)/i.test(match[2])) {
    try { return { mime, bytes: new TextEncoder().encode(decodeURIComponent(match[3])) }; } catch { return null; }
  }
  try { return { mime, bytes: BL.base64ToBytes(match[3]) }; } catch { return null; }
};

BL.hexBytes = (bytes) => {
  let value = "";
  for (let index = 0; index < bytes.length; index++) value += bytes[index].toString(16).padStart(2, "0");
  return value;
};

BL.rasterizeImage = async (data, uiWindow) => {
  if (!data?.bytes || !data.mime) return null;
  if (data.mime === "image/png" || data.mime === "image/jpeg") return data;
  const win = uiWindow || globalThis.window;
  if (!win?.document) return null;
  try {
    const blob = new Blob([data.bytes], { type: data.mime });
    const canvas = win.document.createElement("canvas");
    let width = 0;
    let height = 0;
    const draw = (source) => {
      width = Math.max(1, Math.round(width || source.width || source.naturalWidth || 1));
      height = Math.max(1, Math.round(height || source.height || source.naturalHeight || 1));
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(source, 0, 0, width, height);
    };
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(blob);
        width = bitmap.width;
        height = bitmap.height;
        draw(bitmap);
        bitmap.close?.();
      } catch {}
    }
    if (!width) {
      const url = win.URL.createObjectURL(blob);
      const image = new win.Image();
      try {
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = url;
        });
        draw(image);
      } finally {
        win.URL.revokeObjectURL(url);
      }
    }
    if (!width) return null;
    const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!png) return null;
    return { bytes: new Uint8Array(await png.arrayBuffer()), mime: "image/png", width, height };
  } catch {
    return null;
  }
};

BL.imageBytesFromUrl = async (url, uiWindow) => {
  if (!url) return null;
  const data = BL.decodeDataUrl(url);
  if (data) return BL.rasterizeImage(data, uiWindow);
  if (!/^https?:/i.test(url)) return null;
  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) return null;
    const mime = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
    if (!/^image\//.test(mime)) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 10 * 1024 * 1024) return null;
    return BL.rasterizeImage({ bytes, mime }, uiWindow);
  } catch {
    return null;
  }
};
/* ---- rtf ---- */
/* RTF writer for the Word exporters and a small reader for RTF -> Word. */

BL.rtfEscape = (value) => {
  let output = "";
  for (const character of String(value ?? "")) {
    const code = character.codePointAt(0);
    if (character === "\\") output += "\\\\";
    else if (character === "{") output += "\\{";
    else if (character === "}") output += "\\}";
    else if (character === "\n") output += "\\line ";
    else if (character === "\t") output += "\\tab ";
    else if (code < 128) output += character;
    else {
      const units = character.length > 1 ? [character.charCodeAt(0), character.charCodeAt(1)] : [character.charCodeAt(0)];
      for (const unit of units) output += `\\u${unit > 32767 ? unit - 65536 : unit}?`;
    }
  }
  return output;
};

BL.rtfFromModel = (model) => {
  const fonts = new Set(["Calibri"]);
  for (const block of model.blocks || []) {
    for (const run of block.runs || []) if (run.font) fonts.add(run.font);
    for (const row of block.rows || []) for (const cell of row.cells) for (const run of cell.runs || []) if (run.font) fonts.add(run.font);
  }
  const fontList = [...fonts].slice(0, 16);
  const fontIndex = new Map(fontList.map((font, index) => [font, index]));
  const fontTable = fontList.map((font, index) => `{\\f${index} ${BL.rtfEscape(font).replace(/[{}\\]/g, "")};}`).join("");

  const runText = (run) => {
    if (run.image !== undefined) {
      const image = model.images?.[run.image];
      if (!image?.bytes || !["image/png", "image/jpeg"].includes(image.mime)) return "";
      const control = image.mime === "image/png" ? "\\pngblip" : "\\jpegblip";
      return `{\\pict${control}\\picw${image.width || 320}\\pich${image.height || 200}\\picwgoal${Math.round((image.width || 320) * 15)}\\pichgoal${Math.round((image.height || 200) * 15)} ${BL.hexBytes(image.bytes)}}`;
    }
    if (!run.text) return "";
    const controls = [];
    if (run.bold) controls.push("\\b");
    if (run.italic) controls.push("\\i");
    if (run.underline) controls.push("\\ul");
    if (run.strike) controls.push("\\strike");
    if (run.superscript) controls.push("\\super");
    if (run.subscript) controls.push("\\sub");
    if (run.size) controls.push(`\\fs${Math.round(run.size * 2)}`);
    if (run.font) controls.push(`\\f${fontIndex.get(run.font) ?? 0}`);
    const text = BL.rtfEscape(run.text);
    const prefix = controls.join("");
    const gap = prefix ? " " : "";
    if (run.link && /^https?:|^mailto:/i.test(run.link)) {
      return `{\\field{\\*\\fldinst HYPERLINK "${BL.rtfEscape(run.link).replace(/"/g, "")}"}{\\fldrslt{${prefix}${gap}${text}}}}`;
    }
    return `{${prefix}${gap}${text}}`;
  };

  const listCounters = new Map();
  const listMarker = (block) => {
    if (!block.ordered) return block.marker || "•";
    if (block.marker) return block.marker;
    const level = Math.min(8, block.listLevel || 0);
    const value = (listCounters.get(level) || 0) + 1;
    listCounters.set(level, value);
    return `${value}.`;
  };

  const paragraph = (block, extra = "") => {
    const controls = [];
    if (block.align === "center") controls.push("\\qc");
    else if (block.align === "right") controls.push("\\qr");
    else if (block.align === "justify") controls.push("\\qj");
    if (block.before) controls.push(`\\sb${Math.round(block.before * 20)}`);
    if (block.after) controls.push(`\\sa${Math.round(block.after * 20)}`);
    if (block.indent) controls.push(`\\li${Math.round(block.indent * 20)}`);
    if (block.type === "heading") controls.push(`\\fs${[40, 32, 28, 26, 24, 22][Math.min(5, (block.level || 1) - 1)]}\\b`);
    if (block.type === "list") {
      const level = Math.min(8, block.listLevel || 0);
      controls.push(`\\li${720 + level * 360}\\fi-360`);
      controls.push(`{\\pntext\\f0 ${BL.rtfEscape(listMarker(block))}\\tab}`);
    }
    if (block.quote) controls.push("\\li720\\i");
    if (block.code) controls.push("\\f1\\fs20");
    if (block.pageBreak) controls.push("\\page");
    const prefix = controls.join("");
    const gap = prefix && !prefix.endsWith("}") ? " " : "";
    return `\\pard${extra}${prefix}${gap}${(block.runs || []).map(runText).join("")}\\par\n`;
  };

  const chunks = [];
  for (const block of model.blocks || []) {
    if (block.type !== "list") listCounters.clear();
    if (block.type === "pagebreak") { chunks.push("\\page\n"); continue; }
    if (block.type === "image") {
      chunks.push(paragraph({ type: "paragraph", runs: [{ image: block.image }] }));
      continue;
    }
    if (block.type === "table") {
      const columns = Math.max(1, ...block.rows.map((row) => row.cells.reduce((sum, cell) => sum + (cell.colspan || 1), 0)));
      const cellWidth = Math.floor(9360 / columns);
      for (const row of block.rows) {
        let cells = "\\trowd\\trgaph108\\trleft0";
        let x = 0;
        for (const cell of row.cells) {
          const colspan = Math.max(1, cell.colspan || 1);
          for (let index = 0; index < colspan; index++) {
            x += cellWidth;
            cells += `\\clbrdrt\\brdrs\\brdrw10\\clbrdrl\\brdrs\\brdrw10\\clbrdrb\\brdrs\\brdrw10\\clbrdrr\\brdrs\\brdrw10\\cellx${x}`;
          }
        }
        cells += " ";
        for (const cell of row.cells) {
          const text = BL.cellBlocks(cell).map((block) => (block.runs || []).map((run) => runText({ ...run, bold: run.bold || row.header })).join("")).join("\\line ");
          cells += `\\pard\\intbl ${text}\\cell `;
        }
        cells += "\\row\n";
        chunks.push(cells);
      }
      continue;
    }
    chunks.push(paragraph(block));
  }

  return `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl${fontTable}}${chunks.join("")}}`;
};

/* Reader --------------------------------------------------------------- */

BL.rtfFontTable = (source) => {
  const fonts = new Map();
  const match = /\{\\fonttbl([\s\S]*?)\}/.exec(source);
  if (!match) return fonts;
  for (const item of match[1].matchAll(/\{\\f(\d+)([^{}]*)\}/g)) {
    const name = item[2].replace(/\\[a-z]+\d* ?/gi, "").replace(/[;{}]/g, "").trim();
    if (name) fonts.set(Number(item[1]), name);
  }
  return fonts;
};

BL.parseRtf = async (source, options = {}) => {
  const text = String(source || "");
  if (!/^\s*{\\rtf/i.test(text)) throw new Error("This file is not RTF.");
  const fonts = BL.rtfFontTable(text);
  const images = [];
  // A picture group can contain nested groups (\*\blipuid, \*\picprop), so a
  // non-greedy regex would stop at the first inner brace and leak the rest of
  // the hex into the document text. Match braces instead.
  const stripPictures = (source) => {
    let output = "";
    let index = 0;
    while (index < source.length) {
      if (!source.startsWith("{\\pict", index)) { output += source[index++]; continue; }
      let depth = 0;
      let end = source.length - 1;
      for (let scan = index; scan < source.length; scan++) {
        const character = source[scan];
        if (character === "\\") {
          if (source[scan + 1] === "{" || source[scan + 1] === "}" || source[scan + 1] === "\\") { scan++; continue; }
          const binary = /^\\bin(\d+)\s?/.exec(source.slice(scan, scan + 24));
          if (binary) { scan += binary[0].length + Number(binary[1]) - 1; continue; }
          scan++;
          continue;
        }
        if (character === "{") depth++;
        else if (character === "}" && --depth === 0) { end = scan; break; }
      }
      const body = source.slice(index + 6, end);
      const type = /\\pngblip/i.test(body) ? "image/png" : /\\jpe?gblip/i.test(body) ? "image/jpeg" : "";
      if (type) {
        let cleaned = body;
        for (let guard = 0; guard < 20 && /\{[^{}]*\}/.test(cleaned); guard++) cleaned = cleaned.replace(/\{[^{}]*\}/g, " ");
        const hex = cleaned.replace(/\\[a-zA-Z]+-?\d* ?/g, " ").replace(/[^0-9a-f]/gi, "");
        if (hex.length >= 4 && hex.length % 2 === 0) {
          const bytes = new Uint8Array(hex.length / 2);
          for (let offset = 0; offset < bytes.length; offset++) bytes[offset] = parseInt(hex.slice(offset * 2, offset * 2 + 2), 16);
          const picw = Number(/\\picw(\d+)/.exec(body)?.[1]) || BL.imageSize(bytes)?.width || 320;
          const pich = Number(/\\pich(\d+)/.exec(body)?.[1]) || BL.imageSize(bytes)?.height || 200;
          const image = images.push({ bytes, mime: type, width: picw, height: pich, alt: "" }) - 1;
          output += `\u0001${image}\u0001`;
        }
      }
      index = end + 1;
    }
    return output;
  };
  const withoutPictures = stripPictures(text);

  const blocks = [];
  let paragraph = { type: "paragraph", runs: [], align: "", pageBreak: false };
  let format = { bold: false, italic: false, underline: false, strike: false, size: 11, font: "", link: "", superscript: false, subscript: false };
  let stack = [];
  let skip = false;
  let skipDepth = -1;
  let destination = "";
  let fieldDepth = -1;
  let fieldLink = "";
  let fieldInstruction = "";
  let inFieldResult = false;
  let bullet = false;
  let outline = -1;
  let codepage = 1252;
  let pendingSkip = 0;
  let unicodeSkip = 1;
  let star = false;
  let groupDepth = 0;
  let table = null;
  let cell = null;
  let listLabel = "";
  let inPntext = false;

  const flushParagraph = () => {
    if (!paragraph.runs.length) { paragraph = { ...paragraph, runs: [] }; return; }
    paragraph.runs = BL.mergeRuns(paragraph.runs);
    const marker = listLabel.trim();
    if (table && cell) {
      cell.runs.push(...paragraph.runs);
    } else if (bullet || marker) {
      blocks.push({ ...paragraph, type: "list", ordered: /^\d/.test(marker), listLevel: 0, marker: marker || "•" });
    } else if (outline >= 0) {
      blocks.push({ ...paragraph, type: "heading", level: Math.min(6, outline + 1) });
    } else {
      blocks.push(paragraph);
    }
    paragraph = { type: "paragraph", runs: [], align: paragraphsAlign, pageBreak: false };
    bullet = false;
    listLabel = "";
    outline = -1;
  };
  let paragraphsAlign = "";

  const addText = (value) => {
    if (skip || !value) return;
    if (inPntext) { listLabel += value; return; }
    if (destination === "fldinst") { fieldInstruction += value; return; }
    const run = { ...format, text: value };
    if (inFieldResult && fieldLink) run.link = fieldLink;
    paragraph.runs.push(run);
  };

  const decodeBytes = (bytes) => {
    const label = {
      932: "shift_jis", 936: "gbk", 949: "euc-kr", 950: "big5", 65001: "utf-8", 874: "windows-874",
    }[codepage] || `windows-${codepage}`;
    const view = Uint8Array.from(bytes);
    try { return new TextDecoder(label).decode(view); }
    catch { return new TextDecoder("windows-1252").decode(view); }
  };

  for (let index = 0; index < withoutPictures.length; index++) {
    const character = withoutPictures[index];
    if (pendingSkip > 0 && character !== "\\") { pendingSkip--; continue; }
    if (character === "{") {
      star = false;
      groupDepth++;
      // Table and row state is structural, not formatting: restoring it when a
      // group closes would resurrect a table that a \\row already emitted.
      stack.push({ format: { ...format }, skip, skipDepth, destination, fieldDepth, fieldLink, inFieldResult, bullet, outline });
      continue;
    }
    if (character === "}") {
      if (groupDepth === 0) continue;
      const state = stack.pop();
      if (state) {
        format = state.format;
        skip = state.skip;
        skipDepth = state.skipDepth;
        destination = state.destination;
        fieldDepth = state.fieldDepth;
        fieldLink = state.fieldLink;
        inFieldResult = state.inFieldResult;
        bullet = state.bullet;
        outline = state.outline;
      }
      groupDepth--;
      inPntext = false;
      star = false;
      if (fieldDepth >= 0 && groupDepth < fieldDepth) {
        fieldDepth = -1;
        fieldLink = "";
        fieldInstruction = "";
        inFieldResult = false;
      }
      continue;
    }
    if (character === "\u0001") {
      const end = withoutPictures.indexOf("\u0001", index + 1);
      if (end > index) {
        const image = Number(withoutPictures.slice(index + 1, end));
        if (Number.isInteger(image) && images[image]) paragraph.runs.push({ ...format, image });
        index = end;
      }
      continue;
    }
    if (character !== "\\") {
      if (character !== "\n" && character !== "\r") addText(character);
      continue;
    }
    const next = withoutPictures[index + 1];
    if (next === undefined) break;
    index++;
    if (next === "\\" || next === "{" || next === "}") { addText(next); continue; }
    if (next === "*") { star = true; continue; }
    if (next === "'") {
      // A Big5 or GBK character arrives as several \'hh escapes; decoding each
      // byte alone would turn every CJK document into mojibake.
      const bytes = [];
      for (;;) {
        const quote = withoutPictures[index] === "'" ? index
          : withoutPictures[index] === "\\" && withoutPictures[index + 1] === "'" ? index + 1 : -1;
        if (quote < 0 || !/^[0-9a-f]{2}$/i.test(withoutPictures.slice(quote + 1, quote + 3))) break;
        bytes.push(parseInt(withoutPictures.slice(quote + 1, quote + 3), 16));
        index = quote + 3;
      }
      index--;
      addText(decodeBytes(bytes));
      continue;
    }
    if (next === "~") { addText("\u00a0"); continue; }
    if (next === "-") { continue; }
    if (next === "_") { addText("\u2011"); continue; }
    if (!/[a-zA-Z]/.test(next)) { addText(next); continue; }
    let word = "";
    while (index < withoutPictures.length && /[a-zA-Z]/.test(withoutPictures[index])) { word += withoutPictures[index]; index++; }
    let param = "";
    if (withoutPictures[index] === "-") { param += "-"; index++; }
    while (index < withoutPictures.length && /\d/.test(withoutPictures[index])) { param += withoutPictures[index]; index++; }
    if (withoutPictures[index] !== " ") index--;
    const value = param === "" ? 1 : Number(param) || 0;
    const lower = word.toLowerCase();
    // \binN carries N raw bytes; braces inside it are data, not structure.
    if (lower === "bin") {
      if (withoutPictures[index] === " ") index++;
      index += Math.max(0, value) - 1;
      continue;
    }
    if (star) {
      star = false;
      // An unknown optional destination (data store, theme, user props) is
      // metadata; skipping the whole group keeps it out of the document text.
      if (lower !== "fldinst" && lower !== "fldrslt") { skip = true; continue; }
    }

    if (lower === "fonttbl" || lower === "colortbl" || lower === "stylesheet" || lower === "info" || lower === "header" || lower === "footer" || lower === "footnote" || lower === "annotation" || lower === "object" || lower === "listtable" || lower === "listoverridetable" || lower === "rsidtbl" || lower === "generator" || lower === "datastore" || lower === "themedata" || lower === "colorschememapping" || lower === "latentstyles" || lower === "xmlnstbl" || lower === "pgptbl") {
      skip = true;
      continue;
    }
    if (lower === "field") { fieldDepth = groupDepth; fieldLink = ""; fieldInstruction = ""; destination = ""; inFieldResult = false; continue; }
    if (lower === "fldinst") { destination = "fldinst"; inFieldResult = false; continue; }
    if (lower === "fldrslt") {
      destination = "";
      inFieldResult = true;
      const match = /HYPERLINK\s+(?:"([^"]+)"|(\S+))/i.exec(fieldInstruction);
      fieldLink = match ? match[1] || match[2] : "";
      fieldInstruction = "";
      continue;
    }
    if (lower === "par") { flushParagraph(); continue; }
    if (lower === "line") { addText("\n"); continue; }
    if (lower === "tab") { if (inPntext) listLabel += "\t"; else addText("\t"); continue; }
    if (lower === "b") format.bold = value !== 0;
    else if (lower === "i") format.italic = value !== 0;
    else if (lower === "ul") format.underline = value !== 0;
    else if (lower === "strike") format.strike = value !== 0;
    else if (lower === "super") format.superscript = true;
    else if (lower === "sub") format.subscript = true;
    else if (lower === "fs") format.size = value / 2;
    else if (lower === "f") format.font = fonts.get(value) || "";
    else if (lower === "ulnone") format.underline = false;
    else if (lower === "plain") format = { bold: false, italic: false, underline: false, strike: false, size: 11, font: "", link: "", superscript: false, subscript: false };
    else if (lower === "qc") paragraphsAlign = "center";
    else if (lower === "qr") paragraphsAlign = "right";
    else if (lower === "qj") paragraphsAlign = "justify";
    else if (lower === "ql") paragraphsAlign = "";
    else if (lower === "bullet") { bullet = true; }
    else if (lower === "pntext") { inPntext = true; }
    else if (lower === "outlinelevel") outline = value;
    else if (lower === "ansicpg") codepage = value;
    else if (lower === "uc") unicodeSkip = value;
    else if (lower === "u") {
      let unit = value < 0 ? value + 65536 : value;
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const saved = index;
        let pair = "";
        // The pair arrives as the next \u control word.
        for (let scan = index + 1; scan < withoutPictures.length && pair.length < 12; scan++) pair += withoutPictures[scan];
        const match = /^\s*\\u(-?\d+)\s?\??/.exec(pair);
        if (match) {
          const low = Number(match[1]) + (Number(match[1]) < 0 ? 65536 : 0);
          if (low >= 0xdc00 && low <= 0xdfff) {
            addText(String.fromCharCode(unit, low));
            index += match[0].length;
            continue;
          }
        }
        index = saved;
      }
      addText(String.fromCharCode(unit));
      pendingSkip = unicodeSkip;
    } else if (lower === "pict") {
      skip = true;
    } else if (lower === "trowd") {
      if (!table) table = { type: "table", rows: [] };
      table.rows.push({ cells: [], header: false });
      cell = null;
    } else if (lower === "cell") {
      if (table) {
        const last = table.rows.at(-1);
        last.cells.push({ runs: BL.mergeRuns(paragraph.runs), blocks: [], colspan: 1, header: false });
        paragraph = { ...paragraph, runs: [] };
      }
    } else if (lower === "row") {
      if (table) {
        const previous = blocks.at(-1);
        if (previous?.type === "table") previous.rows.push(...table.rows);
        else blocks.push(table);
        table = null;
        cell = null;
      }
    } else if (lower === "intbl") {
      if (!table) table = { type: "table", rows: [{ cells: [], header: false }] };
      cell = table.rows.at(-1);
    } else if (lower === "pard") {
      paragraphsAlign = "";
    } else if (lower === "page") {
      paragraph.pageBreak = true;
    }
    if (destination === "fldinst") {
      if (lower === "u") fieldInstruction += String.fromCharCode(value < 0 ? value + 65536 : value);
      else if (lower === "fldrslt") destination = "";
    }
  }
  flushParagraph();
  if (table) blocks.push(table);
  return {
    title: "",
    blocks,
    images,
    section: { width: 612, height: 792, top: 72, right: 72, bottom: 72, left: 72 },
    skippedImages: 0,
    source: options.name || "document.rtf",
  };
};
/* ---- odf-package ---- */
/* OpenDocument package helpers: the shared namespace list, length formatting,
   text escaping and manifest, used by the ODT and ODS writers. */

BL.ODF_NS = [
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
  'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"',
  'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"',
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
  'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"',
  'xmlns:xlink="http://www.w3.org/1999/xlink"',
  'xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"',
  'xmlns:dc="http://purl.org/dc/elements/1.1/"',
  'xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"',
].join(" ");

BL.odfCm = (px) => `${Math.round(((Number(px) || 0) / 96) * 2.54 * 1000) / 1000}cm`;
BL.odfPtValue = (pt) => `${Math.round((Number(pt) || 0) * 100) / 100}pt`;

BL.odfTextEscape = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);

BL.odfManifest = (mime, paths) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">` +
  `<manifest:file-entry manifest:full-path="/" manifest:media-type="${mime}"/>` +
  paths.map((entry) => `<manifest:file-entry manifest:full-path="${entry.path}" manifest:media-type="${entry.type}"/>`).join("") +
  `</manifest:manifest>`;
/* ---- odt-out ---- */
/* ODT writer: the shared document model -> an OpenDocument text package.
   Entries are stored rather than deflated, which OpenDocument allows for every
   part; only mimetype has extra rules (first entry, stored, no extra field), and
   BL.makeZip already writes exactly what it is handed, in order. */

BL.ODF_HEADING_PT = [20, 16, 14, 13, 12, 11];

BL.odfTextStyleXml = (name, run) => {
  const props = [];
  if (run.bold) props.push('fo:font-weight="bold"');
  if (run.italic) props.push('fo:font-style="italic"');
  if (run.underline) props.push('style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"');
  if (run.strike) props.push('style:text-line-through-style="solid"');
  if (run.size) props.push(`fo:font-size="${BL.odfPtValue(run.size)}"`);
  if (run.code) props.push(`fo:font-family="'Liberation Mono',Consolas,monospace"`);
  else if (run.font) props.push(`fo:font-family="${BL.odfTextEscape(run.font)}"`);
  if (run.superscript) props.push('style:text-position="super 58%"');
  if (run.subscript) props.push('style:text-position="sub 58%"');
  if (!props.length) return "";
  return `<style:style style:name="${name}" style:family="text"><style:text-properties ${props.join(" ")}/></style:style>`;
};

BL.odfParagraphStyleXml = (name, block) => {
  const props = [];
  const text = [];
  if (block.align) props.push(`fo:text-align="${block.align}"`);
  if (block.indent) props.push(`fo:margin-left="${BL.odfPtValue(block.indent)}"`);
  if (block.before) props.push(`fo:margin-top="${BL.odfPtValue(block.before)}"`);
  if (block.after) props.push(`fo:margin-bottom="${BL.odfPtValue(block.after)}"`);
  if (block.pageBreak) props.push('fo:break-before="page"');
  if (block.type === "heading") {
    props.push('fo:keep-with-next="always"');
    text.push('fo:font-weight="bold"', `fo:font-size="${BL.ODF_HEADING_PT[Math.min(6, block.level || 1) - 1]}pt"`);
  }
  if (block.code) text.push(`fo:font-family="'Liberation Mono',Consolas,monospace"`, 'fo:font-size="10pt"');
  if (block.quote) props.push('fo:margin-left="1cm"');
  return `<style:style style:name="${name}" style:family="paragraph" style:parent-style-name="Standard">${
    props.length ? `<style:paragraph-properties ${props.join(" ")}/>` : ""
  }${text.length ? `<style:text-properties ${text.join(" ")}/>` : ""}</style:style>`;
};

/* Nine levels per list style, the way LibreOffice writes them. */
BL.odfListStyleXml = (name, ordered) => {
  const levels = [];
  for (let level = 1; level <= 9; level++) {
    const properties = `<style:list-level-properties text:space-before="${(0.5 * level).toFixed(2)}cm" text:min-label-width="0.5cm"/>`;
    levels.push(ordered
      ? `<text:list-level-style-number text:level="${level}" style:num-format="1" style:num-suffix=".">${properties}</text:list-level-style-number>`
      : `<text:list-level-style-bullet text:level="${level}" text:bullet-char="${["•", "◦", "▪"][(level - 1) % 3]}">${properties}</text:list-level-style-bullet>`);
  }
  return `<text:list-style style:name="${name}">${levels.join("")}</text:list-style>`;
};

BL.odfCellStyleXml = (name, header) =>
  `<style:style style:name="${name}" style:family="table-cell"><style:table-cell-properties fo:padding="0.1cm" fo:border="0.5pt solid #bfbfbf"${
    header ? ' fo:background-color="#f2f2f2"' : ""
  }/></style:style>`;

BL.writeOdt = async (model) => {
  const section = { width: 612, height: 792, top: 72, right: 72, bottom: 72, left: 72, ...(model.section || {}) };
  const textStyles = new Map();
  const paragraphStyles = new Map();
  const media = [];
  const key = (...parts) => parts.map((part) => (part && part !== 0 ? String(part) : "")).join("|");

  const runKey = (run) => key(run.bold, run.italic, run.underline, run.strike, run.size, run.font, run.code, run.superscript, run.subscript);
  const textStyleFor = (run) => {
    const id = runKey(run);
    if (!id) return "";
    if (!textStyles.has(id)) textStyles.set(id, { name: `T${textStyles.size + 1}`, props: run });
    return textStyles.get(id).name;
  };
  const paragraphStyleFor = (block) => {
    const id = key(block.type, block.level, block.align, block.indent, block.before, block.after, block.pageBreak, block.code, block.quote);
    if (!paragraphStyles.has(id)) paragraphStyles.set(id, { name: `P${paragraphStyles.size + 1}`, props: block });
    return paragraphStyles.get(id).name;
  };

  /* Text keeps its line breaks, tabs and runs of spaces as ODF elements. */
  const textXml = (value) => {
    const parts = [];
    for (const chunk of String(value).split("\n")) {
      if (parts.length) parts.push("<text:line-break/>");
      parts.push(chunk.split(/(\t| {2,})/).map((piece) => {
        if (!piece) return "";
        if (piece === "\t") return "<text:tab/>";
        if (/^ {2,}$/.test(piece)) return `<text:s text:c="${piece.length}"/>`;
        return BL.odfTextEscape(piece);
      }).join(""));
    }
    return parts.join("");
  };

  const imageXml = (width, height, index) => {
    const image = model.images?.[index];
    if (!image?.bytes) return "";
    const path = `Pictures/image${index + 1}.${BL.imageExtension(image.mime)}`;
    if (!media.some((item) => item.name === path)) {
      media.push({ name: path, blob: new Blob([image.bytes], { type: image.mime }), type: image.mime });
    }
    return `<draw:frame draw:name="Image${index + 1}" text:anchor-type="as-char" svg:width="${BL.odfCm(width || image.width || 320)}" svg:height="${BL.odfCm(height || image.height || 200)}">` +
      `<draw:image xlink:href="${path}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`;
  };

  const runXml = (run) => {
    if (run.image !== undefined) return imageXml(run.imageWidth, run.imageHeight, run.image);
    if (!run.text) return "";
    const name = textStyleFor(run);
    const body = name ? `<text:span text:style-name="${name}">${textXml(run.text)}</text:span>` : textXml(run.text);
    if (run.link) return `<text:a xlink:type="simple" xlink:href="${BL.xmlEscape(run.link)}">${body}</text:a>`;
    return body;
  };

  const paragraphXml = (block) => {
    const name = paragraphStyleFor(block);
    const runs = (block.runs || []).map(runXml).join("");
    if (block.type === "heading") {
      return `<text:h text:style-name="${name}" text:outline-level="${Math.min(6, block.level || 1)}">${runs}</text:h>`;
    }
    return `<text:p text:style-name="${name}">${runs}</text:p>`;
  };

  let tableSeq = 0;
  const tableXml = (block) => {
    const columns = Math.max(1, ...block.rows.map((row) => row.cells.reduce((sum, cell) => sum + (cell.colspan || 1), 0)));
    const covered = new Array(columns).fill(0);
    const rowsXml = [];
    for (const row of block.rows || []) {
      let xml = "";
      let column = 0;
      for (const cell of row.cells || []) {
        while (column < columns && covered[column] > 0) {
          xml += "<table:covered-table-cell/>";
          covered[column]--;
          column++;
        }
        if (column >= columns) break;
        const colspan = Math.max(1, cell.colspan || 1);
        const rowspan = Math.max(1, cell.rowspan || 1);
        const style = cell.header ? "TableHeader" : "TableCell";
        const spans = `${colspan > 1 ? ` table:number-columns-spanned="${colspan}"` : ""}${rowspan > 1 ? ` table:number-rows-spanned="${rowspan}"` : ""}`;
        const inner = (cell.blocks?.length ? cell.blocks : [{ type: "paragraph", runs: cell.runs || [] }])
          .map((child) => (child.type === "table" ? paragraphXml({ type: "paragraph", runs: [] }) : paragraphXml({ ...child, type: "paragraph", listLevel: 0 })))
          .join("");
        xml += `<table:table-cell table:style-name="${style}" office:value-type="string"${spans}>${inner}</table:table-cell>`;
        // OpenDocument wants a covered cell for every position a span takes in
        // this row; rows below a row span are covered when they are written.
        for (let offset = 1; offset < colspan && column + offset < columns; offset++) xml += "<table:covered-table-cell/>";
        if (rowspan > 1) {
          for (let offset = 0; offset < colspan && column + offset < columns; offset++) covered[column + offset] = rowspan - 1;
        }
        column += colspan;
      }
      while (column < columns) {
        if (covered[column] > 0) {
          xml += "<table:covered-table-cell/>";
          covered[column]--;
        } else xml += "<table:table-cell/>";
        column++;
      }
      rowsXml.push(`<table:table-row>${xml}</table:table-row>`);
    }
    const headerRows = block.rows.filter((row) => row.header).length;
    const head = headerRows ? `<table:table-header-rows>${rowsXml.splice(0, headerRows).join("")}</table:table-header-rows>` : "";
    return `<table:table table:name="Table${++tableSeq}" table:style-name="Table">` +
      `<table:table-column table:style-name="TableColumn" table:number-columns-repeated="${columns}"/>${head}${rowsXml.join("")}</table:table>`;
  };

  const bodyXml = [];
  const lists = [];

  // Lists are flat in the model, so consecutive items are grouped back into one
  // text:list and deeper levels nest inside the item above them.
  const emitList = (block) => {
    const level = Math.min(8, block.listLevel || 0);
    const ordered = Boolean(block.ordered);
    const id = key(block.listId || "", ordered, level);
    while (lists.length && (lists.at(-1).level > level || (lists.at(-1).level === level && lists.at(-1).id !== id))) {
      const list = lists.pop();
      if (list.openItem) bodyXml.push("</text:list-item>");
      bodyXml.push("</text:list>");
    }
    if (!lists.length || lists.at(-1).level !== level) {
      bodyXml.push(`<text:list text:style-name="${ordered ? "LNumber" : "LBullet"}">`);
      lists.push({ level, id, openItem: false });
    }
    const list = lists.at(-1);
    if (list.openItem) bodyXml.push("</text:list-item>");
    list.openItem = true;
    const start = ordered && block.start && block.start > 1 ? ` text:start-value="${block.start}"` : "";
    bodyXml.push(`<text:list-item${start}>`);
    bodyXml.push(paragraphXml(block));
  };

  const closeLists = () => {
    while (lists.length) {
      const list = lists.pop();
      if (list.openItem) bodyXml.push("</text:list-item>");
      bodyXml.push("</text:list>");
    }
  };

  let imageIndex = 0;
  for (const block of model.blocks || []) {
    if (block.type === "list") {
      emitList(block);
      continue;
    }
    closeLists();
    if (block.type === "pagebreak") bodyXml.push('<text:p text:style-name="PageBreak"/>');
    else if (block.type === "table") bodyXml.push(tableXml(block));
    else if (block.type === "image") bodyXml.push(`<text:p text:style-name="Standard">${imageXml(0, 0, block.image ?? imageIndex++)}</text:p>`);
    else bodyXml.push(paragraphXml(block));
  }
  closeLists();
  if (!bodyXml.length) bodyXml.push('<text:p text:style-name="Standard"/>');

  const automatic = [
    ...[...textStyles.values()].map((item) => BL.odfTextStyleXml(item.name, item.props)),
    ...[...paragraphStyles.values()].map((item) => BL.odfParagraphStyleXml(item.name, item.props)),
    BL.odfListStyleXml("LBullet", false),
    BL.odfListStyleXml("LNumber", true),
    BL.odfCellStyleXml("TableCell", false),
    BL.odfCellStyleXml("TableHeader", true),
    '<style:style style:name="Table" style:family="table"><style:table-properties table:align="margins" fo:margin-top="0.15cm" fo:margin-bottom="0.15cm"/></style:style>',
    '<style:style style:name="TableColumn" style:family="table-column"><style:table-column-properties style:column-width="4cm"/></style:style>',
  ];

  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-content ${BL.ODF_NS} office:version="1.3">` +
    `<office:automatic-styles>${automatic.join("")}</office:automatic-styles>` +
    `<office:body><office:text>${bodyXml.join("")}</office:text></office:body></office:document-content>`;

  const pageLayout = `<style:page-layout style:name="PageLayout"><style:page-layout-properties fo:page-width="${BL.odfCm(section.width / 0.75)}" fo:page-height="${BL.odfCm(section.height / 0.75)}" style:print-orientation="${
    section.width > section.height ? "landscape" : "portrait"
  }" fo:margin-top="${BL.odfCm(section.top / 0.75)}" fo:margin-bottom="${BL.odfCm(section.bottom / 0.75)}" fo:margin-left="${BL.odfCm(section.left / 0.75)}" fo:margin-right="${BL.odfCm(section.right / 0.75)}"/></style:page-layout>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-styles ${BL.ODF_NS} office:version="1.3">` +
    `<office:styles><style:default-style style:family="paragraph"><style:paragraph-properties fo:orphans="2" fo:widows="2" fo:margin-top="0cm" fo:margin-bottom="0.2cm"/>` +
    `<style:text-properties fo:font-size="11pt" style:font-size-asian="11pt" style:font-size-complex="11pt"/></style:default-style>` +
    `<style:style style:name="Standard" style:family="paragraph" style:class="text"/>` +
    `<style:style style:name="PageBreak" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:break-before="page"/></style:style>` +
    `</office:styles><office:automatic-styles>${pageLayout}</office:automatic-styles>` +
    `<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="PageLayout"/></office:master-styles></office:document-styles>`;

  const title = BL.odfTextEscape(model.title || "Converted document");
  const metaXml = `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-meta ${BL.ODF_NS} office:version="1.3"><office:meta>` +
    `<dc:title>${title}</dc:title><meta:generator>Bookmarklet Library</meta:generator></office:meta></office:document-meta>`;

  const mime = "application/vnd.oasis.opendocument.text";
  const manifest = BL.odfManifest(mime, [
    { path: "content.xml", type: "text/xml" },
    { path: "styles.xml", type: "text/xml" },
    { path: "meta.xml", type: "text/xml" },
    ...media.map((item) => ({ path: item.name, type: item.type })),
  ]);

  return BL.makeZip([
    { name: "mimetype", blob: new Blob([mime], { type: "text/plain" }) },
    { name: "META-INF/manifest.xml", blob: new Blob([manifest], { type: "text/xml" }) },
    { name: "content.xml", blob: new Blob([contentXml], { type: "text/xml" }) },
    { name: "styles.xml", blob: new Blob([stylesXml], { type: "text/xml" }) },
    { name: "meta.xml", blob: new Blob([metaXml], { type: "text/xml" }) },
    ...media.map((item) => ({ name: item.name, blob: item.blob })),
  ]);
};
/* ---- word-out ---- */
/* Model transformations shared by the Word export/import tools. */

BL.runText = (runs, model = null) => (runs || []).map((run) => {
  if (run.image !== undefined) return "";
  return run.text || "";
}).join("");

/* A table cell can hold several paragraphs; writers that emit one line per
   cell join them so a label and its amount never run together. */
BL.cellBlocks = (cell) => (cell?.blocks?.length ? cell.blocks : [{ runs: cell?.runs || [] }]);
BL.cellText = (cell, joiner = " ") => BL.cellBlocks(cell)
  .map((block) => BL.runText(block.runs).replace(/\s+/g, " ").trim())
  .filter(Boolean)
  .join(joiner);

/* The text renderer works on the shared model, so the ODF tools use it too. */
BL.modelToText = (model) => {
  const lines = [];
  for (const block of model.blocks || []) {
    if (block.type === "pagebreak") { lines.push(""); continue; }
    if (block.type === "table") {
      for (const row of block.rows) lines.push(row.cells.map((cell) => BL.cellText(cell)).join("\t"));
      lines.push("");
      continue;
    }
    if (block.type === "image") { lines.push("[image]"); continue; }
    const hasImage = block.runs?.some((run) => run.image !== undefined);
    const text = BL.runText(block.runs).replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n");
    if (block.type === "heading") {
      if (text.trim()) lines.push(text.trim(), "");
      else if (hasImage) lines.push("[image]", "");
      continue;
    }
    if (block.type === "list") {
      lines.push(`${block.marker || (block.ordered ? "1." : "•")} ${text.trim() || (hasImage ? "[image]" : "")}`.trim());
      continue;
    }
    if (text.trim()) lines.push(text);
    else if (hasImage) lines.push("[image]");
    else lines.push("");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
};

BL.docxToHtml = (model) => BL.htmlFromModel(model);
BL.docxToRtf = (model) => BL.rtfFromModel(model);
BL.docxToMarkdown = (model) => BL.markdownFromModel(model);

BL.docxToPdf = async (model, options = {}) => BL.pdfFromModel(model, options);

BL.modelNote = (model, options = {}) => {
  const notes = [];
  if (model.skippedImages) notes.push(`${model.skippedImages} unsupported image${model.skippedImages === 1 ? "" : "s"} skipped`);
  if (options.pdf?.replaced) notes.push(`${options.pdf.replaced} character${options.pdf.replaced === 1 ? "" : "s"} replaced (PDF uses Latin-1)`);
  if (options.pdf?.skippedImages) notes.push(`${options.pdf.skippedImages} image${options.pdf.skippedImages === 1 ? "" : "s"} could not be rendered`);
  return notes.length ? ` ${notes.join("; ")}.` : "";
};

BL.textToModel = (bytes, name) => {
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { text = new TextDecoder("windows-1252").decode(bytes); }
  text = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const blocks = text.split("\n").map((line) => ({ type: "paragraph", runs: line ? [{ text: line }] : [], align: "" }));
  return {
    title: BL.baseName(name || ""),
    blocks,
    images: [],
    section: { width: 612, height: 792, top: 72, right: 72, bottom: 72, left: 72 },
    skippedImages: 0,
    source: name,
  };
};

BL.htmlToDocx = async (html, options = {}) => {
  const model = await BL.htmlToModel(html, options);
  const blob = await BL.writeDocx(model);
  return { blob, model, skipped: model.skippedImages };
};

BL.rtfToDocx = async (rtf, options = {}) => {
  const model = await BL.parseRtf(rtf, options);
  const blob = await BL.writeDocx(model);
  return { blob, model, skipped: model.skippedImages };
};

BL.markdownToDocx = async (markdown, options = {}) => {
  const model = await BL.parseMarkdown(markdown, options);
  const blob = await BL.writeDocx(model);
  return { blob, model, skipped: model.skippedImages };
};

BL.txtToDocx = async (bytes, name) => {
  const model = BL.textToModel(bytes, name);
  const blob = await BL.writeDocx(model);
  return { blob, model };
};

BL.imageNoteForModel = (model) => model.skippedImages ? ` ${model.skippedImages} image${model.skippedImages === 1 ? "" : "s"} skipped (relative, blocked or unsupported).` : "";
const startTool = BL.startTool;
startTool({
  slug: "rtf-to-odt",
  title: "RTF to ODT",
  accept: ".rtf",
  dropTitle: "Drop RTF files",
  hint: "or choose .rtf files. PNG and JPEG pictures are kept.",
  empty: "No RTF files yet. Drop them above or choose them.",
  note: "OpenDocument text with paragraphs, formatting, simple tables and pictures. Only PNG and JPEG pictures are kept; other formats are skipped. Files stay on this device.",
  action: "Convert to ODT",
  convert: async (file, options, context) => {
    const model = await BL.parseRtf(await file.text(), { name: file.name });
    const blob = await BL.writeOdt(model);
    return [{
      name: `${BL.baseName(file.name)}.odt`,
      blob,
    }];
  },
});
if (globalThis.__BL_TEST__) globalThis.__BL_TEST__.BL = BL;
})();
