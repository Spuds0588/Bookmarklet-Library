/**
 * @name 📊 Excel to ODS
 * @category files
 * @description Turn .xlsx workbooks into .ods spreadsheets, one sheet each.
 * @tags excel, xlsx, ods, libreoffice, opendocument, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,spreadsheet,sheet-out,odf-package,ods-out
startTool({
  slug: "excel-to-ods",
  title: "Excel to ODS",
  accept: ".xlsx,.xlsm",
  dropTitle: "Drop Excel files",
  hint: "or choose .xlsx or .xlsm files. Dates become ISO text.",
  empty: "No workbooks yet. Drop them above or choose them.",
  note: "OpenDocument spreadsheet with the sheets it has. Formulas keep their last saved value; formatting, images and charts are not exported. Files stay on this device.",
  action: "Convert to ODS",
  options: [
    { id: "sheets", label: "Sheets", value: "all", values: [{ value: "all", label: "All sheets" }, { value: "first", label: "First sheet only" }] },
  ],
  convert: async (file, options, context) => {
    const result = await BL.xlsxToOds(file, options, context);
    return {
      files: [result.output],
      note: result.exported < result.sheetCount ? ` Exported ${result.exported} of ${result.sheetCount} sheets.` : "",
    };
  },
});
