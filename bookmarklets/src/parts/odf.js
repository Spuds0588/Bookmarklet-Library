/* OpenDocument text reader: an .odt package -> the shared block/run document model.
   The mapping follows the OpenDocument Engine Suite (MIT, github.com/Spuds0588/
   OpenDocument-Engine-Suite): elements are matched by local name so a different
   prefix binding does not matter, styles resolve through style:parent-style-name,
   and the repeat counters LibreOffice pads files with are clamped before use. */

BL.odfParse = (source) => {
  const text = String(source || "");
  const root = { name: "#document", attrs: {}, children: [] };
  const stack = [root];
  const addText = (value, decode = true) => {
    if (!value) return;
    // Whitespace between elements is package indentation, not document text:
    // a real newline inside a paragraph always comes from text:line-break.
    if (decode && !value.trim() && value.includes("\n")) return;
    stack.at(-1).children.push({ name: "#text", text: decode ? BL.decodeEntities(value) : value });
  };
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf("<", index);
    if (open < 0) {
      addText(text.slice(index));
      break;
    }
    if (open > index) addText(text.slice(index, open));
    if (text.startsWith("<!--", open)) {
      const end = text.indexOf("-->", open + 4);
      index = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith("<![CDATA[", open)) {
      const end = text.indexOf("]]>", open + 9);
      addText(text.slice(open + 9, end < 0 ? text.length : end), false);
      index = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith("<?", open)) {
      const end = text.indexOf("?>", open + 2);
      index = end < 0 ? text.length : end + 2;
      continue;
    }
    if (text.startsWith("<!", open)) {
      const end = text.indexOf(">", open + 2);
      index = end < 0 ? text.length : end + 1;
      continue;
    }
    const close = text.indexOf(">", open + 1);
    if (close < 0) break;
    let inside = text.slice(open + 1, close).trim();
    index = close + 1;
    if (!inside) continue;
    if (inside.startsWith("/")) {
      const name = inside.slice(1).trim().toLowerCase();
      for (let depth = stack.length - 1; depth > 0; depth--) {
        if (stack[depth].name === name) {
          stack.length = depth;
          break;
        }
      }
      continue;
    }
    const selfClosing = inside.endsWith("/");
    if (selfClosing) inside = inside.slice(0, -1).trim();
    const space = inside.search(/\s/);
    const name = (space < 0 ? inside : inside.slice(0, space)).toLowerCase();
    const attrs = {};
    if (space >= 0) {
      const pattern = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
      let match;
      while ((match = pattern.exec(inside.slice(space + 1)))) {
        attrs[match[1].toLowerCase()] = BL.decodeEntities(match[3] ?? match[4] ?? "");
      }
    }
    const node = { name, attrs, children: [] };
    stack.at(-1).children.push(node);
    if (!selfClosing) stack.push(node);
  }
  return root.children.find((child) => child.name !== "#text") || root;
};

BL.odfChildren = (node, local) =>
  (node?.children || []).filter((child) => child.name !== "#text" && BL.localName(child.name) === local);

BL.odfChild = (node, local) => BL.odfChildren(node, local)[0] || null;

BL.odfDescend = (node, local) => {
  if (!node) return null;
  for (const child of node.children || []) {
    if (child.name === "#text") continue;
    if (BL.localName(child.name) === local) return child;
    const found = BL.odfDescend(child, local);
    if (found) return found;
  }
  return null;
};

/* Attributes are asked for by their usual prefixed name and found by suffix when
   a document binds the namespace to another prefix. */
BL.odfAttr = (node, local, fallback = "") => {
  const attrs = node?.attrs;
  if (!attrs) return fallback;
  const exact = attrs[local];
  if (exact !== undefined) return exact;
  for (const key in attrs) if (key.endsWith(`:${local}`)) return attrs[key];
  return fallback;
};

/* Text of a node in document order, expanding the ODF whitespace elements. */
BL.odfText = (node) => {
  let value = "";
  const visit = (current) => {
    for (const child of current.children || []) {
      if (child.name === "#text") {
        value += child.text;
        continue;
      }
      const tag = BL.localName(child.name);
      if (tag === "s") {
        const count = Math.min(Math.max(Number(BL.odfAttr(child, "text:c", "1")) || 1, 1), 200);
        value += " ".repeat(count);
      } else if (tag === "tab") value += "\t";
      else if (tag === "line-break") value += "\n";
      else visit(child);
    }
  };
  visit(node);
  return value;
};

/* ODF lengths (10mm, 2.5cm, 1in, 12pt, 6pc, 96px) as px or pt. */
BL.odfLength = (value, unit = "px") => {
  const match = /^\s*(-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*([a-z]*)\s*$/i.exec(String(value ?? ""));
  if (!match) return 0;
  const factor = { in: 1, cm: 1 / 2.54, mm: 1 / 25.4, pt: 1 / 72, pc: 1 / 6, px: 1 / 96 }[(match[2] || "px").toLowerCase()];
  if (!factor) return 0;
  return Math.round(Number(match[1]) * factor * (unit === "pt" ? 72 : 96) * 100) / 100;
};

BL.odfPx = (value) => BL.odfLength(value, "px");
BL.odfPt = (value) => BL.odfLength(value, "pt");

/* Style names encode spaces as _20_: "Heading_20_1" is "Heading 1". */
BL.odfStyleName = (name) =>
  String(name || "").replace(/_([0-9a-f]{2})_/gi, (match, hex) => {
    const code = Number.parseInt(hex, 16);
    return code > 31 ? String.fromCharCode(code) : match;
  });

BL.odfProps = (element) => {
  const props = {};
  const visit = (node) => {
    if (node.name !== "#text") {
      const tag = BL.localName(node.name);
      const value = (name) => BL.odfAttr(node, name, "");
      if (tag === "text-properties") {
        const weight = value("fo:font-weight");
        if (weight) props.bold = /^(bold|[6-9]\d\d)$/i.test(weight);
        const style = value("fo:font-style");
        if (style) props.italic = /^(italic|oblique)$/i.test(style);
        const underline = value("style:text-underline-style") || value("style:text-underline-type");
        if (underline) props.underline = underline !== "none";
        const strike = value("style:text-line-through-style") || value("style:text-line-through-type");
        if (strike) props.strike = strike !== "none";
        const size = BL.odfPt(value("fo:font-size"));
        if (size) props.size = Math.round(size * 10) / 10;
        const font = value("fo:font-family") || value("style:font-name");
        if (font) props.font = font.replace(/^['"]|['"]$/g, "");
        const position = value("style:text-position");
        if (position) {
          if (/super/.test(position) || Number.parseFloat(position) > 0) props.superscript = true;
          else if (/sub/.test(position) || Number.parseFloat(position) < 0) props.subscript = true;
        }
      } else if (tag === "paragraph-properties") {
        const align = value("fo:text-align");
        if (align) props.align = { center: "center", right: "right", end: "right", justify: "justify" }[align] || "";
        const indent = BL.odfPt(value("fo:margin-left"));
        if (indent) props.indent = indent;
        const before = BL.odfPt(value("fo:margin-top"));
        if (before) props.before = before;
        const after = BL.odfPt(value("fo:margin-bottom"));
        if (after) props.after = after;
        const pageBreak = value("fo:page-break-before") || value("fo:break-before");
        props.pageBreak = pageBreak === "always" || pageBreak === "page";
      }
      for (const child of node.children || []) visit(child);
    }
  };
  for (const child of element?.children || []) visit(child);
  return props;
};

BL.odfPageLayout = (element) => {
  const props = BL.odfDescend(element, "page-layout-properties");
  const all = BL.odfAttr(props, "fo:margin", "");
  const side = (name, fallback) => BL.odfPt(BL.odfAttr(props, name)) || BL.odfPt(all) || fallback;
  return {
    width: BL.odfPt(BL.odfAttr(props, "fo:page-width")) || 595.3,
    height: BL.odfPt(BL.odfAttr(props, "fo:page-height")) || 841.9,
    top: side("fo:margin-top", 56.7),
    bottom: side("fo:margin-bottom", 56.7),
    left: side("fo:margin-left", 56.7),
    right: side("fo:margin-right", 56.7),
  };
};

/* Named styles, defaults, list styles, page layouts and master pages, resolved
   through the parent-style chain. */
BL.odfStyleBook = (docs) => {
  const named = new Map();
  const defaults = new Map();
  const lists = new Map();
  const layouts = new Map();
  const masters = new Map();
  const cache = new Map();

  const index = (element) => {
    const tag = BL.localName(element.name);
    const name = BL.odfAttr(element, "style:name");
    if (tag === "style" && name) {
      named.set(name, {
        family: BL.odfAttr(element, "style:family"),
        parent: BL.odfAttr(element, "style:parent-style-name"),
        props: BL.odfProps(element),
      });
    } else if (tag === "default-style") {
      const family = BL.odfAttr(element, "style:family");
      if (family) defaults.set(family, BL.odfProps(element));
    } else if (tag === "list-style" && name) {
      const levels = new Map();
      for (const child of element.children || []) {
        if (child.name === "#text") continue;
        const kind = BL.localName(child.name);
        if (kind !== "list-level-style-number" && kind !== "list-level-style-bullet") continue;
        const ordered = kind === "list-level-style-number";
        levels.set(Number(BL.odfAttr(child, "text:level", "1")) || 1, {
          ordered,
          format: BL.odfAttr(child, "style:num-format", "1") || "1",
          prefix: BL.odfAttr(child, "style:num-prefix", ""),
          suffix: BL.odfAttr(child, "style:num-suffix", "") || (ordered ? "." : ""),
          bullet: BL.odfAttr(child, "text:bullet-char", "•") || "•",
          start: Number(BL.odfAttr(child, "text:start-value", "1")) || 1,
        });
      }
      lists.set(name, levels);
    } else if (tag === "page-layout" && name) {
      layouts.set(name, BL.odfPageLayout(element));
    } else if (tag === "master-page" && name) {
      masters.set(name, BL.odfAttr(element, "style:page-layout-name"));
    }
  };

  const walk = (element) => {
    index(element);
    for (const child of element.children || []) if (child.name !== "#text") walk(child);
  };

  for (const doc of docs) {
    if (!doc) continue;
    for (const container of doc.children || []) {
      if (container.name === "#text") continue;
      if (!["styles", "automatic-styles", "master-styles"].includes(BL.localName(container.name))) continue;
      for (const child of container.children || []) if (child.name !== "#text") walk(child);
    }
  }

  const resolve = (name) => {
    if (!name) return {};
    if (cache.has(name)) return cache.get(name);
    const chain = [];
    const seen = new Set();
    let current = name;
    while (current && named.has(current) && !seen.has(current) && chain.length < 32) {
      seen.add(current);
      const style = named.get(current);
      chain.unshift(style.props);
      current = style.parent;
    }
    const family = named.get(name)?.family || "";
    const props = { ...(defaults.get(family) || {}) };
    for (const item of chain) Object.assign(props, item);
    cache.set(name, props);
    return props;
  };

  const bullet = { ordered: false, format: "1", prefix: "", suffix: "", bullet: "•", start: 1 };
  const listLevel = (name, level) => {
    const levels = lists.get(name);
    if (!levels) return bullet;
    return levels.get(Math.min(Math.max(level, 1), 10)) || levels.get(1) || bullet;
  };

  const section = () => {
    const master = masters.get("Standard") || [...masters.values()][0];
    return layouts.get(master) || [...layouts.values()][0] || {
      width: 595.3,
      height: 841.9,
      top: 56.7,
      bottom: 56.7,
      left: 56.7,
      right: 56.7,
    };
  };

  return { resolve, listLevel, section };
};

/* Pictures stored in the package, matched by href the way the suite matches them. */
BL.odfMedia = (zip) => {
  const files = new Map();
  for (const path of zip.parts.keys()) {
    if (!/^Pictures\//i.test(path)) continue;
    const mime = BL.imageMime(path);
    if (mime) files.set(path, mime);
  }
  const find = (href) => {
    let target = String(href || "").replace(/\\/g, "/").replace(/^\.\//, "");
    if (!target) return null;
    try {
      target = decodeURIComponent(target);
    } catch {
      /* keep the raw href */
    }
    const base = target.split("/").pop();
    const path = files.has(target) ? target : [...files.keys()].find((item) => item.split("/").pop() === base);
    if (!path) return null;
    return { mime: files.get(path), bytes: zip.parts.get(path) };
  };
  return { find };
};

BL.odfNumber = (format, value) => {
  if (format === "a") return String.fromCharCode(97 + (((value - 1) % 26) + 26) % 26);
  if (format === "A") return String.fromCharCode(65 + (((value - 1) % 26) + 26) % 26);
  if (format === "i" || format === "I") {
    const map = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
    let number = Math.max(1, value);
    let text = "";
    for (const [amount, glyph] of map) {
      while (number >= amount) {
        text += glyph;
        number -= amount;
      }
    }
    return format === "I" ? text.toUpperCase() : text;
  }
  return String(value);
};

/* Indentation newlines inside a paragraph collapse to one space; ODF only breaks
   a line where a text:line-break element says so. */
BL.odfSpacing = (value) => String(value || "").replace(/[ \t]*\r?\n[ \t]*/g, " ");

BL.odfTrimRuns = (runs) => {
  const out = runs.slice();
  while (out.length && out[0].image === undefined) {
    out[0].text = String(out[0].text || "").replace(/^[ \t]+/, "");
    if (out[0].text) break;
    out.shift();
  }
  while (out.length && out.at(-1).image === undefined) {
    out.at(-1).text = String(out.at(-1).text || "").replace(/[ \t]+$/, "");
    if (out.at(-1).text) break;
    out.pop();
  }
  return out;
};

BL.odfImage = (frame, ctx) => {
  const element = BL.localName(frame.name) === "image" ? frame : BL.odfDescend(frame, "image");
  if (!element) return null;
  const media = ctx.media.find(BL.odfAttr(element, "xlink:href"));
  if (!media) {
    ctx.skipped++;
    return null;
  }
  const intrinsic = BL.imageSize(media.bytes);
  const title = BL.odfDescend(frame, "title") || BL.odfDescend(frame, "desc");
  ctx.images.push({
    bytes: media.bytes,
    mime: media.mime,
    width: BL.odfPx(BL.odfAttr(frame, "svg:width")) || intrinsic?.width || 320,
    height: BL.odfPx(BL.odfAttr(frame, "svg:height")) || intrinsic?.height || 200,
    alt: (title ? BL.odfText(title).trim() : "") || BL.odfAttr(frame, "draw:name"),
  });
  return ctx.images.length - 1;
};

/* Only the character properties belong on a run; paragraph properties such as
   alignment and margins stay on the block. */
BL.odfRunFormat = (props) => {
  const format = {};
  for (const name of ["bold", "italic", "underline", "strike", "size", "font", "superscript", "subscript", "code"]) {
    if (props[name] !== undefined) format[name] = props[name];
  }
  return format;
};

BL.odfRuns = (element, ctx, base) => {
  const runs = [];
  const visit = (node, format) => {
    for (const child of node.children || []) {
      if (child.name === "#text") {
        const value = BL.odfSpacing(child.text);
        if (value) runs.push({ ...format, text: value });
        continue;
      }
      const tag = BL.localName(child.name);
      if (tag === "s") {
        const count = Math.min(Math.max(Number(BL.odfAttr(child, "text:c", "1")) || 1, 1), 200);
        runs.push({ ...format, text: " ".repeat(count) });
      } else if (tag === "tab") runs.push({ ...format, text: "\t" });
      else if (tag === "line-break") runs.push({ ...format, text: "\n" });
      else if (tag === "span" || tag === "a") {
        const styleName = BL.odfAttr(child, "text:style-name");
        const next = { ...format, ...BL.odfRunFormat(ctx.book.resolve(styleName)) };
        if (/^(preformatted|code|source)/i.test(BL.odfStyleName(styleName))) next.code = true;
        if (tag === "a") next.link = BL.odfAttr(child, "xlink:href");
        visit(child, next);
      } else if (tag === "frame" || tag === "image") {
        const index = BL.odfImage(child, ctx);
        if (index !== null) runs.push({ ...format, image: index });
      } else if (tag === "note" || tag === "annotation" || tag === "index-mark" || tag === "soft-page-break") {
        continue;
      } else visit(child, format);
    }
  };
  visit(element, base);
  return BL.odfTrimRuns(BL.mergeRuns(runs));
};

BL.odfParagraph = (element, ctx, heading) => {
  const styleName = BL.odfAttr(element, "text:style-name");
  const props = ctx.book.resolve(styleName);
  const name = BL.odfStyleName(styleName);
  const block = {
    type: "paragraph",
    runs: BL.odfRuns(element, ctx, BL.odfRunFormat(props)),
    align: props.align || "",
    before: props.before || 0,
    after: props.after || 0,
    indent: props.indent || 0,
    pageBreak: Boolean(props.pageBreak),
    link: "",
  };
  if (heading) {
    const outline = Number(BL.odfAttr(element, "text:outline-level", "0")) || 0;
    const match = /(?:heading|h)[ _-]?([1-9])/i.exec(name);
    block.type = "heading";
    block.level = Math.min(6, outline || (match ? Number(match[1]) : 0) || 1);
  }
  if (/^(preformatted|code|source)/i.test(name)) block.code = true;
  if (/quot/i.test(name)) block.quote = true;
  return block;
};

/* A list item's first paragraph carries the marker; further paragraphs and
   nested lists follow it as ordinary blocks, which is how the flat model holds
   lists everywhere else in the library. */
BL.odfList = (element, ctx, level, inheritedId = "") => {
  const definition = ctx.book.listLevel(BL.odfAttr(element, "text:style-name"), level + 1);
  // Nested lists continue the parent list's numbering, so they share its id.
  const listId = inheritedId || `odf-list-${++ctx.listSeq}`;
  const blocks = [];
  let counter = definition.start || 1;
  let first = true;

  for (const item of element.children || []) {
    if (item.name === "#text") continue;
    const tag = BL.localName(item.name);
    if (tag === "list") {
      blocks.push(...BL.odfList(item, ctx, level + 1, listId));
      continue;
    }
    if (tag !== "list-item" && tag !== "list-header") continue;
    const start = Number(BL.odfAttr(item, "text:start-value", "0")) || 0;
    if (start) counter = start;
    const marker = definition.ordered
      ? `${definition.prefix}${BL.odfNumber(definition.format, counter)}${definition.suffix}`
      : definition.bullet;
    let lead = null;
    for (const child of item.children || []) {
      if (child.name === "#text") continue;
      const kind = BL.localName(child.name);
      if (kind === "p" || kind === "h") {
        const block = BL.odfParagraph(child, ctx, kind === "h" ? 1 : 0);
        if (lead) {
          blocks.push(block);
          continue;
        }
        lead = {
          type: "list",
          ordered: Boolean(definition.ordered),
          marker,
          listLevel: level,
          listId,
          runs: block.runs,
          align: block.align || "",
        };
        if (first && definition.ordered && counter !== (definition.start || 1)) lead.start = counter;
        blocks.push(lead);
      } else if (kind === "list") {
        blocks.push(...BL.odfList(child, ctx, level + 1, listId));
      }
    }
    if (definition.ordered) counter++;
    first = false;
  }
  return blocks;
};

BL.odfCellBlocks = (element, ctx) => {
  const blocks = [];
  for (const block of BL.odfBlocks(element, ctx)) {
    // The model has no nested tables; their text joins the cell as paragraphs.
    if (block.type === "table") {
      for (const row of block.rows) blocks.push({ type: "paragraph", runs: row.cells.flatMap((cell) => cell.runs || []), align: "" });
      continue;
    }
    blocks.push(block);
  }
  return blocks;
};

BL.odfTable = (element, ctx) => {
  const rows = [];
  const isEmpty = (cell) => cell.colspan === 1 && !cell.runs.length && !cell.blocks.length;

  const pushRow = (rowElement, header) => {
    if (rows.length >= 5000) return;
    const repeat = Math.min(Math.max(Number(BL.odfAttr(rowElement, "table:number-rows-repeated", "1")) || 1, 1), 200);
    const cells = [];
    for (const child of rowElement.children || []) {
      if (child.name === "#text" || cells.length >= 256) continue;
      const tag = BL.localName(child.name);
      // Covered cells are the shadow of a span; the writers rebuild the grid
      // from table:number-columns-spanned, so they are skipped.
      if (tag === "covered-table-cell" || tag !== "table-cell") continue;
      const repeatColumns = Math.min(Math.max(Number(BL.odfAttr(child, "table:number-columns-repeated", "1")) || 1, 1), 100);
      const blocks = BL.odfCellBlocks(child, ctx);
      const cell = {
        runs: blocks.flatMap((block) => block.runs || []),
        blocks,
        colspan: Math.min(Math.max(Number(BL.odfAttr(child, "table:number-columns-spanned", "1")) || 1, 1), 64),
        rowspan: Math.min(Math.max(Number(BL.odfAttr(child, "table:number-rows-spanned", "1")) || 1, 1), 64),
        header,
      };
      for (let index = 0; index < repeatColumns && cells.length < 256; index++) cells.push(cell);
    }
    while (cells.length && isEmpty(cells.at(-1))) cells.pop();
    for (let index = 0; index < repeat && rows.length < 5000; index++) {
      rows.push({ cells: index ? cells.map((cell) => ({ ...cell })) : cells, header });
    }
  };

  const readRows = (node, header) => {
    for (const child of node.children || []) {
      if (child.name === "#text") continue;
      const tag = BL.localName(child.name);
      if (tag === "table-header-rows") readRows(child, true);
      else if (tag === "table-row-group" || tag === "table-rows") readRows(child, header);
      else if (tag === "table-row") pushRow(child, header);
    }
  };
  readRows(element, false);

  const width = rows.reduce((max, row) => Math.max(max, row.cells.length), 0);
  if (!width) return null;
  return { type: "table", rows, grid: [] };
};

BL.odfBlocks = (parent, ctx) => {
  const blocks = [];
  // Generated content such as a table of contents would duplicate the headings.
  const generated = new Set(["table-of-content", "alphabetical-index", "illustration-index", "index-title", "sequence-decls", "forms"]);
  for (const element of parent.children || []) {
    if (element.name === "#text") continue;
    const tag = BL.localName(element.name);
    if (tag === "h") blocks.push(BL.odfParagraph(element, ctx, 1));
    else if (tag === "p") blocks.push(BL.odfParagraph(element, ctx, 0));
    else if (tag === "list") blocks.push(...BL.odfList(element, ctx, 0));
    else if (tag === "table") {
      const table = BL.odfTable(element, ctx);
      if (table) blocks.push(table);
    } else if (tag === "section" || tag === "index-body") {
      blocks.push(...BL.odfBlocks(element, ctx));
    } else if (tag === "frame") {
      const image = BL.odfImage(element, ctx);
      if (image !== null) blocks.push({ type: "paragraph", runs: [{ image }], align: "" });
    } else if (tag === "soft-page-break") {
      blocks.push({ type: "pagebreak" });
    } else if (generated.has(tag)) {
      continue;
    } else if (BL.odfChildren(element, "p").length || BL.odfChildren(element, "table").length) {
      blocks.push(...BL.odfBlocks(element, ctx));
    }
  }
  return blocks;
};

BL.parseOdt = async (file, options = {}) => {
  const zip = await BL.unzip(file, options);
  const content = zip.text("content.xml");
  if (!content) throw new Error("This is not an OpenDocument file. Use an .odt document saved by LibreOffice, Writer or another ODF app.");
  const root = BL.odfParse(content);
  const body = BL.odfDescend(root, "body");
  const text = body ? BL.odfChild(body, "text") : null;
  if (!text) throw new Error("This OpenDocument file is not a text document. Use .odt for documents and .ods for spreadsheets.");
  const styles = zip.has("styles.xml") ? BL.odfParse(zip.text("styles.xml")) : null;
  const ctx = {
    book: BL.odfStyleBook([styles, root]),
    media: BL.odfMedia(zip),
    images: [],
    skipped: 0,
    listSeq: 0,
  };
  const blocks = BL.odfBlocks(text, ctx);
  const meta = zip.has("meta.xml") ? BL.odfParse(zip.text("meta.xml")) : null;
  const title = meta ? BL.odfDescend(meta, "title") : null;
  return {
    title: title ? BL.odfText(title).trim() : "",
    blocks,
    images: ctx.images,
    section: ctx.book.section(),
    skippedImages: ctx.skipped,
    source: file.name,
  };
};
