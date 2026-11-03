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
        const direct = dict.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/);
        let end;
        if (direct) {
          end = start + Number(direct[1]);
        } else {
          // An indirect /Length lives in another object, so fall back to the
          // endstream marker and drop the line break in front of it.
          const marker = text.indexOf("endstream", start);
          if (marker < 0) continue;
          end = marker;
          while (end > start && (text[end - 1] === "\n" || text[end - 1] === "\r")) end--;
        }
        if (end > start && end <= bytes.length) stream = bytes.subarray(start, end);
      } else if (!dict) {
        const stop = text.indexOf("endobj", cursor);
        body = text.slice(cursor, stop > cursor ? stop : cursor).trim();
      }

      objects.set(num, { num, gen, dict, body, stream });
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
        if (body && !objects.has(num)) objects.set(num, { num, gen: 0, dict: body, body: "", stream: null });
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
      pushText(object.dict || object.body || "<< >>");
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

  async function shrinkPdf(bytes, presetName) {
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

    if (!candidates) throw new Error("noImages");
    const out = serializePdf(pdf.objects, pdf.trailer);
    return {
      bytes: out,
      before: bytes.length,
      after: out.length,
      pages: countPages(pdf.objects),
      candidates,
      shrunk,
      skipped,
    };
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

    const status = make("p", { class: "status" }, "Ready. Pick a PDF, then press Shrink.");
    const result = make("div", { class: "result" });
    result.hidden = true;
    const hint = make("p", { class: "hint" }, "The file is rebuilt here in the browser. Pages, links and text are kept; only images are re-encoded, and only when the result is smaller.");

    body.append(drop, presets, status, result, hint);

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
        const outcome = await shrinkPdf(bytes, state.preset);
        state.result = outcome;

        const saved = outcome.before - outcome.after;
        const percent = Math.round((saved / outcome.before) * 100);
        if (saved <= 0) {
          setStatus(`No gain: the rebuilt file is ${kb(outcome.after)}, about the same as the original. Nothing was downloaded.`, true);
          result.hidden = true;
          return;
        }

        setStatus(`Done. ${outcome.pages} page${outcome.pages === 1 ? "" : "s"} kept.`);
        const figure = make("b", {}, `${kb(outcome.before)} → ${kb(outcome.after)}`);
        const detail = make(
          "span",
          {},
          `${percent}% smaller · ${outcome.shrunk} of ${outcome.candidates} images recompressed${outcome.skipped ? `, ${outcome.skipped} left alone because re-encoding did not help` : ""}`,
        );
        result.replaceChildren(figure, detail);
        result.hidden = false;
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
      const base = state.file.name.replace(/\.pdf$/i, "");
      const blob = new Blob([state.result.bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${base}-small.pdf`;
      anchor.rel = "noopener";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setStatus(`Saved ${base}-small.pdf (${kb(state.result.after)}).`);
    });

    document.body.append(host);
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.pdfShrink = {
      isPdf, scanObjects, serializePdf, imageKind, replaceImageDict, presetFor, countPages, dictEnd,
    };
  } else if (document?.body) {
    open();
  }
})();
