/**
 * @name 🗜️ Shrink PDF
 * @category files
 * @description Recompress a PDF's images and rebuild the file, so a scan gets smaller while every page, link and text layer survives.
 * @tags pdf, compress, shrink, optimize, images, size
 * @traits offline, self-contained, no-cors, private-safe
 * @added 2026-11-03
 * @featured false
 * @testing true
 */
(() => {
  const PRESETS = {
    light: { label: "Light", edge: 2400, quality: 0.82, note: "Keeps the most detail" },
    balanced: { label: "Balanced", edge: 1800, quality: 0.7, note: "Good for scans" },
    strong: { label: "Strong", edge: 1200, quality: 0.55, note: "Smallest, softest" },
  };
  const MESSAGES = {
    pdf: "That does not look like a PDF. Choose a .pdf file.",
    encrypted: "This PDF is encrypted, so its images cannot be read. Unlock it first, then shrink it.",
    objects: "No objects could be read from this PDF, so it is not safe to rebuild. Nothing was changed.",
    root: "This PDF's page tree could not be found, so it was left alone.",
    objstm: "This PDF packs its objects into a compressed stream that could not be read. Nothing was changed.",
    noImages: "No images in this PDF could be recompressed. Text-only PDFs do not get smaller this way, so nothing was downloaded.",
  };

  /* Reading the file ------------------------------------------------------ */

  function latin1(bytes) {
    let text = "";
    const chunk = 0x8000;
    for (let index = 0; index < bytes.length; index += chunk) {
      text += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
    }
    return text;
  }

  function fromLatin1(text) {
    const out = new Uint8Array(text.length);
    for (let index = 0; index < text.length; index++) out[index] = text.charCodeAt(index) & 0xff;
    return out;
  }

  function isPdf(bytes) {
    if (!bytes || bytes.length < 8) return false;
    const head = latin1(bytes.subarray(0, Math.min(bytes.length, 1024)));
    return head.includes("%PDF-");
  }

  // A PDF dictionary ends at the matching >>, and image dictionaries nest.
  function dictEnd(text, from) {
    let depth = 0;
    for (let index = from; index < text.length - 1; index++) {
      if (text[index] === "<" && text[index + 1] === "<") {
        depth++;
        index++;
      } else if (text[index] === ">" && text[index + 1] === ">") {
        depth--;
        index++;
        if (depth === 0) return index + 1;
      }
    }
    return -1;
  }

  // Finds every "N G obj" in the file. A later definition of the same object
  // number replaces the earlier one, which is how incremental saves work: that
  // alone removes the leftovers some editors leave behind.
  function scanObjects(bytes) {
    const text = latin1(bytes);
    const objects = new Map();
    const pattern = /(\d+)\s+(\d+)\s+obj\b/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const num = Number(match[1]);
      const gen = Number(match[2]);
      let cursor = match.index + match[0].length;
      while (cursor < text.length && /\s/.test(text[cursor])) cursor++;

      let dict = "";
      let body = "";
      let stream = null;
      let streamStart = null;

      if (text.startsWith("<<", cursor)) {
        const close = dictEnd(text, cursor);
        if (close > cursor) {
          dict = text.slice(cursor, close);
          cursor = close;
        }
      }

      const after = text.slice(cursor, cursor + 400);
      const streamMatch = dict ? after.match(/^\s*stream(\r\n|\n|\r)/) : null;

      if (streamMatch) {
        const start = cursor + streamMatch[0].length;
        streamStart = start;
        const direct = dict.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/);
        let end;
        if (direct) {
          end = start + Number(direct[1]);
        } else {
          // The real length is a number in another object, resolved below. Until
          // then, take the endstream marker and remove only the single line
          // break that belongs to it: the data itself may end in a newline.
          const marker = text.indexOf("endstream", start);
          if (marker < 0) continue;
          end = marker;
          if (text[end - 1] === "\n") end--;
          if (text[end - 1] === "\r") end--;
        }
        if (end > start && end <= bytes.length) stream = bytes.subarray(start, end);
      } else if (!dict) {
        const stop = text.indexOf("endobj", cursor);
        body = text.slice(cursor, stop > cursor ? stop : cursor).trim();
      }

      // The position decides which definition wins when a number appears more
      // than once, which is how an incremental save supersedes an object.
      objects.set(num, { num, gen, dict, body, stream, streamStart, start: match.index });
    }

    // Resolve indirect /Length values now that every object is known. Guessing
    // from the endstream marker is not enough: trimming a line break there
    // shortened any binary stream that happened to end with one, which damaged
    // embedded fonts and made pages render differently.
    for (const object of objects.values()) {
      if (!object.stream || object.streamStart === null) continue;
      const indirect = object.dict.match(/\/Length\s+(\d+)\s+(\d+)\s+R/);
      if (!indirect) continue;
      const target = objects.get(Number(indirect[1]));
      const length = target ? Number(String(target.body || "").trim()) : NaN;
      if (!Number.isFinite(length) || length < 0) continue;
      const end = object.streamStart + length;
      if (end <= bytes.length && end > object.streamStart) {
        object.stream = bytes.subarray(object.streamStart, end);
      }
    }

    return { text, objects };
  }

  function trailerDict(text, objects) {
    let index = text.lastIndexOf("trailer");
    while (index >= 0) {
      const open = text.indexOf("<<", index);
      if (open > index) {
        const close = dictEnd(text, open);
        if (close > open) return text.slice(open, close);
      }
      index = text.lastIndexOf("trailer", index - 1);
    }
    // PDF 1.5 stores the trailer fields in a cross-reference stream instead.
    for (const object of objects.values()) {
      if (/\/Type\s*\/XRef/.test(object.dict)) return object.dict;
    }
    return "";
  }

  function refIn(dict, key) {
    const match = dict.match(new RegExp(`/${key}\\s+(\\d+)\\s+(\\d+)\\s+R`));
    return match ? { num: Number(match[1]), gen: Number(match[2]) } : null;
  }

  function refsIn(dict) {
    return [...String(dict).matchAll(/(\d+)\s+(\d+)\s+R/g)].map((match) => ({
      num: Number(match[1]),
      gen: Number(match[2]),
    }));
  }

  function arrayRefs(dict, key) {
    const match = String(dict).match(new RegExp(`/${key}\\s*\\[([^\\]]*)\\]`));
    return match ? refsIn(match[1]) : [];
  }

  // Page order comes from the page tree, never from object order: images and
  // fonts sit between the pages, and scans usually put them all at the end.
  function pageTree(objects, catalogNum) {
    const catalog = objects.get(catalogNum);
    const pagesRef = catalog ? refIn(catalog.dict, "Pages") : null;
    const pages = [];
    const seen = new Set();
    const walk = (ref) => {
      if (!ref || seen.has(ref.num)) return;
      seen.add(ref.num);
      const node = objects.get(ref.num);
      if (!node) return;
      if (/\/Type\s*\/Pages/.test(node.dict)) {
        for (const child of arrayRefs(node.dict, "Kids")) walk(child);
      } else if (/\/Type\s*\/Page\b/.test(node.dict)) {
        pages.push({ num: node.num, gen: node.gen });
      }
    };
    if (pagesRef) walk(pagesRef);
    return { pagesRef, pages };
  }

  // A part keeps only what its pages can reach, so pages left out take their
  // images, fonts and annotations with them. The Pages node keeps every other
  // key it had, because children can inherit MediaBox and Resources from it.
  function subsetFor(pdf, selection) {
    const objects = new Map();
    const queue = [pdf.trailer.root, pdf.pagesRef, ...selection].filter(Boolean);
    const visited = new Set();

    while (queue.length) {
      const ref = queue.shift();
      if (!ref || visited.has(ref.num)) continue;
      visited.add(ref.num);
      const original = pdf.objects.get(ref.num);
      if (!original || original.drop) continue;
      objects.set(ref.num, { ...original });
      // The page tree would otherwise pull in every sibling page, so the Kids
      // edge is replaced by the selection itself.
      const refs = visited.has(pdf.pagesRef?.num)
        ? refsIn(original.dict.replace(/\/Kids\s*\[[^\]]*\]/, ""))
        : refsIn(original.dict);
      for (const next of refs) queue.push(next);
    }

    const pages = pdf.pagesRef ? objects.get(pdf.pagesRef.num) : null;
    if (pages) {
      const kept = pages.dict
        .replace(/\s*\/Kids\s*\[[^\]]*\]/, "")
        .replace(/\s*\/Count\s+\d+/, "")
        .replace(/\s*>>\s*$/, "");
      const kids = selection.map((page) => `${page.num} ${page.gen} R`).join(" ");
      objects.set(pages.num, { ...pages, dict: `${kept} /Kids [${kids}] /Count ${selection.length} >>` });
    }
    return { objects };
  }

  // Grows each part a page at a time and keeps the last build that fits, so a
  // part never exceeds the target unless a single page does on its own.
  function splitParts(pdf, targetBytes) {
    const { pages, pagesRef } = pdf;
    if (!pages.length) throw new Error("root");
    const build = (start, end) =>
      serializePdf(subsetFor({ ...pdf, pagesRef }, pages.slice(start, end)).objects, pdf.trailer);

    const parts = [];
    let start = 0;
    while (start < pages.length) {
      let end = start + 1;
      let bytes = build(start, end);
      while (end < pages.length) {
        const candidate = build(start, end + 1);
        if (candidate.length > targetBytes) break;
        bytes = candidate;
        end++;
      }
      parts.push({ bytes, pageCount: end - start, from: start + 1, to: end, tooBig: bytes.length > targetBytes });
      start = end;
    }
    return parts;
  }

  async function inflateLoose(bytes) {
    let last = null;
    for (const format of ["deflate", "deflate-raw"]) {
      try {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      } catch (error) {
        last = error;
      }
    }
    throw last || new Error("Flate stream could not be inflated");
  }

  // PDF 1.5 can pack ordinary objects into a compressed object stream. They are
  // lifted to the top level so the rebuilt file needs no cross-reference stream.
  async function flattenObjectStreams(objects) {
    for (const object of [...objects.values()]) {
      if (!/\/Type\s*\/ObjStm/.test(object.dict) || !object.stream) continue;
      const data = await inflateLoose(object.stream);
      const text = latin1(data);
      const count = Number((object.dict.match(/\/N\s+(\d+)/) || [])[1] || 0);
      const first = Number((object.dict.match(/\/First\s+(\d+)/) || [])[1] || 0);
      const header = text.slice(0, first).trim().split(/\s+/).map(Number);
      if (!count || !Number.isFinite(first) || header.length < count * 2) throw new Error("objstm");

      for (let index = 0; index < count; index++) {
        const num = header[index * 2];
        const offset = header[index * 2 + 1];
        if (!Number.isFinite(num) || !Number.isFinite(offset)) continue;
        const start = first + offset;
        const nextOffset = header[(index + 1) * 2 + 1];
        const end = first + (Number.isFinite(nextOffset) ? nextOffset : text.length);
        const body = text.slice(start, end).trim();
        if (!body) continue;
        // A compressed object can be newer than a top-level one with the same
        // number, so the later position wins instead of the first seen.
        const existing = objects.get(num);
        if (existing && (existing.start ?? 0) > (object.start ?? 0)) continue;
        objects.set(num, { num, gen: 0, dict: body, body: "", stream: null, start: object.start });
      }
      object.drop = true;
    }
    for (const object of objects.values()) {
      if (/\/Type\s*\/XRef/.test(object.dict)) object.drop = true;
    }
  }

  async function readPdf(bytes) {
    if (!isPdf(bytes)) throw new Error("pdf");
    const { text, objects } = scanObjects(bytes);
    if (!objects.size) throw new Error("objects");
    await flattenObjectStreams(objects);
    const dict = trailerDict(text, objects);
    const root = refIn(dict, "Root");
    if (!root) throw new Error("root");
    if (refIn(dict, "Encrypt")) throw new Error("encrypted");
    return {
      objects,
      trailer: { root, info: refIn(dict, "Info"), id: (dict.match(/\/ID\s*(\[[^\]]*\])/) || [])[1] || "" },
    };
  }

  /* Writing the file ------------------------------------------------------ */

  function serializePdf(objects, trailer) {
    const list = [...objects.values()].filter((object) => !object.drop).sort((a, b) => a.num - b.num);
    const chunks = [];
    let size = 0;
    const push = (bytes) => {
      chunks.push(bytes);
      size += bytes.length;
    };
    const pushText = (text) => push(fromLatin1(text));

    pushText("%PDF-1.7\n");
    push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

    const offsets = new Map();
    for (const object of list) {
      offsets.set(object.num, size);
      pushText(`${object.num} ${object.gen || 0} obj\n`);
      let dict = object.dict || object.body || "<< >>";
      if (object.stream) {
        // The bytes written are the bytes counted. A producer's /Length that
        // was off, or an indirect one pointing at the original size, would
        // otherwise leave a reader guessing where the stream ends.
        const length = `/Length ${object.stream.length}`;
        dict = /\/Length\s+(\d+|\d+\s+\d+\s+R)/.test(dict)
          ? dict.replace(/\/Length\s+(\d+|\d+\s+\d+\s+R)/, length)
          : dict.replace(/>>\s*$/, `${length} >>`);
      }
      pushText(dict);
      if (object.stream) {
        pushText("\nstream\n");
        push(object.stream);
        pushText("\nendstream");
      }
      pushText("\nendobj\n");
    }

    const startxref = size;
    pushText("xref\n");
    pushText("0 1\n0000000000 65535 f \n");

    const numbers = list.map((object) => object.num);
    let index = 0;
    while (index < numbers.length) {
      let end = index + 1;
      while (end < numbers.length && numbers[end] === numbers[end - 1] + 1) end++;
      pushText(`${numbers[index]} ${end - index}\n`);
      for (let cursor = index; cursor < end; cursor++) {
        const object = list[cursor];
        pushText(`${String(offsets.get(object.num)).padStart(10, "0")} ${String(object.gen || 0).padStart(5, "0")} n \n`);
      }
      index = end;
    }

    const max = numbers.reduce((top, num) => Math.max(top, num), 0);
    let trailerText = `trailer\n<< /Size ${max + 1} /Root ${trailer.root.num} ${trailer.root.gen} R`;
    if (trailer.info) trailerText += ` /Info ${trailer.info.num} ${trailer.info.gen} R`;
    if (trailer.id) trailerText += ` /ID ${trailer.id}`;
    trailerText += ` >>\nstartxref\n${startxref}\n%%EOF\n`;
    pushText(trailerText);

    const out = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  /* Images ---------------------------------------------------------------- */

  function imageKind(dict) {
    if (!/\/Subtype\s*\/Image/.test(dict)) return null;
    if (/\/ImageMask\s+true/.test(dict)) return null;
    // Transparency and masks belong to other objects; shrinking one of the pair
    // would leave the other misaligned.
    if (/\/SMask\s+(\d+\s+\d+\s+R|\/[A-Za-z]+)/.test(dict)) return null;
    if (/\/Mask\s+(\d+\s+\d+\s+R|\[)/.test(dict)) return null;
    if (/Predictor\s+([2-9]|1\d)\b/.test(dict)) return null;

    const filter = (dict.match(/\/Filter\s*(\[[^\]]*\]|\/[A-Za-z0-9]+)/) || [])[1] || "";
    const space = (dict.match(/\/ColorSpace\s*(\[[^\]]*\]|\/[A-Za-z0-9]+)/) || [])[1] || "";
    const width = Number((dict.match(/\/Width\s+(\d+)/) || [])[1] || 0);
    const height = Number((dict.match(/\/Height\s+(\d+)/) || [])[1] || 0);
    const bits = Number((dict.match(/\/BitsPerComponent\s+(\d+)/) || [])[1] ?? 8);
    if (!width || !height) return null;

    const gray = /DeviceGray/.test(space);
    const rgb = /DeviceRGB/.test(space);
    if (/DCTDecode/.test(filter)) {
      // A canvas writes RGB or grey JPEGs. CMYK and ICC-based images would come
      // back in the wrong colour space, so they are left untouched.
      if (!gray && !rgb) return null;
      return { kind: "jpeg", width, height, gray };
    }
    if (/FlateDecode/.test(filter) && bits === 8 && (gray || /DeviceRGB/.test(space))) {
      return { kind: "flate", width, height, gray, channels: gray ? 1 : 3 };
    }
    return null;
  }

  function replaceImageDict(dict, next, gray) {
    return dict
      .replace(/\/Width\s+\d+/, `/Width ${next.width}`)
      .replace(/\/Height\s+\d+/, `/Height ${next.height}`)
      .replace(/\/Length\s+(\d+)(\s+\d+\s+R)?/, `/Length ${next.bytes.length}`)
      .replace(/\/Filter(\s*)(\[[^\]]*\]|\/[A-Za-z0-9]+)/, "/Filter$1/DCTDecode")
      .replace(/\/DecodeParms(\s*)(\[[^\]]*\]|<<[\s\S]*?>>|\d+\s+\d+\s+R)/, "")
      .replace(/\/BitsPerComponent\s+\d+/, "/BitsPerComponent 8")
      .replace(/\/ColorSpace(\s*)(\[[^\]]*\]|\/[A-Za-z0-9]+)/, `/ColorSpace$1${gray ? "/DeviceGray" : "/DeviceRGB"}`);
  }

  function makeCanvas(width, height) {
    if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(width, height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  async function canvasBytes(canvas, quality) {
    if (typeof canvas.convertToBlob === "function") {
      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
      return new Uint8Array(await blob.arrayBuffer());
    }
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        resolve(blob ? new Uint8Array(await blob.arrayBuffer()) : null);
      }, "image/jpeg", quality);
    });
  }

  async function loadImage(bytes, type) {
    const blob = new Blob([bytes], { type });
    if (typeof createImageBitmap === "function") {
      try {
        return await createImageBitmap(blob);
      } catch {}
    }
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  }

  // A raw Flate bitmap (a screenshot, usually) becomes a canvas so it can be
  // treated the same way as a JPEG.
  async function rawImage(stream, info) {
    const raw = await inflateLoose(stream);
    const expected = info.width * info.height * info.channels;
    if (raw.length < expected) return null;
    const canvas = makeCanvas(info.width, info.height);
    const context = canvas.getContext("2d");
    const pixels = context.createImageData(info.width, info.height);
    for (let source = 0, target = 0; source < expected; source += info.channels, target += 4) {
      pixels.data[target] = raw[source];
      pixels.data[target + 1] = info.channels === 3 ? raw[source + 1] : raw[source];
      pixels.data[target + 2] = info.channels === 3 ? raw[source + 2] : raw[source];
      pixels.data[target + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    return canvas;
  }

  async function shrinkImage(object, info, preset) {
    const source = info.kind === "jpeg" ? await loadImage(object.stream, "image/jpeg") : await rawImage(object.stream, info);
    if (!source) return null;

    const scale = Math.min(1, preset.edge / Math.max(info.width, info.height));
    const width = Math.max(1, Math.round(info.width * scale));
    const height = Math.max(1, Math.round(info.height * scale));

    const canvas = makeCanvas(width, height);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    // Keeping grey pages grey saves bytes and looks right for line art.
    if (info.gray) context.filter = "grayscale(1)";
    context.drawImage(source, 0, 0, width, height);

    const bytes = await canvasBytes(canvas, preset.quality);
    if (!bytes || bytes.length >= object.stream.length) return null;
    return { bytes, width, height };
  }

  function countPages(objects) {
    let pages = 0;
    for (const object of objects.values()) if (/\/Type\s*\/Page[^s]/.test(`${object.dict} `)) pages++;
    return pages;
  }

  function presetFor(name) {
    return PRESETS[name] || PRESETS.balanced;
  }

  async function optimizePdf(bytes, presetName) {
    const preset = presetFor(presetName);
    const pdf = await readPdf(bytes);
    let candidates = 0;
    let shrunk = 0;
    let skipped = 0;

    for (const object of pdf.objects.values()) {
      if (!object.stream || object.drop) continue;
      const info = imageKind(object.dict);
      if (!info) continue;
      candidates++;
      let next = null;
      try {
        next = await shrinkImage(object, info, preset);
      } catch {
        next = null;
      }
      if (!next) {
        skipped++;
        continue;
      }
      object.stream = next.bytes;
      object.dict = replaceImageDict(object.dict, next, info.gray);
      shrunk++;
    }

    const tree = pageTree(pdf.objects, pdf.trailer.root.num);
    return {
      pdf: { ...pdf, pagesRef: tree.pagesRef, pages: tree.pages },
      before: bytes.length,
      candidates,
      shrunk,
      skipped,
      pages: countPages(pdf.objects),
    };
  }

  async function shrinkPdf(bytes, presetName) {
    const outcome = await optimizePdf(bytes, presetName);
    if (!outcome.candidates) throw new Error("noImages");
    const out = serializePdf(outcome.pdf.objects, outcome.pdf.trailer);
    // Lifting compressed object streams into plain objects costs bytes, and on
    // a file with little to gain that can outweigh the images. The original is
    // the better file then, so it is handed back untouched.
    const better = outcome.shrunk > 0 && out.length < bytes.length;
    return { ...outcome, bytes: better ? out : bytes, after: better ? out.length : bytes.length, unchanged: !better };
  }

  async function splitPdf(bytes, targetBytes, presetName) {
    const outcome = await optimizePdf(bytes, presetName);
    return { ...outcome, parts: splitParts(outcome.pdf, targetBytes) };
  }

  /* Packing the parts ------------------------------------------------------ */

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index++) {
      let value = index;
      for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      table[index] = value >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index++) crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  // One download instead of several: a browser blocks the second file a page
  // starts, so parts travel together in a stored (uncompressed) ZIP.
  function zipStore(files, date = new Date()) {
    const locals = [];
    const central = [];
    let offset = 0;
    const time = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff;
    const day = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;

    for (const file of files) {
      const name = fromLatin1(file.name);
      const crc = crc32(file.bytes);
      const local = new Uint8Array(30 + name.length);
      const view = new DataView(local.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, time, true);
      view.setUint16(12, day, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, file.bytes.length, true);
      view.setUint32(22, file.bytes.length, true);
      view.setUint16(26, name.length, true);
      local.set(name, 30);

      const record = new Uint8Array(46 + name.length);
      const recordView = new DataView(record.buffer);
      recordView.setUint32(0, 0x02014b50, true);
      recordView.setUint16(4, 20, true);
      recordView.setUint16(6, 20, true);
      recordView.setUint16(8, 0x0800, true);
      recordView.setUint16(10, 0, true);
      recordView.setUint16(12, time, true);
      recordView.setUint16(14, day, true);
      recordView.setUint32(16, crc, true);
      recordView.setUint32(20, file.bytes.length, true);
      recordView.setUint32(24, file.bytes.length, true);
      recordView.setUint16(28, name.length, true);
      recordView.setUint32(42, offset, true);
      record.set(name, 46);

      locals.push(local, file.bytes);
      central.push(record);
      offset += local.length + file.bytes.length;
    }

    const centralSize = central.reduce((total, record) => total + record.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);

    const out = new Uint8Array(offset + centralSize + end.length);
    let cursor = 0;
    for (const chunk of [...locals, ...central, end]) {
      out.set(chunk, cursor);
      cursor += chunk.length;
    }
    return out;
  }

  /* The panel ------------------------------------------------------------- */

  const CSS = `
    .wrap { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,.72); font: 14px/1.5 system-ui, -apple-system, sans-serif; color: #111; }
    .panel { display: flex; flex-direction: column; width: min(460px, 92vw); max-height: 90vh; background: #fbfaf8;
      border: 1px solid #111; box-shadow: 0 24px 60px rgba(0,0,0,.45); }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px;
      border-bottom: 1px solid #111; }
    .title { margin: 0; font-size: 14px; font-weight: 600; }
    .meta { margin: 2px 0 0; font: 600 9.5px/1.4 ui-monospace, monospace; letter-spacing: .08em;
      text-transform: uppercase; color: #666; }
    .close { padding: 4px 8px; border: 1px solid #111; background: transparent; color: #111;
      font: 600 10px/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
    .body { display: flex; flex-direction: column; gap: 12px; padding: 14px; overflow: auto; }
    .drop { display: flex; flex-direction: column; gap: 3px; padding: 18px 12px; text-align: center;
      border: 1px dashed #111; background: #fff; cursor: pointer; }
    .drop b { font-size: 13px; }
    .drop span { font-size: 11.5px; color: #666; }
    .drop.over { background: #111; color: #fbfaf8; }
    .drop.over span { color: #cfcac0; }
    .drop input { display: none; }
    .presets { display: flex; gap: 6px; }
    .presets button { flex: 1; padding: 7px 4px; border: 1px solid #111; background: transparent; color: #111;
      font: 600 9.5px/1.3 ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; }
    .presets button[aria-pressed="true"] { background: #111; color: #fbfaf8; }
    .presets button small { display: block; margin-top: 3px; font: 9px/1.3 system-ui, sans-serif;
      letter-spacing: 0; text-transform: none; opacity: .75; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .row span { font-size: 12px; }
    .row input { width: 92px; padding: 6px 7px; border: 1px solid #111; background: #fff; color: #111;
      font: 12px system-ui, sans-serif; text-align: right; }
    .status { margin: 0; padding: 9px 10px; border: 1px solid #111; background: #fff; font-size: 12.5px;
      overflow-wrap: anywhere; }
    .status.error { border-style: dashed; }
    .result { display: flex; flex-direction: column; gap: 4px; padding: 10px; border: 1px solid #111; background: #fff; }
    .result b { font-size: 18px; letter-spacing: -.01em; }
    .result span { font-size: 12px; color: #555; }
    .hint { margin: 0; font-size: 11.5px; color: #666; }
    .foot { display: flex; gap: 8px; justify-content: flex-end; padding: 10px 14px; border-top: 1px solid #111; }
    .foot button { padding: 6px 10px; border: 1px solid #111; background: transparent; color: #111;
      font: 600 10px/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
    .foot .primary { background: #111; color: #fbfaf8; }
    .foot .primary:disabled { opacity: .4; cursor: default; }
  `;

  function kb(bytes) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  function make(tag, attrs = {}, text = "") {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) {
      if (name === "class") element.className = value;
      else element.setAttribute(name, value);
    }
    if (text) element.textContent = text;
    return element;
  }

  function open() {
    document.getElementById("bl-pdf-shrink-host")?.remove();
    const host = document.createElement("div");
    host.id = "bl-pdf-shrink-host";
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;
    root.append(style);

    const state = { file: null, preset: "balanced", busy: false, result: null };

    const wrap = make("div", { class: "wrap" });
    const panel = make("section", { class: "panel", role: "dialog", "aria-modal": "true", "aria-label": "Shrink a PDF" });
    const head = make("header", { class: "head" });
    const titles = make("div");
    titles.append(make("h2", { class: "title" }, "Shrink a PDF"), make("p", { class: "meta" }, "Images only · pages and text stay"));
    const closeButton = make("button", { class: "close", type: "button" }, "Close");
    head.append(titles, closeButton);

    const body = make("div", { class: "body" });
    const drop = make("label", { class: "drop" });
    const dropTitle = make("b", {}, "Choose a PDF");
    const dropText = make("span", {}, "or drop one here · nothing is uploaded");
    const input = make("input", { type: "file", accept: "application/pdf,.pdf" });
    drop.append(dropTitle, dropText, input);

    const presets = make("div", { class: "presets", role: "group", "aria-label": "Compression strength" });
    const presetButtons = new Map();
    for (const [id, preset] of Object.entries(PRESETS)) {
      const button = make("button", { type: "button", "aria-pressed": String(id === state.preset) });
      button.append(make("span", {}, preset.label), make("small", {}, preset.note));
      button.addEventListener("click", () => {
        state.preset = id;
        for (const [key, node] of presetButtons) node.setAttribute("aria-pressed", String(key === id));
      });
      presetButtons.set(id, button);
      presets.append(button);
    }

    const splitRow = make("label", { class: "row" });
    const splitInput = make("input", { type: "number", min: "0.2", step: "0.5", placeholder: "off", inputmode: "decimal" });
    splitRow.append(make("span", {}, "Split parts under (MB)"), splitInput);

    const status = make("p", { class: "status" }, "Ready. Pick a PDF, then press Shrink.");
    const result = make("div", { class: "result" });
    result.hidden = true;
    const hint = make("p", { class: "hint" }, "The file is rebuilt here in the browser. Pages, links and text are kept; only images are re-encoded, and only when the result is smaller.");

    body.append(drop, presets, splitRow, status, result, hint);

    const foot = make("footer", { class: "foot" });
    const download = make("button", { class: "primary", type: "button", "data-download": "" }, "Download");
    download.disabled = true;
    const shrinkButton = make("button", { type: "button", "data-shrink": "" }, "Shrink");
    shrinkButton.disabled = true;
    foot.append(download, shrinkButton);

    panel.append(head, body, foot);
    wrap.append(panel);
    root.append(wrap);

    const close = () => {
      window.removeEventListener("keydown", onKey, true);
      host.remove();
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    closeButton.addEventListener("click", close);
    wrap.addEventListener("click", (event) => {
      if (event.target === wrap) close();
    });

    function setStatus(message, error = false) {
      status.textContent = message;
      status.className = error ? "status error" : "status";
    }

    function choose(file) {
      if (!file) return;
      state.file = file;
      state.result = null;
      result.hidden = true;
      download.disabled = true;
      shrinkButton.disabled = false;
      dropTitle.textContent = file.name;
      dropText.textContent = `${kb(file.size)} · press Shrink`;
      setStatus(`Ready to shrink ${file.name} (${kb(file.size)}).`);
    }

    input.addEventListener("change", () => choose(input.files?.[0]));
    drop.addEventListener("dragover", (event) => {
      event.preventDefault();
      drop.classList.add("over");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      drop.classList.remove("over");
      const file = event.dataTransfer?.files?.[0];
      if (file) choose(file);
    });

    async function run() {
      if (state.busy || !state.file) return;
      state.busy = true;
      shrinkButton.disabled = true;
      download.disabled = true;
      result.hidden = true;
      setStatus(`Reading ${state.file.name}…`);

      try {
        const bytes = new Uint8Array(await state.file.arrayBuffer());
        setStatus("Recompressing images and rebuilding the file…");
        // Let the status paint before the main thread gets busy.
        await new Promise((resolve) => setTimeout(resolve, 30));
        const targetMb = Number.parseFloat(splitInput.value);
        const target = Number.isFinite(targetMb) && targetMb > 0 ? targetMb * 1024 * 1024 : 0;
        const outcome = target ? await splitPdf(bytes, target, state.preset) : await shrinkPdf(bytes, state.preset);
        const parts = outcome.parts || null;
        const total = parts ? parts.reduce((sum, part) => sum + part.bytes.length, 0) : outcome.after;
        const saved = outcome.before - total;

        if (!parts && saved <= 0) {
          setStatus(`No gain: the rebuilt file is ${kb(total)}, about the same as the original. Nothing was downloaded.`, true);
          result.hidden = true;
          return;
        }

        const base = state.file.name.replace(/\.pdf$/i, "");
        let filename = `${base}-small.pdf`;
        let output = outcome.bytes;
        if (parts && parts.length > 1) {
          filename = `${base}-parts.zip`;
          output = zipStore(parts.map((part, index) => ({ name: `${base}-part${index + 1}.pdf`, bytes: part.bytes })));
        } else if (parts) {
          output = parts[0].bytes;
        }
        state.result = { bytes: output, filename };

        const ranges = parts
          ? parts.map((part) => (part.from === part.to ? `${part.from}` : `${part.from}–${part.to}`)).join(", ")
          : "";
        const headline = parts && parts.length > 1
          ? `${parts.length} parts · ${kb(total)}`
          : `${kb(outcome.before)} → ${kb(total)}`;
        const detail = parts && parts.length > 1
          ? `pages ${ranges} · each under ${kb(target)}${parts.some((part) => part.tooBig) ? " except one page that is larger on its own" : ""} · ${outcome.shrunk} of ${outcome.candidates} images recompressed`
          : `${Math.round((saved / outcome.before) * 100)}% smaller · ${outcome.shrunk} of ${outcome.candidates} images recompressed${outcome.skipped ? `, ${outcome.skipped} left alone because re-encoding did not help` : ""}`;

        setStatus(`Done. ${outcome.pages} page${outcome.pages === 1 ? "" : "s"} in ${parts && parts.length > 1 ? `${parts.length} files, zipped` : "1 file"}.`);
        result.replaceChildren(make("b", {}, headline), make("span", {}, detail));
        result.hidden = false;
        download.textContent = parts && parts.length > 1 ? "Download .zip" : "Download";
        download.disabled = false;
      } catch (error) {
        const message = MESSAGES[error?.message] || `Could not shrink this PDF: ${error?.message || error}`;
        setStatus(message, true);
      } finally {
        state.busy = false;
        shrinkButton.disabled = !state.file;
      }
    }

    shrinkButton.addEventListener("click", () => void run());

    download.addEventListener("click", () => {
      if (!state.result) return;
      const { bytes, filename } = state.result;
      const type = filename.endsWith(".zip") ? "application/zip" : "application/pdf";
      const url = URL.createObjectURL(new Blob([bytes], { type }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setStatus(`Saved ${filename} (${kb(bytes.length)}).`);
    });

    document.body.append(host);
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.pdfShrink = {
      isPdf, scanObjects, serializePdf, imageKind, replaceImageDict, presetFor, countPages, dictEnd,
      pageTree, subsetFor, splitParts, crc32, zipStore, shrinkPdf, splitPdf, readPdf,
    };
  } else if (document?.body) {
    open();
  }
})();
