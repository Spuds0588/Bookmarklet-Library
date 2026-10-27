/**
 * @name 📝 RTF to Word
 * @category files
 * @description Open RTF files as .docx, keeping formatting, tables and PNG or JPEG images.
 * @tags rtf, word, docx, convert, office, batch
 * @added 2026-10-26
 * @featured false
 */
// @parts ui,zip,xml,rtf,images,docx-write,word-out
startTool({
  slug: "rtf-to-word",
  title: "RTF to Word",
  accept: ".rtf",
  dropTitle: "Drop RTF files",
  hint: "or choose .rtf files. PNG and JPEG pictures are kept.",
  empty: "No RTF files yet. Drop them above or choose them.",
  note: "Word document with paragraphs, formatting, simple tables and pictures. Only PNG and JPEG pictures are kept; other formats are skipped. Files stay on this device.",
  action: "Convert to Word",
  convert: async (file, options, context) => {
    const model = await BL.parseRtf(await file.text(), { name: file.name });
    const blob = await BL.writeDocx(model);
    return [{
      name: `${BL.baseName(file.name)}.docx`,
      blob,
    }];
  },
});
