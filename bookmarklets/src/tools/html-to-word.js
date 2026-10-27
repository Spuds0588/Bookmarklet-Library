/**
 * @name 📝 HTML to Word
 * @category files
 * @description Turn HTML pages into .docx files with headings, lists, tables, links and images.
 * @tags html, word, docx, convert, office, batch
 * @added 2026-10-26
 * @featured false
 */
// @parts ui,zip,xml,html,images,docx-write,word-out
startTool({
  slug: "html-to-word",
  title: "HTML to Word",
  accept: ".html,.htm",
  dropTitle: "Drop HTML files",
  hint: "or choose .html or .htm files. Data-URL images are kept.",
  empty: "No HTML files yet. Drop them above or choose them.",
  note: "Word document with headings, lists, links and tables. Relative images cannot be found from a single file; data-URL and CORS images are embedded. Files stay on this device.",
  action: "Convert to Word",
  convert: async (file, options, context) => {
    const html = await file.text();
    const model = await BL.htmlToModel(html, { uiWindow: context.uiWindow, name: file.name });
    const blob = await BL.writeDocx(model);
    return {
      files: [{ name: `${BL.baseName(file.name)}.docx`, blob }],
      note: BL.imageNoteForModel(model),
    };
  },
});
