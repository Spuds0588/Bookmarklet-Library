/**
 * @name 📈 CSV to Excel
 * @category files
 * @description Turn CSV or TSV files into .xlsx workbooks, with numbers kept as numbers.
 * @tags csv, tsv, excel, xlsx, convert, office, batch
 * @added 2026-10-26
 * @featured false
 */
// @parts ui,zip,xml,spreadsheet,sheet-out
startTool({
  slug: "csv-to-excel",
  title: "CSV to Excel",
  accept: ".csv,.tsv",
  dropTitle: "Drop CSV files",
  hint: "or choose .csv or .tsv files. The delimiter is detected.",
  empty: "No CSV files yet. Drop them above or choose them.",
  note: "One workbook per file. UTF-8, UTF-16 and Windows-1252 are read. Dates stay text; formulas are never created. Files stay on this device.",
  action: "Convert to Excel",
  options: [
    { id: "delimiter", label: "Delimiter", value: "auto", values: [{ value: "auto", label: "Detect" }, { value: "comma", label: "Comma" }, { value: "tab", label: "Tab" }, { value: "semicolon", label: "Semicolon" }] },
  ],
  convert: async (file, options, context) => {
    const result = await BL.csvToXlsx(file, options, context);
    return {
      files: [result.output],
      note: ` ${result.rows} rows, ${result.columns} columns.`,
    };
  },
});
