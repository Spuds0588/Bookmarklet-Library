/**
 * @name 📄 ODT to HTML
 * @category files
 * @description Turn .odt documents into standalone HTML, images included, one or many.
 * @tags odt, libreoffice, opendocument, html, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,images,odf,html,word-out
startTool({
  slug: "odt-to-html",
  title: "ODT to HTML",
  accept: ".odt",
  dropTitle: "Drop ODT files",
  hint: "or choose .odt files saved by LibreOffice, Writer or another ODF app.",
  empty: "No ODT files yet. Drop them above or choose them.",
  note: "Standalone HTML with inline CSS. Headings, lists, tables, links and images come across; colours, columns, headers and footers do not. Files stay on this device.",
  action: "Convert to HTML",
  convert: async (file, options, context) => {
    const model = await BL.parseOdt(file, { signal: context.signal });
    return {
      files: [{
        name: `${BL.baseName(file.name)}.html`,
        blob: new Blob([BL.htmlFromModel(model)], { type: "text/html" }),
      }],
      note: BL.imageNoteForModel(model),
    };
  },
});
