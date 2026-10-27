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
