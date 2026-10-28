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
