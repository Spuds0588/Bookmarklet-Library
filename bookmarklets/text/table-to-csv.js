/**
 * @name 📊 Table to CSV / Markdown
 * @category text
 * @description Pick a table on the page and copy it as clean CSV or a Markdown table.
 * @tags table, csv, markdown, extract, clipboard, spreadsheet
 * @added 2026-10-28
 * @featured false
 */
(() => {
  const ID = "bl-table-export";
  document.getElementById(ID)?.remove();

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const clean = (value) => String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const isHidden = (element) => {
    if (element.hidden || element.getAttribute("aria-hidden") === "true") return true;
    const style = getComputedStyle(element);
    return style.display === "none" || style.visibility === "hidden";
  };

  // Read a table into a rectangular grid. Spans are expanded so a cell that
  // covers two columns does not shift every later value one column left.
  function readTable(table) {
    const grid = [];
    const occupied = new Set();
    for (const row of table.rows) {
      if (row.closest("table") !== table) continue;
      const values = [];
      let column = 0;
      for (const cell of row.cells) {
        if (cell.closest("table") !== table || isHidden(cell)) continue;
        while (occupied.has(`${grid.length}:${column}`)) column++;
        const colspan = Math.max(1, Math.min(20, cell.colSpan || 1));
        const rowspan = Math.max(1, Math.min(100, cell.rowSpan || 1));
        const value = clean(cell.innerText);
        for (let y = 0; y < rowspan; y++) {
          for (let x = 0; x < colspan; x++) {
            occupied.add(`${grid.length + y}:${column + x}`);
            if (x === 0) values[column] = value;
            else values[column + x] = "";
          }
        }
        column += colspan;
      }
      if (values.some((value) => value !== "")) grid.push(values);
    }
    const width = Math.max(0, ...grid.map((row) => row.length));
    for (const row of grid) while (row.length < width) row.push("");
    return grid;
  }

  const csvCell = (value) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const toCsv = (grid) => grid.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const mdCell = (value) => value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
  const toMarkdown = (grid, hasHeader) => {
    if (!grid.length) return "";
    const width = grid[0].length;
    const header = hasHeader ? grid[0] : Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
    const body = hasHeader ? grid.slice(1) : grid;
    const line = (row) => `| ${Array.from({ length: width }, (_, index) => mdCell(row[index] ?? "")).join(" | ")} |`;
    return [line(header), `| ${Array.from({ length: width }, () => "---").join(" | ")} |`, ...body.map(line)].join("\n");
  };

  let host = null;
  let banner = null;
  let outline = null;
  let cleanup = () => {};
  const restore = () => {
    if (outline) {
      outline.style.outline = outline.dataset.blTableOutline ?? "";
      outline.style.outlineOffset = outline.dataset.blTableOffset ?? "";
      delete outline.dataset.blTableOutline;
      delete outline.dataset.blTableOffset;
      outline = null;
    }
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
    banner?.remove();
    banner = null;
  };
  const close = () => {
    restore();
    try { cleanup(); } catch {}
    cleanup = () => {};
    host?.remove();
    host = null;
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };
  const onMove = (event) => {
    const table = event.target?.closest?.("table");
    if (!table || table === outline) return;
    if (outline) {
      outline.style.outline = outline.dataset.blTableOutline ?? "";
      outline.style.outlineOffset = outline.dataset.blTableOffset ?? "";
    }
    outline = table;
    outline.dataset.blTableOutline = table.style.outline;
    outline.dataset.blTableOffset = table.style.outlineOffset;
    table.style.outline = "2px solid #111";
    table.style.outlineOffset = "4px";
  };
  const onClick = (event) => {
    const table = event.target?.closest?.("table");
    if (!table) return;
    event.preventDefault();
    event.stopPropagation();
    const tables = [...document.querySelectorAll("table")];
    const grid = readTable(table);
    const hasHeader = Boolean(table.tHead) || [...(table.rows[0]?.cells ?? [])].every((cell) => cell.tagName === "TH");
    restore();
    if (!grid.length) {
      alert("That table has no readable rows.");
      return;
    }
    showPanel(grid, hasHeader, tables.indexOf(table) + 1, tables.length);
  };
  const copy = async (text, label, status) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch {}
      area.remove();
      if (!ok) {
        status.textContent = `Could not copy ${label}. Select the preview and copy it manually.`;
        status.dataset.kind = "error";
        return;
      }
    }
    status.textContent = `${label} copied to the clipboard.`;
    status.dataset.kind = "ok";
  };

  function showPanel(grid, hasHeader, index, total) {
    const csv = toCsv(grid);
    const markdown = toMarkdown(grid, hasHeader);
    const width = grid[0]?.length ?? 0;
    host = document.createElement("div");
    host.id = ID;
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>
      :host{color-scheme:light dark;font:14px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
      *{box-sizing:border-box}
      .scrim{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(0,0,0,.52)}
      .panel{width:min(620px,100%);max-height:min(760px,calc(100vh - 44px));display:flex;flex-direction:column;background:#fff;color:#111;border:1px solid #111;box-shadow:0 24px 80px rgba(0,0,0,.35)}
      @media(prefers-color-scheme:dark){.panel{background:#111;color:#f5f5f5;border-color:#f5f5f5}.scrim{background:rgba(0,0,0,.72)}}
      header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px 14px;border-bottom:1px solid #bbb}
      @media(prefers-color-scheme:dark){header{border-color:#3a3a3a}}
      .kicker{margin:0 0 4px;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.62}
      h2{margin:0;font-size:20px;line-height:1.2;font-weight:600}
      button{font:inherit}
      .close{width:32px;height:32px;flex:none;border:1px solid #bbb;background:transparent;color:inherit;font-size:20px;line-height:1;cursor:pointer}
      .body{padding:16px 20px 8px;overflow:auto;display:flex;flex-direction:column;gap:12px}
      .meta{font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;opacity:.62}
      pre{margin:0;padding:10px;max-height:250px;overflow:auto;background:#f4f4f4;border:1px solid #d5d5d5;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre;color:#111}
      @media(prefers-color-scheme:dark){pre{background:#1b1b1b;border-color:#3a3a3a;color:#f5f5f5}}
      .status{min-height:17px;font-size:12px;opacity:.68}.status[data-kind=ok]{color:#086b3a;opacity:1}.status[data-kind=error]{color:#a11;opacity:1}
      @media(prefers-color-scheme:dark){.status[data-kind=ok]{color:#7ee2a8}.status[data-kind=error]{color:#ff8d8d}}
      footer{padding:12px 20px 18px;border-top:1px solid #bbb;display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
      @media(prefers-color-scheme:dark){footer{border-color:#3a3a3a}}
      .btn{border:1px solid #bbb;background:transparent;color:inherit;padding:8px 12px;font-size:12px;font-weight:600;cursor:pointer}
      .btn:hover{border-color:currentColor}
      .primary{background:#111;border-color:#111;color:#fff}
      @media(prefers-color-scheme:dark){.primary{background:#f5f5f5;border-color:#f5f5f5;color:#111}}
      @media(max-width:560px){.scrim{padding:10px}.panel{max-height:calc(100vh - 20px)}header,.body,footer{padding-left:14px;padding-right:14px}}
    </style>
    <div class="scrim">
      <section class="panel" role="dialog" aria-modal="true" aria-labelledby="bl-table-title">
        <header>
          <div><p class="kicker">Table ${index} of ${total}</p><h2 id="bl-table-title">Table to CSV / Markdown</h2></div>
          <button class="close" type="button" aria-label="Close">×</button>
        </header>
        <div class="body">
          <p class="meta">${grid.length} row${grid.length === 1 ? "" : "s"} · ${width} column${width === 1 ? "" : "s"}${hasHeader ? " · header row" : " · no header row"}</p>
          <pre>${escapeHtml(csv.slice(0, 1200))}${csv.length > 1200 ? "\n…" : ""}</pre>
          <p class="status" role="status" aria-live="polite">Choose a format. CSV is the default for spreadsheets; Markdown pastes into docs and READMEs.</p>
        </div>
        <footer>
          <button class="btn primary" type="button" data-copy="csv">Copy CSV</button>
          <button class="btn" type="button" data-copy="markdown">Copy Markdown</button>
        </footer>
      </section>
    </div>`;
    const status = root.querySelector(".status");
    root.querySelector(".close").addEventListener("click", close);
    root.querySelector(".scrim").addEventListener("click", (event) => {
      if (event.target === root.querySelector(".scrim")) close();
    });
    for (const button of root.querySelectorAll("[data-copy]")) {
      button.addEventListener("click", () =>
        copy(button.dataset.copy === "csv" ? csv : markdown, button.dataset.copy === "csv" ? "CSV" : "Markdown", status),
      );
    }
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
    (document.body || document.documentElement).appendChild(host);
    cleanup = () => root.removeEventListener("keydown", onKey);
    document.addEventListener("keydown", onKey, true);
    root.querySelector("[data-copy]").focus();
  }

  banner = document.createElement("div");
  banner.textContent = "Table to CSV / Markdown — click a table";
  banner.style.cssText =
    "position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483647;background:#111;color:#fff;padding:8px 12px;font:12px/1.3 ui-monospace,Menlo,Consolas,monospace;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.25)";
  (document.body || document.documentElement).appendChild(banner);
  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);
})();
