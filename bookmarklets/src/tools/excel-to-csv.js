/**
 * @name 📊 Excel to CSV
 * @category files
 * @description Export .xlsx sheets to CSV or TSV, with dates and quoting handled.
 * @tags excel, xlsx, csv, tsv, convert, office, batch
 * @added 2026-10-26
 * @featured false
 */
// @parts ui,zip,xml,spreadsheet,sheet-out
startTool({
  slug: "excel-to-csv",
  title: "Excel to CSV",
  accept: ".xlsx,.xlsm",
  dropTitle: "Drop Excel files",
  hint: "or choose .xlsx or .xlsm files. Dates become ISO text.",
  empty: "No workbooks yet. Drop them above or choose them.",
  note: "One CSV per sheet. Formulas use their last saved value. Formatting, images and charts are not exported. Files stay on this device.",
  action: "Convert to CSV",
  options: [
    { id: "format", label: "Format", value: "csv", values: [{ value: "csv", label: "CSV (comma)" }, { value: "tsv", label: "TSV (tab)" }] },
    { id: "sheets", label: "Sheets", value: "all", values: [{ value: "all", label: "All sheets" }, { value: "first", label: "First sheet only" }] },
  ],
  convert: async (file, options, context) => {
    const result = await BL.xlsxToCsv(file, options, context);
    return {
      files: result.outputs,
      note: result.exported < result.sheetCount ? ` Exported ${result.exported} of ${result.sheetCount} sheets.` : "",
    };
  },
});
