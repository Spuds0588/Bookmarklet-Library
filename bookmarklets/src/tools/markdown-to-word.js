/**
 * @name 📝 Markdown to Word
 * @category files
 * @description Turn Markdown into .docx with headings, lists, tables, links and images.
 * @tags markdown, md, word, docx, convert, office, batch
 * @added 2026-10-26
 * @featured false
 */
// @parts ui,zip,xml,markdown,images,docx-write,word-out
startTool({
  slug: "markdown-to-word",
  title: "Markdown to Word",
  accept: ".md,.markdown",
  dropTitle: "Drop Markdown files",
  hint: "or choose .md files. Data-URL images are kept.",
  empty: "No Markdown files yet. Drop them above or choose them.",
  note: "Word document with headings, lists, code blocks, tables and links. Remote images depend on CORS; relative images are skipped. Files stay on this device.",
  action: "Convert to Word",
  convert: async (file, options, context) => {
    const model = await BL.parseMarkdown(await file.text(), { uiWindow: context.uiWindow, name: file.name });
    const blob = await BL.writeDocx(model);
    return {
      files: [{ name: `${BL.baseName(file.name)}.docx`, blob }],
      note: BL.imageNoteForModel(model),
    };
  },
});
