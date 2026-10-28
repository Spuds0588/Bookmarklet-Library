/* DOCX reader: OOXML package -> a small block/run document model. */

BL.docxOn = (node) => {
  if (!node) return false;
  const value = BL.attr(node, "w:val", "").toLowerCase();
  return value !== "0" && value !== "false" && value !== "off" && value !== "none";
};

BL.docxStyles = (xml) => {
  const styles = new Map();
  const defaults = { run: {}, paragraph: {} };
  if (!xml) return { styles, defaults, resolve: () => ({}) };
  const root = BL.parseXml(xml);
  const docDefaults = BL.child(root, "docdefaults");
  const defaultRun = BL.findFirst(docDefaults, "w:rpr");
  const defaultParagraph = BL.findFirst(docDefaults, "w:ppr");
  const readRun = (rPr) => {
    if (!rPr) return {};
    const result = {};
    if (BL.child(rPr, "w:b") && BL.docxOn(BL.child(rPr, "w:b"))) result.bold = true;
    if (BL.child(rPr, "w:i") && BL.docxOn(BL.child(rPr, "w:i"))) result.italic = true;
    if (BL.child(rPr, "w:u") && BL.docxOn(BL.child(rPr, "w:u"))) result.underline = true;
    if ((BL.child(rPr, "w:strike") && BL.docxOn(BL.child(rPr, "w:strike"))) || (BL.child(rPr, "w:dstrike") && BL.docxOn(BL.child(rPr, "w:dstrike")))) result.strike = true;
    const size = BL.child(rPr, "w:sz");
    if (size) result.size = Number(BL.attr(size, "w:val", 22)) / 2;
    const fonts = BL.child(rPr, "w:rfonts");
    if (fonts) result.font = BL.attr(fonts, "w:ascii") || BL.attr(fonts, "w:hansi") || BL.attr(fonts, "w:eastasia") || "";
    const vertical = BL.child(rPr, "w:vertalign");
    if (vertical) {
      const value = BL.attr(vertical, "w:val");
      if (value === "superscript") result.superscript = true;
      if (value === "subscript") result.subscript = true;
    }
    return result;
  };
  const readParagraph = (pPr) => {
    if (!pPr) return {};
    const result = {};
    const style = BL.child(pPr, "w:pstyle");
    if (style) result.style = BL.attr(style, "w:val");
    const outline = BL.child(pPr, "w:outlinelvl");
    if (outline) result.outline = Number(BL.attr(outline, "w:val", 0));
    const numPr = BL.child(pPr, "w:numpr");
    if (numPr) {
      const numId = BL.child(numPr, "w:numid");
      const level = BL.child(numPr, "w:ilvl");
      result.numPr = {
        id: numId ? BL.attr(numId, "w:val") : "",
        level: level ? Number(BL.attr(level, "w:val", 0)) : 0,
      };
    }
    return result;
  };
  if (defaultRun) defaults.run = readRun(defaultRun);
  if (defaultParagraph) defaults.paragraph = readParagraph(defaultParagraph);
  for (const style of BL.children(root, "w:style")) {
    const id = BL.attr(style, "w:styleid");
    if (!id) continue;
    const nameNode = BL.child(style, "w:name");
    const based = BL.child(style, "w:basedon");
    styles.set(id, {
      id,
      name: nameNode ? BL.attr(nameNode, "w:val") : id,
      basedOn: based ? BL.attr(based, "w:val") : "",
      run: readRun(BL.child(style, "w:rpr")),
      paragraph: readParagraph(BL.child(style, "w:ppr")),
    });
  }
  const resolve = (id, seen = new Set()) => {
    if (!id || seen.has(id)) return { run: {}, paragraph: {}, name: "" };
    seen.add(id);
    const style = styles.get(id);
    if (!style) return { run: {}, paragraph: {}, name: "" };
    const parent = style.basedOn ? resolve(style.basedOn, seen) : { run: {}, paragraph: {}, name: "" };
    return {
      name: style.name || parent.name,
      run: { ...parent.run, ...style.run },
      paragraph: { ...parent.paragraph, ...style.paragraph },
    };
  };
  return { styles, defaults, resolve };
};

BL.docxNumbering = (xml) => {
  const abstracts = new Map();
  const nums = new Map();
  if (!xml) return { nums, abstracts };
  const root = BL.parseXml(xml);
  for (const abstract of BL.children(root, "w:abstractnum")) {
    const id = BL.attr(abstract, "w:abstractnumid");
    const levels = new Map();
    for (const level of BL.children(abstract, "w:lvl")) {
      const ilvl = Number(BL.attr(level, "w:ilvl", 0));
      const format = BL.child(level, "w:numfmt");
      const text = BL.child(level, "w:lvltext");
      const start = BL.child(level, "w:start");
      levels.set(ilvl, {
        format: format ? BL.attr(format, "w:val", "decimal") : "decimal",
        text: text ? BL.attr(text, "w:val", "") : "",
        start: start ? Number(BL.attr(start, "w:val", 1)) : 1,
      });
    }
    abstracts.set(id, levels);
  }
  for (const num of BL.children(root, "w:num")) {
    const id = BL.attr(num, "w:numid");
    const abstract = BL.child(num, "w:abstractnumid");
    if (id && abstract) nums.set(id, BL.attr(abstract, "w:val"));
  }
  return { nums, abstracts };
};

BL.roman = (value) => {
  const map = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  let number = Math.max(1, value);
  let text = "";
  for (const [amount, glyph] of map) while (number >= amount) { text += glyph; number -= amount; }
  return text;
};

BL.listLabel = (format, value) => {
  if (format === "bullet" || format === "none") return "•";
  if (format === "lowerletter") return String.fromCharCode(96 + ((value - 1) % 26) + 1) + ".";
  if (format === "upperletter") return String.fromCharCode(64 + ((value - 1) % 26) + 1) + ".";
  if (format === "lowerroman") return BL.roman(value) + ".";
  if (format === "upperroman") return BL.roman(value).toUpperCase() + ".";
  return `${value}.`;
};

BL.parseDocx = async (file, options = {}) => {
  const zip = await BL.unzip(file, options);
  const documentXml = zip.text("word/document.xml");
  if (!documentXml) throw new Error("This file does not contain a Word document. Use a .docx file, not a legacy .doc.");
  const rels = BL.docxRels(zip.text("word/_rels/document.xml.rels"));
  const styleBook = BL.docxStyles(zip.text("word/styles.xml"));
  const numbering = BL.docxNumbering(zip.text("word/numbering.xml"));
  const root = BL.parseXml(documentXml);
  const body = BL.child(root, "w:body") || root;
  const images = [];
  const imageCache = new Map();
  let skippedImages = 0;
  let headings = 0;
  let pages = 0;
  const listCounters = new Map();
  const section = { width: 612, height: 792, top: 72, right: 72, bottom: 72, left: 72 };

  const readSect = (sectPr) => {
    if (!sectPr) return;
    const size = BL.child(sectPr, "w:pgsz");
    const margin = BL.child(sectPr, "w:pgmar");
    if (size) {
      section.width = Number(BL.attr(size, "w:w", 12240)) / 20;
      section.height = Number(BL.attr(size, "w:h", 15840)) / 20;
    }
    if (margin) {
      section.top = Number(BL.attr(margin, "w:top", 1440)) / 20;
      section.right = Number(BL.attr(margin, "w:right", 1440)) / 20;
      section.bottom = Number(BL.attr(margin, "w:bottom", 1440)) / 20;
      section.left = Number(BL.attr(margin, "w:left", 1440)) / 20;
    }
  };

  const addImage = (target, relation, alt, width, height) => {
    if (!relation || relation.mode === "External") return -1;
    if (imageCache.has(target)) return imageCache.get(target);
    const path = BL.resolvePart("word", relation.target);
    const bytes = zip.parts.get(path);
    if (!bytes) return -1;
    const mime = BL.imageMime(path);
    if (!["image/png", "image/jpeg", "image/gif", "image/bmp", "image/webp"].includes(mime)) {
      skippedImages++;
      return -1;
    }
    const intrinsic = BL.imageSize(bytes);
    const index = images.length;
    images.push({
      bytes,
      mime,
      width: width || intrinsic?.width || 320,
      height: height || intrinsic?.height || 200,
      alt: alt || "",
    });
    imageCache.set(target, index);
    return index;
  };

  const imageFromDrawing = (node) => {
    const blip = BL.findFirst(node, "a:blip");
    const imagedata = BL.findFirst(node, "v:imagedata");
    const id = blip ? BL.attr(blip, "r:embed") : imagedata ? BL.attr(imagedata, "r:id") : "";
    if (!id) return -1;
    const extent = BL.findFirst(node, "wp:extent");
    const docPr = BL.findFirst(node, "wp:docpr");
    const alt = docPr ? BL.attr(docPr, "descr") || BL.attr(docPr, "title") || BL.attr(docPr, "name") : "";
    const width = extent ? Number(BL.attr(extent, "cx", 0)) / 9525 : 0;
    const height = extent ? Number(BL.attr(extent, "cy", 0)) / 9525 : 0;
    return addImage(id, rels[id], alt, width, height);
  };

  const readRunProps = (rPr, style) => {
    const format = { ...styleBook.defaults.run, ...(style?.run || {}) };
    if (!rPr) return format;
    if (BL.child(rPr, "w:b")) format.bold = BL.docxOn(BL.child(rPr, "w:b"));
    if (BL.child(rPr, "w:i")) format.italic = BL.docxOn(BL.child(rPr, "w:i"));
    if (BL.child(rPr, "w:u")) format.underline = BL.docxOn(BL.child(rPr, "w:u"));
    if (BL.child(rPr, "w:strike") || BL.child(rPr, "w:dstrike")) {
      format.strike = BL.docxOn(BL.child(rPr, "w:strike")) || BL.docxOn(BL.child(rPr, "w:dstrike"));
    }
    const size = BL.child(rPr, "w:sz");
    if (size) format.size = Number(BL.attr(size, "w:val", 22)) / 2;
    const fonts = BL.child(rPr, "w:rfonts");
    if (fonts) format.font = BL.attr(fonts, "w:ascii") || BL.attr(fonts, "w:hansi") || BL.attr(fonts, "w:eastasia") || format.font;
    const vertical = BL.child(rPr, "w:vertalign");
    if (vertical) {
      const value = BL.attr(vertical, "w:val");
      if (value === "superscript") format.superscript = true;
      if (value === "subscript") format.subscript = true;
    }
    const runStyle = BL.child(rPr, "w:rstyle");
    if (runStyle) {
      const named = styleBook.resolve(BL.attr(runStyle, "w:val"));
      Object.assign(format, named.run);
      if (/code|preformatted/i.test(named.name || "")) format.code = true;
    }
    return format;
  };

  const readRuns = (node, format, paragraph, link = "") => {
    for (const child of node.children || []) {
      const name = child.name;
      if (name === "w:r") {
        const runStyleNode = BL.child(child, "w:rpr");
        const runStyleId = runStyleNode ? BL.attr(BL.child(runStyleNode, "w:rstyle"), "w:val") : "";
        const runStyle = runStyleId ? styleBook.resolve(runStyleId) : null;
        const next = { ...format, ...readRunProps(runStyleNode, runStyle) };
        if (link) next.link = link;
        if (/code|preformatted/i.test(runStyle?.name || "")) next.code = true;
        for (const piece of child.children || []) {
          if (piece.name === "w:t") {
            const value = BL.textContent(piece);
            if (value) paragraph.runs.push({ ...next, text: value });
          } else if (piece.name === "w:tab") {
            paragraph.runs.push({ ...next, text: "\t" });
          } else if (piece.name === "w:br" || piece.name === "w:cr") {
            if (BL.attr(piece, "w:type") === "page") paragraph.pageBreak = true;
            else paragraph.runs.push({ ...next, text: "\n" });
          } else if (piece.name === "w:noBreakHyphen") {
            paragraph.runs.push({ ...next, text: "-" });
          } else if (piece.name === "w:drawing" || piece.name === "w:pict") {
            const index = imageFromDrawing(piece);
            if (index >= 0) paragraph.runs.push({ ...next, image: index });
          } else if (piece.name === "w:instrtext") {
            const instruction = BL.textContent(piece);
            const match = /HYPERLINK\s+"([^"]+)"/i.exec(instruction);
            if (match) paragraph.link = match[1];
          }
        }
      } else if (name === "w:hyperlink") {
        const id = BL.attr(child, "r:id");
        const target = rels[id]?.target || BL.attr(child, "w:anchor");
        readRuns(child, format, paragraph, target);
        if (target) paragraph.link = target;
      } else if (name === "w:ins" || name === "w:smarttag" || name === "w:sdt" || name === "w:sdtcontent" || name === "w:fldsimple") {
        if (name === "w:fldsimple") {
          const instruction = BL.attr(child, "w:instr");
          const match = /HYPERLINK\s+"([^"]+)"/i.exec(instruction);
          readRuns(child, format, paragraph, match ? match[1] : link);
        } else {
          readRuns(child, format, paragraph, link);
        }
      }
    }
  };

  const readParagraph = (p, inheritedFormat = {}) => {
    const pPr = BL.child(p, "w:ppr");
    const styleId = pPr ? BL.attr(BL.child(pPr, "w:pstyle"), "w:val") : "";
    const style = styleId ? styleBook.resolve(styleId) : { run: {}, paragraph: {}, name: "" };
    const directOutline = BL.child(pPr, "w:outlinelvl");
    const outline = directOutline ? Number(BL.attr(directOutline, "w:val", 0)) : style.paragraph.outline;
    const name = style.name || "";
    const headingMatch = /^heading\s*([1-6])$/i.exec(name);
    const heading = headingMatch ? Number(headingMatch[1]) : /^title$/i.test(name) ? 1 : /^subtitle$/i.test(name) ? 2 : outline !== undefined ? Math.min(6, Math.max(1, Number(outline) + 1)) : 0;
    if (heading) headings++;
    const alignmentNode = BL.child(pPr, "w:jc");
    const alignment = alignmentNode ? BL.attr(alignmentNode, "w:val") : "";
    const spacing = BL.child(pPr, "w:spacing");
    const indent = BL.child(pPr, "w:ind");
    const directNumPr = BL.child(pPr, "w:numpr");
    const numPr = directNumPr || style.paragraph.numPr || null;
    const paragraph = {
      type: heading ? "heading" : "paragraph",
      level: heading,
      runs: [],
      align: alignment,
      before: spacing ? Number(BL.attr(spacing, "w:before", 0)) / 20 : 0,
      after: spacing ? Number(BL.attr(spacing, "w:after", 0)) / 20 : 0,
      indent: indent ? Number(BL.attr(indent, "w:left", 0)) / 20 : 0,
      pageBreak: BL.docxOn(BL.child(pPr, "w:pagebreakbefore")),
      link: "",
    };
    const baseFormat = { ...styleBook.defaults.run, ...(style.run || {}), ...inheritedFormat, ...readRunProps(BL.child(pPr, "w:rpr"), style) };
    readRuns(p, baseFormat, paragraph);
    if (paragraph.pageBreak) pages++;
    if (numPr) {
      const numId = directNumPr
        ? BL.attr(BL.child(directNumPr, "w:numid"), "w:val")
        : style.paragraph.numPr.id;
      const level = directNumPr
        ? Number(BL.attr(BL.child(directNumPr, "w:ilvl"), "w:val", 0))
        : style.paragraph.numPr.level || 0;
      const abstractId = numbering.nums.get(numId);
      const levels = numbering.abstracts.get(abstractId);
      const definition = levels?.get(level) || { format: "bullet", text: "", start: 1 };
      if (!listCounters.has(numId)) listCounters.set(numId, new Array(9).fill(0));
      const counters = listCounters.get(numId);
      counters[level] = counters[level] ? counters[level] + 1 : definition.start || 1;
      for (let depth = level + 1; depth < counters.length; depth++) counters[depth] = 0;
      let label = BL.listLabel(definition.format, counters[level]);
      if (definition.text && definition.format !== "bullet" && definition.format !== "none") {
        label = definition.text.replace(/%([1-9])/g, (match, index) => {
          const depth = Number(index) - 1;
          const value = counters[depth] || 1;
          return BL.listLabel(definition.format, value).replace(/\.$/, "");
        });
      }
      paragraph.type = "list";
      paragraph.ordered = definition.format !== "bullet" && definition.format !== "none";
      paragraph.listLevel = level;
      paragraph.marker = label;
      paragraph.numId = numId;
    }
    return paragraph;
  };

  const readTable = (table) => {
    const rows = [];
    const grid = BL.children(BL.child(table, "w:tblgrid"), "w:gridcol").map((col) => Number(BL.attr(col, "w:w", 0)) / 20);
    const readCellBlocks = (node, blocks) => {
      for (const child of node.children || []) {
        if (child.name === "w:p") {
          const paragraph = readParagraph(child);
          if (paragraph.runs.length) blocks.push(paragraph);
        } else if (child.name === "w:tbl") {
          const nested = readTable(child);
          for (const nestedRow of nested.rows) blocks.push({ type: "paragraph", runs: nestedRow.cells.flatMap((cell) => cell.runs || []) });
        } else if (child.name === "w:sdt" || child.name === "w:sdtcontent" || child.name === "w:customxml" || child.name === "w:ins") {
          readCellBlocks(child, blocks);
        }
      }
    };
    const readRows = (node) => {
      for (const child of node.children || []) {
        if (child.name === "w:sdt" || child.name === "w:sdtcontent" || child.name === "w:customxml") {
          readRows(child);
          continue;
        }
        if (child.name !== "w:tr") continue;
        const header = BL.docxOn(BL.child(BL.child(child, "w:trpr"), "w:tblheader"));
        const cells = [];
        for (const cellNode of BL.children(child, "w:tc")) {
          const cellProps = BL.child(cellNode, "w:tcpr");
          const spanNode = BL.child(cellProps, "w:gridspan");
          const vMerge = BL.child(cellProps, "w:vmerge");
          const colspan = spanNode ? Number(BL.attr(spanNode, "w:val", 1)) : 1;
          if (vMerge && BL.attr(vMerge, "w:val") !== "restart" && rows.length) {
            const above = rows.at(-1).cells[cells.length];
            if (above) above.rowspan = (above.rowspan || 1) + 1;
            continue;
          }
          const blocks = [];
          readCellBlocks(cellNode, blocks);
          const runs = blocks.flatMap((block) => block.runs || []);
          cells.push({ runs, blocks, colspan, rowspan: vMerge && BL.attr(vMerge, "w:val") === "restart" ? 1 : 1 });
        }
        rows.push({ cells, header });
      }
    };
    readRows(table);
    return { type: "table", rows, grid };
  };

  const blocks = [];
  const visit = (node) => {
    for (const child of node.children || []) {
      if (child.name === "w:p") {
        const paragraph = readParagraph(child);
        if (paragraph.runs.length || paragraph.type === "heading" || paragraph.type === "list") blocks.push(paragraph);
        if (paragraph.pageBreak) blocks.push({ type: "pagebreak" });
      } else if (child.name === "w:tbl") {
        blocks.push(readTable(child));
      } else if (child.name === "w:sectpr") {
        readSect(child);
      } else if (child.name === "w:sdt" || child.name === "w:sdtcontent" || child.name === "w:customxml" || child.name === "w:ins" || child.name === "w:smarttag") {
        visit(child);
      }
    }
  };
  visit(body);
  const lastSect = BL.findAll(body, "w:sectpr").at(-1);
  readSect(lastSect);

  let title = "";
  const core = zip.text("docProps/core.xml");
  if (core) {
    const coreRoot = BL.parseXml(core);
    const titleNode = BL.findFirst(coreRoot, "dc:title");
    if (titleNode) title = BL.textContent(titleNode);
  }

  return {
    title,
    blocks,
    images,
    section,
    skippedImages,
    headings,
    pages,
    source: file.name,
  };
};
