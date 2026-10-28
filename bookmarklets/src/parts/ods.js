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
