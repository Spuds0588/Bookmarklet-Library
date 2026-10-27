/**
 * @name 📄 Word to RTF
 * @category files
 * @description Convert .docx files to RTF with formatting, tables, links and images.
 * @tags word, docx, rtf, convert, office, batch
 * @added 2026-10-26
 * @featured false
 */
// @parts ui,zip,xml,images,docx-read,rtf,word-out
startTool({
  slug: "word-to-rtf",
  title: "Word to RTF",
  accept: ".docx,.docm",
  dropTitle: "Drop Word files",
  hint: "or choose .docx or .docm files. PNG and JPEG images are kept.",
  empty: "No Word files yet. Drop them above or choose them.",
  note: "Rich Text Format with headings, lists, tables and links. Only PNG and JPEG images are kept; other formats are skipped. Files stay on this device.",
  action: "Convert to RTF",
  convert: async (file, options, context) => {
    const model = await BL.parseDocx(file, { signal: context.signal });
    return [{
      name: `${BL.baseName(file.name)}.rtf`,
      blob: new Blob([BL.docxToRtf(model)], { type: "application/rtf" }),
    }];
  },
});
