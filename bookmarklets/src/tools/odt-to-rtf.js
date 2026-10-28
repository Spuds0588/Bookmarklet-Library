/**
 * @name 📄 ODT to RTF
 * @category files
 * @description Convert .odt documents to RTF with formatting, tables, links and images.
 * @tags odt, libreoffice, opendocument, rtf, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,images,odf,rtf,word-out
startTool({
  slug: "odt-to-rtf",
  title: "ODT to RTF",
  accept: ".odt",
  dropTitle: "Drop ODT files",
  hint: "or choose .odt files. PNG and JPEG images are kept.",
  empty: "No ODT files yet. Drop them above or choose them.",
  note: "Rich Text Format with headings, lists, tables and links. Only PNG and JPEG images are kept; other formats are skipped. Files stay on this device.",
  action: "Convert to RTF",
  convert: async (file, options, context) => {
    const model = await BL.parseOdt(file, { signal: context.signal });
    return [{
      name: `${BL.baseName(file.name)}.rtf`,
      blob: new Blob([BL.rtfFromModel(model)], { type: "application/rtf" }),
    }];
  },
});
