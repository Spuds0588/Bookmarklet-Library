/**
 * @name 📝 RTF to ODT
 * @category files
 * @description Open RTF files as .odt, keeping formatting, tables and PNG or JPEG images.
 * @tags rtf, odt, libreoffice, opendocument, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,images,rtf,odf-package,odt-out,word-out
startTool({
  slug: "rtf-to-odt",
  title: "RTF to ODT",
  accept: ".rtf",
  dropTitle: "Drop RTF files",
  hint: "or choose .rtf files. PNG and JPEG pictures are kept.",
  empty: "No RTF files yet. Drop them above or choose them.",
  note: "OpenDocument text with paragraphs, formatting, simple tables and pictures. Only PNG and JPEG pictures are kept; other formats are skipped. Files stay on this device.",
  action: "Convert to ODT",
  convert: async (file, options, context) => {
    const model = await BL.parseRtf(await file.text(), { name: file.name });
    const blob = await BL.writeOdt(model);
    return [{
      name: `${BL.baseName(file.name)}.odt`,
      blob,
    }];
  },
});
