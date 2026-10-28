/**
 * @name 📄 ODT to Word
 * @category files
 * @description Open .odt documents as .docx, keeping headings, lists, tables and images.
 * @tags odt, libreoffice, opendocument, word, docx, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,images,odf,docx-write,word-out
startTool({
  slug: "odt-to-word",
  title: "ODT to Word",
  accept: ".odt",
  dropTitle: "Drop ODT files",
  hint: "or choose .odt files. Headings, lists, tables and images are kept.",
  empty: "No ODT files yet. Drop them above or choose them.",
  note: "Word document with paragraphs, headings, lists, tables, links and images. Fonts, colours, columns and text boxes are not carried. Files stay on this device.",
  action: "Convert to Word",
  convert: async (file, options, context) => {
    const model = await BL.parseOdt(file, { signal: context.signal });
    const blob = await BL.writeDocx(model);
    return [{
      name: `${BL.baseName(file.name)}.docx`,
      blob,
    }];
  },
});
