/* ODS writer: sheet matrices -> an OpenDocument spreadsheet package.
   Numbers keep office:value-type float so Calc reads them as numbers, and text
   keeps one text:p per line, which is how the reader joins them back. */

BL.odsSheetName = (value, used) => {
  const name = String(value || "Sheet").replace(/[\\/*?:[\]]/g, "-").replace(/^'+|'+$/g, "").trim().slice(0, 200) || "Sheet";
  let candidate = name;
  let index = 2;
  while (used.has(candidate.toLowerCase())) candidate = `${name} (${index++})`;
  used.add(candidate.toLowerCase());
  return candidate;
};

BL.odsCellXml = (cell) => {
  if (typeof cell === "number" && Number.isFinite(cell)) {
    return `<table:table-cell office:value-type="float" office:value="${cell}"><text:p>${cell}</text:p></table:table-cell>`;
  }
  const text = String(cell ?? "");
  if (!text) return "<table:table-cell/>";
  const lines = text.split("\n").slice(0, 100).map((line) => `<text:p>${BL.odfTextEscape(line)}</text:p>`).join("");
  return `<table:table-cell office:value-type="string">${lines}</table:table-cell>`;
};

BL.csvToOds = async (file, options = {}, context = {}) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.length) throw new Error("The file is empty.");
  const text = BL.decodeCsvText(bytes);
  const delimiter = options.delimiter === "auto" ? "auto" : { comma: ",", tab: "\t", semicolon: ";" }[options.delimiter] || "auto";
  const parsed = BL.parseCsv(text, delimiter);
  if (!parsed.rows.length) throw new Error("There are no rows in this file.");
  if (parsed.rows.length > 1000000) throw new Error("This file has more rows than a spreadsheet needs.");
  const rows = parsed.rows.map((row) => row.map((cell) => {
    const inferred = BL.csvNumber(cell);
    return inferred.kind === "number" ? inferred.value : cell;
  }));
  const blob = await BL.writeOds([{ name: BL.baseName(file.name), rows }]);
  return { output: { name: `${BL.baseName(file.name)}.ods`, blob }, rows: rows.length, columns: rows[0]?.length || 0 };
};

BL.xlsxToOds = async (file, options = {}, context = {}) => {
  const sheets = await BL.parseXlsx(file, { signal: context.signal });
  const selected = options.sheets === "first" ? sheets.slice(0, 1) : sheets;
  if (context.signal?.aborted) throw BL.abortError();
  if (!selected.length) throw new Error("This workbook has no readable sheets.");
  // parseXlsx reports every cell as saved text, so numbers are typed again here
  // the same way the CSV reader types them.
  const typed = selected.map((sheet) => ({
    name: sheet.name,
    rows: sheet.rows.map((row) => row.map((cell) => {
      if (typeof cell !== "string") return cell ?? "";
      const inferred = BL.csvNumber(cell);
      return inferred.kind === "number" ? inferred.value : cell;
    })),
  }));
  const blob = await BL.writeOds(typed);
  return { output: { name: `${BL.baseName(file.name)}.ods`, blob }, sheetCount: sheets.length, exported: selected.length };
};

BL.writeOds = async (sheets) => {
  const used = new Set();
  const normalized = (sheets || []).map((sheet) => ({
    name: BL.odsSheetName(sheet.name, used),
    rows: (sheet.rows || []).map((row) => (row || []).map((cell) => cell ?? "")),
  }));
  if (!normalized.length) throw new Error("There is no data to write.");

  const columnStyles = [];
  const columnStyleFor = (index, width) => {
    const name = `co${index + 1}`;
    if (!columnStyles.some((style) => style.name === name)) {
      columnStyles.push({ name, width });
      return name;
    }
    return name;
  };

  const tables = normalized.map((sheet) => {
    const width = Math.max(1, ...sheet.rows.map((row) => row.length));
    const widths = Array.from({ length: width }, (_, column) => {
      const longest = Math.max(6, ...sheet.rows.slice(0, 200).map((row) => String(row[column] ?? "").length));
      return `${(Math.min(60, longest + 2) * 0.2).toFixed(2)}cm`;
    });
    const columns = widths.map((value, index) => `<table:table-column table:style-name="${columnStyleFor(index, value)}"/>`).join("");
    const rows = sheet.rows.map((row) => {
      const cells = row.map((cell) => BL.odsCellXml(cell)).join("");
      const filler = Math.max(0, 1 - row.length);
      return `<table:table-row>${cells}${filler ? "<table:table-cell/>".repeat(filler) : ""}</table:table-row>`;
    }).join("");
    return `<table:table table:name="${BL.odfTextEscape(sheet.name)}" table:style-name="ta1">${columns}${rows}</table:table>`;
  }).join("");

  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-content ${BL.ODF_NS} office:version="1.3"><office:automatic-styles>` +
    `<style:style style:name="ta1" style:family="table"><style:table-properties table:display="true"/></style:style>` +
    columnStyles.map((style) => `<style:style style:name="${style.name}" style:family="table-column"><style:table-column-properties style:column-width="${style.width}"/></style:style>`).join("") +
    `<style:style style:name="ro1" style:family="table-row"><style:table-row-properties style:use-optimal-row-height="true"/></style:style>` +
    `</office:automatic-styles><office:body><office:spreadsheet>${tables}</office:spreadsheet></office:body></office:document-content>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-styles ${BL.ODF_NS} office:version="1.3"><office:styles>` +
    `<style:default-style style:family="table-cell"><style:table-cell-properties fo:padding="0.02in"/></style:default-style>` +
    `<style:style style:name="Default" style:family="table-cell"/>` +
    `</office:styles><office:automatic-styles/><office:master-styles/></office:document-styles>`;

  const title = BL.odfTextEscape(normalized.length === 1 ? normalized[0].name : `${normalized.length} sheets`);
  const metaXml = `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-meta ${BL.ODF_NS} office:version="1.3"><office:meta>` +
    `<dc:title>${title}</dc:title><meta:generator>Bookmarklet Library</meta:generator></office:meta></office:document-meta>`;

  const mime = "application/vnd.oasis.opendocument.spreadsheet";
  const manifest = BL.odfManifest(mime, [
    { path: "content.xml", type: "text/xml" },
    { path: "styles.xml", type: "text/xml" },
    { path: "meta.xml", type: "text/xml" },
  ]);

  return BL.makeZip([
    { name: "mimetype", blob: new Blob([mime], { type: "text/plain" }) },
    { name: "META-INF/manifest.xml", blob: new Blob([manifest], { type: "text/xml" }) },
    { name: "content.xml", blob: new Blob([contentXml], { type: "text/xml" }) },
    { name: "styles.xml", blob: new Blob([stylesXml], { type: "text/xml" }) },
    { name: "meta.xml", blob: new Blob([metaXml], { type: "text/xml" }) },
  ]);
};
