/**
 * @name 📄 ODT to PDF
 * @category files
 * @description Turn .odt documents into PDFs with text, tables and embedded images.
 * @tags odt, libreoffice, opendocument, pdf, convert, office, batch
 * @added 2026-10-27
 * @featured false
 */
// @parts ui,zip,xml,images,odf,pdf,word-out
startTool({
  slug: "odt-to-pdf",
  title: "ODT to PDF",
  accept: ".odt",
  dropTitle: "Drop ODT files",
  hint: "or choose .odt files. The page size comes from the document.",
  empty: "No ODT files yet. Drop them above or choose them.",
  note: "PDF with Helvetica text, tables and block images, sized from the document's page layout. Latin-1 only; unsupported characters are replaced. Files stay on this device.",
  action: "Convert to PDF",
  convert: async (file, options, context) => {
    const model = await BL.parseOdt(file, { signal: context.signal });
    const pdf = await BL.pdfFromModel(model, { uiWindow: context.uiWindow });
    return {
      files: [{
        name: `${BL.baseName(file.name)}.pdf`,
        blob: pdf.blob,
      }],
      note: BL.modelNote(model, { pdf }),
    };
  },
});
