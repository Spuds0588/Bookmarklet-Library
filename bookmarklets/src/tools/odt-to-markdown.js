/**
 * @name 📄 ODT to Markdown
 * @category files
 * @description Convert .odt documents to Markdown with headings, lists, tables and images.
 * @tags odt, libreoffice, opendocument, markdown, md, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,images,odf,markdown,word-out
startTool({
  slug: "odt-to-markdown",
  title: "ODT to Markdown",
  accept: ".odt",
  dropTitle: "Drop ODT files",
  hint: "or choose .odt files. Images become data URLs.",
  empty: "No ODT files yet. Drop them above or choose them.",
  note: "GitHub-flavoured Markdown with bold and italic runs, links and tables. Images are embedded as data URLs, so files can get large. Files stay on this device.",
  action: "Convert to Markdown",
  convert: async (file, options, context) => {
    const model = await BL.parseOdt(file, { signal: context.signal });
    return [{
      name: `${BL.baseName(file.name)}.md`,
      blob: new Blob([BL.markdownFromModel(model)], { type: "text/markdown" }),
    }];
  },
});
