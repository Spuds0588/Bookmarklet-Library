/**
 * @name 📊 ODS to Excel
 * @category files
 * @description Open .ods spreadsheets as .xlsx workbooks, one sheet each.
 * @tags ods, libreoffice, opendocument, excel, xlsx, spreadsheet, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,odf,ods,spreadsheet
startTool({
  slug: "ods-to-excel",
  title: "ODS to Excel",
  accept: ".ods",
  dropTitle: "Drop ODS files",
  hint: "or choose .ods spreadsheets. Numbers stay numbers, dates become ISO text.",
  empty: "No spreadsheets yet. Drop them above or choose them.",
  note: "One workbook per file, with the sheets it has. Formulas keep their last saved value; formatting, images and charts are not exported. Files stay on this device.",
  action: "Convert to Excel",
  options: [
    { id: "sheets", label: "Sheets", value: "all", values: [{ value: "all", label: "All sheets" }, { value: "first", label: "First sheet only" }] },
  ],
  convert: async (file, options, context) => {
    const result = await BL.odsToXlsx(file, options, context);
    return {
      files: [result.output],
      note: result.exported < result.sheetCount ? ` Exported ${result.exported} of ${result.sheetCount} sheets.` : "",
    };
  },
});
