/* RTF writer for the Word exporters and a small reader for RTF -> Word. */

BL.rtfEscape = (value) => {
  let output = "";
  for (const character of String(value ?? "")) {
    const code = character.codePointAt(0);
    if (character === "\\") output += "\\\\";
    else if (character === "{") output += "\\{";
    else if (character === "}") output += "\\}";
    else if (character === "\n") output += "\\line ";
    else if (character === "\t") output += "\\tab ";
    else if (code < 128) output += character;
    else {
      const units = character.length > 1 ? [character.charCodeAt(0), character.charCodeAt(1)] : [character.charCodeAt(0)];
      for (const unit of units) output += `\\u${unit > 32767 ? unit - 65536 : unit}?`;
    }
  }
  return output;
};

BL.rtfFromModel = (model) => {
  const fonts = new Set(["Calibri"]);
  for (const block of model.blocks || []) {
    for (const run of block.runs || []) if (run.font) fonts.add(run.font);
    for (const row of block.rows || []) for (const cell of row.cells) for (const run of cell.runs || []) if (run.font) fonts.add(run.font);
  }
  const fontList = [...fonts].slice(0, 16);
  const fontIndex = new Map(fontList.map((font, index) => [font, index]));
  const fontTable = fontList.map((font, index) => `{\\f${index} ${BL.rtfEscape(font).replace(/[{}\\]/g, "")};}`).join("");

  const runText = (run) => {
    if (run.image !== undefined) {
      const image = model.images?.[run.image];
      if (!image?.bytes || !["image/png", "image/jpeg"].includes(image.mime)) return "";
      const control = image.mime === "image/png" ? "\\pngblip" : "\\jpegblip";
      return `{\\pict${control}\\picw${image.width || 320}\\pich${image.height || 200}\\picwgoal${Math.round((image.width || 320) * 15)}\\pichgoal${Math.round((image.height || 200) * 15)} ${BL.hexBytes(image.bytes)}}`;
    }
    if (!run.text) return "";
    const controls = [];
    if (run.bold) controls.push("\\b");
    if (run.italic) controls.push("\\i");
    if (run.underline) controls.push("\\ul");
    if (run.strike) controls.push("\\strike");
    if (run.superscript) controls.push("\\super");
    if (run.subscript) controls.push("\\sub");
    if (run.size) controls.push(`\\fs${Math.round(run.size * 2)}`);
    if (run.font) controls.push(`\\f${fontIndex.get(run.font) ?? 0}`);
    const text = BL.rtfEscape(run.text);
    const prefix = controls.join("");
    const gap = prefix ? " " : "";
    if (run.link && /^https?:|^mailto:/i.test(run.link)) {
      return `{\\field{\\*\\fldinst HYPERLINK "${BL.rtfEscape(run.link).replace(/"/g, "")}"}{\\fldrslt{${prefix}${gap}${text}}}}`;
    }
    return `{${prefix}${gap}${text}}`;
  };

  const listCounters = new Map();
  const listMarker = (block) => {
    if (!block.ordered) return block.marker || "•";
    if (block.marker) return block.marker;
    const level = Math.min(8, block.listLevel || 0);
    const value = (listCounters.get(level) || 0) + 1;
    listCounters.set(level, value);
    return `${value}.`;
  };

  const paragraph = (block, extra = "") => {
    const controls = [];
    if (block.align === "center") controls.push("\\qc");
    else if (block.align === "right") controls.push("\\qr");
    else if (block.align === "justify") controls.push("\\qj");
    if (block.before) controls.push(`\\sb${Math.round(block.before * 20)}`);
    if (block.after) controls.push(`\\sa${Math.round(block.after * 20)}`);
    if (block.indent) controls.push(`\\li${Math.round(block.indent * 20)}`);
    if (block.type === "heading") controls.push(`\\fs${[40, 32, 28, 26, 24, 22][Math.min(5, (block.level || 1) - 1)]}\\b`);
    if (block.type === "list") {
      const level = Math.min(8, block.listLevel || 0);
      controls.push(`\\li${720 + level * 360}\\fi-360`);
      controls.push(`{\\pntext\\f0 ${BL.rtfEscape(listMarker(block))}\\tab}`);
    }
    if (block.quote) controls.push("\\li720\\i");
    if (block.code) controls.push("\\f1\\fs20");
    if (block.pageBreak) controls.push("\\page");
    const prefix = controls.join("");
    const gap = prefix && !prefix.endsWith("}") ? " " : "";
    return `\\pard${extra}${prefix}${gap}${(block.runs || []).map(runText).join("")}\\par\n`;
  };

  const chunks = [];
  for (const block of model.blocks || []) {
    if (block.type !== "list") listCounters.clear();
    if (block.type === "pagebreak") { chunks.push("\\page\n"); continue; }
    if (block.type === "image") {
      chunks.push(paragraph({ type: "paragraph", runs: [{ image: block.image }] }));
      continue;
    }
    if (block.type === "table") {
      const columns = Math.max(1, ...block.rows.map((row) => row.cells.reduce((sum, cell) => sum + (cell.colspan || 1), 0)));
      const cellWidth = Math.floor(9360 / columns);
      for (const row of block.rows) {
        let cells = "\\trowd\\trgaph108\\trleft0";
        let x = 0;
        for (const cell of row.cells) {
          const colspan = Math.max(1, cell.colspan || 1);
          for (let index = 0; index < colspan; index++) {
            x += cellWidth;
            cells += `\\clbrdrt\\brdrs\\brdrw10\\clbrdrl\\brdrs\\brdrw10\\clbrdrb\\brdrs\\brdrw10\\clbrdrr\\brdrs\\brdrw10\\cellx${x}`;
          }
        }
        cells += " ";
        for (const cell of row.cells) {
          const text = BL.cellBlocks(cell).map((block) => (block.runs || []).map((run) => runText({ ...run, bold: run.bold || row.header })).join("")).join("\\line ");
          cells += `\\pard\\intbl ${text}\\cell `;
        }
        cells += "\\row\n";
        chunks.push(cells);
      }
      continue;
    }
    chunks.push(paragraph(block));
  }

  return `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl${fontTable}}${chunks.join("")}}`;
};

/* Reader --------------------------------------------------------------- */

BL.rtfFontTable = (source) => {
  const fonts = new Map();
  const match = /\{\\fonttbl([\s\S]*?)\}/.exec(source);
  if (!match) return fonts;
  for (const item of match[1].matchAll(/\{\\f(\d+)([^{}]*)\}/g)) {
    const name = item[2].replace(/\\[a-z]+\d* ?/gi, "").replace(/[;{}]/g, "").trim();
    if (name) fonts.set(Number(item[1]), name);
  }
  return fonts;
};

BL.parseRtf = async (source, options = {}) => {
  const text = String(source || "");
  if (!/^\s*{\\rtf/i.test(text)) throw new Error("This file is not RTF.");
  const fonts = BL.rtfFontTable(text);
  const images = [];
  // A picture group can contain nested groups (\*\blipuid, \*\picprop), so a
  // non-greedy regex would stop at the first inner brace and leak the rest of
  // the hex into the document text. Match braces instead.
  const stripPictures = (source) => {
    let output = "";
    let index = 0;
    while (index < source.length) {
      if (!source.startsWith("{\\pict", index)) { output += source[index++]; continue; }
      let depth = 0;
      let end = source.length - 1;
      for (let scan = index; scan < source.length; scan++) {
        const character = source[scan];
        if (character === "\\") {
          if (source[scan + 1] === "{" || source[scan + 1] === "}" || source[scan + 1] === "\\") { scan++; continue; }
          const binary = /^\\bin(\d+)\s?/.exec(source.slice(scan, scan + 24));
          if (binary) { scan += binary[0].length + Number(binary[1]) - 1; continue; }
          scan++;
          continue;
        }
        if (character === "{") depth++;
        else if (character === "}" && --depth === 0) { end = scan; break; }
      }
      const body = source.slice(index + 6, end);
      const type = /\\pngblip/i.test(body) ? "image/png" : /\\jpe?gblip/i.test(body) ? "image/jpeg" : "";
      if (type) {
        let cleaned = body;
        for (let guard = 0; guard < 20 && /\{[^{}]*\}/.test(cleaned); guard++) cleaned = cleaned.replace(/\{[^{}]*\}/g, " ");
        const hex = cleaned.replace(/\\[a-zA-Z]+-?\d* ?/g, " ").replace(/[^0-9a-f]/gi, "");
        if (hex.length >= 4 && hex.length % 2 === 0) {
          const bytes = new Uint8Array(hex.length / 2);
          for (let offset = 0; offset < bytes.length; offset++) bytes[offset] = parseInt(hex.slice(offset * 2, offset * 2 + 2), 16);
          const picw = Number(/\\picw(\d+)/.exec(body)?.[1]) || BL.imageSize(bytes)?.width || 320;
          const pich = Number(/\\pich(\d+)/.exec(body)?.[1]) || BL.imageSize(bytes)?.height || 200;
          const image = images.push({ bytes, mime: type, width: picw, height: pich, alt: "" }) - 1;
          output += `\u0001${image}\u0001`;
        }
      }
      index = end + 1;
    }
    return output;
  };
  const withoutPictures = stripPictures(text);

  const blocks = [];
  let paragraph = { type: "paragraph", runs: [], align: "", pageBreak: false };
  let format = { bold: false, italic: false, underline: false, strike: false, size: 11, font: "", link: "", superscript: false, subscript: false };
  let stack = [];
  let skip = false;
  let skipDepth = -1;
  let destination = "";
  let fieldDepth = -1;
  let fieldLink = "";
  let fieldInstruction = "";
  let inFieldResult = false;
  let bullet = false;
  let outline = -1;
  let codepage = 1252;
  let pendingSkip = 0;
  let unicodeSkip = 1;
  let star = false;
  let groupDepth = 0;
  let table = null;
  let cell = null;
  let listLabel = "";
  let inPntext = false;

  const flushParagraph = () => {
    if (!paragraph.runs.length) { paragraph = { ...paragraph, runs: [] }; return; }
    paragraph.runs = BL.mergeRuns(paragraph.runs);
    const marker = listLabel.trim();
    if (table && cell) {
      cell.runs.push(...paragraph.runs);
    } else if (bullet || marker) {
      blocks.push({ ...paragraph, type: "list", ordered: /^\d/.test(marker), listLevel: 0, marker: marker || "•" });
    } else if (outline >= 0) {
      blocks.push({ ...paragraph, type: "heading", level: Math.min(6, outline + 1) });
    } else {
      blocks.push(paragraph);
    }
    paragraph = { type: "paragraph", runs: [], align: paragraphsAlign, pageBreak: false };
    bullet = false;
    listLabel = "";
    outline = -1;
  };
  let paragraphsAlign = "";

  const addText = (value) => {
    if (skip || !value) return;
    if (inPntext) { listLabel += value; return; }
    if (destination === "fldinst") { fieldInstruction += value; return; }
    const run = { ...format, text: value };
    if (inFieldResult && fieldLink) run.link = fieldLink;
    paragraph.runs.push(run);
  };

  const decodeBytes = (bytes) => {
    const label = {
      932: "shift_jis", 936: "gbk", 949: "euc-kr", 950: "big5", 65001: "utf-8", 874: "windows-874",
    }[codepage] || `windows-${codepage}`;
    const view = Uint8Array.from(bytes);
    try { return new TextDecoder(label).decode(view); }
    catch { return new TextDecoder("windows-1252").decode(view); }
  };

  for (let index = 0; index < withoutPictures.length; index++) {
    const character = withoutPictures[index];
    if (pendingSkip > 0 && character !== "\\") { pendingSkip--; continue; }
    if (character === "{") {
      star = false;
      groupDepth++;
      // Table and row state is structural, not formatting: restoring it when a
      // group closes would resurrect a table that a \\row already emitted.
      stack.push({ format: { ...format }, skip, skipDepth, destination, fieldDepth, fieldLink, inFieldResult, bullet, outline });
      continue;
    }
    if (character === "}") {
      if (groupDepth === 0) continue;
      const state = stack.pop();
      if (state) {
        format = state.format;
        skip = state.skip;
        skipDepth = state.skipDepth;
        destination = state.destination;
        fieldDepth = state.fieldDepth;
        fieldLink = state.fieldLink;
        inFieldResult = state.inFieldResult;
        bullet = state.bullet;
        outline = state.outline;
      }
      groupDepth--;
      inPntext = false;
      star = false;
      if (fieldDepth >= 0 && groupDepth < fieldDepth) {
        fieldDepth = -1;
        fieldLink = "";
        fieldInstruction = "";
        inFieldResult = false;
      }
      continue;
    }
    if (character === "\u0001") {
      const end = withoutPictures.indexOf("\u0001", index + 1);
      if (end > index) {
        const image = Number(withoutPictures.slice(index + 1, end));
        if (Number.isInteger(image) && images[image]) paragraph.runs.push({ ...format, image });
        index = end;
      }
      continue;
    }
    if (character !== "\\") {
      if (character !== "\n" && character !== "\r") addText(character);
      continue;
    }
    const next = withoutPictures[index + 1];
    if (next === undefined) break;
    index++;
    if (next === "\\" || next === "{" || next === "}") { addText(next); continue; }
    if (next === "*") { star = true; continue; }
    if (next === "'") {
      // A Big5 or GBK character arrives as several \'hh escapes; decoding each
      // byte alone would turn every CJK document into mojibake.
      const bytes = [];
      for (;;) {
        const quote = withoutPictures[index] === "'" ? index
          : withoutPictures[index] === "\\" && withoutPictures[index + 1] === "'" ? index + 1 : -1;
        if (quote < 0 || !/^[0-9a-f]{2}$/i.test(withoutPictures.slice(quote + 1, quote + 3))) break;
        bytes.push(parseInt(withoutPictures.slice(quote + 1, quote + 3), 16));
        index = quote + 3;
      }
      index--;
      addText(decodeBytes(bytes));
      continue;
    }
    if (next === "~") { addText("\u00a0"); continue; }
    if (next === "-") { continue; }
    if (next === "_") { addText("\u2011"); continue; }
    if (!/[a-zA-Z]/.test(next)) { addText(next); continue; }
    let word = "";
    while (index < withoutPictures.length && /[a-zA-Z]/.test(withoutPictures[index])) { word += withoutPictures[index]; index++; }
    let param = "";
    if (withoutPictures[index] === "-") { param += "-"; index++; }
    while (index < withoutPictures.length && /\d/.test(withoutPictures[index])) { param += withoutPictures[index]; index++; }
    if (withoutPictures[index] !== " ") index--;
    const value = param === "" ? 1 : Number(param) || 0;
    const lower = word.toLowerCase();
    // \binN carries N raw bytes; braces inside it are data, not structure.
    if (lower === "bin") {
      if (withoutPictures[index] === " ") index++;
      index += Math.max(0, value) - 1;
      continue;
    }
    if (star) {
      star = false;
      // An unknown optional destination (data store, theme, user props) is
      // metadata; skipping the whole group keeps it out of the document text.
      if (lower !== "fldinst" && lower !== "fldrslt") { skip = true; continue; }
    }

    if (lower === "fonttbl" || lower === "colortbl" || lower === "stylesheet" || lower === "info" || lower === "header" || lower === "footer" || lower === "footnote" || lower === "annotation" || lower === "object" || lower === "listtable" || lower === "listoverridetable" || lower === "rsidtbl" || lower === "generator" || lower === "datastore" || lower === "themedata" || lower === "colorschememapping" || lower === "latentstyles" || lower === "xmlnstbl" || lower === "pgptbl") {
      skip = true;
      continue;
    }
    if (lower === "field") { fieldDepth = groupDepth; fieldLink = ""; fieldInstruction = ""; destination = ""; inFieldResult = false; continue; }
    if (lower === "fldinst") { destination = "fldinst"; inFieldResult = false; continue; }
    if (lower === "fldrslt") {
      destination = "";
      inFieldResult = true;
      const match = /HYPERLINK\s+(?:"([^"]+)"|(\S+))/i.exec(fieldInstruction);
      fieldLink = match ? match[1] || match[2] : "";
      fieldInstruction = "";
      continue;
    }
    if (lower === "par") { flushParagraph(); continue; }
    if (lower === "line") { addText("\n"); continue; }
    if (lower === "tab") { if (inPntext) listLabel += "\t"; else addText("\t"); continue; }
    if (lower === "b") format.bold = value !== 0;
    else if (lower === "i") format.italic = value !== 0;
    else if (lower === "ul") format.underline = value !== 0;
    else if (lower === "strike") format.strike = value !== 0;
    else if (lower === "super") format.superscript = true;
    else if (lower === "sub") format.subscript = true;
    else if (lower === "fs") format.size = value / 2;
    else if (lower === "f") format.font = fonts.get(value) || "";
    else if (lower === "ulnone") format.underline = false;
    else if (lower === "plain") format = { bold: false, italic: false, underline: false, strike: false, size: 11, font: "", link: "", superscript: false, subscript: false };
    else if (lower === "qc") paragraphsAlign = "center";
    else if (lower === "qr") paragraphsAlign = "right";
    else if (lower === "qj") paragraphsAlign = "justify";
    else if (lower === "ql") paragraphsAlign = "";
    else if (lower === "bullet") { bullet = true; }
    else if (lower === "pntext") { inPntext = true; }
    else if (lower === "outlinelevel") outline = value;
    else if (lower === "ansicpg") codepage = value;
    else if (lower === "uc") unicodeSkip = value;
    else if (lower === "u") {
      let unit = value < 0 ? value + 65536 : value;
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const saved = index;
        let pair = "";
        // The pair arrives as the next \u control word.
        for (let scan = index + 1; scan < withoutPictures.length && pair.length < 12; scan++) pair += withoutPictures[scan];
        const match = /^\s*\\u(-?\d+)\s?\??/.exec(pair);
        if (match) {
          const low = Number(match[1]) + (Number(match[1]) < 0 ? 65536 : 0);
          if (low >= 0xdc00 && low <= 0xdfff) {
            addText(String.fromCharCode(unit, low));
            index += match[0].length;
            continue;
          }
        }
        index = saved;
      }
      addText(String.fromCharCode(unit));
      pendingSkip = unicodeSkip;
    } else if (lower === "pict") {
      skip = true;
    } else if (lower === "trowd") {
      if (!table) table = { type: "table", rows: [] };
      table.rows.push({ cells: [], header: false });
      cell = null;
    } else if (lower === "cell") {
      if (table) {
        const last = table.rows.at(-1);
        last.cells.push({ runs: BL.mergeRuns(paragraph.runs), blocks: [], colspan: 1, header: false });
        paragraph = { ...paragraph, runs: [] };
      }
    } else if (lower === "row") {
      if (table) {
        const previous = blocks.at(-1);
        if (previous?.type === "table") previous.rows.push(...table.rows);
        else blocks.push(table);
        table = null;
        cell = null;
      }
    } else if (lower === "intbl") {
      if (!table) table = { type: "table", rows: [{ cells: [], header: false }] };
      cell = table.rows.at(-1);
    } else if (lower === "pard") {
      paragraphsAlign = "";
    } else if (lower === "page") {
      paragraph.pageBreak = true;
    }
    if (destination === "fldinst") {
      if (lower === "u") fieldInstruction += String.fromCharCode(value < 0 ? value + 65536 : value);
      else if (lower === "fldrslt") destination = "";
    }
  }
  flushParagraph();
  if (table) blocks.push(table);
  return {
    title: "",
    blocks,
    images,
    section: { width: 612, height: 792, top: 72, right: 72, bottom: 72, left: 72 },
    skippedImages: 0,
    source: options.name || "document.rtf",
  };
};
