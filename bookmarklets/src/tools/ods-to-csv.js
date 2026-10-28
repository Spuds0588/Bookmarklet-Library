/**
 * @name 📊 ODS to CSV
 * @category files
 * @description Export .ods sheets to CSV or TSV, with dates and quoting handled.
 * @tags ods, libreoffice, opendocument, spreadsheet, csv, tsv, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,odf,ods,spreadsheet
startTool({
  slug: "ods-to-csv",
  title: "ODS to CSV",
  accept: ".ods",
  dropTitle: "Drop ODS files",
  hint: "or choose .ods spreadsheets saved by LibreOffice or Calc. Dates become ISO text.",
  empty: "No spreadsheets yet. Drop them above or choose them.",
  note: "One CSV per sheet. Formulas use their last saved value. Formatting, images and charts are not exported. Files stay on this device.",
  action: "Convert to CSV",
  options: [
    { id: "format", label: "Format", value: "csv", values: [{ value: "csv", label: "CSV (comma)" }, { value: "tsv", label: "TSV (tab)" }] },
    { id: "sheets", label: "Sheets", value: "all", values: [{ value: "all", label: "All sheets" }, { value: "first", label: "First sheet only" }] },
  ],
  convert: async (file, options, context) => {
    const result = await BL.odsToCsv(file, options, context);
    return {
      files: result.outputs,
      note: result.exported < result.sheetCount ? ` Exported ${result.exported} of ${result.sheetCount} sheets.` : "",
    };
  },
});
