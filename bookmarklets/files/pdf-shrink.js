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
    strong: { label: "Strong", edge: 1800, quality: 0.62, note: "Fits tight limits, keeps text crisp" },
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
        // The reference form must come first in the alternation: matching `73`
        // inside `73 0 R` would leave `/Length 79 0 R`, a pointer at whatever
        // object carries that number instead of a byte count.
        const existing = /\/Length\s+(\d+\s+\d+\s+R|\d+)/;
        dict = existing.test(dict)
          ? dict.replace(existing, length)
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

  const LADDER = ["light", "balanced", "strong"];

  // From the chosen strength upwards. A ceiling is a promise, so a part that
  // does not fit is compressed harder before it is called impossible.
  function ladderFrom(name) {
    const index = LADDER.indexOf(name);
    return LADDER.slice(index < 0 ? 1 : index);
  }

  async function splitPdf(bytes, targetBytes, presetName) {
    const ladder = ladderFrom(presetName);
    let outcome = null;
    let parts = [];
    let used = ladder[0];
    for (const name of ladder) {
      outcome = await optimizePdf(bytes, name);
      parts = splitParts(outcome.pdf, targetBytes);
      used = name;
      if (parts.every((part) => part.bytes.length <= targetBytes)) break;
    }
    return { ...outcome, parts, preset: used, escalated: used !== ladder[0] };
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

  // A wizard, not a form: dropping files is the only action, compression starts
  // by itself, and the panel turns into progress and then into the finished
  // files. There is one compression setting, because the job is "as small as
  // this can get without making the words unreadable", not a slider to tune.
  const CSS = `
    .wrap { position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,.72);
      font: 14px/1.5 system-ui, -apple-system, sans-serif; color: #111; }
    .panel { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex;
      flex-direction: column; width: min(520px, 94vw); max-height: 90vh; background: #fbfaf8;
      border: 1px solid #111; box-shadow: 0 24px 60px rgba(0,0,0,.45); }
    .panel[data-dragged] { transform: none; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px;
      border-bottom: 1px solid #111; cursor: grab; touch-action: none; user-select: none; }
    .panel.dragging .head { cursor: grabbing; }
    .title { margin: 0; font-size: 14px; font-weight: 600; }
    .meta { margin: 2px 0 0; font: 600 9.5px/1.4 ui-monospace, monospace; letter-spacing: .08em;
      text-transform: uppercase; color: #666; }
    .close { padding: 4px 8px; border: 1px solid #111; background: transparent; color: #111;
      font: 600 10px/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
    .body { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; overflow: auto; }
    .intake { display: flex; flex-direction: column; gap: 10px; }
    .intake[hidden] { display: none; }
    .drop { display: flex; flex-direction: column; gap: 3px; padding: 18px 12px; text-align: center;
      border: 1px dashed #111; background: #fff; cursor: pointer; }
    .drop b { font-size: 13px; }
    .drop span { font-size: 11.5px; color: #666; }
    .drop.over { background: #111; color: #fbfaf8; }
    .drop.over span { color: #cfcac0; }
    .drop input { display: none; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .row span { font-size: 12px; }
    .row input { width: 92px; padding: 6px 7px; border: 1px solid #111; background: #fff; color: #111;
      font: 12px system-ui, sans-serif; text-align: right; }
    .max { display: flex; flex-direction: column; gap: 7px; }
    .range { width: 100%; margin: 0; accent-color: #111; }
    .bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px;
      border: 1px solid #111; background: #fff; }
    .bar[hidden] { display: none; }
    .bar b { font-size: 12px; font-weight: 600; }
    .add-more { padding: 3px 7px; border: 1px solid #111; background: transparent; color: #111;
      font: 600 9px/1 ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; }
    .jobs { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none;
      border: 1px solid #111; background: #fff; max-height: 176px; overflow: auto; }
    .jobs:empty { display: none; }
    .job { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 10px; padding: 8px 10px;
      border-bottom: 1px solid #ddd; }
    .job:last-child { border-bottom: 0; }
    .job-name { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .job-meta { grid-column: 1; font: 11px/1.4 ui-monospace, monospace; color: #555; }
    .job-state { grid-row: 1 / span 2; grid-column: 2; align-self: center;
      font: 600 9px/1 ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; color: #555; }
    .job.done .job-state { color: #111; }
    .job-track { grid-column: 1 / -1; height: 2px; margin-top: 5px; background: #e6e2d9; }
    .job-fill { display: block; height: 100%; width: 0; background: #111; transition: width .25s linear; }
    .results { display: flex; flex-direction: column; gap: 9px; padding: 10px; border: 1px solid #111; background: #fff; }
    .results[hidden] { display: none; }
    .results-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
    .results-head b { font-size: 13px; }
    .results-head span { font: 600 9.5px/1.4 ui-monospace, monospace; letter-spacing: .06em;
      text-transform: uppercase; color: #666; text-align: right; }
    .drag-all { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px dashed #111;
      background: #fbfaf8; cursor: grab; font: 600 10px/1.3 ui-monospace, monospace; letter-spacing: .05em;
      text-transform: uppercase; }
    .drag-all:active { cursor: grabbing; background: #111; color: #fbfaf8; }
    .drag-all[hidden] { display: none; }
    .drag-all-pill { padding: 3px 5px; border: 1px solid currentColor; font-size: 9px; }
    .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; }
    .tile { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 9px 6px;
      border: 1px solid #111; background: #fbfaf8; cursor: grab; text-align: center; }
    .tile:active { cursor: grabbing; }
    .tile-icon { padding: 4px 6px; border: 1px solid #111; font: 600 9px/1 ui-monospace, monospace; letter-spacing: .06em; }
    .tile-name { font: 10px/1.3 ui-monospace, monospace; overflow-wrap: anywhere; }
    .tile-size { font: 9.5px/1.2 ui-monospace, monospace; color: #666; }
    .tile-save { margin-top: 2px; padding: 3px 6px; border: 1px solid #111; background: transparent; color: #111;
      font: 600 8.5px/1 ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; }
    .status { margin: 0; padding: 9px 10px; border: 1px solid #111; background: #fff; font-size: 12.5px;
      overflow-wrap: anywhere; }
    .status.error { border-style: dashed; }
    .hint { margin: 0; font-size: 11.5px; color: #666; }
    .foot { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; padding: 10px 14px;
      border-top: 1px solid #111; }
    .foot button { padding: 6px 10px; border: 1px solid #111; background: transparent; color: #111;
      font: 600 10px/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
    .foot .primary { background: #111; color: #fbfaf8; }
    .foot button:disabled { opacity: .4; cursor: default; }
    .foot button[hidden] { display: none; }
  `;

  // Sizes are always MB, with decimals below 10 MB: upload limits are quoted
  // that way, so "0.06 MB" reads true beside a 20 MB ceiling where "58 KB"
  // needs a conversion first.
  function mb(bytes) {
    const value = bytes / (1024 * 1024);
    if (value >= 100) return `${Math.round(value)} MB`;
    if (value >= 10) return `${value.toFixed(1)} MB`;
    return `${value.toFixed(2)} MB`;
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

  // A batch can hold two files with the same name, so the second entry needs a
  // suffix or the archive carries duplicates.
  function uniqueName(name, used) {
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : "";
    let index = 2;
    while (used.has(`${base}-${index}${extension}`)) index++;
    const next = `${base}-${index}${extension}`;
    used.add(next);
    return next;
  }

  // Chromium's download-drag shape: mime, then the name, then the URL. A page
  // cannot put a file into another site's picker, but a drag carrying this lets
  // a finished PDF be dropped where the saved copy would have gone.
  function downloadDragPayload(name, type, url) {
    return `${type}:${name}:${url}`;
  }

  // A dragged panel is clamped so its header stays reachable; one dropped past
  // an edge would be a dialog nobody can grab again.
  function clampOrigin(x, y, size, viewport, margin = 8) {
    const maxLeft = Math.max(margin, viewport.width - size.width - margin);
    const maxTop = Math.max(margin, viewport.height - 120);
    return {
      left: Math.min(Math.max(x, margin), maxLeft),
      top: Math.min(Math.max(y, margin), maxTop),
    };
  }

  function attachDragging(panel, head) {
    let drag = null;
    const onMove = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const rect = panel.getBoundingClientRect();
      const origin = clampOrigin(event.clientX - drag.dx, event.clientY - drag.dy, rect, {
        width: window.innerWidth,
        height: window.innerHeight,
      });
      panel.style.left = `${origin.left}px`;
      panel.style.top = `${origin.top}px`;
      event.preventDefault();
    };
    const onUp = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      panel.classList.remove("dragging");
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
    };
    head.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || (event.target instanceof Element && event.target.closest("button, input, a"))) return;
      const rect = panel.getBoundingClientRect();
      drag = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
      panel.dataset.dragged = "";
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
      panel.classList.add("dragging");
      event.preventDefault();
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onUp, true);
      window.addEventListener("pointercancel", onUp, true);
    });
  }

  function open() {
    document.getElementById("bl-pdf-shrink-host")?.remove();
    const host = document.createElement("div");
    host.id = "bl-pdf-shrink-host";
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;
    root.append(style);

    // One setting, chosen here rather than offered as a choice: Strong holds
    // 1800 px so small print survives, and spends the savings on JPEG quality.
    const state = { preset: "strong", busy: false };

    const wrap = make("div", { class: "wrap" });
    const panel = make("section", { class: "panel", role: "dialog", "aria-modal": "true", "aria-label": "Shrink PDFs" });
    const head = make("header", { class: "head" });
    const titles = make("div");
    titles.append(make("h2", { class: "title" }, "Shrink PDFs"), make("p", { class: "meta" }, "Images only · pages and text stay"));
    const closeButton = make("button", { class: "close", type: "button" }, "Close");
    head.append(titles, closeButton);

    const body = make("div", { class: "body" });

    const intake = make("div", { class: "intake" });
    const drop = make("label", { class: "drop" });
    const dropTitle = make("b", {}, "Drop PDFs here");
    const dropText = make("span", {}, "pick several at once · compression starts on its own");
    const input = make("input", { type: "file", accept: "application/pdf,.pdf", multiple: "" });
    drop.append(dropTitle, dropText, input);
    const maxRow = make("label", { class: "row" });
    const maxInput = make("input", { type: "number", min: "0.5", max: "500", step: "0.5", inputmode: "decimal", value: "20", "data-max": "" });
    maxRow.append(make("span", {}, "Max file size (MB)"), maxInput);
    const maxRange = make("input", { class: "range", type: "range", min: "0.05", max: "60", step: "0.05", value: "20", "aria-label": "Maximum file size in megabytes", "data-max-range": "" });
    const maxBlock = make("div", { class: "max" });
    maxBlock.append(maxRow, maxRange);
    intake.append(drop, maxBlock);

    const bar = make("div", { class: "bar" });
    bar.hidden = true;
    const barText = make("b");
    const addMore = make("button", { class: "add-more", type: "button" }, "Add more");
    bar.append(barText, addMore);

    const jobs = make("ul", { class: "jobs", "aria-label": "Compression progress", "data-jobs": "" });

    const results = make("section", { class: "results", "aria-label": "Finished files" });
    results.hidden = true;
    const resultsHead = make("div", { class: "results-head" });
    const resultsTitle = make("b", {}, "Ready");
    const resultsNote = make("span");
    resultsHead.append(resultsTitle, resultsNote);
    const dragAll = make("div", { class: "drag-all", draggable: "true", "data-drag-all": "", title: "Drag every finished file at once" });
    dragAll.append(make("span", { class: "drag-all-pill" }, "PDF"), make("span", {}, "Drag all onto the upload box"));
    dragAll.hidden = true;
    const tiles = make("div", { class: "tiles", "data-tiles": "" });
    results.append(resultsHead, dragAll, tiles);

    const status = make("p", { class: "status" }, "Drop PDFs and they start compressing. The finished files appear here to drag or save.");
    const hint = make("p", { class: "hint" }, "Always the strongest setting: 1800 px long edge at JPEG 0.62, which held 99% of the words on scanned pages. Anything over the maximum size is split into parts that fit, and a page that cannot fit is reported instead of dropped.");

    body.append(intake, bar, jobs, results, status, hint);

    const foot = make("footer", { class: "foot" });
    const folder = make("button", { type: "button", "data-folder": "" }, "Save all to folder");
    folder.hidden = typeof window.showDirectoryPicker !== "function";
    folder.disabled = true;
    const download = make("button", { class: "primary", type: "button", "data-download": "" }, "Download");
    download.disabled = true;
    foot.append(folder, download);

    panel.append(head, body, foot);
    wrap.append(panel);
    root.append(wrap);
    attachDragging(panel, head);

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

    maxRange.addEventListener("input", () => { maxInput.value = maxRange.value; });
    maxInput.addEventListener("input", () => {
      const value = Number.parseFloat(maxInput.value);
      if (Number.isFinite(value) && value > 0) maxRange.value = String(Math.min(60, Math.max(0.05, value)));
    });

    function setStatus(message, error = false) {
      status.textContent = message;
      status.className = error ? "status error" : "status";
    }

    const items = [];

    function baseName(name) {
      return name.replace(/\.pdf$/i, "");
    }

    function saveBytes(bytes, filename) {
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
      setStatus(`Saved ${filename} (${mb(bytes.length)}).`);
    }

    // Everything that finished, with the names the archive and the folder save
    // will use: split files become one archive per source file, and two sources
    // with the same name get distinct entries.
    function resultFiles() {
      const used = new Set();
      return items
        .filter((item) => item.result.length)
        .flatMap((item) => {
          if (item.result.length > 1) {
            const name = uniqueName(`${baseName(item.file.name)}-parts.zip`, used);
            return [{ name, bytes: zipStore(item.result), type: "application/zip" }];
          }
          return item.result.map((entry) => ({
            name: uniqueName(entry.name, used),
            bytes: entry.bytes,
            type: "application/pdf",
          }));
        });
    }

    function startDrag(event, files) {
      if (!event.dataTransfer || !files.length) {
        event.preventDefault();
        return;
      }
      const transfer = event.dataTransfer;
      transfer.effectAllowed = "copy";
      // A file input on this page reads dataTransfer.files, so a drag of real
      // File objects is what makes "drag all" land as several files at once.
      for (const file of files) {
        try {
          transfer.items.add(new File([file.bytes], file.name, { type: file.type }));
        } catch {
          /* a browser that refuses File items still gets the download payload */
        }
      }
      const first = files[0];
      const url = URL.createObjectURL(new Blob([first.bytes], { type: first.type }));
      setTimeout(() => URL.revokeObjectURL(url), 120000);
      transfer.setData("DownloadURL", downloadDragPayload(first.name, first.type, url));
      transfer.setData("text/plain", files.map((file) => file.name).join("\n"));
      setStatus(files.length === 1 ? `Dragging ${first.name} — drop it on the upload box.` : `Dragging ${files.length} files — drop them on the upload box.`);
    }

    function tileFor(entry) {
      const tile = make("div", { class: "tile", draggable: "true", "data-tile": entry.name });
      const icon = make("span", { class: "tile-icon" }, entry.type === "application/zip" ? "ZIP" : "PDF");
      const name = make("span", { class: "tile-name" }, entry.name);
      const size = make("span", { class: "tile-size" }, mb(entry.bytes.length));
      const save = make("button", { class: "tile-save", type: "button" }, "Save");
      save.addEventListener("click", (event) => {
        event.stopPropagation();
        saveBytes(entry.bytes, entry.name);
      });
      tile.append(icon, name, size, save);
      tile.addEventListener("dragstart", (event) => startDrag(event, [entry]));
      return tile;
    }

    function jobFor(file) {
      const row = make("li", { class: "job" });
      const name = make("span", { class: "job-name" }, file.name);
      const meta = make("span", { class: "job-meta" }, `${mb(file.size)} · waiting`);
      const mark = make("span", { class: "job-state" }, "Waiting");
      const track = make("span", { class: "job-track" });
      const fill = make("span", { class: "job-fill" });
      track.append(fill);
      row.append(name, meta, mark, track);
      jobs.append(row);
      return { file, status: "queued", result: [], meta, mark, fill, row };
    }

    function progress(item, percent, label) {
      item.fill.style.width = `${percent}%`;
      if (label) item.meta.textContent = label;
    }

    function showBar() {
      const total = items.reduce((sum, item) => sum + item.file.size, 0);
      const ceiling = Number.parseFloat(maxInput.value);
      const ceilingNote = Number.isFinite(ceiling) && ceiling > 0 ? ` · max ${mb(ceiling * 1024 * 1024)}` : "";
      barText.textContent = `${items.length} PDF${items.length === 1 ? "" : "s"} · ${mb(total)}${ceilingNote}`;
    }

    function showSummary() {
      const files = resultFiles();
      const done = items.filter((item) => item.status === "done");
      const none = items.filter((item) => item.status === "none");
      const failed = items.filter((item) => item.status === "error");
      download.disabled = files.length === 0;
      folder.disabled = files.length === 0;
      download.textContent = files.length > 1 ? "Download all (.zip)" : "Download";
      dragAll.hidden = files.length === 0;
      if (!files.length) {
        results.hidden = true;
        return;
      }
      const before = done.reduce((sum, item) => sum + item.file.size, 0);
      const after = files.reduce((sum, file) => sum + file.bytes.length, 0);
      const saved = before ? Math.round(((before - after) / before) * 100) : 0;
      resultsTitle.textContent = files.length === 1 ? "1 file ready" : `${files.length} files ready`;
      const notes = [`${mb(before)} → ${mb(after)}`, saved > 0 ? `${saved}% smaller` : "no saving"];
      if (none.length) notes.push(`${none.length} with no gain`);
      if (failed.length) notes.push(`${failed.length} failed`);
      resultsNote.textContent = notes.join(" · ");
      tiles.replaceChildren(...files.map(tileFor));
      results.hidden = false;
    }

    async function saveAllToFolder() {
      const files = resultFiles();
      if (!files.length || typeof window.showDirectoryPicker !== "function") return;
      try {
        // Picking a folder beats a ZIP here: the files arrive as themselves, so
        // the page's own upload control can take several at once from the folder.
        const directory = await window.showDirectoryPicker({ id: "bl-pdf-shrink", mode: "readwrite" });
        setStatus(`Writing ${files.length} file${files.length === 1 ? "" : "s"} to ${directory.name}…`);
        for (const file of files) {
          const handle = await directory.getFileHandle(file.name, { create: true });
          const writable = await handle.createWritable();
          await writable.write(file.bytes);
          await writable.close();
        }
        setStatus(`Saved ${files.length} file${files.length === 1 ? "" : "s"} to ${directory.name}. Drag them from there into the upload box.`);
      } catch (error) {
        if (error?.name === "AbortError") {
          setStatus("Folder pick cancelled; nothing was written.");
          return;
        }
        setStatus(`Could not write to that folder: ${error?.message || error}`, true);
      }
    }

    async function processItem(item) {
      item.status = "working";
      item.row.classList.add("working");
      item.mark.textContent = "Working";
      progress(item, 12, `${mb(item.file.size)} · reading`);
      setStatus(`Compressing ${item.file.name}…`);
      try {
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        progress(item, 45, "re-encoding images");
        await new Promise((resolve) => setTimeout(resolve, 20));
        const targetMb = Number.parseFloat(maxInput.value);
        const target = Number.isFinite(targetMb) && targetMb > 0 ? targetMb * 1024 * 1024 : 0;
        const outcome = target ? await splitPdf(bytes, target, state.preset) : await shrinkPdf(bytes, state.preset);
        const parts = outcome.parts || null;
        const total = parts ? parts.reduce((sum, part) => sum + part.bytes.length, 0) : outcome.after;
        const saved = outcome.before - total;

        if (saved <= 0 && (!parts || parts.length === 1)) {
          item.status = "none";
          item.row.classList.add("none");
          item.mark.textContent = "No gain";
          progress(item, 100, `${mb(outcome.before)} · already tight, left as it was`);
          return;
        }

        const base = baseName(item.file.name);
        if (parts && parts.length > 1) {
          item.result = parts.map((part, index) => ({ name: `${base}-part${index + 1}.pdf`, bytes: part.bytes, type: "application/pdf" }));
          progress(item, 100, `${parts.length} parts · ${mb(total)}`);
          if (parts.some((part) => part.tooBig)) progress(item, 100, `${parts.length} parts · ${mb(total)} · a page will not fit under ${mb(target)}`);
        } else {
          item.result = [{ name: `${base}-small.pdf`, bytes: parts ? parts[0].bytes : outcome.bytes, type: "application/pdf" }];
          progress(item, 100, `${mb(outcome.before)} → ${mb(total)} · ${Math.round((saved / outcome.before) * 100)}% smaller`);
          if (parts && parts[0] && parts[0].tooBig) progress(item, 100, `${mb(outcome.before)} → ${mb(total)} · still over ${mb(target)}`);
        }
        item.status = "done";
        item.row.classList.add("done");
        item.mark.textContent = "Done";
      } catch (error) {
        item.status = "error";
        item.row.classList.add("error");
        item.mark.textContent = "Failed";
        progress(item, 100, (MESSAGES[error?.message] || String(error?.message || error)).slice(0, 90));
      } finally {
        showSummary();
      }
    }

    async function run() {
      if (state.busy) return;
      const queued = items.filter((item) => item.status === "queued").length;
      if (!queued) return;
      state.busy = true;
      try {
        for (;;) {
          const next = items.find((item) => item.status === "queued");
          if (!next) break;
          await processItem(next);
        }
      } finally {
        state.busy = false;
        const done = items.filter((item) => item.status === "done").length;
        const none = items.filter((item) => item.status === "none").length;
        const failed = items.filter((item) => item.status === "error").length;
        const left = items.length - done - none - failed;
        if (left > 0) {
          setStatus(`${done} ready, ${left} still to go. Add more or press Save.`, false);
        } else {
          setStatus(
            `${done + none} file${done + none === 1 ? "" : "s"} finished${none ? `, ${none} already tight` : ""}${failed ? `, ${failed} failed` : ""}. Drag them onto the upload box, or save them.`,
            done === 0,
          );
        }
      }
    }

    function addFiles(list) {
      const files = [...list];
      const pdfs = files.filter((file) => /\.pdf$/i.test(file.name) || file.type === "application/pdf");
      const skipped = files.length - pdfs.length;
      if (!pdfs.length) {
        setStatus("That does not look like a PDF. Choose a .pdf file.", true);
        return;
      }
      for (const file of pdfs) items.push(jobFor(file));
      // The intake is out of the way from here: the wizard owns the panel now,
      // and "Add more" brings the drop zone back.
      intake.hidden = true;
      bar.hidden = false;
      showBar();
      const waiting = items.filter((item) => item.status === "queued").length;
      setStatus(`Compressing ${waiting} PDF${waiting === 1 ? "" : "s"}${skipped ? `, ${skipped} non-PDF ${skipped === 1 ? "file" : "files"} skipped` : ""}…`);
      void run();
    }

    input.addEventListener("change", () => {
      addFiles(input.files || []);
      input.value = "";
    });
    drop.addEventListener("dragover", (event) => {
      event.preventDefault();
      drop.classList.add("over");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      drop.classList.remove("over");
      addFiles(event.dataTransfer?.files || []);
    });

    addMore.addEventListener("click", () => {
      intake.hidden = false;
      setStatus("Add more PDFs; they join the queue and start on their own.");
    });

    folder.addEventListener("click", () => void saveAllToFolder());

    dragAll.addEventListener("dragstart", (event) => startDrag(event, resultFiles()));

    download.addEventListener("click", () => {
      const files = resultFiles();
      if (!files.length) return;
      if (files.length === 1) saveBytes(files[0].bytes, files[0].name);
      else saveBytes(zipStore(files), `shrunken-${files.length}-files.zip`);
    });

    document.body.append(host);
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.pdfShrink = {
      isPdf, scanObjects, serializePdf, imageKind, replaceImageDict, presetFor, countPages, dictEnd,
      pageTree, subsetFor, splitParts, crc32, zipStore, shrinkPdf, splitPdf, readPdf, uniqueName, ladderFrom,
      downloadDragPayload, clampOrigin,
    };
  } else if (document?.body) {
    open();
  }
})();
