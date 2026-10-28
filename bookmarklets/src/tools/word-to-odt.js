/**
 * @name 📝 Word to ODT
 * @category files
 * @description Turn .docx files into OpenDocument text that LibreOffice and Writer open.
 * @tags word, docx, odt, libreoffice, opendocument, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,images,docx-read,odf-package,odt-out,word-out
startTool({
  slug: "word-to-odt",
  title: "Word to ODT",
  accept: ".docx,.docm",
  dropTitle: "Drop Word files",
  hint: "or choose .docx or .docm files. Headings, lists, tables and images are kept.",
  empty: "No Word files yet. Drop them above or choose them.",
  note: "OpenDocument text with paragraphs, headings, lists, tables, links and images. Fonts, colours, columns and text boxes are not carried. Files stay on this device.",
  action: "Convert to ODT",
  convert: async (file, options, context) => {
    const model = await BL.parseDocx(file, { signal: context.signal });
    const blob = await BL.writeOdt(model);
    return [{
      name: `${BL.baseName(file.name)}.odt`,
      blob,
    }];
  },
});
