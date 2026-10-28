/* PDF writer: block model -> PDF 1.4 with base-14 fonts and image XObjects. */

BL.pdfWidths = (() => {
  const decode = (value) => {
    const binary = atob(value);
    const widths = new Uint16Array(224);
    for (let index = 0; index < 224; index++) widths[index] = binary.charCodeAt(index * 2) | (binary.charCodeAt(index * 2 + 1) << 8);
    return widths;
  };
  return {
    reg: decode("FgEWAWMBLAIsAnkDmwK/AE0BTQGFAUgCFgFNARYBFgEsAiwCLAIsAiwCLAIsAiwCLAIsAhYBFgFIAkgCSAIsAvcDmwKbAtIC0gKbAmMCCgPSAhYB9AGbAiwCQQPSAgoDmwIKA9ICmwJjAtICmwKwA5sCmwJjAhYBFgEWAdUBLAJNASwCLAL0ASwCLAIWASwCLALeAN4A9AHeAEEDLAIsAiwCLAJNAfQBFgEsAvQB0gL0AfQB9AFOAQQBTgFIAl4BLAJeAd4ALAJNAegDLAIsAk0B6AObAk0B6ANeAWMCXgFeAd4A3gBNAU0BXgEsAugDTQHoA/QBTQGwA14B9AGbAhYBTQEsAiwCLAIsAgQBLAJNAeECcgEsAkgCTQHhAk0BkAFIAk0BTQFNASwCGQIWAU0BTQFtASwCQgNCA0IDYwKbApsCmwKbApsCmwLoA9ICmwKbApsCmwIWARYBFgEWAdIC0gIKAwoDCgMKAwoDSAIKA9IC0gLSAtICmwKbAmMCLAIsAiwCLAIsAiwCeQP0ASwCLAIsAiwCFgEWARYBFgEsAiwCLAIsAiwCLAIsAkgCYwIsAiwCLAIsAvQBLAL0AQ=="),
    bold: decode("FgFNAdoBLAIsAnkD0gLuAE0BTQGFAUgCFgFNARYBFgEsAiwCLAIsAiwCLAIsAiwCLAIsAk0BTQFIAkgCSAJjAs8D0gLSAtIC0gKbAmMCCgPSAhYBLALSAmMCQQPSAgoDmwIKA9ICmwJjAtICmwKwA5sCmwJjAk0BFgFNAUgCLAJNASwCYwIsAmMCLAJNAWMCYwIWARYBLAIWAXkDYwJjAmMCYwKFASwCTQFjAiwCCgMsAiwC9AGFARgBhQFIAl4BLAJeARYBLAL0AegDLAIsAk0B6AObAk0B6ANeAWMCXgFeARYBFgH0AfQBXgEsAugDTQHoAywCTQGwA14B9AGbAhYBTQEsAiwCLAIsAhgBLAJNAeECcgEsAkgCTQHhAk0BkAFIAk0BTQFNAWMCLAIWAU0BTQFtASwCQgNCA0IDYwLSAtIC0gLSAtIC0gLoA9ICmwKbApsCmwIWARYBFgEWAdIC0gIKAwoDCgMKAwoDSAIKA9IC0gLSAtICmwKbAmMCLAIsAiwCLAIsAiwCeQMsAiwCLAIsAiwCFgEWARYBFgFjAmMCYwJjAmMCYwJjAkgCYwJjAmMCYwJjAiwCYwIsAg=="),
    italic: decode("FgEWAWMBLAIsAnkDmwK/AE0BTQGFAUgCFgFNARYBFgEsAiwCLAIsAiwCLAIsAiwCLAIsAhYBFgFIAkgCSAIsAvcDmwKbAtIC0gKbAmMCCgPSAhYB9AGbAiwCQQPSAgoDmwIKA9ICmwJjAtICmwKwA5sCmwJjAhYBFgEWAdUBLAJNASwCLAL0ASwCLAIWASwCLALeAN4A9AHeAEEDLAIsAiwCLAJNAfQBFgEsAvQB0gL0AfQB9AFOAQQBTgFIAl4BLAJeAd4ALAJNAegDLAIsAk0B6AObAk0B6ANeAWMCXgFeAd4A3gBNAU0BXgEsAugDTQHoA/QBTQGwA14B9AGbAhYBTQEsAiwCLAIsAgQBLAJNAeECcgEsAkgCTQHhAk0BkAFIAk0BTQFNASwCGQIWAU0BTQFtASwCQgNCA0IDYwKbApsCmwKbApsCmwLoA9ICmwKbApsCmwIWARYBFgEWAdIC0gIKAwoDCgMKAwoDSAIKA9IC0gLSAtICmwKbAmMCLAIsAiwCLAIsAiwCeQP0ASwCLAIsAiwCFgEWARYBFgEsAiwCLAIsAiwCLAIsAkgCYwIsAiwCLAIsAvQBLAL0AQ=="),
    boldItalic: decode("FgFNAdoBLAIsAnkD0gLuAE0BTQGFAUgCFgFNARYBFgEsAiwCLAIsAiwCLAIsAiwCLAIsAk0BTQFIAkgCSAJjAs8D0gLSAtIC0gKbAmMCCgPSAhYBLALSAmMCQQPSAgoDmwIKA9ICmwJjAtICmwKwA5sCmwJjAk0BFgFNAUgCLAJNASwCYwIsAmMCLAJNAWMCYwIWARYBLAIWAXkDYwJjAmMCYwKFASwCTQFjAiwCCgMsAiwC9AGFARgBhQFIAl4BLAJeARYBLAL0AegDLAIsAk0B6AObAk0B6ANeAWMCXgFeARYBFgH0AfQBXgEsAugDTQHoAywCTQGwA14B9AGbAhYBTQEsAiwCLAIsAhgBLAJNAeECcgEsAkgCTQHhAk0BkAFIAk0BTQFNAWMCLAIWAU0BTQFtASwCQgNCA0IDYwLSAtIC0gLSAtIC0gLoA9ICmwKbApsCmwIWARYBFgEWAdIC0gIKAwoDCgMKAwoDSAIKA9IC0gLSAtICmwKbAmMCLAIsAiwCLAIsAiwCeQMsAiwCLAIsAiwCFgEWARYBFgFjAmMCYwJjAmMCYwJjAkgCYwJjAmMCYwJjAiwCYwIsAg=="),
  };
})();

BL.pdfFontKey = (run, bold = false) => {
  const isBold = bold || run.bold;
  const isItalic = run.italic;
  return isBold ? (isItalic ? "boldItalic" : "bold") : (isItalic ? "italic" : "reg");
};

BL.pdfChar = (character) => {
  const code = character.codePointAt(0);
  if (code === 0x20ac) return 0x80;
  if (code === 0x2026) return 0x85;
  if (code === 0x2018) return 0x91;
  if (code === 0x2019) return 0x92;
  if (code === 0x201c) return 0x93;
  if (code === 0x201d) return 0x94;
  if (code === 0x2022) return 0x95;
  if (code === 0x2013) return 0x96;
  if (code === 0x2014) return 0x97;
  if (code === 0x2122) return 0x99;
  if (code >= 0xa0 && code <= 0xff) return code;
  if (code >= 0x20 && code <= 0x7e) return code;
  return 0x3f;
};

BL.pdfString = (value, counter) => {
  let output = "";
  for (const character of String(value ?? "")) {
    let code = BL.pdfChar(character);
    if (!code && character !== " ") counter.replaced++;
    if (character !== " " && code === 0x3f && character.codePointAt(0) !== 0x3f) counter.replaced++;
    if (!code) code = 0x3f;
    if (code === 0x28 || code === 0x29 || code === 0x5c) output += `\\${String.fromCharCode(code)}`;
    else if (code < 32 || code > 126) output += `\\${code.toString(8).padStart(3, "0")}`;
    else output += String.fromCharCode(code);
  }
  return output;
};

BL.pdfWidth = (text, fontKey, size) => {
  const widths = BL.pdfWidths[fontKey];
  let width = 0;
  for (const character of String(text || "")) {
    let code = BL.pdfChar(character);
    if (!code) code = 0x3f;
    const index = Math.min(223, Math.max(0, code - 32));
    width += widths[index] || 500;
  }
  return (width / 1000) * size;
};

BL.pdfRasterize = async (image, uiWindow) => {
  if (!image?.bytes) return null;
  const win = uiWindow || globalThis.window;
  try {
    if (!win?.document || typeof createImageBitmap !== "function") return null;
    const normalized = await BL.rasterizeImage(image, win);
    if (!normalized) return null;
    const bitmap = await createImageBitmap(new Blob([normalized.bytes], { type: normalized.mime }));
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = win.document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const pixels = context.getImageData(0, 0, width, height).data;
    const rgb = new Uint8Array(width * height * 3);
    for (let source = 0, target = 0; source < pixels.length; source += 4) {
      rgb[target++] = pixels[source];
      rgb[target++] = pixels[source + 1];
      rgb[target++] = pixels[source + 2];
    }
    return { width, height, rgb };
  } catch {
    return null;
  }
};

BL.pdfFromModel = async (model, options = {}) => {
  const section = { width: 612, height: 792, top: 72, right: 72, bottom: 72, left: 72, ...(model.section || {}) };
  const contentWidth = section.width - section.left - section.right;
  const contentHeight = section.height - section.top - section.bottom;
  const pages = [];
  const images = [];
  const counter = { replaced: 0, skippedImages: 0 };
  let ops = [];
  let y = section.height - section.top;
  const ensure = (needed) => {
    if (y - needed >= section.bottom) return;
    pages.push(ops.join("\n"));
    ops = [];
    y = section.height - section.top;
  };

  const wrap = (runs, size, maxWidth, bold = false) => {
    const lines = [];
    let line = [];
    let width = 0;
    const pushLine = () => { if (line.length) lines.push(line); line = []; width = 0; };
    for (const source of runs) {
      if (!source.text) continue;
      const parts = String(source.text).replace(/\t/g, "    ").replace(/\u00a0/g, " ").split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          if (line.length) { line.push({ ...source, text: " ", font: BL.pdfFontKey(source, bold) }); width += BL.pdfWidth(" ", BL.pdfFontKey(source, bold), size); }
          continue;
        }
        const font = BL.pdfFontKey(source, bold);
        let word = part;
        let wordWidth = BL.pdfWidth(word, font, size);
        if (width + wordWidth > maxWidth && line.length) { pushLine(); }
        while (wordWidth > maxWidth && word.length > 1) {
          let cut = word.length - 1;
          while (cut > 1 && BL.pdfWidth(word.slice(0, cut), font, size) > maxWidth) cut--;
          if (line.length) pushLine();
          lines.push([{ ...source, text: word.slice(0, cut), font }]);
          word = word.slice(cut);
          wordWidth = BL.pdfWidth(word, font, size);
        }
        line.push({ ...source, text: word, font });
        width += wordWidth;
      }
    }
    pushLine();
    return lines;
  };

  const drawLine = (runs, x, size) => {
    let cursor = x;
    const baseline = y;
    for (const run of runs) {
      if (!run.text) continue;
      const font = run.font || "reg";
      const resource = { reg: "F1", bold: "F2", italic: "F3", boldItalic: "F4" }[font];
      ops.push(`BT /${resource} ${size} Tf ${cursor.toFixed(2)} ${baseline.toFixed(2)} Td (${BL.pdfString(run.text, counter)}) Tj ET`);
      if (run.underline) ops.push(`0.6 w ${cursor.toFixed(2)} ${(baseline - 1.5).toFixed(2)} m ${(cursor + BL.pdfWidth(run.text, font, size)).toFixed(2)} ${(baseline - 1.5).toFixed(2)} l S`);
      cursor += BL.pdfWidth(run.text, font, size);
    }
  };

  const placeImage = async (run) => {
    const image = model.images?.[run.image];
    if (!image) return;
    const raster = await BL.pdfRasterize(image, options.uiWindow || globalThis.window);
    if (!raster) { counter.skippedImages++; return; }
    const naturalWidth = image.width || raster.width;
    const naturalHeight = image.height || raster.height;
    const width = Math.min(contentWidth, naturalWidth * 0.75);
    const height = width * (naturalHeight / naturalWidth);
    ensure(height + 8);
    const x = section.left + (contentWidth - width) / 2;
    const bottom = y - height;
    const index = images.length;
    images.push(raster);
    ops.push(`q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${bottom.toFixed(2)} cm /Im${index + 1} Do Q`);
    y = bottom - 8;
  };

  const paragraphLines = (block, size, bold) => {
    const runs = (block.runs || []).filter((run) => run.image === undefined);
    if (!runs.some((run) => run.text)) return [];
    return wrap(runs, size, contentWidth - (block.indent || 0), bold);
  };

  const listCounters = new Map();
  const nextMarker = (block) => {
    if (block.marker) return block.marker;
    if (!block.ordered) return "•";
    const level = block.listLevel || 0;
    const value = (listCounters.get(level) || 0) + 1;
    listCounters.set(level, value);
    return `${value}.`;
  };

  for (const block of model.blocks || []) {
    if (block.type !== "list") listCounters.clear();
    if (block.type === "pagebreak") {
      pages.push(ops.join("\n"));
      ops = [];
      y = section.height - section.top;
      continue;
    }
    if (block.type === "image") {
      await placeImage({ image: block.image });
      y -= 5;
      continue;
    }
    if (block.type === "table") {
      const columns = Math.max(1, ...block.rows.map((row) => row.cells.reduce((sum, cell) => sum + (cell.colspan || 1), 0)));
      const baseWidth = contentWidth / columns;
      const lineHeight = 12;
      for (const row of block.rows) {
        const cells = [];
        let column = 0;
        for (const cell of row.cells) {
          const span = Math.max(1, cell.colspan || 1);
          const width = baseWidth * span - 8;
          const runs = BL.cellBlocks(cell)
            .flatMap((cellBlock, index) => [...(index ? [{ text: " " }] : []), ...(cellBlock.runs || [])])
            .map((run) => ({ ...run, bold: run.bold || row.header }));
          const lines = wrap(runs, 9.5, Math.max(20, width), row.header);
          const cellImages = [];
          for (const run of runs) {
            if (run.image === undefined) continue;
            const raster = await BL.pdfRasterize(model.images?.[run.image], options.uiWindow || globalThis.window);
            if (!raster) { counter.skippedImages++; continue; }
            const imageWidth = Math.min(width, 140);
            cellImages.push({ raster, width: imageWidth, height: imageWidth * (raster.height / raster.width) });
          }
          const imageHeight = cellImages.reduce((sum, image) => sum + image.height + 4, 0);
          cells.push({ lines, width: baseWidth * span, column, images: cellImages, imageHeight });
          column += span;
        }
        const height = Math.max(16, ...cells.map((cell) => cell.lines.length * lineHeight + cell.imageHeight)) + 6;
        ensure(height);
        const top = y;
        let x = section.left;
        for (let index = 0; index < cells.length; index++) {
          const cell = cells[index];
          ops.push(`0.5 w 0.65 0.65 0.65 RG ${x.toFixed(2)} ${(top - height).toFixed(2)} ${cell.width.toFixed(2)} ${height.toFixed(2)} re S`);
          let textY = top - 12;
          for (const image of cell.images) {
            const imageIndex = images.length;
            images.push(image.raster);
            ops.push(`q ${image.width.toFixed(2)} 0 0 ${image.height.toFixed(2)} ${(x + 4).toFixed(2)} ${(textY - image.height).toFixed(2)} cm /Im${imageIndex + 1} Do Q`);
            textY -= image.height + 4;
          }
          for (const line of cell.lines) {
            drawLineAt(line, x + 4, textY, 9.5);
            textY -= lineHeight;
          }
          x += cell.width;
        }
        y = top - height;
      }
      y -= 6;
      continue;
    }
    const heading = block.type === "heading";
    const size = heading ? [24, 19, 16, 14, 13, 12][Math.min(5, (block.level || 1) - 1)] : block.code ? 9.5 : 10.5;
    const before = heading ? 12 : (block.before || 0);
    const after = heading ? 5 : (block.after ?? 5);
    if (block.runs?.some((run) => run.image !== undefined)) {
      if (before) { ensure(before); y -= before; }
      let marker = block.type === "list" ? nextMarker(block) : "";
      let markerUsed = false;
      let textRuns = [];
      const indent = (block.indent || 0) + (block.type === "list" ? 18 + (block.listLevel || 0) * 16 : 0);
      const drawTextRuns = () => {
        if (!textRuns.some((run) => run.text)) { textRuns = []; return; }
        const lines = wrap(textRuns, size, contentWidth - indent, heading || block.quote === true);
        for (const line of lines) {
          const lineHeight = size * 1.45;
          ensure(lineHeight);
          let x = section.left + indent;
          if (marker && !markerUsed) {
            ops.push(`BT /F1 ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${BL.pdfString(marker, counter)}) Tj ET`);
            x += BL.pdfWidth(`${marker} `, "reg", size);
            markerUsed = true;
          }
          drawLine(line, x, size);
          y -= lineHeight;
        }
        textRuns = [];
      };
      for (const run of block.runs || []) {
        if (run.image !== undefined) {
          drawTextRuns();
          await placeImage(run);
        } else {
          textRuns.push(run);
        }
      }
      drawTextRuns();
      y -= after;
      continue;
    }
    if (before) { ensure(before); y -= before; }
    const marker = block.type === "list" ? nextMarker(block) : "";
    const indent = (block.indent || 0) + (block.type === "list" ? 18 + (block.listLevel || 0) * 16 : 0);
    const lines = paragraphLines({ ...block, indent }, size, heading || block.quote === true);
    if (!lines.length) { y -= after; continue; }
    for (const line of lines) {
      const lineHeight = size * 1.45;
      ensure(lineHeight);
      let x = section.left + indent;
      if (marker && line === lines[0]) {
        ops.push(`BT /F1 ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${BL.pdfString(marker, counter)}) Tj ET`);
        x += BL.pdfWidth(`${marker} `, "reg", size);
      }
      drawLine(line, x, size);
      y -= lineHeight;
    }
    y -= after;
    if (block.quote) ops.push(`2 w 0.8 0.8 0.8 RG ${(section.left + 6).toFixed(2)} ${(y + 4).toFixed(2)} m ${(section.left + 6).toFixed(2)} ${(y + 4 + Math.max(12, lines.length * size * 1.45)).toFixed(2)} l S`);
  }
  pages.push(ops.join("\n"));

  // Nested helper used by tables, defined here so it can see y-independent drawing.
  function drawLineAt(runs, x, baseline, size) {
    let cursor = x;
    for (const run of runs) {
      if (!run.text) continue;
      const font = run.font || "reg";
      const resource = { reg: "F1", bold: "F2", italic: "F3", boldItalic: "F4" }[font];
      ops.push(`BT /${resource} ${size} Tf ${cursor.toFixed(2)} ${baseline.toFixed(2)} Td (${BL.pdfString(run.text, counter)}) Tj ET`);
      cursor += BL.pdfWidth(run.text, font, size);
    }
  }

  const compress = async (bytes) => {
    if (typeof CompressionStream !== "function") return { bytes, filter: "" };
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
      return { bytes: new Uint8Array(await new Response(stream).arrayBuffer()), filter: "/Filter /FlateDecode " };
    } catch {
      return { bytes, filter: "" };
    }
  };

  const objects = [];
  const addObject = (parts) => { objects.push(parts); return objects.length; };
  const fontObjects = [
    addObject(["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]),
    addObject(["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"]),
    addObject(["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>"]),
    addObject(["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>"]),
  ];
  const imageObjects = [];
  for (const image of images) {
    const compressed = await compress(image.rgb);
    const header = new TextEncoder().encode(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 ${compressed.filter}/Length ${compressed.bytes.length} >>\nstream\n`);
    const footer = new TextEncoder().encode("\nendstream");
    imageObjects.push(addObject([header, compressed.bytes, footer]));
  }
  const pageObjects = [];
  for (const content of pages) {
    const bytes = new TextEncoder().encode(content);
    const compressed = await compress(bytes);
    const stream = addObject([new TextEncoder().encode(`<< ${compressed.filter}/Length ${compressed.bytes.length} >>\nstream\n`), compressed.bytes, new TextEncoder().encode("\nendstream")]);
    pageObjects.push({ stream, page: 0 });
  }
  const resources = `<< /Font << /F1 ${fontObjects[0]} 0 R /F2 ${fontObjects[1]} 0 R /F3 ${fontObjects[2]} 0 R /F4 ${fontObjects[3]} 0 R >>${imageObjects.length ? ` /XObject << ${imageObjects.map((id, index) => `/Im${index + 1} ${id} 0 R`).join(" ")} >>` : ""} >>`;
  const pagesObjectIndex = addObject([]);
  const pageIds = [];
  pages.forEach((_, index) => {
    const stream = pageObjects[index].stream;
    const id = addObject([`<< /Type /Page /Parent ${pagesObjectIndex} 0 R /MediaBox [0 0 ${section.width} ${section.height}] /Resources ${resources} /Contents ${stream} 0 R >>`]);
    pageIds.push(id);
  });
  objects[pagesObjectIndex - 1] = [`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`];
  const catalogIndex = addObject([`<< /Type /Catalog /Pages ${pagesObjectIndex} 0 R >>`]);

  const encoder = new TextEncoder();
  const chunks = [encoder.encode("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")];
  let length = chunks[0].length;
  const offsets = [];
  objects.forEach((parts, index) => {
    offsets.push(length);
    const body = [encoder.encode(`${index + 1} 0 obj\n`), ...parts.map((part) => part instanceof Uint8Array ? part : encoder.encode(part)), encoder.encode("\nendobj\n")];
    for (const part of body) { chunks.push(part); length += part.length; }
  });
  const xrefOffset = length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogIndex} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(encoder.encode(xref));
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let position = 0;
  for (const chunk of chunks) { output.set(chunk, position); position += chunk.length; }
  return {
    blob: new Blob([output], { type: "application/pdf" }),
    bytes: output,
    pages: pages.length,
    replaced: counter.replaced,
    skippedImages: counter.skippedImages,
  };
};
