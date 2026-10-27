/* Spreadsheet conversion helpers. */

BL.xlsxToCsv = async (file, options = {}, context = {}) => {
  const sheets = await BL.parseXlsx(file, { signal: context.signal });
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

BL.csvNumber = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return { kind: "empty" };
  if (!/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(text)) return { kind: "text" };
  if (/^0\d/.test(text)) return { kind: "text" };
  const digits = text.replace(/[-.]/g, "").split(/[eE]/)[0].replace(/^0+/, "");
  if (digits.length > 15) return { kind: "text" };
  const number = Number(text);
  if (!Number.isFinite(number)) return { kind: "text" };
  return { kind: "number", value: number };
};

BL.csvToXlsx = async (file, options = {}, context = {}) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.length) throw new Error("The file is empty.");
  const text = BL.decodeCsvText(bytes);
  const delimiter = options.delimiter === "auto" ? "auto" : { comma: ",", tab: "\t", semicolon: ";" }[options.delimiter] || "auto";
  const parsed = BL.parseCsv(text, delimiter);
  if (!parsed.rows.length) throw new Error("There are no rows in this file.");
  if (parsed.rows.length > 1048576) throw new Error("This file has more rows than Excel supports.");
  if (parsed.rows[0].length > 16384) throw new Error("This file has more columns than Excel supports.");
  const rows = parsed.rows.map((row) => row.map((cell) => {
    const inferred = BL.csvNumber(cell);
    return inferred.kind === "number" ? inferred.value : cell;
  }));
  const name = `${BL.baseName(file.name)}.xlsx`;
  const blob = await BL.writeXlsx([{ name: BL.baseName(file.name), rows }]);
  return { output: { name, blob }, rows: rows.length, columns: rows[0]?.length || 0, delimiter: parsed.delimiter };
};
