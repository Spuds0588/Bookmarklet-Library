/**
 * @name 📄 Word to PDF
 * @category files
 * @description Turn .docx files into PDFs with text, tables and embedded images.
 * @tags word, docx, pdf, convert, office, batch
 * @added 2026-10-26
 * @featured false
 */
// @parts ui,zip,xml,images,docx-read,pdf,word-out
startTool({
  slug: "word-to-pdf",
  title: "Word to PDF",
  accept: ".docx,.docm",
  dropTitle: "Drop Word files",
  hint: "or choose .docx or .docm files. Images are rasterized into the PDF.",
  empty: "No Word files yet. Drop them above or choose them.",
  note: "PDF with Helvetica text, tables and block images. Latin-1 only; unsupported characters are replaced. Files stay on this device.",
  action: "Convert to PDF",
  convert: async (file, options, context) => {
    const model = await BL.parseDocx(file, { signal: context.signal });
    const pdf = await BL.docxToPdf(model, { uiWindow: context.uiWindow });
    return {
      files: [{
        name: `${BL.baseName(file.name)}.pdf`,
        blob: pdf.blob,
      }],
      note: BL.modelNote(model, { pdf }),
    };
  },
});
