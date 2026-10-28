/**
 * @name 📝 TXT to ODT
 * @category files
 * @description Make .odt documents from plain text, one paragraph per line.
 * @tags txt, text, odt, libreoffice, opendocument, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,images,odf-package,odt-out,word-out
startTool({
  slug: "txt-to-odt",
  title: "TXT to ODT",
  accept: ".txt",
  dropTitle: "Drop text files",
  hint: "or choose .txt files. Every line becomes a paragraph.",
  empty: "No text files yet. Drop them above or choose them.",
  note: "A simple OpenDocument text: lines stay lines, blank lines stay blank. Files stay on this device.",
  action: "Convert to ODT",
  convert: async (file, options, context) => {
    const model = BL.textToModel(new Uint8Array(await file.arrayBuffer()), file.name);
    const blob = await BL.writeOdt(model);
    return [{
      name: `${BL.baseName(file.name)}.odt`,
      blob,
    }];
  },
});
