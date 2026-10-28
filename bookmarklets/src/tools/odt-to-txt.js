/**
 * @name 📄 ODT to TXT
 * @category files
 * @description Pull the text out of .odt documents; tables become tab-separated rows.
 * @tags odt, libreoffice, opendocument, txt, text, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,images,odf,word-out
startTool({
  slug: "odt-to-txt",
  title: "ODT to TXT",
  accept: ".odt",
  dropTitle: "Drop ODT files",
  hint: "or choose .odt files. The text comes out, images do not.",
  empty: "No ODT files yet. Drop them above or choose them.",
  note: "Plain text: headings, lists and tables survive, images cannot. Files stay on this device.",
  action: "Convert to TXT",
  convert: async (file, options, context) => {
    const model = await BL.parseOdt(file, { signal: context.signal });
    return [{
      name: `${BL.baseName(file.name)}.txt`,
      blob: new Blob([BL.modelToText(model)], { type: "text/plain" }),
    }];
  },
});
