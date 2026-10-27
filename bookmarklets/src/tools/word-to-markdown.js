/**
 * @name 📄 Word to Markdown
 * @category files
 * @description Convert .docx files to Markdown with headings, lists, tables and images.
 * @tags word, docx, markdown, md, convert, office, batch
 * @added 2026-10-26
 * @featured false
 */
// @parts ui,zip,xml,images,docx-read,markdown,word-out
startTool({
  slug: "word-to-markdown",
  title: "Word to Markdown",
  accept: ".docx,.docm",
  dropTitle: "Drop Word files",
  hint: "or choose .docx or .docm files. Images become data URLs.",
  empty: "No Word files yet. Drop them above or choose them.",
  note: "GitHub-flavoured Markdown. Images are embedded as data URLs, so files can get large. Files stay on this device.",
  action: "Convert to Markdown",
  convert: async (file, options, context) => {
    const model = await BL.parseDocx(file, { signal: context.signal });
    return [{
      name: `${BL.baseName(file.name)}.md`,
      blob: new Blob([BL.docxToMarkdown(model)], { type: "text/markdown" }),
    }];
  },
});
