/* Model transformations shared by the Word export/import tools. */

BL.runText = (runs, model = null) => (runs || []).map((run) => {
  if (run.image !== undefined) return "";
  return run.text || "";
}).join("");

/* A table cell can hold several paragraphs; writers that emit one line per
   cell join them so a label and its amount never run together. */
BL.cellBlocks = (cell) => (cell?.blocks?.length ? cell.blocks : [{ runs: cell?.runs || [] }]);
BL.cellText = (cell, joiner = " ") => BL.cellBlocks(cell)
  .map((block) => BL.runText(block.runs).replace(/\s+/g, " ").trim())
  .filter(Boolean)
  .join(joiner);

/* The text renderer works on the shared model, so the ODF tools use it too. */
BL.modelToText = (model) => {
  const lines = [];
  for (const block of model.blocks || []) {
    if (block.type === "pagebreak") { lines.push(""); continue; }
    if (block.type === "table") {
      for (const row of block.rows) lines.push(row.cells.map((cell) => BL.cellText(cell)).join("\t"));
      lines.push("");
      continue;
    }
    if (block.type === "image") { lines.push("[image]"); continue; }
    const hasImage = block.runs?.some((run) => run.image !== undefined);
    const text = BL.runText(block.runs).replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n");
    if (block.type === "heading") {
      if (text.trim()) lines.push(text.trim(), "");
      else if (hasImage) lines.push("[image]", "");
      continue;
    }
    if (block.type === "list") {
      lines.push(`${block.marker || (block.ordered ? "1." : "•")} ${text.trim() || (hasImage ? "[image]" : "")}`.trim());
      continue;
    }
    if (text.trim()) lines.push(text);
    else if (hasImage) lines.push("[image]");
    else lines.push("");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
};

BL.docxToHtml = (model) => BL.htmlFromModel(model);
BL.docxToRtf = (model) => BL.rtfFromModel(model);
BL.docxToMarkdown = (model) => BL.markdownFromModel(model);

BL.docxToPdf = async (model, options = {}) => BL.pdfFromModel(model, options);

BL.modelNote = (model, options = {}) => {
  const notes = [];
  if (model.skippedImages) notes.push(`${model.skippedImages} unsupported image${model.skippedImages === 1 ? "" : "s"} skipped`);
  if (options.pdf?.replaced) notes.push(`${options.pdf.replaced} character${options.pdf.replaced === 1 ? "" : "s"} replaced (PDF uses Latin-1)`);
  if (options.pdf?.skippedImages) notes.push(`${options.pdf.skippedImages} image${options.pdf.skippedImages === 1 ? "" : "s"} could not be rendered`);
  return notes.length ? ` ${notes.join("; ")}.` : "";
};

BL.textToModel = (bytes, name) => {
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { text = new TextDecoder("windows-1252").decode(bytes); }
  text = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const blocks = text.split("\n").map((line) => ({ type: "paragraph", runs: line ? [{ text: line }] : [], align: "" }));
  return {
    title: BL.baseName(name || ""),
    blocks,
    images: [],
    section: { width: 612, height: 792, top: 72, right: 72, bottom: 72, left: 72 },
    skippedImages: 0,
    source: name,
  };
};

BL.htmlToDocx = async (html, options = {}) => {
  const model = await BL.htmlToModel(html, options);
  const blob = await BL.writeDocx(model);
  return { blob, model, skipped: model.skippedImages };
};

BL.rtfToDocx = async (rtf, options = {}) => {
  const model = await BL.parseRtf(rtf, options);
  const blob = await BL.writeDocx(model);
  return { blob, model, skipped: model.skippedImages };
};

BL.markdownToDocx = async (markdown, options = {}) => {
  const model = await BL.parseMarkdown(markdown, options);
  const blob = await BL.writeDocx(model);
  return { blob, model, skipped: model.skippedImages };
};

BL.txtToDocx = async (bytes, name) => {
  const model = BL.textToModel(bytes, name);
  const blob = await BL.writeDocx(model);
  return { blob, model };
};

BL.imageNoteForModel = (model) => model.skippedImages ? ` ${model.skippedImages} image${model.skippedImages === 1 ? "" : "s"} skipped (relative, blocked or unsupported).` : "";
