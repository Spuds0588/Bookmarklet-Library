/* ODT writer: the shared document model -> an OpenDocument text package.
   Entries are stored rather than deflated, which OpenDocument allows for every
   part; only mimetype has extra rules (first entry, stored, no extra field), and
   BL.makeZip already writes exactly what it is handed, in order. */

BL.ODF_HEADING_PT = [20, 16, 14, 13, 12, 11];

BL.odfTextStyleXml = (name, run) => {
  const props = [];
  if (run.bold) props.push('fo:font-weight="bold"');
  if (run.italic) props.push('fo:font-style="italic"');
  if (run.underline) props.push('style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"');
  if (run.strike) props.push('style:text-line-through-style="solid"');
  if (run.size) props.push(`fo:font-size="${BL.odfPtValue(run.size)}"`);
  if (run.code) props.push(`fo:font-family="'Liberation Mono',Consolas,monospace"`);
  else if (run.font) props.push(`fo:font-family="${BL.odfTextEscape(run.font)}"`);
  if (run.superscript) props.push('style:text-position="super 58%"');
  if (run.subscript) props.push('style:text-position="sub 58%"');
  if (!props.length) return "";
  return `<style:style style:name="${name}" style:family="text"><style:text-properties ${props.join(" ")}/></style:style>`;
};

BL.odfParagraphStyleXml = (name, block) => {
  const props = [];
  const text = [];
  if (block.align) props.push(`fo:text-align="${block.align}"`);
  if (block.indent) props.push(`fo:margin-left="${BL.odfPtValue(block.indent)}"`);
  if (block.before) props.push(`fo:margin-top="${BL.odfPtValue(block.before)}"`);
  if (block.after) props.push(`fo:margin-bottom="${BL.odfPtValue(block.after)}"`);
  if (block.pageBreak) props.push('fo:break-before="page"');
  if (block.type === "heading") {
    props.push('fo:keep-with-next="always"');
    text.push('fo:font-weight="bold"', `fo:font-size="${BL.ODF_HEADING_PT[Math.min(6, block.level || 1) - 1]}pt"`);
  }
  if (block.code) text.push(`fo:font-family="'Liberation Mono',Consolas,monospace"`, 'fo:font-size="10pt"');
  if (block.quote) props.push('fo:margin-left="1cm"');
  return `<style:style style:name="${name}" style:family="paragraph" style:parent-style-name="Standard">${
    props.length ? `<style:paragraph-properties ${props.join(" ")}/>` : ""
  }${text.length ? `<style:text-properties ${text.join(" ")}/>` : ""}</style:style>`;
};

/* Nine levels per list style, the way LibreOffice writes them. */
BL.odfListStyleXml = (name, ordered) => {
  const levels = [];
  for (let level = 1; level <= 9; level++) {
    const properties = `<style:list-level-properties text:space-before="${(0.5 * level).toFixed(2)}cm" text:min-label-width="0.5cm"/>`;
    levels.push(ordered
      ? `<text:list-level-style-number text:level="${level}" style:num-format="1" style:num-suffix=".">${properties}</text:list-level-style-number>`
      : `<text:list-level-style-bullet text:level="${level}" text:bullet-char="${["•", "◦", "▪"][(level - 1) % 3]}">${properties}</text:list-level-style-bullet>`);
  }
  return `<text:list-style style:name="${name}">${levels.join("")}</text:list-style>`;
};

BL.odfCellStyleXml = (name, header) =>
  `<style:style style:name="${name}" style:family="table-cell"><style:table-cell-properties fo:padding="0.1cm" fo:border="0.5pt solid #bfbfbf"${
    header ? ' fo:background-color="#f2f2f2"' : ""
  }/></style:style>`;

BL.writeOdt = async (model) => {
  const section = { width: 612, height: 792, top: 72, right: 72, bottom: 72, left: 72, ...(model.section || {}) };
  const textStyles = new Map();
  const paragraphStyles = new Map();
  const media = [];
  const key = (...parts) => parts.map((part) => (part && part !== 0 ? String(part) : "")).join("|");

  const runKey = (run) => key(run.bold, run.italic, run.underline, run.strike, run.size, run.font, run.code, run.superscript, run.subscript);
  const textStyleFor = (run) => {
    const id = runKey(run);
    if (!id) return "";
    if (!textStyles.has(id)) textStyles.set(id, { name: `T${textStyles.size + 1}`, props: run });
    return textStyles.get(id).name;
  };
  const paragraphStyleFor = (block) => {
    const id = key(block.type, block.level, block.align, block.indent, block.before, block.after, block.pageBreak, block.code, block.quote);
    if (!paragraphStyles.has(id)) paragraphStyles.set(id, { name: `P${paragraphStyles.size + 1}`, props: block });
    return paragraphStyles.get(id).name;
  };

  /* Text keeps its line breaks, tabs and runs of spaces as ODF elements. */
  const textXml = (value) => {
    const parts = [];
    for (const chunk of String(value).split("\n")) {
      if (parts.length) parts.push("<text:line-break/>");
      parts.push(chunk.split(/(\t| {2,})/).map((piece) => {
        if (!piece) return "";
        if (piece === "\t") return "<text:tab/>";
        if (/^ {2,}$/.test(piece)) return `<text:s text:c="${piece.length}"/>`;
        return BL.odfTextEscape(piece);
      }).join(""));
    }
    return parts.join("");
  };

  const imageXml = (width, height, index) => {
    const image = model.images?.[index];
    if (!image?.bytes) return "";
    const path = `Pictures/image${index + 1}.${BL.imageExtension(image.mime)}`;
    if (!media.some((item) => item.name === path)) {
      media.push({ name: path, blob: new Blob([image.bytes], { type: image.mime }), type: image.mime });
    }
    return `<draw:frame draw:name="Image${index + 1}" text:anchor-type="as-char" svg:width="${BL.odfCm(width || image.width || 320)}" svg:height="${BL.odfCm(height || image.height || 200)}">` +
      `<draw:image xlink:href="${path}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`;
  };

  const runXml = (run) => {
    if (run.image !== undefined) return imageXml(run.imageWidth, run.imageHeight, run.image);
    if (!run.text) return "";
    const name = textStyleFor(run);
    const body = name ? `<text:span text:style-name="${name}">${textXml(run.text)}</text:span>` : textXml(run.text);
    if (run.link) return `<text:a xlink:type="simple" xlink:href="${BL.xmlEscape(run.link)}">${body}</text:a>`;
    return body;
  };

  const paragraphXml = (block) => {
    const name = paragraphStyleFor(block);
    const runs = (block.runs || []).map(runXml).join("");
    if (block.type === "heading") {
      return `<text:h text:style-name="${name}" text:outline-level="${Math.min(6, block.level || 1)}">${runs}</text:h>`;
    }
    return `<text:p text:style-name="${name}">${runs}</text:p>`;
  };

  let tableSeq = 0;
  const tableXml = (block) => {
    const columns = Math.max(1, ...block.rows.map((row) => row.cells.reduce((sum, cell) => sum + (cell.colspan || 1), 0)));
    const covered = new Array(columns).fill(0);
    const rowsXml = [];
    for (const row of block.rows || []) {
      let xml = "";
      let column = 0;
      for (const cell of row.cells || []) {
        while (column < columns && covered[column] > 0) {
          xml += "<table:covered-table-cell/>";
          covered[column]--;
          column++;
        }
        if (column >= columns) break;
        const colspan = Math.max(1, cell.colspan || 1);
        const rowspan = Math.max(1, cell.rowspan || 1);
        const style = cell.header ? "TableHeader" : "TableCell";
        const spans = `${colspan > 1 ? ` table:number-columns-spanned="${colspan}"` : ""}${rowspan > 1 ? ` table:number-rows-spanned="${rowspan}"` : ""}`;
        const inner = (cell.blocks?.length ? cell.blocks : [{ type: "paragraph", runs: cell.runs || [] }])
          .map((child) => (child.type === "table" ? paragraphXml({ type: "paragraph", runs: [] }) : paragraphXml({ ...child, type: "paragraph", listLevel: 0 })))
          .join("");
        xml += `<table:table-cell table:style-name="${style}" office:value-type="string"${spans}>${inner}</table:table-cell>`;
        // OpenDocument wants a covered cell for every position a span takes in
        // this row; rows below a row span are covered when they are written.
        for (let offset = 1; offset < colspan && column + offset < columns; offset++) xml += "<table:covered-table-cell/>";
        if (rowspan > 1) {
          for (let offset = 0; offset < colspan && column + offset < columns; offset++) covered[column + offset] = rowspan - 1;
        }
        column += colspan;
      }
      while (column < columns) {
        if (covered[column] > 0) {
          xml += "<table:covered-table-cell/>";
          covered[column]--;
        } else xml += "<table:table-cell/>";
        column++;
      }
      rowsXml.push(`<table:table-row>${xml}</table:table-row>`);
    }
    const headerRows = block.rows.filter((row) => row.header).length;
    const head = headerRows ? `<table:table-header-rows>${rowsXml.splice(0, headerRows).join("")}</table:table-header-rows>` : "";
    return `<table:table table:name="Table${++tableSeq}" table:style-name="Table">` +
      `<table:table-column table:style-name="TableColumn" table:number-columns-repeated="${columns}"/>${head}${rowsXml.join("")}</table:table>`;
  };

  const bodyXml = [];
  const lists = [];

  // Lists are flat in the model, so consecutive items are grouped back into one
  // text:list and deeper levels nest inside the item above them.
  const emitList = (block) => {
    const level = Math.min(8, block.listLevel || 0);
    const ordered = Boolean(block.ordered);
    const id = key(block.listId || "", ordered, level);
    while (lists.length && (lists.at(-1).level > level || (lists.at(-1).level === level && lists.at(-1).id !== id))) {
      const list = lists.pop();
      if (list.openItem) bodyXml.push("</text:list-item>");
      bodyXml.push("</text:list>");
    }
    if (!lists.length || lists.at(-1).level !== level) {
      bodyXml.push(`<text:list text:style-name="${ordered ? "LNumber" : "LBullet"}">`);
      lists.push({ level, id, openItem: false });
    }
    const list = lists.at(-1);
    if (list.openItem) bodyXml.push("</text:list-item>");
    list.openItem = true;
    const start = ordered && block.start && block.start > 1 ? ` text:start-value="${block.start}"` : "";
    bodyXml.push(`<text:list-item${start}>`);
    bodyXml.push(paragraphXml(block));
  };

  const closeLists = () => {
    while (lists.length) {
      const list = lists.pop();
      if (list.openItem) bodyXml.push("</text:list-item>");
      bodyXml.push("</text:list>");
    }
  };

  let imageIndex = 0;
  for (const block of model.blocks || []) {
    if (block.type === "list") {
      emitList(block);
      continue;
    }
    closeLists();
    if (block.type === "pagebreak") bodyXml.push('<text:p text:style-name="PageBreak"/>');
    else if (block.type === "table") bodyXml.push(tableXml(block));
    else if (block.type === "image") bodyXml.push(`<text:p text:style-name="Standard">${imageXml(0, 0, block.image ?? imageIndex++)}</text:p>`);
    else bodyXml.push(paragraphXml(block));
  }
  closeLists();
  if (!bodyXml.length) bodyXml.push('<text:p text:style-name="Standard"/>');

  const automatic = [
    ...[...textStyles.values()].map((item) => BL.odfTextStyleXml(item.name, item.props)),
    ...[...paragraphStyles.values()].map((item) => BL.odfParagraphStyleXml(item.name, item.props)),
    BL.odfListStyleXml("LBullet", false),
    BL.odfListStyleXml("LNumber", true),
    BL.odfCellStyleXml("TableCell", false),
    BL.odfCellStyleXml("TableHeader", true),
    '<style:style style:name="Table" style:family="table"><style:table-properties table:align="margins" fo:margin-top="0.15cm" fo:margin-bottom="0.15cm"/></style:style>',
    '<style:style style:name="TableColumn" style:family="table-column"><style:table-column-properties style:column-width="4cm"/></style:style>',
  ];

  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-content ${BL.ODF_NS} office:version="1.3">` +
    `<office:automatic-styles>${automatic.join("")}</office:automatic-styles>` +
    `<office:body><office:text>${bodyXml.join("")}</office:text></office:body></office:document-content>`;

  const pageLayout = `<style:page-layout style:name="PageLayout"><style:page-layout-properties fo:page-width="${BL.odfCm(section.width / 0.75)}" fo:page-height="${BL.odfCm(section.height / 0.75)}" style:print-orientation="${
    section.width > section.height ? "landscape" : "portrait"
  }" fo:margin-top="${BL.odfCm(section.top / 0.75)}" fo:margin-bottom="${BL.odfCm(section.bottom / 0.75)}" fo:margin-left="${BL.odfCm(section.left / 0.75)}" fo:margin-right="${BL.odfCm(section.right / 0.75)}"/></style:page-layout>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-styles ${BL.ODF_NS} office:version="1.3">` +
    `<office:styles><style:default-style style:family="paragraph"><style:paragraph-properties fo:orphans="2" fo:widows="2" fo:margin-top="0cm" fo:margin-bottom="0.2cm"/>` +
    `<style:text-properties fo:font-size="11pt" style:font-size-asian="11pt" style:font-size-complex="11pt"/></style:default-style>` +
    `<style:style style:name="Standard" style:family="paragraph" style:class="text"/>` +
    `<style:style style:name="PageBreak" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:break-before="page"/></style:style>` +
    `</office:styles><office:automatic-styles>${pageLayout}</office:automatic-styles>` +
    `<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="PageLayout"/></office:master-styles></office:document-styles>`;

  const title = BL.odfTextEscape(model.title || "Converted document");
  const metaXml = `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-meta ${BL.ODF_NS} office:version="1.3"><office:meta>` +
    `<dc:title>${title}</dc:title><meta:generator>Bookmarklet Library</meta:generator></office:meta></office:document-meta>`;

  const mime = "application/vnd.oasis.opendocument.text";
  const manifest = BL.odfManifest(mime, [
    { path: "content.xml", type: "text/xml" },
    { path: "styles.xml", type: "text/xml" },
    { path: "meta.xml", type: "text/xml" },
    ...media.map((item) => ({ path: item.name, type: item.type })),
  ]);

  return BL.makeZip([
    { name: "mimetype", blob: new Blob([mime], { type: "text/plain" }) },
    { name: "META-INF/manifest.xml", blob: new Blob([manifest], { type: "text/xml" }) },
    { name: "content.xml", blob: new Blob([contentXml], { type: "text/xml" }) },
    { name: "styles.xml", blob: new Blob([stylesXml], { type: "text/xml" }) },
    { name: "meta.xml", blob: new Blob([metaXml], { type: "text/xml" }) },
    ...media.map((item) => ({ name: item.name, blob: item.blob })),
  ]);
};
