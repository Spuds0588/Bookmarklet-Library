/**
 * @name 📊 ODS to Excel
 * @category files
 * @description Open .ods spreadsheets as .xlsx workbooks, one sheet each.
 * @tags ods, libreoffice, opendocument, excel, xlsx, spreadsheet, convert, office, batch
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
/* ---- odf ---- */
/* OpenDocument text reader: an .odt package -> the shared block/run document model.
   The mapping follows the OpenDocument Engine Suite (MIT, github.com/Spuds0588/
   OpenDocument-Engine-Suite): elements are matched by local name so a different
   prefix binding does not matter, styles resolve through style:parent-style-name,
   and the repeat counters LibreOffice pads files with are clamped before use. */

BL.odfParse = (source) => {
  const text = String(source || "");
  const root = { name: "#document", attrs: {}, children: [] };
  const stack = [root];
  const addText = (value, decode = true) => {
    if (!value) return;
    // Whitespace between elements is package indentation, not document text:
    // a real newline inside a paragraph always comes from text:line-break.
    if (decode && !value.trim() && value.includes("\n")) return;
    stack.at(-1).children.push({ name: "#text", text: decode ? BL.decodeEntities(value) : value });
  };
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf("<", index);
    if (open < 0) {
      addText(text.slice(index));
      break;
    }
    if (open > index) addText(text.slice(index, open));
    if (text.startsWith("<!--", open)) {
      const end = text.indexOf("-->", open + 4);
      index = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith("<![CDATA[", open)) {
      const end = text.indexOf("]]>", open + 9);
      addText(text.slice(open + 9, end < 0 ? text.length : end), false);
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
      const pattern = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
      let match;
      while ((match = pattern.exec(inside.slice(space + 1)))) {
        attrs[match[1].toLowerCase()] = BL.decodeEntities(match[3] ?? match[4] ?? "");
      }
    }
    const node = { name, attrs, children: [] };
    stack.at(-1).children.push(node);
    if (!selfClosing) stack.push(node);
  }
  return root.children.find((child) => child.name !== "#text") || root;
};

BL.odfChildren = (node, local) =>
  (node?.children || []).filter((child) => child.name !== "#text" && BL.localName(child.name) === local);

BL.odfChild = (node, local) => BL.odfChildren(node, local)[0] || null;

BL.odfDescend = (node, local) => {
  if (!node) return null;
  for (const child of node.children || []) {
    if (child.name === "#text") continue;
    if (BL.localName(child.name) === local) return child;
    const found = BL.odfDescend(child, local);
    if (found) return found;
  }
  return null;
};

/* Attributes are asked for by their usual prefixed name and found by suffix when
   a document binds the namespace to another prefix. */
BL.odfAttr = (node, local, fallback = "") => {
  const attrs = node?.attrs;
  if (!attrs) return fallback;
  const exact = attrs[local];
  if (exact !== undefined) return exact;
  for (const key in attrs) if (key.endsWith(`:${local}`)) return attrs[key];
  return fallback;
};

/* Text of a node in document order, expanding the ODF whitespace elements. */
BL.odfText = (node) => {
  let value = "";
  const visit = (current) => {
    for (const child of current.children || []) {
      if (child.name === "#text") {
        value += child.text;
        continue;
      }
      const tag = BL.localName(child.name);
      if (tag === "s") {
        const count = Math.min(Math.max(Number(BL.odfAttr(child, "text:c", "1")) || 1, 1), 200);
        value += " ".repeat(count);
      } else if (tag === "tab") value += "\t";
      else if (tag === "line-break") value += "\n";
      else visit(child);
    }
  };
  visit(node);
  return value;
};

/* ODF lengths (10mm, 2.5cm, 1in, 12pt, 6pc, 96px) as px or pt. */
BL.odfLength = (value, unit = "px") => {
  const match = /^\s*(-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*([a-z]*)\s*$/i.exec(String(value ?? ""));
  if (!match) return 0;
  const factor = { in: 1, cm: 1 / 2.54, mm: 1 / 25.4, pt: 1 / 72, pc: 1 / 6, px: 1 / 96 }[(match[2] || "px").toLowerCase()];
  if (!factor) return 0;
  return Math.round(Number(match[1]) * factor * (unit === "pt" ? 72 : 96) * 100) / 100;
};

BL.odfPx = (value) => BL.odfLength(value, "px");
BL.odfPt = (value) => BL.odfLength(value, "pt");

/* Style names encode spaces as _20_: "Heading_20_1" is "Heading 1". */
BL.odfStyleName = (name) =>
  String(name || "").replace(/_([0-9a-f]{2})_/gi, (match, hex) => {
    const code = Number.parseInt(hex, 16);
    return code > 31 ? String.fromCharCode(code) : match;
  });

BL.odfProps = (element) => {
  const props = {};
  const visit = (node) => {
    if (node.name !== "#text") {
      const tag = BL.localName(node.name);
      const value = (name) => BL.odfAttr(node, name, "");
      if (tag === "text-properties") {
        const weight = value("fo:font-weight");
        if (weight) props.bold = /^(bold|[6-9]\d\d)$/i.test(weight);
        const style = value("fo:font-style");
        if (style) props.italic = /^(italic|oblique)$/i.test(style);
        const underline = value("style:text-underline-style") || value("style:text-underline-type");
        if (underline) props.underline = underline !== "none";
        const strike = value("style:text-line-through-style") || value("style:text-line-through-type");
        if (strike) props.strike = strike !== "none";
        const size = BL.odfPt(value("fo:font-size"));
        if (size) props.size = Math.round(size * 10) / 10;
        const font = value("fo:font-family") || value("style:font-name");
        if (font) props.font = font.replace(/^['"]|['"]$/g, "");
        const position = value("style:text-position");
        if (position) {
          if (/super/.test(position) || Number.parseFloat(position) > 0) props.superscript = true;
          else if (/sub/.test(position) || Number.parseFloat(position) < 0) props.subscript = true;
        }
      } else if (tag === "paragraph-properties") {
        const align = value("fo:text-align");
        if (align) props.align = { center: "center", right: "right", end: "right", justify: "justify" }[align] || "";
        const indent = BL.odfPt(value("fo:margin-left"));
        if (indent) props.indent = indent;
        const before = BL.odfPt(value("fo:margin-top"));
        if (before) props.before = before;
        const after = BL.odfPt(value("fo:margin-bottom"));
        if (after) props.after = after;
        const pageBreak = value("fo:page-break-before") || value("fo:break-before");
        props.pageBreak = pageBreak === "always" || pageBreak === "page";
      }
      for (const child of node.children || []) visit(child);
    }
  };
  for (const child of element?.children || []) visit(child);
  return props;
};

BL.odfPageLayout = (element) => {
  const props = BL.odfDescend(element, "page-layout-properties");
  const all = BL.odfAttr(props, "fo:margin", "");
  const side = (name, fallback) => BL.odfPt(BL.odfAttr(props, name)) || BL.odfPt(all) || fallback;
  return {
    width: BL.odfPt(BL.odfAttr(props, "fo:page-width")) || 595.3,
    height: BL.odfPt(BL.odfAttr(props, "fo:page-height")) || 841.9,
    top: side("fo:margin-top", 56.7),
    bottom: side("fo:margin-bottom", 56.7),
    left: side("fo:margin-left", 56.7),
    right: side("fo:margin-right", 56.7),
  };
};

/* Named styles, defaults, list styles, page layouts and master pages, resolved
   through the parent-style chain. */
BL.odfStyleBook = (docs) => {
  const named = new Map();
  const defaults = new Map();
  const lists = new Map();
  const layouts = new Map();
  const masters = new Map();
  const cache = new Map();

  const index = (element) => {
    const tag = BL.localName(element.name);
    const name = BL.odfAttr(element, "style:name");
    if (tag === "style" && name) {
      named.set(name, {
        family: BL.odfAttr(element, "style:family"),
        parent: BL.odfAttr(element, "style:parent-style-name"),
        props: BL.odfProps(element),
      });
    } else if (tag === "default-style") {
      const family = BL.odfAttr(element, "style:family");
      if (family) defaults.set(family, BL.odfProps(element));
    } else if (tag === "list-style" && name) {
      const levels = new Map();
      for (const child of element.children || []) {
        if (child.name === "#text") continue;
        const kind = BL.localName(child.name);
        if (kind !== "list-level-style-number" && kind !== "list-level-style-bullet") continue;
        const ordered = kind === "list-level-style-number";
        levels.set(Number(BL.odfAttr(child, "text:level", "1")) || 1, {
          ordered,
          format: BL.odfAttr(child, "style:num-format", "1") || "1",
          prefix: BL.odfAttr(child, "style:num-prefix", ""),
          suffix: BL.odfAttr(child, "style:num-suffix", "") || (ordered ? "." : ""),
          bullet: BL.odfAttr(child, "text:bullet-char", "•") || "•",
          start: Number(BL.odfAttr(child, "text:start-value", "1")) || 1,
        });
      }
      lists.set(name, levels);
    } else if (tag === "page-layout" && name) {
      layouts.set(name, BL.odfPageLayout(element));
    } else if (tag === "master-page" && name) {
      masters.set(name, BL.odfAttr(element, "style:page-layout-name"));
    }
  };

  const walk = (element) => {
    index(element);
    for (const child of element.children || []) if (child.name !== "#text") walk(child);
  };

  for (const doc of docs) {
    if (!doc) continue;
    for (const container of doc.children || []) {
      if (container.name === "#text") continue;
      if (!["styles", "automatic-styles", "master-styles"].includes(BL.localName(container.name))) continue;
      for (const child of container.children || []) if (child.name !== "#text") walk(child);
    }
  }

  const resolve = (name) => {
    if (!name) return {};
    if (cache.has(name)) return cache.get(name);
    const chain = [];
    const seen = new Set();
    let current = name;
    while (current && named.has(current) && !seen.has(current) && chain.length < 32) {
      seen.add(current);
      const style = named.get(current);
      chain.unshift(style.props);
      current = style.parent;
    }
    const family = named.get(name)?.family || "";
    const props = { ...(defaults.get(family) || {}) };
    for (const item of chain) Object.assign(props, item);
    cache.set(name, props);
    return props;
  };

  const bullet = { ordered: false, format: "1", prefix: "", suffix: "", bullet: "•", start: 1 };
  const listLevel = (name, level) => {
    const levels = lists.get(name);
    if (!levels) return bullet;
    return levels.get(Math.min(Math.max(level, 1), 10)) || levels.get(1) || bullet;
  };

  const section = () => {
    const master = masters.get("Standard") || [...masters.values()][0];
    return layouts.get(master) || [...layouts.values()][0] || {
      width: 595.3,
      height: 841.9,
      top: 56.7,
      bottom: 56.7,
      left: 56.7,
      right: 56.7,
    };
  };

  return { resolve, listLevel, section };
};

/* Pictures stored in the package, matched by href the way the suite matches them. */
BL.odfMedia = (zip) => {
  const files = new Map();
  for (const path of zip.parts.keys()) {
    if (!/^Pictures\//i.test(path)) continue;
    const mime = BL.imageMime(path);
    if (mime) files.set(path, mime);
  }
  const find = (href) => {
    let target = String(href || "").replace(/\\/g, "/").replace(/^\.\//, "");
    if (!target) return null;
    try {
      target = decodeURIComponent(target);
    } catch {
      /* keep the raw href */
    }
    const base = target.split("/").pop();
    const path = files.has(target) ? target : [...files.keys()].find((item) => item.split("/").pop() === base);
    if (!path) return null;
    return { mime: files.get(path), bytes: zip.parts.get(path) };
  };
  return { find };
};

BL.odfNumber = (format, value) => {
  if (format === "a") return String.fromCharCode(97 + (((value - 1) % 26) + 26) % 26);
  if (format === "A") return String.fromCharCode(65 + (((value - 1) % 26) + 26) % 26);
  if (format === "i" || format === "I") {
    const map = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
    let number = Math.max(1, value);
    let text = "";
    for (const [amount, glyph] of map) {
      while (number >= amount) {
        text += glyph;
        number -= amount;
      }
    }
    return format === "I" ? text.toUpperCase() : text;
  }
  return String(value);
};

/* Indentation newlines inside a paragraph collapse to one space; ODF only breaks
   a line where a text:line-break element says so. */
BL.odfSpacing = (value) => String(value || "").replace(/[ \t]*\r?\n[ \t]*/g, " ");

BL.odfTrimRuns = (runs) => {
  const out = runs.slice();
  while (out.length && out[0].image === undefined) {
    out[0].text = String(out[0].text || "").replace(/^[ \t]+/, "");
    if (out[0].text) break;
    out.shift();
  }
  while (out.length && out.at(-1).image === undefined) {
    out.at(-1).text = String(out.at(-1).text || "").replace(/[ \t]+$/, "");
    if (out.at(-1).text) break;
    out.pop();
  }
  return out;
};

BL.odfImage = (frame, ctx) => {
  const element = BL.localName(frame.name) === "image" ? frame : BL.odfDescend(frame, "image");
  if (!element) return null;
  const media = ctx.media.find(BL.odfAttr(element, "xlink:href"));
  if (!media) {
    ctx.skipped++;
    return null;
  }
  const intrinsic = BL.imageSize(media.bytes);
  const title = BL.odfDescend(frame, "title") || BL.odfDescend(frame, "desc");
  ctx.images.push({
    bytes: media.bytes,
    mime: media.mime,
    width: BL.odfPx(BL.odfAttr(frame, "svg:width")) || intrinsic?.width || 320,
    height: BL.odfPx(BL.odfAttr(frame, "svg:height")) || intrinsic?.height || 200,
    alt: (title ? BL.odfText(title).trim() : "") || BL.odfAttr(frame, "draw:name"),
  });
  return ctx.images.length - 1;
};

/* Only the character properties belong on a run; paragraph properties such as
   alignment and margins stay on the block. */
BL.odfRunFormat = (props) => {
  const format = {};
  for (const name of ["bold", "italic", "underline", "strike", "size", "font", "superscript", "subscript", "code"]) {
    if (props[name] !== undefined) format[name] = props[name];
  }
  return format;
};

BL.odfRuns = (element, ctx, base) => {
  const runs = [];
  const visit = (node, format) => {
    for (const child of node.children || []) {
      if (child.name === "#text") {
        const value = BL.odfSpacing(child.text);
        if (value) runs.push({ ...format, text: value });
        continue;
      }
      const tag = BL.localName(child.name);
      if (tag === "s") {
        const count = Math.min(Math.max(Number(BL.odfAttr(child, "text:c", "1")) || 1, 1), 200);
        runs.push({ ...format, text: " ".repeat(count) });
      } else if (tag === "tab") runs.push({ ...format, text: "\t" });
      else if (tag === "line-break") runs.push({ ...format, text: "\n" });
      else if (tag === "span" || tag === "a") {
        const styleName = BL.odfAttr(child, "text:style-name");
        const next = { ...format, ...BL.odfRunFormat(ctx.book.resolve(styleName)) };
        if (/^(preformatted|code|source)/i.test(BL.odfStyleName(styleName))) next.code = true;
        if (tag === "a") next.link = BL.odfAttr(child, "xlink:href");
        visit(child, next);
      } else if (tag === "frame" || tag === "image") {
        const index = BL.odfImage(child, ctx);
        if (index !== null) runs.push({ ...format, image: index });
      } else if (tag === "note" || tag === "annotation" || tag === "index-mark" || tag === "soft-page-break") {
        continue;
      } else visit(child, format);
    }
  };
  visit(element, base);
  return BL.odfTrimRuns(BL.mergeRuns(runs));
};

BL.odfParagraph = (element, ctx, heading) => {
  const styleName = BL.odfAttr(element, "text:style-name");
  const props = ctx.book.resolve(styleName);
  const name = BL.odfStyleName(styleName);
  const block = {
    type: "paragraph",
    runs: BL.odfRuns(element, ctx, BL.odfRunFormat(props)),
    align: props.align || "",
    before: props.before || 0,
    after: props.after || 0,
    indent: props.indent || 0,
    pageBreak: Boolean(props.pageBreak),
    link: "",
  };
  if (heading) {
    const outline = Number(BL.odfAttr(element, "text:outline-level", "0")) || 0;
    const match = /(?:heading|h)[ _-]?([1-9])/i.exec(name);
    block.type = "heading";
    block.level = Math.min(6, outline || (match ? Number(match[1]) : 0) || 1);
  }
  if (/^(preformatted|code|source)/i.test(name)) block.code = true;
  if (/quot/i.test(name)) block.quote = true;
  return block;
};

/* A list item's first paragraph carries the marker; further paragraphs and
   nested lists follow it as ordinary blocks, which is how the flat model holds
   lists everywhere else in the library. */
BL.odfList = (element, ctx, level, inheritedId = "") => {
  const definition = ctx.book.listLevel(BL.odfAttr(element, "text:style-name"), level + 1);
  // Nested lists continue the parent list's numbering, so they share its id.
  const listId = inheritedId || `odf-list-${++ctx.listSeq}`;
  const blocks = [];
  let counter = definition.start || 1;
  let first = true;

  for (const item of element.children || []) {
    if (item.name === "#text") continue;
    const tag = BL.localName(item.name);
    if (tag === "list") {
      blocks.push(...BL.odfList(item, ctx, level + 1, listId));
      continue;
    }
    if (tag !== "list-item" && tag !== "list-header") continue;
    const start = Number(BL.odfAttr(item, "text:start-value", "0")) || 0;
    if (start) counter = start;
    const marker = definition.ordered
      ? `${definition.prefix}${BL.odfNumber(definition.format, counter)}${definition.suffix}`
      : definition.bullet;
    let lead = null;
    for (const child of item.children || []) {
      if (child.name === "#text") continue;
      const kind = BL.localName(child.name);
      if (kind === "p" || kind === "h") {
        const block = BL.odfParagraph(child, ctx, kind === "h" ? 1 : 0);
        if (lead) {
          blocks.push(block);
          continue;
        }
        lead = {
          type: "list",
          ordered: Boolean(definition.ordered),
          marker,
          listLevel: level,
          listId,
          runs: block.runs,
          align: block.align || "",
        };
        if (first && definition.ordered && counter !== (definition.start || 1)) lead.start = counter;
        blocks.push(lead);
      } else if (kind === "list") {
        blocks.push(...BL.odfList(child, ctx, level + 1, listId));
      }
    }
    if (definition.ordered) counter++;
    first = false;
  }
  return blocks;
};

BL.odfCellBlocks = (element, ctx) => {
  const blocks = [];
  for (const block of BL.odfBlocks(element, ctx)) {
    // The model has no nested tables; their text joins the cell as paragraphs.
    if (block.type === "table") {
      for (const row of block.rows) blocks.push({ type: "paragraph", runs: row.cells.flatMap((cell) => cell.runs || []), align: "" });
      continue;
    }
    blocks.push(block);
  }
  return blocks;
};

BL.odfTable = (element, ctx) => {
  const rows = [];
  const isEmpty = (cell) => cell.colspan === 1 && !cell.runs.length && !cell.blocks.length;

  const pushRow = (rowElement, header) => {
    if (rows.length >= 5000) return;
    const repeat = Math.min(Math.max(Number(BL.odfAttr(rowElement, "table:number-rows-repeated", "1")) || 1, 1), 200);
    const cells = [];
    for (const child of rowElement.children || []) {
      if (child.name === "#text" || cells.length >= 256) continue;
      const tag = BL.localName(child.name);
      // Covered cells are the shadow of a span; the writers rebuild the grid
      // from table:number-columns-spanned, so they are skipped.
      if (tag === "covered-table-cell" || tag !== "table-cell") continue;
      const repeatColumns = Math.min(Math.max(Number(BL.odfAttr(child, "table:number-columns-repeated", "1")) || 1, 1), 100);
      const blocks = BL.odfCellBlocks(child, ctx);
      const cell = {
        runs: blocks.flatMap((block) => block.runs || []),
        blocks,
        colspan: Math.min(Math.max(Number(BL.odfAttr(child, "table:number-columns-spanned", "1")) || 1, 1), 64),
        rowspan: Math.min(Math.max(Number(BL.odfAttr(child, "table:number-rows-spanned", "1")) || 1, 1), 64),
        header,
      };
      for (let index = 0; index < repeatColumns && cells.length < 256; index++) cells.push(cell);
    }
    while (cells.length && isEmpty(cells.at(-1))) cells.pop();
    for (let index = 0; index < repeat && rows.length < 5000; index++) {
      rows.push({ cells: index ? cells.map((cell) => ({ ...cell })) : cells, header });
    }
  };

  const readRows = (node, header) => {
    for (const child of node.children || []) {
      if (child.name === "#text") continue;
      const tag = BL.localName(child.name);
      if (tag === "table-header-rows") readRows(child, true);
      else if (tag === "table-row-group" || tag === "table-rows") readRows(child, header);
      else if (tag === "table-row") pushRow(child, header);
    }
  };
  readRows(element, false);

  const width = rows.reduce((max, row) => Math.max(max, row.cells.length), 0);
  if (!width) return null;
  return { type: "table", rows, grid: [] };
};

BL.odfBlocks = (parent, ctx) => {
  const blocks = [];
  // Generated content such as a table of contents would duplicate the headings.
  const generated = new Set(["table-of-content", "alphabetical-index", "illustration-index", "index-title", "sequence-decls", "forms"]);
  for (const element of parent.children || []) {
    if (element.name === "#text") continue;
    const tag = BL.localName(element.name);
    if (tag === "h") blocks.push(BL.odfParagraph(element, ctx, 1));
    else if (tag === "p") blocks.push(BL.odfParagraph(element, ctx, 0));
    else if (tag === "list") blocks.push(...BL.odfList(element, ctx, 0));
    else if (tag === "table") {
      const table = BL.odfTable(element, ctx);
      if (table) blocks.push(table);
    } else if (tag === "section" || tag === "index-body") {
      blocks.push(...BL.odfBlocks(element, ctx));
    } else if (tag === "frame") {
      const image = BL.odfImage(element, ctx);
      if (image !== null) blocks.push({ type: "paragraph", runs: [{ image }], align: "" });
    } else if (tag === "soft-page-break") {
      blocks.push({ type: "pagebreak" });
    } else if (generated.has(tag)) {
      continue;
    } else if (BL.odfChildren(element, "p").length || BL.odfChildren(element, "table").length) {
      blocks.push(...BL.odfBlocks(element, ctx));
    }
  }
  return blocks;
};

BL.parseOdt = async (file, options = {}) => {
  const zip = await BL.unzip(file, options);
  const content = zip.text("content.xml");
  if (!content) throw new Error("This is not an OpenDocument file. Use an .odt document saved by LibreOffice, Writer or another ODF app.");
  const root = BL.odfParse(content);
  const body = BL.odfDescend(root, "body");
  const text = body ? BL.odfChild(body, "text") : null;
  if (!text) throw new Error("This OpenDocument file is not a text document. Use .odt for documents and .ods for spreadsheets.");
  const styles = zip.has("styles.xml") ? BL.odfParse(zip.text("styles.xml")) : null;
  const ctx = {
    book: BL.odfStyleBook([styles, root]),
    media: BL.odfMedia(zip),
    images: [],
    skipped: 0,
    listSeq: 0,
  };
  const blocks = BL.odfBlocks(text, ctx);
  const meta = zip.has("meta.xml") ? BL.odfParse(zip.text("meta.xml")) : null;
  const title = meta ? BL.odfDescend(meta, "title") : null;
  return {
    title: title ? BL.odfText(title).trim() : "",
    blocks,
    images: ctx.images,
    section: ctx.book.section(),
    skippedImages: ctx.skipped,
    source: file.name,
  };
};
/* ---- ods ---- */
/* OpenDocument spreadsheet reader: an .ods package -> the sheet model the CSV and
   Excel writers already take. Repeat counters are clamped before allocation, the
   way the OpenDocument Engine Suite clamps them, so a padded sheet never asks for
   a million rows. */

BL.odsLimits = { rows: 100000, columns: 1024, cellRepeat: 1024, cells: 300000 };

BL.odfCellText = (cell) => {
  const paragraphs = BL.odfChildren(cell, "p");
  if (!paragraphs.length) return BL.odfText(cell).trim();
  return paragraphs.map((item) => BL.odfText(item)).join("\n").trim();
};

/* ODF dates keep their ISO value; times keep the text the cell shows. */
BL.odsDate = (value) => {
  const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}(?::\d{2})?))?/.exec(String(value || ""));
  if (!match) return "";
  if (!match[2]) return match[1];
  return `${match[1]} ${match[2].length === 5 ? `${match[2]}:00` : match[2]}`;
};

BL.odsValue = (cell) => {
  const type = BL.odfAttr(cell, "office:value-type");
  if (type === "float" || type === "percentage" || type === "currency") {
    const value = Number(BL.odfAttr(cell, "office:value"));
    return Number.isFinite(value) ? value : BL.odfCellText(cell);
  }
  if (type === "boolean") {
    const raw = BL.odfAttr(cell, "office:boolean-value");
    return raw === "true" || raw === "1" ? "TRUE" : "FALSE";
  }
  if (type === "date") return BL.odsDate(BL.odfAttr(cell, "office:date-value")) || BL.odfCellText(cell);
  if (type === "time") return BL.odfCellText(cell) || BL.odfAttr(cell, "office:time-value");
  if (type === "string") return BL.odfAttr(cell, "office:string-value") || BL.odfCellText(cell);
  return BL.odfCellText(cell);
};

BL.odsCells = (rowElement, budget) => {
  const cells = [];
  let pending = 0;
  // LibreOffice pads every row with one blank cell repeated across the full
  // remaining width. Keeping a blank run pending means trailing padding costs
  // nothing and only an interior run is materialized to keep columns aligned.
  const add = (value, repeat) => {
    if (value === "" || value === null || value === undefined) {
      pending = Math.min(pending + repeat, BL.odsLimits.columns);
      return;
    }
    if (pending + repeat > BL.odsLimits.columns - cells.length) throw new Error(`This spreadsheet is wider than the converter handles (${BL.odsLimits.columns} columns).`);
    const fill = pending;
    const take = repeat;
    budget.count += fill + take;
    if (budget.count > BL.odsLimits.cells) throw new Error("This spreadsheet has too many cells for the converter. Try a smaller sheet.");
    for (let index = 0; index < fill; index++) cells.push("");
    for (let index = 0; index < take; index++) cells.push(value);
    pending = 0;
  };
  for (const child of rowElement.children || []) {
    if (child.name === "#text" || cells.length >= BL.odsLimits.columns) continue;
    const tag = BL.localName(child.name);
    if (tag !== "table-cell" && tag !== "covered-table-cell") continue;
    const repeat = Math.min(Math.max(Number(BL.odfAttr(child, "table:number-columns-repeated", "1")) || 1, 1), BL.odsLimits.cellRepeat);
    // Covered cells keep merged ranges aligned with the visual grid.
    add(tag === "covered-table-cell" ? "" : BL.odsValue(child), repeat);
  }
  return cells;
};

BL.odsRows = (table) => {
  const rows = [];
  const budget = { count: 0 };
  let blanks = 0;

  const pushRow = (rowElement) => {
    const repeat = Math.max(Number(BL.odfAttr(rowElement, "table:number-rows-repeated", "1")) || 1, 1);
    const cells = BL.odsCells(rowElement, budget);
    if (!cells.length) {
      // Blank runs are deferred: trailing ones are dropped, interior ones are
      // restored when a row with content arrives.
      blanks += repeat;
      return;
    }
    if (blanks + repeat > BL.odsLimits.rows - rows.length) {
      throw new Error(`This spreadsheet has more rows than the converter handles (${BL.odsLimits.rows} per sheet).`);
    }
    while (blanks > 0) {
      rows.push([]);
      blanks--;
    }
    for (let index = 0; index < repeat; index++) rows.push(cells.slice());
  };

  const readRows = (node) => {
    for (const child of node.children || []) {
      if (child.name === "#text") continue;
      const tag = BL.localName(child.name);
      if (tag === "table-row") pushRow(child);
      else if (tag === "table-header-rows" || tag === "table-row-group" || tag === "table-rows") readRows(child);
    }
  };
  readRows(table);

  while (rows.length && rows[rows.length - 1].every((value) => value === "")) rows.pop();
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  return rows.map((row) => {
    const normalized = row.slice();
    while (normalized.length < width) normalized.push("");
    return normalized;
  });
};

BL.parseOds = async (file, options = {}) => {
  const zip = await BL.unzip(file, options);
  const content = zip.text("content.xml");
  if (!content) throw new Error("This is not an OpenDocument file. Use an .ods spreadsheet saved by LibreOffice, Calc or another ODF app.");
  const root = BL.odfParse(content);
  const body = BL.odfDescend(root, "body");
  const spreadsheet = body ? BL.odfChild(body, "spreadsheet") : null;
  if (!spreadsheet) throw new Error("This OpenDocument file is not a spreadsheet. Use .ods for spreadsheets and .odt for documents.");
  const sheets = [];
  const used = new Set();
  for (const table of BL.odfChildren(spreadsheet, "table")) {
    let name = BL.odfAttr(table, "table:name", "Sheet") || "Sheet";
    let candidate = name;
    let suffix = 2;
    while (used.has(candidate)) candidate = `${name} (${suffix++})`;
    used.add(candidate);
    sheets.push({ name: candidate, rows: BL.odsRows(table) });
  }
  if (!sheets.length) throw new Error("This spreadsheet has no readable sheets.");
  return sheets;
};

BL.odsToCsv = async (file, options = {}, context = {}) => {
  const sheets = await BL.parseOds(file, { signal: context.signal });
  const selected = options.sheets === "first" ? sheets.slice(0, 1) : sheets;
  const delimiter = options.format === "tsv" ? "\t" : ",";
  const extension = delimiter === "\t" ? "tsv" : "csv";
  const base = BL.baseName(file.name);
  const used = new Set();
  const outputs = [];
  for (const sheet of selected) {
    if (context.signal?.aborted) throw BL.abortError();
    const name = BL.uniqueName(BL.safeName(selected.length === 1 ? `${base}.${extension}` : `${base}-${sheet.name}.${extension}`), used);
    outputs.push({ name, blob: new Blob([BL.toCsv(sheet.rows, delimiter)], { type: delimiter === "\t" ? "text/tab-separated-values" : "text/csv" }) });
  }
  return { outputs, sheetCount: sheets.length, exported: selected.length };
};

BL.odsToXlsx = async (file, options = {}, context = {}) => {
  const sheets = await BL.parseOds(file, { signal: context.signal });
  const selected = options.sheets === "first" ? sheets.slice(0, 1) : sheets;
  if (context.signal?.aborted) throw BL.abortError();
  const blob = await BL.writeXlsx(selected);
  return { output: { name: `${BL.baseName(file.name)}.xlsx`, blob }, sheetCount: sheets.length, exported: selected.length };
};
/* ---- spreadsheet ---- */
/* XLSX reader/writer and CSV helpers. */

BL.columnIndex = (reference) => {
  const letters = /^([A-Z]+)/i.exec(reference || "")?.[1]?.toUpperCase() || "A";
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
};

BL.dateFormat = (id) => {
  const builtin = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
  return builtin.has(Number(id));
};

BL.isDateFormat = (code) => {
  if (!code) return false;
  const cleaned = String(code)
    .replace(/"[^"]*"/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\\./g, "");
  return /[ymdhs]/i.test(cleaned) && !/^[#0.,%]+$/.test(cleaned);
};

BL.excelDate = (serial, date1904, format, timeOnly) => {
  if (!Number.isFinite(serial)) return String(serial);
  const adjusted = serial < 60 && !date1904 ? serial + 1 : serial;
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const date = new Date(epoch + Math.round(adjusted * 86400000));
  if (Number.isNaN(date.getTime())) return String(serial);
  const pad = (value) => String(value).padStart(2, "0");
  if (timeOnly) return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  const hasTime = serial % 1 !== 0 || /[hs]/i.test(String(format || "").replace(/"[^"]*"/g, ""));
  return hasTime ? `${day} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}` : day;
};

BL.parseXlsx = async (file, options = {}) => {
  const zip = await BL.unzip(file, options);
  const workbook = BL.parseXml(zip.text("xl/workbook.xml"));
  if (!workbook || !/workbook$/.test(workbook.name)) throw new Error("This file does not contain a workbook. Use a .xlsx file, not a legacy .xls.");
  const workbookPr = BL.child(workbook, "workbookpr");
  const date1904 = workbookPr ? BL.attr(workbookPr, "date1904") === "1" || BL.attr(workbookPr, "date1904") === "true" : false;
  const rels = BL.docxRels(zip.text("xl/_rels/workbook.xml.rels"));
  const shared = [];
  const sharedRoot = zip.has("xl/sharedStrings.xml") ? BL.parseXml(zip.text("xl/sharedStrings.xml")) : null;
  if (sharedRoot) {
    for (const item of BL.children(sharedRoot, "si")) {
      shared.push(BL.textContent(item));
    }
  }
  const formats = new Map();
  const stylesRoot = zip.has("xl/styles.xml") ? BL.parseXml(zip.text("xl/styles.xml")) : null;
  const cellFormats = [];
  if (stylesRoot) {
    for (const item of BL.children(BL.child(stylesRoot, "numfmts"), "numfmt")) {
      formats.set(Number(BL.attr(item, "numfmtid")), BL.attr(item, "formatcode"));
    }
    for (const xf of BL.children(BL.child(stylesRoot, "cellxfs"), "xf")) {
      const id = Number(BL.attr(xf, "numfmtid", 0));
      cellFormats.push({ numFmtId: id, format: formats.get(id) || "" });
    }
  }
  const sheets = [];
  for (const sheet of BL.children(BL.child(workbook, "sheets"), "sheet")) {
    const rel = rels[BL.attr(sheet, "r:id")];
    if (!rel) continue;
    const path = BL.resolvePart("xl", rel.target);
    if (!zip.has(path)) continue;
    const root = BL.parseXml(zip.text(path));
    const data = BL.child(root, "sheetdata");
    const rows = [];
    let maxColumn = 0;
    let cellCount = 0;
    for (const rowNode of BL.children(data, "row")) {
      const rowIndex = Number(BL.attr(rowNode, "r", rows.length + 1)) - 1;
      const row = [];
      for (const cell of BL.children(rowNode, "c")) {
        if (++cellCount > 500000) throw new Error("This workbook has too many cells for the converter. Try a smaller sheet.");
        const column = BL.columnIndex(BL.attr(cell, "r"));
        const type = BL.attr(cell, "t");
        const styleId = Number(BL.attr(cell, "s", 0));
        const style = cellFormats[styleId] || { numFmtId: 0, format: "" };
        let value = "";
        if (type === "inlineStr") {
          value = BL.textContent(BL.child(cell, "is"));
        } else if (type === "s") {
          value = shared[Number(BL.textContent(BL.child(cell, "v")))] ?? "";
        } else {
          const raw = BL.textContent(BL.child(cell, "v"));
          if (type === "b") value = raw === "1" ? "TRUE" : "FALSE";
          else if (type === "e") value = raw;
          else if (raw !== "") {
            const number = Number(raw);
            if (BL.dateFormat(style.numFmtId) || BL.isDateFormat(style.format)) {
              const timeOnly = !/[ymd]/i.test(String(style.format || "").replace(/"[^"]*"/g, "")) && /[hs]/i.test(String(style.format || ""));
              value = BL.excelDate(number, date1904, style.format, timeOnly);
            } else {
              value = Number.isFinite(number) ? String(number) : raw;
            }
          }
        }
        row[column] = value;
        maxColumn = Math.max(maxColumn, column);
      }
      rows[rowIndex] = row;
    }
    const matrix = [];
    for (const row of rows) {
      // Build densely: slicing a sparse row leaves holes that Array#map skips,
      // which shifts every later cell one column to the left.
      const normalized = Array.from({ length: maxColumn + 1 }, (_, column) => row?.[column] ?? "");
      matrix.push(normalized);
    }
    while (matrix.length && matrix.at(-1).every((value) => value === "")) matrix.pop();
    let width = maxColumn + 1;
    while (width > 0 && matrix.every((row) => row[width - 1] === "")) width--;
    for (const row of matrix) row.length = width;
    sheets.push({ name: BL.attr(sheet, "name", "Sheet"), rows: matrix });
  }
  if (!sheets.length) throw new Error("This workbook has no readable sheets.");
  return sheets;
};

BL.csvQuote = (value, delimiter = ",") => {
  const text = String(value ?? "");
  return new RegExp(`["\\n\\r${delimiter === "\t" ? "\\t" : delimiter}]`).test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
};

BL.toCsv = (rows, delimiter = ",") => rows.map((row) => row.map((cell) => BL.csvQuote(cell, delimiter)).join(delimiter)).join("\r\n") + "\r\n";

BL.decodeCsvText = (bytes) => {
  if (!bytes) return "";
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder("utf-8").decode(bytes.subarray(3));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
};

BL.detectDelimiter = (text) => {
  const first = String(text || "").split(/\r?\n/).find((line) => line.trim()) || "";
  let best = ",";
  let bestCount = 0;
  for (const delimiter of [",", "\t", ";"]) {
    let count = 0;
    let quoted = false;
    for (const character of first) {
      if (character === '"') quoted = !quoted;
      else if (character === delimiter && !quoted) count++;
    }
    if (count > bestCount) { best = delimiter; bestCount = count; }
  }
  return bestCount ? best : ",";
};

BL.parseCsv = (text, delimiter) => {
  const source = String(text || "");
  const actual = delimiter === "auto" ? BL.detectDelimiter(source) : delimiter;
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') { field += '"'; index += 2; continue; }
      if (character === '"') { quoted = false; index++; continue; }
      field += character;
      index++;
      continue;
    }
    if (character === '"' && field === "") { quoted = true; index++; continue; }
    if (character === actual) { row.push(field); field = ""; index++; continue; }
    if (character === "\r" || character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (character === "\r" && source[index + 1] === "\n") index++;
      index++;
      continue;
    }
    field += character;
    index++;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  while (rows.length && rows.at(-1).every((cell) => cell === "")) rows.pop();
  return { rows, delimiter: actual };
};

BL.xlsxSafeSheet = (value, used) => {
  let name = String(value || "Sheet").replace(/[\\/:*?\[\]]/g, "-").replace(/^'+|'+$/g, "").trim().slice(0, 31) || "Sheet";
  let candidate = name;
  let index = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${index++})`;
    candidate = `${name.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

BL.writeXlsx = async (sheets, options = {}) => {
  const encoder = new TextEncoder();
  const used = new Set();
  const normalized = (sheets || []).map((sheet) => ({
    name: BL.xlsxSafeSheet(sheet.name, used),
    rows: (sheet.rows || []).map((row) => row.map((cell) => cell ?? "")),
  }));
  if (!normalized.length) throw new Error("There is no data to write.");
  const columnName = (index) => {
    let value = "";
    let number = index + 1;
    while (number > 0) {
      const remainder = (number - 1) % 26;
      value = String.fromCharCode(65 + remainder) + value;
      number = Math.floor((number - 1) / 26);
    }
    return value;
  };
  const sheetXml = (sheet) => {
    const width = Math.max(1, ...sheet.rows.map((row) => row.length));
    const widths = Array.from({ length: width }, (_, column) => {
      const length = Math.max(8, ...sheet.rows.slice(0, 200).map((row) => String(row[column] ?? "").length));
      return Math.min(60, length + 2);
    });
    const columns = `<cols>${widths.map((value, index) => `<col min="${index + 1}" max="${index + 1}" width="${value}" customWidth="1"/>`).join("")}</cols>`;
    const rows = sheet.rows.map((row, rowIndex) => {
      const cells = row.map((cell, column) => {
        const reference = `${columnName(column)}${rowIndex + 1}`;
        if (typeof cell === "number" && Number.isFinite(cell)) return `<c r="${reference}"><v>${cell}</v></c>`;
        const value = String(cell ?? "").slice(0, 32767);
        if (!value) return `<c r="${reference}"/>`;
        return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${BL.xmlEscape(value)}</t></is></c>`;
      }).join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${columnName(width - 1)}${Math.max(1, sheet.rows.length)}"/>${columns}<sheetData>${rows}</sheetData></worksheet>`;
  };
  const workbookSheets = normalized.map((sheet, index) => `<sheet name="${BL.xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  const rels = normalized.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${normalized.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
  const items = [
    { name: "[Content_Types].xml", text: contentTypes },
    { name: "_rels/.rels", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}<Relationship Id="rId${normalized.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf/></cellXfs></styleSheet>` },
  ];
  normalized.forEach((sheet, index) => {
    items.push({ name: `xl/worksheets/sheet${index + 1}.xml`, text: sheetXml(sheet) });
  });
  return BL.makeZip(items.map((item) => ({ name: item.name, blob: new Blob([item.text], { type: "application/xml" }) })));
};
const startTool = BL.startTool;
startTool({
  slug: "ods-to-excel",
  title: "ODS to Excel",
  accept: ".ods",
  dropTitle: "Drop ODS files",
  hint: "or choose .ods spreadsheets. Numbers stay numbers, dates become ISO text.",
  empty: "No spreadsheets yet. Drop them above or choose them.",
  note: "One workbook per file, with the sheets it has. Formulas keep their last saved value; formatting, images and charts are not exported. Files stay on this device.",
  action: "Convert to Excel",
  options: [
    { id: "sheets", label: "Sheets", value: "all", values: [{ value: "all", label: "All sheets" }, { value: "first", label: "First sheet only" }] },
  ],
  convert: async (file, options, context) => {
    const result = await BL.odsToXlsx(file, options, context);
    return {
      files: [result.output],
      note: result.exported < result.sheetCount ? ` Exported ${result.exported} of ${result.sheetCount} sheets.` : "",
    };
  },
});
if (globalThis.__BL_TEST__) globalThis.__BL_TEST__.BL = BL;
})();
