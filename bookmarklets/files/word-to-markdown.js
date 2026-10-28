/**
 * @name 📄 Word to Markdown
 * @category files
 * @description Convert .docx files to Markdown with headings, lists, tables and images.
 * @tags word, docx, markdown, md, convert, office, batch
 * @added 2026-10-26
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
/* ---- docx-read ---- */
/* DOCX reader: OOXML package -> a small block/run document model. */

BL.docxOn = (node) => {
  if (!node) return false;
  const value = BL.attr(node, "w:val", "").toLowerCase();
  return value !== "0" && value !== "false" && value !== "off" && value !== "none";
};

BL.docxStyles = (xml) => {
  const styles = new Map();
  const defaults = { run: {}, paragraph: {} };
  if (!xml) return { styles, defaults, resolve: () => ({}) };
  const root = BL.parseXml(xml);
  const docDefaults = BL.child(root, "docdefaults");
  const defaultRun = BL.findFirst(docDefaults, "w:rpr");
  const defaultParagraph = BL.findFirst(docDefaults, "w:ppr");
  const readRun = (rPr) => {
    if (!rPr) return {};
    const result = {};
    if (BL.child(rPr, "w:b") && BL.docxOn(BL.child(rPr, "w:b"))) result.bold = true;
    if (BL.child(rPr, "w:i") && BL.docxOn(BL.child(rPr, "w:i"))) result.italic = true;
    if (BL.child(rPr, "w:u") && BL.docxOn(BL.child(rPr, "w:u"))) result.underline = true;
    if ((BL.child(rPr, "w:strike") && BL.docxOn(BL.child(rPr, "w:strike"))) || (BL.child(rPr, "w:dstrike") && BL.docxOn(BL.child(rPr, "w:dstrike")))) result.strike = true;
    const size = BL.child(rPr, "w:sz");
    if (size) result.size = Number(BL.attr(size, "w:val", 22)) / 2;
    const fonts = BL.child(rPr, "w:rfonts");
    if (fonts) result.font = BL.attr(fonts, "w:ascii") || BL.attr(fonts, "w:hansi") || BL.attr(fonts, "w:eastasia") || "";
    const vertical = BL.child(rPr, "w:vertalign");
    if (vertical) {
      const value = BL.attr(vertical, "w:val");
      if (value === "superscript") result.superscript = true;
      if (value === "subscript") result.subscript = true;
    }
    return result;
  };
  const readParagraph = (pPr) => {
    if (!pPr) return {};
    const result = {};
    const style = BL.child(pPr, "w:pstyle");
    if (style) result.style = BL.attr(style, "w:val");
    const outline = BL.child(pPr, "w:outlinelvl");
    if (outline) result.outline = Number(BL.attr(outline, "w:val", 0));
    const numPr = BL.child(pPr, "w:numpr");
    if (numPr) {
      const numId = BL.child(numPr, "w:numid");
      const level = BL.child(numPr, "w:ilvl");
      result.numPr = {
        id: numId ? BL.attr(numId, "w:val") : "",
        level: level ? Number(BL.attr(level, "w:val", 0)) : 0,
      };
    }
    return result;
  };
  if (defaultRun) defaults.run = readRun(defaultRun);
  if (defaultParagraph) defaults.paragraph = readParagraph(defaultParagraph);
  for (const style of BL.children(root, "w:style")) {
    const id = BL.attr(style, "w:styleid");
    if (!id) continue;
    const nameNode = BL.child(style, "w:name");
    const based = BL.child(style, "w:basedon");
    styles.set(id, {
      id,
      name: nameNode ? BL.attr(nameNode, "w:val") : id,
      basedOn: based ? BL.attr(based, "w:val") : "",
      run: readRun(BL.child(style, "w:rpr")),
      paragraph: readParagraph(BL.child(style, "w:ppr")),
    });
  }
  const resolve = (id, seen = new Set()) => {
    if (!id || seen.has(id)) return { run: {}, paragraph: {}, name: "" };
    seen.add(id);
    const style = styles.get(id);
    if (!style) return { run: {}, paragraph: {}, name: "" };
    const parent = style.basedOn ? resolve(style.basedOn, seen) : { run: {}, paragraph: {}, name: "" };
    return {
      name: style.name || parent.name,
      run: { ...parent.run, ...style.run },
      paragraph: { ...parent.paragraph, ...style.paragraph },
    };
  };
  return { styles, defaults, resolve };
};

BL.docxNumbering = (xml) => {
  const abstracts = new Map();
  const nums = new Map();
  if (!xml) return { nums, abstracts };
  const root = BL.parseXml(xml);
  for (const abstract of BL.children(root, "w:abstractnum")) {
    const id = BL.attr(abstract, "w:abstractnumid");
    const levels = new Map();
    for (const level of BL.children(abstract, "w:lvl")) {
      const ilvl = Number(BL.attr(level, "w:ilvl", 0));
      const format = BL.child(level, "w:numfmt");
      const text = BL.child(level, "w:lvltext");
      const start = BL.child(level, "w:start");
      levels.set(ilvl, {
        format: format ? BL.attr(format, "w:val", "decimal") : "decimal",
        text: text ? BL.attr(text, "w:val", "") : "",
        start: start ? Number(BL.attr(start, "w:val", 1)) : 1,
      });
    }
    abstracts.set(id, levels);
  }
  for (const num of BL.children(root, "w:num")) {
    const id = BL.attr(num, "w:numid");
    const abstract = BL.child(num, "w:abstractnumid");
    if (id && abstract) nums.set(id, BL.attr(abstract, "w:val"));
  }
  return { nums, abstracts };
};

BL.roman = (value) => {
  const map = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  let number = Math.max(1, value);
  let text = "";
  for (const [amount, glyph] of map) while (number >= amount) { text += glyph; number -= amount; }
  return text;
};

BL.listLabel = (format, value) => {
  if (format === "bullet" || format === "none") return "•";
  if (format === "lowerletter") return String.fromCharCode(96 + ((value - 1) % 26) + 1) + ".";
  if (format === "upperletter") return String.fromCharCode(64 + ((value - 1) % 26) + 1) + ".";
  if (format === "lowerroman") return BL.roman(value) + ".";
  if (format === "upperroman") return BL.roman(value).toUpperCase() + ".";
  return `${value}.`;
};

BL.parseDocx = async (file, options = {}) => {
  const zip = await BL.unzip(file, options);
  const documentXml = zip.text("word/document.xml");
  if (!documentXml) throw new Error("This file does not contain a Word document. Use a .docx file, not a legacy .doc.");
  const rels = BL.docxRels(zip.text("word/_rels/document.xml.rels"));
  const styleBook = BL.docxStyles(zip.text("word/styles.xml"));
  const numbering = BL.docxNumbering(zip.text("word/numbering.xml"));
  const root = BL.parseXml(documentXml);
  const body = BL.child(root, "w:body") || root;
  const images = [];
  const imageCache = new Map();
  let skippedImages = 0;
  let headings = 0;
  let pages = 0;
  const listCounters = new Map();
  const section = { width: 612, height: 792, top: 72, right: 72, bottom: 72, left: 72 };

  const readSect = (sectPr) => {
    if (!sectPr) return;
    const size = BL.child(sectPr, "w:pgsz");
    const margin = BL.child(sectPr, "w:pgmar");
    if (size) {
      section.width = Number(BL.attr(size, "w:w", 12240)) / 20;
      section.height = Number(BL.attr(size, "w:h", 15840)) / 20;
    }
    if (margin) {
      section.top = Number(BL.attr(margin, "w:top", 1440)) / 20;
      section.right = Number(BL.attr(margin, "w:right", 1440)) / 20;
      section.bottom = Number(BL.attr(margin, "w:bottom", 1440)) / 20;
      section.left = Number(BL.attr(margin, "w:left", 1440)) / 20;
    }
  };

  const addImage = (target, relation, alt, width, height) => {
    if (!relation || relation.mode === "External") return -1;
    if (imageCache.has(target)) return imageCache.get(target);
    const path = BL.resolvePart("word", relation.target);
    const bytes = zip.parts.get(path);
    if (!bytes) return -1;
    const mime = BL.imageMime(path);
    if (!["image/png", "image/jpeg", "image/gif", "image/bmp", "image/webp"].includes(mime)) {
      skippedImages++;
      return -1;
    }
    const intrinsic = BL.imageSize(bytes);
    const index = images.length;
    images.push({
      bytes,
      mime,
      width: width || intrinsic?.width || 320,
      height: height || intrinsic?.height || 200,
      alt: alt || "",
    });
    imageCache.set(target, index);
    return index;
  };

  const imageFromDrawing = (node) => {
    const blip = BL.findFirst(node, "a:blip");
    const imagedata = BL.findFirst(node, "v:imagedata");
    const id = blip ? BL.attr(blip, "r:embed") : imagedata ? BL.attr(imagedata, "r:id") : "";
    if (!id) return -1;
    const extent = BL.findFirst(node, "wp:extent");
    const docPr = BL.findFirst(node, "wp:docpr");
    const alt = docPr ? BL.attr(docPr, "descr") || BL.attr(docPr, "title") || BL.attr(docPr, "name") : "";
    const width = extent ? Number(BL.attr(extent, "cx", 0)) / 9525 : 0;
    const height = extent ? Number(BL.attr(extent, "cy", 0)) / 9525 : 0;
    return addImage(id, rels[id], alt, width, height);
  };

  const readRunProps = (rPr, style) => {
    const format = { ...styleBook.defaults.run, ...(style?.run || {}) };
    if (!rPr) return format;
    if (BL.child(rPr, "w:b")) format.bold = BL.docxOn(BL.child(rPr, "w:b"));
    if (BL.child(rPr, "w:i")) format.italic = BL.docxOn(BL.child(rPr, "w:i"));
    if (BL.child(rPr, "w:u")) format.underline = BL.docxOn(BL.child(rPr, "w:u"));
    if (BL.child(rPr, "w:strike") || BL.child(rPr, "w:dstrike")) {
      format.strike = BL.docxOn(BL.child(rPr, "w:strike")) || BL.docxOn(BL.child(rPr, "w:dstrike"));
    }
    const size = BL.child(rPr, "w:sz");
    if (size) format.size = Number(BL.attr(size, "w:val", 22)) / 2;
    const fonts = BL.child(rPr, "w:rfonts");
    if (fonts) format.font = BL.attr(fonts, "w:ascii") || BL.attr(fonts, "w:hansi") || BL.attr(fonts, "w:eastasia") || format.font;
    const vertical = BL.child(rPr, "w:vertalign");
    if (vertical) {
      const value = BL.attr(vertical, "w:val");
      if (value === "superscript") format.superscript = true;
      if (value === "subscript") format.subscript = true;
    }
    const runStyle = BL.child(rPr, "w:rstyle");
    if (runStyle) {
      const named = styleBook.resolve(BL.attr(runStyle, "w:val"));
      Object.assign(format, named.run);
      if (/code|preformatted/i.test(named.name || "")) format.code = true;
    }
    return format;
  };

  const readRuns = (node, format, paragraph, link = "") => {
    for (const child of node.children || []) {
      const name = child.name;
      if (name === "w:r") {
        const runStyleNode = BL.child(child, "w:rpr");
        const runStyleId = runStyleNode ? BL.attr(BL.child(runStyleNode, "w:rstyle"), "w:val") : "";
        const runStyle = runStyleId ? styleBook.resolve(runStyleId) : null;
        const next = { ...format, ...readRunProps(runStyleNode, runStyle) };
        if (link) next.link = link;
        if (/code|preformatted/i.test(runStyle?.name || "")) next.code = true;
        for (const piece of child.children || []) {
          if (piece.name === "w:t") {
            const value = BL.textContent(piece);
            if (value) paragraph.runs.push({ ...next, text: value });
          } else if (piece.name === "w:tab") {
            paragraph.runs.push({ ...next, text: "\t" });
          } else if (piece.name === "w:br" || piece.name === "w:cr") {
            if (BL.attr(piece, "w:type") === "page") paragraph.pageBreak = true;
            else paragraph.runs.push({ ...next, text: "\n" });
          } else if (piece.name === "w:noBreakHyphen") {
            paragraph.runs.push({ ...next, text: "-" });
          } else if (piece.name === "w:drawing" || piece.name === "w:pict") {
            const index = imageFromDrawing(piece);
            if (index >= 0) paragraph.runs.push({ ...next, image: index });
          } else if (piece.name === "w:instrtext") {
            const instruction = BL.textContent(piece);
            const match = /HYPERLINK\s+"([^"]+)"/i.exec(instruction);
            if (match) paragraph.link = match[1];
          }
        }
      } else if (name === "w:hyperlink") {
        const id = BL.attr(child, "r:id");
        const target = rels[id]?.target || BL.attr(child, "w:anchor");
        readRuns(child, format, paragraph, target);
        if (target) paragraph.link = target;
      } else if (name === "w:ins" || name === "w:smarttag" || name === "w:sdt" || name === "w:sdtcontent" || name === "w:fldsimple") {
        if (name === "w:fldsimple") {
          const instruction = BL.attr(child, "w:instr");
          const match = /HYPERLINK\s+"([^"]+)"/i.exec(instruction);
          readRuns(child, format, paragraph, match ? match[1] : link);
        } else {
          readRuns(child, format, paragraph, link);
        }
      }
    }
  };

  const readParagraph = (p, inheritedFormat = {}) => {
    const pPr = BL.child(p, "w:ppr");
    const styleId = pPr ? BL.attr(BL.child(pPr, "w:pstyle"), "w:val") : "";
    const style = styleId ? styleBook.resolve(styleId) : { run: {}, paragraph: {}, name: "" };
    const directOutline = BL.child(pPr, "w:outlinelvl");
    const outline = directOutline ? Number(BL.attr(directOutline, "w:val", 0)) : style.paragraph.outline;
    const name = style.name || "";
    const headingMatch = /^heading\s*([1-6])$/i.exec(name);
    const heading = headingMatch ? Number(headingMatch[1]) : /^title$/i.test(name) ? 1 : /^subtitle$/i.test(name) ? 2 : outline !== undefined ? Math.min(6, Math.max(1, Number(outline) + 1)) : 0;
    if (heading) headings++;
    const alignmentNode = BL.child(pPr, "w:jc");
    const alignment = alignmentNode ? BL.attr(alignmentNode, "w:val") : "";
    const spacing = BL.child(pPr, "w:spacing");
    const indent = BL.child(pPr, "w:ind");
    const directNumPr = BL.child(pPr, "w:numpr");
    const numPr = directNumPr || style.paragraph.numPr || null;
    const paragraph = {
      type: heading ? "heading" : "paragraph",
      level: heading,
      runs: [],
      align: alignment,
      before: spacing ? Number(BL.attr(spacing, "w:before", 0)) / 20 : 0,
      after: spacing ? Number(BL.attr(spacing, "w:after", 0)) / 20 : 0,
      indent: indent ? Number(BL.attr(indent, "w:left", 0)) / 20 : 0,
      pageBreak: BL.docxOn(BL.child(pPr, "w:pagebreakbefore")),
      link: "",
    };
    const baseFormat = { ...styleBook.defaults.run, ...(style.run || {}), ...inheritedFormat, ...readRunProps(BL.child(pPr, "w:rpr"), style) };
    readRuns(p, baseFormat, paragraph);
    if (paragraph.pageBreak) pages++;
    if (numPr) {
      const numId = directNumPr
        ? BL.attr(BL.child(directNumPr, "w:numid"), "w:val")
        : style.paragraph.numPr.id;
      const level = directNumPr
        ? Number(BL.attr(BL.child(directNumPr, "w:ilvl"), "w:val", 0))
        : style.paragraph.numPr.level || 0;
      const abstractId = numbering.nums.get(numId);
      const levels = numbering.abstracts.get(abstractId);
      const definition = levels?.get(level) || { format: "bullet", text: "", start: 1 };
      if (!listCounters.has(numId)) listCounters.set(numId, new Array(9).fill(0));
      const counters = listCounters.get(numId);
      counters[level] = counters[level] ? counters[level] + 1 : definition.start || 1;
      for (let depth = level + 1; depth < counters.length; depth++) counters[depth] = 0;
      let label = BL.listLabel(definition.format, counters[level]);
      if (definition.text && definition.format !== "bullet" && definition.format !== "none") {
        label = definition.text.replace(/%([1-9])/g, (match, index) => {
          const depth = Number(index) - 1;
          const value = counters[depth] || 1;
          return BL.listLabel(definition.format, value).replace(/\.$/, "");
        });
      }
      paragraph.type = "list";
      paragraph.ordered = definition.format !== "bullet" && definition.format !== "none";
      paragraph.listLevel = level;
      paragraph.marker = label;
      paragraph.numId = numId;
    }
    return paragraph;
  };

  const readTable = (table) => {
    const rows = [];
    const grid = BL.children(BL.child(table, "w:tblgrid"), "w:gridcol").map((col) => Number(BL.attr(col, "w:w", 0)) / 20);
    for (const rowNode of BL.children(table, "w:tr")) {
      const header = BL.docxOn(BL.child(BL.child(rowNode, "w:trpr"), "w:tblheader"));
      const cells = [];
      for (const cellNode of BL.children(rowNode, "w:tc")) {
        const cellProps = BL.child(cellNode, "w:tcpr");
        const spanNode = BL.child(cellProps, "w:gridspan");
        const vMerge = BL.child(cellProps, "w:vmerge");
        const colspan = spanNode ? Number(BL.attr(spanNode, "w:val", 1)) : 1;
        if (vMerge && BL.attr(vMerge, "w:val") !== "restart" && rows.length) {
          const above = rows.at(-1).cells[cells.length];
          if (above) above.rowspan = (above.rowspan || 1) + 1;
          continue;
        }
        const blocks = [];
        for (const child of cellNode.children || []) {
          if (child.name === "w:p") {
            const paragraph = readParagraph(child);
            if (paragraph.runs.length) blocks.push(paragraph);
          } else if (child.name === "w:tbl") {
            const nested = readTable(child);
            for (const nestedRow of nested.rows) blocks.push({ type: "paragraph", runs: nestedRow.cells.flatMap((cell) => cell.runs || []) });
          }
        }
        const runs = blocks.flatMap((block) => block.runs || []);
        cells.push({ runs, blocks, colspan, rowspan: vMerge && BL.attr(vMerge, "w:val") === "restart" ? 1 : 1 });
      }
      rows.push({ cells, header });
    }
    return { type: "table", rows, grid };
  };

  const blocks = [];
  const visit = (node) => {
    for (const child of node.children || []) {
      if (child.name === "w:p") {
        const paragraph = readParagraph(child);
        if (paragraph.runs.length || paragraph.type === "heading" || paragraph.type === "list") blocks.push(paragraph);
        if (paragraph.pageBreak) blocks.push({ type: "pagebreak" });
      } else if (child.name === "w:tbl") {
        blocks.push(readTable(child));
      } else if (child.name === "w:sectpr") {
        readSect(child);
      } else if (child.name === "w:sdt" || child.name === "w:sdtcontent" || child.name === "w:customxml" || child.name === "w:ins") {
        visit(child);
      }
    }
  };
  visit(body);
  const lastSect = BL.findAll(body, "w:sectpr").at(-1);
  readSect(lastSect);

  let title = "";
  const core = zip.text("docProps/core.xml");
  if (core) {
    const coreRoot = BL.parseXml(core);
    const titleNode = BL.findFirst(coreRoot, "dc:title");
    if (titleNode) title = BL.textContent(titleNode);
  }

  return {
    title,
    blocks,
    images,
    section,
    skippedImages,
    headings,
    pages,
    source: file.name,
  };
};
/* ---- markdown ---- */
/* GFM writer for Word documents and a compact Markdown reader for Word. */

BL.markdownEscape = (value) => String(value ?? "").replace(/([\\`*_{}\[\]()#>|~])/g, "\\$1");

BL.markdownInline = (run, model) => {
  if (run.image !== undefined) {
    const image = model.images?.[run.image];
    if (!image?.bytes) return "";
    return `![${BL.markdownEscape(image.alt || "image")}](${BL.dataUrl(image.bytes, image.mime)})`;
  }
  if (!run.text) return "";
  let value = BL.markdownEscape(run.text).replace(/\n/g, "  \n");
  if (run.code) value = `\`${value.replace(/`/g, "\\`")}\``;
  if (run.bold) value = `**${value}**`;
  if (run.italic) value = `*${value}*`;
  if (run.strike) value = `~~${value}~~`;
  if (run.underline && !run.link) value = `<u>${value}</u>`;
  if (run.link) value = `[${value}](${run.link.replace(/\)/g, "\\)")})`;
  return value;
};

BL.markdownFromModel = (model) => {
  const lines = [];
  let listNumber = 0;
  let listLevel = -1;
  let listOrdered = null;
  const closeList = () => { listNumber = 0; listLevel = -1; listOrdered = null; };
  for (const block of model.blocks || []) {
    if (block.type === "list") {
      if (!block.ordered) listNumber = 0;
      if (listLevel !== (block.listLevel || 0)) listLevel = block.listLevel || 0;
      if (listOrdered !== null && listOrdered !== Boolean(block.ordered)) lines.push("");
      listOrdered = Boolean(block.ordered);
      if (block.ordered) listNumber++;
      const indent = "  ".repeat(Math.min(8, block.listLevel || 0));
      const marker = block.ordered ? `${block.start || listNumber}.` : "-";
      lines.push(`${indent}${marker} ${(block.runs || []).map((run) => BL.markdownInline(run, model)).join("")}`);
      continue;
    }
    closeList();
    if (block.type === "heading") {
      lines.push(`${"#".repeat(Math.min(6, block.level || 1))} ${(block.runs || []).map((run) => BL.markdownInline({ ...run, bold: false }, model)).join("")}`);
    } else if (block.type === "pagebreak") {
      lines.push("---");
    } else if (block.type === "table") {
      if (lines.length && lines.at(-1) !== "") lines.push("");
      const header = block.rows.find((row) => row.header) || block.rows[0];
      if (!header) continue;
      const cell = (item) => {
        const runs = item.runs || [];
        const text = runs.filter((run) => run.image === undefined).map((run) => run.text || "").join("");
        const images = runs.filter((run) => run.image !== undefined).map((run) => BL.markdownInline(run, model)).join(" ");
        return [BL.markdownEscape(text.replace(/\n/g, " ")), images].filter(Boolean).join(" ");
      };
      const rowLine = (row) => `| ${row.cells.map((item) => cell(item)).join(" | ")} |`;
      lines.push(rowLine(header));
      lines.push(`| ${header.cells.map(() => "---").join(" | ")} |`);
      for (const row of block.rows.filter((item) => item !== header)) lines.push(rowLine(row));
      lines.push("");
    } else if (block.type === "image") {
      lines.push(`![${BL.markdownEscape(model.images?.[block.image]?.alt || "image")}](${BL.dataUrl(model.images?.[block.image]?.bytes || new Uint8Array(), model.images?.[block.image]?.mime || "image/png")})`);
    } else if (block.quote) {
      lines.push(...`> ${(block.runs || []).map((run) => BL.markdownInline(run, model)).join("")}`.split("\n"));
    } else if (block.code) {
      const body = (block.runs || []).map((run) => run.text || "").join("");
      const fence = body.includes("```") ? "````" : "```";
      lines.push(`${fence}\n${body}\n${fence}`);
    } else {
      lines.push((block.runs || []).map((run) => BL.markdownInline(run, model)).join(""));
    }
    lines.push("");
  }
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
};

/* Reader --------------------------------------------------------------- */

BL.parseMarkdown = async (source, options = {}) => {
  const text = String(source || "").replace(/\r\n?/g, "\n");
  const images = [];
  let skippedImages = 0;
  const linkSafe = (url) => /^(https?:|mailto:|#)/i.test(url || "");
  const imageFor = async (url, alt) => {
    const data = await BL.imageBytesFromUrl(url, options.uiWindow);
    if (!data) { skippedImages++; return null; }
    const intrinsic = BL.imageSize(data.bytes);
    images.push({ bytes: data.bytes, mime: data.mime || "image/png", width: data.width || intrinsic?.width || 320, height: data.height || intrinsic?.height || 200, alt: alt || "" });
    return images.length - 1;
  };
  const readInline = async (input, format = {}) => {
    const runs = [];
    let index = 0;
    const push = (value, extra = {}) => { if (value) runs.push({ ...format, ...extra, text: value }); };
    while (index < input.length) {
      if (input[index] === "\\" && index + 1 < input.length) { push(input[index + 1]); index += 2; continue; }
      if (input[index] === "`") {
        const end = input.indexOf("`", index + 1);
        if (end > index) { runs.push({ ...format, text: input.slice(index + 1, end), code: true }); index = end + 1; continue; }
      }
      if (input[index] === "!" && input[index + 1] === "[") {
        const close = input.indexOf("]", index + 2);
        const end = close > 0 && input[close + 1] === "(" ? input.indexOf(")", close + 2) : -1;
        if (end > close) {
          const label = input.slice(index + 2, close);
          const image = await imageFor(input.slice(close + 2, end), label);
          if (image !== null) runs.push({ ...format, image });
          index = end + 1;
          continue;
        }
      }
      if (input[index] === "[") {
        const close = input.indexOf("]", index + 1);
        const end = close > 0 && input[close + 1] === "(" ? input.indexOf(")", close + 2) : -1;
        if (end > close) {
          const label = input.slice(index + 1, close);
          const url = input.slice(close + 2, end).split(/\s+/)[0].replace(/^<|>$/g, "");
          const inner = await readInline(label, { ...format, link: linkSafe(url) ? url : "" });
          runs.push(...inner);
          index = end + 1;
          continue;
        }
      }
      let matched = false;
      for (const marker of ["**", "__", "~~", "*", "_"]) {
        if (!input.startsWith(marker, index)) continue;
        const end = input.indexOf(marker, index + marker.length);
        if (end <= index + marker.length) continue;
        const inner = await readInline(input.slice(index + marker.length, end), {
          ...format,
          ...(marker === "**" || marker === "__" ? { bold: true } : marker === "~~" ? { strike: true } : { italic: true }),
        });
        runs.push(...inner);
        index = end + marker.length;
        matched = true;
        break;
      }
      if (matched) continue;
      push(input[index]);
      index++;
    }
    return BL.mergeRuns(runs);
  };
  const blocks = [];
  const lines = text.split("\n");
  let index = 0;
  let listCounter = 0;
  const pushParagraph = async (value) => {
    const runs = (await readInline(value)).filter((run) => run.text || run.image !== undefined);
    if (runs.length) blocks.push({ type: "paragraph", runs, align: "" });
  };
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    const fence = /^\s*(```+|~~~+)/.exec(line);
    if (fence) {
      const marker = fence[1][0].repeat(3);
      const content = [];
      index++;
      while (index < lines.length && !lines[index].trim().startsWith(marker)) content.push(lines[index++]);
      index++;
      if (content.length) blocks.push({ type: "paragraph", code: true, runs: [{ text: content.join("\n") }], align: "" });
      continue;
    }
    const heading = /^\s*(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, runs: await readInline(heading[2].trim()), align: "" });
      index++;
      continue;
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s\S]*$/.test(line)) {
      blocks.push({ type: "pagebreak" });
      index++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ""));
      for (const item of quote) await pushParagraph(item);
      continue;
    }
    const listLine = /^(\s*)([-+*]|\d+[.)])\s+(.*)$/;
    if (listLine.test(line)) {
      const listId = `md-list-${listCounter++}`;
      while (index < lines.length && listLine.test(lines[index])) {
        const match = listLine.exec(lines[index]);
        const indent = match[1].replace(/\t/g, "  ").length;
        const ordered = /^\d/.test(match[2]);
        const start = ordered ? Number(match[2]) : 0;
        const runs = await readInline(match[3].trim());
        blocks.push({ type: "list", ordered, listLevel: Math.min(8, Math.floor(indent / 2)), start, listId, runs, align: "" });
        index++;
      }
      continue;
    }
    if (/\|/.test(line) && index + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[index + 1])) {
      const split = (value) => value.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((cell) => cell.trim());
      const header = split(line);
      index += 2;
      const rows = [{ header: true, cells: await Promise.all(header.map(async (value) => ({ runs: await readInline(value), blocks: [], colspan: 1, header: true }))) }];
      while (index < lines.length && /\|/.test(lines[index]) && lines[index].trim()) {
        const cells = split(lines[index]);
        rows.push({ header: false, cells: await Promise.all(cells.map(async (value) => ({ runs: await readInline(value), blocks: [], colspan: 1, header: false }))) });
        index++;
      }
      blocks.push({ type: "table", rows, grid: [] });
      continue;
    }
    const paragraph = [line.trim()];
    index++;
    while (index < lines.length && lines[index].trim() && !/^\s*(#{1,6}\s|```|\||>|[-+*]\s|\d+[.)]\s)/.test(lines[index])) {
      paragraph.push(lines[index].trim());
      index++;
    }
    await pushParagraph(paragraph.join(" "));
  }
  return {
    title: "",
    blocks,
    images,
    section: { width: 612, height: 792, top: 72, right: 72, bottom: 72, left: 72 },
    skippedImages,
    source: options.name || "document.md",
  };
};
/* ---- word-out ---- */
/* Model transformations shared by the Word export/import tools. */

BL.runText = (runs, model = null) => (runs || []).map((run) => {
  if (run.image !== undefined) return "";
  return run.text || "";
}).join("");

/* The text renderer works on the shared model, so the ODF tools use it too. */
BL.modelToText = (model) => {
  const lines = [];
  for (const block of model.blocks || []) {
    if (block.type === "pagebreak") { lines.push(""); continue; }
    if (block.type === "table") {
      for (const row of block.rows) lines.push(row.cells.map((cell) => BL.runText(cell.runs).replace(/\s+/g, " ").trim()).join("\t"));
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
  slug: "word-to-markdown",
  title: "Word to Markdown",
  accept: ".docx,.docm",
  dropTitle: "Drop Word files",
  hint: "or choose .docx or .docm files. Images become data URLs.",
  empty: "No Word files yet. Drop them above or choose them.",
  note: "GitHub-flavoured Markdown. Images are embedded as data URLs, so files can get large. Files stay on this device.",
  action: "Convert to Markdown",
  convert: async (file, options, context) => {
    const model = await BL.parseDocx(file, { signal: context.signal });
    return [{
      name: `${BL.baseName(file.name)}.md`,
      blob: new Blob([BL.docxToMarkdown(model)], { type: "text/markdown" }),
    }];
  },
});
if (globalThis.__BL_TEST__) globalThis.__BL_TEST__.BL = BL;
})();
