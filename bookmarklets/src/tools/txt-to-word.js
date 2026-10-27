/**
 * @name 📝 TXT to Word
 * @category files
 * @description Make .docx files from plain text, one paragraph per line.
 * @tags txt, text, word, docx, convert, office, batch
 * @added 2026-10-26
 * @featured false
 */
// @parts ui,zip,xml,docx-write,word-out
startTool({
  slug: "txt-to-word",
  title: "TXT to Word",
  accept: ".txt",
  dropTitle: "Drop text files",
  hint: "or choose .txt files. Every line becomes a paragraph.",
  empty: "No text files yet. Drop them above or choose them.",
  note: "A simple Word document: lines stay lines, blank lines stay blank. Files stay on this device.",
  action: "Convert to Word",
  convert: async (file, options, context) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await BL.txtToDocx(bytes, file.name);
    return [{
      name: `${BL.baseName(file.name)}.docx`,
      blob: result.blob,
    }];
  },
});
