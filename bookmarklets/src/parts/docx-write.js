/* DOCX writer: block model -> a valid .docx package (stored ZIP entries). */

BL.docxStylesXml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/></w:rPr></w:style>
${[1, 2, 3, 4, 5, 6].map((level) => `<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="${level - 1}"/><w:spacing w:before="${level <= 2 ? 360 : 240}" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="${[40, 32, 28, 26, 24, 22][level - 1]}"/></w:rPr></w:style>`).join("\n")}
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F4F4F4"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="720"/></w:pPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>
</w:styles>`;

BL.docxNumberingXml = (orderedLists = []) => {
  const bullet = "•◦▪";
  const bulletLevels = Array.from({ length: 9 }, (_, level) => `<w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="${bullet[Math.min(level, 2)]}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 + level * 360}" w:hanging="360"/></w:pPr></w:lvl>`).join("");
  const decimalLevels = Array.from({ length: 9 }, (_, level) => `<w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%${level + 1}."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 + level * 360}" w:hanging="360"/></w:pPr></w:lvl>`).join("");
  const nums = [`<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>`];
  for (const list of orderedLists) {
    const start = list.start > 1 ? `<w:lvlOverride w:ilvl="0"><w:startOverride w:val="${list.start}"/></w:lvlOverride>` : "";
    nums.push(`<w:num w:numId="${list.numId}"><w:abstractNumId w:val="1"/>${start}</w:num>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0">${bulletLevels}</w:abstractNum>
<w:abstractNum w:abstractNumId="1">${decimalLevels}</w:abstractNum>
${nums.join("\n")}
</w:numbering>`;
};

BL.writeDocx = async (model) => {
  const section = { width: 612, height: 792, top: 72, right: 72, bottom: 72, left: 72, ...(model.section || {}) };
  const rels = [
    { id: "rId1", target: "styles.xml", type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" },
    { id: "rId2", target: "numbering.xml", type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" },
  ];
  const relIds = new Map();
  const media = [];
  const addRel = (target, type, external = false) => {
    const key = `${type}|${target}`;
    if (relIds.has(key)) return relIds.get(key);
    const id = `rId${rels.length + 1}`;
    rels.push({ id, target, type, external });
    relIds.set(key, id);
    return id;
  };
  const imageRel = (index) => {
    const image = model.images?.[index];
    if (!image?.bytes) return "";
    const extension = BL.imageExtension(image.mime);
    const path = `media/image${index + 1}.${extension}`;
    if (!media.some((item) => item.path === path)) {
      media.push({ path, image });
    }
    return addRel(path, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image");
  };
  const linkRel = (target) => {
    if (!target || target.startsWith("#")) return "";
    if (!/^(https?|mailto):/i.test(target)) return "";
    return addRel(target, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", true);
  };
  const orderedLists = [];
  const orderedIds = new Map();
  let nextOrderedId = 2;
  const numIdFor = (block) => {
    if (!block.ordered) return 1;
    const key = block.listId || "ordered";
    if (!orderedIds.has(key)) {
      const numId = nextOrderedId++;
      orderedIds.set(key, numId);
      orderedLists.push({ numId, start: block.start || 1 });
    }
    return orderedIds.get(key);
  };

  const runProps = (run) => {
    const parts = [];
    const style = [];
    if (run.code) style.push("Code");
    if (run.link) style.push("Hyperlink");
    if (style.length) parts.push(`<w:rStyle w:val="${style.at(-1)}"/>`);
    if (run.bold) parts.push("<w:b/>");
    if (run.italic) parts.push("<w:i/>");
    if (run.underline) parts.push('<w:u w:val="single"/>');
    if (run.strike) parts.push("<w:strike/>");
    if (run.superscript) parts.push('<w:vertAlign w:val="superscript"/>');
    if (run.subscript) parts.push('<w:vertAlign w:val="subscript"/>');
    if (run.size) parts.push(`<w:sz w:val="${Math.round(run.size * 2)}"/><w:szCs w:val="${Math.round(run.size * 2)}"/>`);
    if (run.font) parts.push(`<w:rFonts w:ascii="${BL.xmlEscape(run.font)}" w:hAnsi="${BL.xmlEscape(run.font)}"/>`);
    return parts.length ? `<w:rPr>${parts.join("")}</w:rPr>` : "";
  };

  const imageXml = (index, width, height) => {
    const image = model.images?.[index];
    const rel = imageRel(index);
    if (!image || !rel) return "";
    const cx = Math.round((width || image.width || 320) * 9525);
    const cy = Math.round((height || image.height || 200) * 9525);
    const name = BL.xmlEscape(image.alt || `image${index + 1}`);
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${index + 1}" name="${name}" descr="${name}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${index + 1}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rel}"/></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  };

  const runXml = (run) => {
    if (run.image !== undefined) return imageXml(run.image, run.imageWidth, run.imageHeight);
    if (!run.text) return "";
    const pieces = String(run.text).split(/(\n)/);
    return pieces.map((piece) => {
      if (piece === "\n") return "<w:r><w:br/></w:r>";
      if (!piece) return "";
      return `<w:r>${runProps(run)}<w:t xml:space="preserve">${BL.xmlEscape(piece)}</w:t></w:r>`;
    }).join("");
  };

  const paragraphRuns = (runs) => {
    let xml = "";
    let link = "";
    let buffer = [];
    const flush = () => {
      if (!buffer.length) return;
      const body = buffer.join("");
      if (link) {
        const id = linkRel(link);
        if (id) xml += `<w:hyperlink r:id="${id}">${body}</w:hyperlink>`;
        else if (link.startsWith("#")) xml += `<w:hyperlink w:anchor="${BL.xmlEscape(link.slice(1))}">${body}</w:hyperlink>`;
        else xml += body;
      } else {
        xml += body;
      }
      buffer = [];
    };
    for (const run of runs || []) {
      if ((run.link || "") !== link) {
        flush();
        link = run.link || "";
      }
      buffer.push(runXml(run));
    }
    flush();
    return xml;
  };

  const paragraphXml = (block) => {
    const props = [];
    if (block.type === "heading") props.push(`<w:pStyle w:val="${block.level === 1 ? "Title" : `Heading${Math.min(6, block.level || 1)}`}"/>`);
    else if (block.code) props.push('<w:pStyle w:val="Code"/>');
    else if (block.quote) props.push('<w:pStyle w:val="Quote"/>');
    if (block.type === "list") {
      props.push(`<w:numPr><w:ilvl w:val="${Math.min(8, block.listLevel || 0)}"/><w:numId w:val="${numIdFor(block)}"/></w:numPr>`);
    }
    if (block.align) props.push(`<w:jc w:val="${{ center: "center", right: "right", justify: "both" }[block.align] || "left"}"/>`);
    if (block.before || block.after) props.push(`<w:spacing w:before="${Math.round((block.before || 0) * 20)}" w:after="${Math.round((block.after || 0) * 20)}"/>`);
    if (block.indent) props.push(`<w:ind w:left="${Math.round(block.indent * 20)}"/>`);
    if (block.pageBreak) props.push("<w:pageBreakBefore/>");
    return `<w:p>${props.length ? `<w:pPr>${props.join("")}</w:pPr>` : ""}${paragraphRuns(block.runs)}</w:p>`;
  };

  const tableXml = (block) => {
    const columns = Math.max(1, ...block.rows.map((row) => row.cells.reduce((sum, cell) => sum + (cell.colspan || 1), 0)));
    const width = Math.floor((section.width - section.left - section.right) / columns);
    const grid = Array.from({ length: columns }, () => `<w:gridCol w:w="${Math.round(width * 20)}"/>`).join("");
    const borders = `<w:tblBorders><w:top w:val="single" w:sz="4" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="4" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideH w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:color="BFBFBF"/></w:tblBorders>`;
    const rows = block.rows.map((row) => {
      const cells = row.cells.map((cell) => {
        const colspan = Math.max(1, cell.colspan || 1);
        const span = colspan > 1 ? `<w:gridSpan w:val="${colspan}"/>` : "";
        const shade = cell.header ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>' : "";
        const paragraphs = (cell.blocks?.length ? cell.blocks : [{ type: "paragraph", runs: cell.runs || [] }])
          .map((inner) => paragraphXml({ ...inner, type: "paragraph", listLevel: 0 })).join("");
        return `<w:tc><w:tcPr><w:tcW w:w="${Math.round(width * colspan * 20)}" w:type="dxa"/>${span}${shade}<w:vAlign w:val="top"/></w:tcPr>${paragraphs}</w:tc>`;
      }).join("");
      return `<w:tr>${row.header ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${cells}</w:tr>`;
    }).join("");
    return `<w:tbl><w:tblPr><w:tblW w:w="${Math.round((section.width - section.left - section.right) * 20)}" w:type="dxa"/>${borders}<w:tblCellMar><w:left w:w="108" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows}</w:tbl>`;
  };

  const bodyParts = [];
  let imageIndex = 0;
  for (const block of model.blocks || []) {
    if (block.type === "pagebreak") {
      bodyParts.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    } else if (block.type === "table") {
      bodyParts.push(tableXml(block));
    } else if (block.type === "image") {
      bodyParts.push(paragraphXml({ type: "paragraph", runs: [{ image: block.image ?? imageIndex++ }] }));
    } else {
      bodyParts.push(paragraphXml(block));
    }
  }
  if (!bodyParts.length) bodyParts.push("<w:p/>");

  const sectionXml = `<w:sectPr><w:pgSz w:w="${Math.round(section.width * 20)}" w:h="${Math.round(section.height * 20)}"/><w:pgMar w:top="${Math.round(section.top * 20)}" w:right="${Math.round(section.right * 20)}" w:bottom="${Math.round(section.bottom * 20)}" w:left="${Math.round(section.left * 20)}" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>`;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${bodyParts.join("")}${sectionXml}</w:body></w:document>`;

  const relXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.map((rel) => `<Relationship Id="${rel.id}" Type="${rel.type}" Target="${BL.xmlEscape(rel.target)}"${rel.external ? ' TargetMode="External"' : ""}/>`).join("")}</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Default Extension="bmp" ContentType="image/bmp"/><Default Extension="webp" ContentType="image/webp"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;

  const title = BL.xmlEscape(model.title || "Converted document");
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${title}</dc:title><dc:creator>Bookmarklet Library</dc:creator><cp:lastModifiedBy>Bookmarklet Library</cp:lastModifiedBy></cp:coreProperties>`;

  const entries = [
    { name: "[Content_Types].xml", text: contentTypes },
    { name: "_rels/.rels", text: rootRels },
    { name: "docProps/core.xml", text: core },
    { name: "word/document.xml", text: documentXml },
    { name: "word/styles.xml", text: BL.docxStylesXml() },
    { name: "word/numbering.xml", text: BL.docxNumberingXml(orderedLists) },
    { name: "word/_rels/document.xml.rels", text: relXml },
  ];
  const items = entries.map((entry) => ({ name: entry.name, blob: new Blob([entry.text], { type: "application/xml" }) }));
  for (const item of media) {
    items.push({ name: `word/${item.path}`, blob: new Blob([item.image.bytes], { type: item.image.mime }) });
  }
  return BL.makeZip(items);
};
