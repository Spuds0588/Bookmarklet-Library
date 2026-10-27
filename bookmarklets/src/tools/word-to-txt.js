/**
 * @name 📄 Word to TXT
 * @category files
 * @description Pull the text out of .docx files; tables become tab-separated rows.
 * @tags word, docx, txt, text, convert, office, batch
 * @added 2026-10-26
 * @featured false
 */
// @parts ui,zip,xml,images,docx-read,word-out
startTool({
  slug: "word-to-txt",
  title: "Word to TXT",
  accept: ".docx,.docm",
  dropTitle: "Drop Word files",
  hint: "or choose .docx or .docm files. The text comes out, images do not.",
  empty: "No Word files yet. Drop them above or choose them.",
  note: "Plain text: headings, lists and tables survive, images cannot. Files stay on this device.",
  action: "Convert to TXT",
  convert: async (file, options, context) => {
    const model = await BL.parseDocx(file, { signal: context.signal });
    return [{
      name: `${BL.baseName(file.name)}.txt`,
      blob: new Blob([BL.docxToText(model)], { type: "text/plain" }),
    }];
  },
});
