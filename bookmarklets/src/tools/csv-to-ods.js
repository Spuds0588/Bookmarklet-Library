/**
 * @name 📈 CSV to ODS
 * @category files
 * @description Turn CSV or TSV files into .ods spreadsheets, with numbers kept as numbers.
 * @tags csv, tsv, ods, libreoffice, opendocument, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,spreadsheet,sheet-out,odf-package,ods-out
startTool({
  slug: "csv-to-ods",
  title: "CSV to ODS",
  accept: ".csv,.tsv",
  dropTitle: "Drop CSV files",
  hint: "or choose .csv or .tsv files. The delimiter is detected.",
  empty: "No CSV files yet. Drop them above or choose them.",
  note: "One sheet per file: numbers stay numbers, dates stay text, and no formulas are created. Files stay on this device.",
  action: "Convert to ODS",
  options: [
    { id: "delimiter", label: "Delimiter", value: "auto", values: [{ value: "auto", label: "Detect" }, { value: "comma", label: "Comma" }, { value: "tab", label: "Tab" }, { value: "semicolon", label: "Semicolon" }] },
  ],
  convert: async (file, options, context) => {
    const result = await BL.csvToOds(file, options, context);
    return {
      files: [result.output],
      note: ` ${result.rows} rows, ${result.columns} columns.`,
    };
  },
});
