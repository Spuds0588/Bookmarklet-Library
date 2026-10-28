/**
 * @name 📝 HTML to ODT
 * @category files
 * @description Turn HTML pages into .odt documents with headings, lists, tables and links.
 * @tags html, odt, libreoffice, opendocument, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,html,images,odf-package,odt-out,word-out
startTool({
  slug: "html-to-odt",
  title: "HTML to ODT",
  accept: ".html,.htm",
  dropTitle: "Drop HTML files",
  hint: "or choose .html or .htm files. Data-URL images are kept.",
  empty: "No HTML files yet. Drop them above or choose them.",
  note: "OpenDocument text with headings, lists, links and tables. Relative images cannot be found from a single file; data-URL and CORS images are embedded. Files stay on this device.",
  action: "Convert to ODT",
  convert: async (file, options, context) => {
    const model = await BL.htmlToModel(await file.text(), { uiWindow: context.uiWindow, name: file.name });
    const blob = await BL.writeOdt(model);
    return {
      files: [{ name: `${BL.baseName(file.name)}.odt`, blob }],
      note: BL.imageNoteForModel(model),
    };
  },
});
