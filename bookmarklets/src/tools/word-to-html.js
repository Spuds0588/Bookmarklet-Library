/**
 * @name 📄 Word to HTML
 * @category files
 * @description Turn .docx files into standalone HTML, images included, one or many.
 * @tags word, docx, html, convert, office, batch
 * @added 2026-10-26
 * @featured false
 */
// @parts ui,zip,xml,images,docx-read,html,word-out
startTool({
  slug: "word-to-html",
  title: "Word to HTML",
  accept: ".docx,.docm",
  dropTitle: "Drop Word files",
  hint: "or choose .docx or .docm files. Images are embedded.",
  empty: "No Word files yet. Drop them above or choose them.",
  note: "Standalone HTML with inline CSS. Images become data URLs. Files stay on this device.",
  action: "Convert to HTML",
  convert: async (file, options, context) => {
    const model = await BL.parseDocx(file, { signal: context.signal });
    return [{
      name: `${BL.baseName(file.name)}.html`,
      blob: new Blob([BL.docxToHtml(model)], { type: "text/html" }),
    }];
  },
});
