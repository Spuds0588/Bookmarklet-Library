/**
 * @name 📝 Markdown to ODT
 * @category files
 * @description Turn Markdown into .odt documents with headings, lists, tables and links.
 * @tags markdown, md, odt, libreoffice, opendocument, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,markdown,images,odf-package,odt-out,word-out
startTool({
  slug: "markdown-to-odt",
  title: "Markdown to ODT",
  accept: ".md,.markdown",
  dropTitle: "Drop Markdown files",
  hint: "or choose .md files. Data-URL images are kept.",
  empty: "No Markdown files yet. Drop them above or choose them.",
  note: "OpenDocument text with headings, lists, code blocks, tables and links. Remote images depend on CORS; relative images are skipped. Files stay on this device.",
  action: "Convert to ODT",
  convert: async (file, options, context) => {
    const model = await BL.parseMarkdown(await file.text(), { uiWindow: context.uiWindow, name: file.name });
    const blob = await BL.writeOdt(model);
    return {
      files: [{ name: `${BL.baseName(file.name)}.odt`, blob }],
      note: BL.imageNoteForModel(model),
    };
  },
});
