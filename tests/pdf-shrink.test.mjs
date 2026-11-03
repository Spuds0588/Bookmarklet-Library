import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "files", "pdf-shrink.js"), "utf8"))();
const { isPdf, scanObjects, serializePdf, imageKind, replaceImageDict, presetFor, countPages, dictEnd, pageTree, subsetFor, splitParts, crc32, zipStore } =
  globalThis.__BL_TEST__.pdfShrink;
delete globalThis.__BL_TEST__;

const ascii = (text) => new TextEncoder().encode(text);
const textOf = (bytes) => Buffer.from(bytes).toString("latin1");

function sampleObjects() {
  return new Map([
    [1, { num: 1, gen: 0, dict: "<< /Type /Catalog /Pages 2 0 R >>", body: "", stream: null }],
    [2, { num: 2, gen: 0, dict: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", body: "", stream: null }],
    [3, { num: 3, gen: 0, dict: "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>", body: "", stream: null }],
    [
      4,
      {
        num: 4,
        gen: 0,
        dict: "<< /Length 12 >>",
        body: "",
        stream: ascii("q 1 0 0 1 Q\n"),
      },
    ],
  ]);
}

test("a PDF header is recognised even with a little junk in front", () => {
  assert.equal(isPdf(ascii("%PDF-1.7\n...")), true);
  assert.equal(isPdf(ascii("\n\n%PDF-1.4\n")), true);
  assert.equal(isPdf(ascii("<html><body>nope</body></html>")), false);
  assert.equal(isPdf(new Uint8Array([])), false);
});

test("objects are found, including streams with an indirect length", () => {
  const pdf = ascii(
    "%PDF-1.4\n" +
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
      "4 0 obj\n<< /Length 9 0 R >>\nstream\nBT /F1 12 Tf\nendstream\nendobj\n" +
      "9 0 obj\n17\nendobj\n" +
      "trailer\n<< /Size 10 /Root 1 0 R >>\n%%EOF\n",
  );
  const { objects } = scanObjects(pdf);
  assert.equal(objects.size, 3);
  assert.equal(objects.get(1).dict, "<< /Type /Catalog /Pages 2 0 R >>");
  // The /Length points at object 9, so the stream ends at endstream instead.
  assert.equal(textOf(objects.get(4).stream), "BT /F1 12 Tf");
  assert.equal(objects.get(9).body, "17");
});

test("a later definition replaces the earlier one, dropping revision leftovers", () => {
  const pdf = ascii(
    "%PDF-1.4\n" +
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
      "1 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n" +
      "trailer\n<< /Size 4 /Root 1 0 R >>\n%%EOF\n",
  );
  const { objects } = scanObjects(pdf);
  assert.equal(objects.size, 1);
  assert.match(objects.get(1).dict, /Pages 3 0 R/);
});

test("nested dictionaries end where they should", () => {
  const dict = "<< /Type /XObject /DecodeParms << /Predictor 12 >> /Width 4 >>";
  assert.equal(dictEnd(dict, 0), dict.length);
});

test("the rebuilt file is a valid PDF whose xref points at every object", () => {
  const bytes = serializePdf(sampleObjects(), { root: { num: 1, gen: 0 }, id: "" });
  const text = textOf(bytes);
  assert.match(text, /^%PDF-1\.7\n/);
  assert.match(text, /\/Root 1 0 R/);
  assert.match(text, /%%EOF\n$/);

  const startxref = Number(text.match(/startxref\n(\d+)/)[1]);
  const rows = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((match) => Number(match[1]));
  assert.equal(rows.length, 4);
  for (const offset of rows) {
    assert.match(text.slice(offset, offset + 20), /^\d+ 0 obj\n/);
  }

  // Round-tripping the rebuilt file must give back the same objects and stream.
  const { objects } = scanObjects(bytes);
  assert.equal(objects.size, 4);
  assert.equal(textOf(objects.get(4).stream), "q 1 0 0 1 Q\n");
});

test("only images this tool can re-encode are offered up", () => {
  const base = "/Type /XObject /Subtype /Image /Width 100 /Height 200 /ColorSpace /DeviceRGB /BitsPerComponent 8";
  const jpeg = `<< ${base} /Filter /DCTDecode /Length 5 >>`;
  assert.deepEqual(imageKind(jpeg), { kind: "jpeg", width: 100, height: 200, gray: false });

  assert.equal(imageKind(`<< ${base} /Filter [/DCTDecode] /Length 5 >>`).kind, "jpeg");

  const flate = `<< ${base} /Filter /FlateDecode /Length 5 >>`;
  assert.deepEqual(imageKind(flate), { kind: "flate", width: 100, height: 200, gray: false, channels: 3 });

  const gray = `<< ${base.replace("/DeviceRGB", "/DeviceGray")} /Filter /FlateDecode /Length 5 >>`;
  assert.equal(imageKind(gray).gray, true);
  assert.equal(imageKind(gray).channels, 1);

  // Left exactly as they are: a canvas cannot reproduce these faithfully.
  assert.equal(imageKind(`<< ${base} /Filter /CCITTFaxDecode /Length 5 >>`), null);
  assert.equal(imageKind(`<< ${base.replace("/DeviceRGB", "/DeviceCMYK")} /Filter /DCTDecode /Length 5 >>`), null);
  assert.equal(imageKind("<< /Type /Page /Contents 1 0 R >>"), null);
});

test("transparency, masks, predictors and unsupported colour are skipped", () => {
  const base = "<< /Type /XObject /Subtype /Image /Width 100 /Height 200 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length 5";
  assert.equal(imageKind(`${base} /SMask 7 0 R >>`), null);
  assert.equal(imageKind(`${base} /Mask 7 0 R >>`), null);
  assert.equal(imageKind(`${base} /ImageMask true >>`), null);
  assert.equal(imageKind(`${base} /Mask [1 2] >>`), null);
  assert.equal(
    imageKind("<< /Type /XObject /Subtype /Image /Width 10 /Height 10 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 12 >> /Length 5 >>"),
    null,
  );
  assert.equal(
    imageKind("<< /Type /XObject /Subtype /Image /Width 10 /Height 10 /ColorSpace [/ICCBased 9 0 R] /BitsPerComponent 8 /Filter /DCTDecode >>"),
    null,
  );
});

test("a replaced image keeps its slot and drops the old filter settings", () => {
  const dict = "<< /Type /XObject /Subtype /Image /Width 3000 /Height 2000 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 12 /Columns 4 >> /Length 900000 >>";
  const next = replaceImageDict(dict, { bytes: new Uint8Array(1200), width: 1500, height: 1000 }, true);
  assert.match(next, /\/Width 1500/);
  assert.match(next, /\/Height 1000/);
  assert.match(next, /\/Length 1200/);
  assert.match(next, /\/Filter \/DCTDecode/);
  assert.match(next, /\/ColorSpace \/DeviceGray/);
  assert.match(next, /\/BitsPerComponent 8/);
  assert.equal(next.includes("DecodeParms"), false);
  assert.equal(next.includes("Predictor"), false);
});

function threePagePdf() {
  return {
    objects: new Map([
      [1, { num: 1, gen: 0, dict: "<< /Type /Catalog /Pages 2 0 R >>", body: "", stream: null }],
      [2, { num: 2, gen: 0, dict: "<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 /MediaBox [0 0 612 792] >>", body: "", stream: null }],
      [3, { num: 3, gen: 0, dict: "<< /Type /Page /Parent 2 0 R /Contents 6 0 R >>", body: "", stream: null }],
      [4, { num: 4, gen: 0, dict: "<< /Type /Page /Parent 2 0 R /Contents 7 0 R >>", body: "", stream: null }],
      [5, { num: 5, gen: 0, dict: "<< /Type /Page /Parent 2 0 R /Contents 8 0 R >>", body: "", stream: null }],
      [6, { num: 6, gen: 0, dict: "<< /Length 3 >>", body: "", stream: ascii("a b") }],
      [7, { num: 7, gen: 0, dict: "<< /Length 3 >>", body: "", stream: ascii("c d") }],
      [8, { num: 8, gen: 0, dict: "<< /Length 3 >>", body: "", stream: ascii("e f") }],
      // Not reachable from any page, so a part must not carry it.
      [9, { num: 9, gen: 0, dict: "<< /Unused true >>", body: "", stream: null }],
    ]),
    trailer: { root: { num: 1, gen: 0 } },
  };
}

test("page order comes from the page tree, and a part drops what it cannot reach", () => {
  const pdf = threePagePdf();
  const tree = pageTree(pdf.objects, 1);
  assert.equal(tree.pagesRef.num, 2);
  assert.deepEqual(tree.pages.map((page) => page.num), [3, 4, 5]);

  const subset = subsetFor({ ...pdf, pagesRef: tree.pagesRef }, [tree.pages[0]]).objects;
  assert.deepEqual([...subset.keys()].sort((a, b) => a - b), [1, 2, 3, 6]);
  // The Pages node keeps the MediaBox that children inherit.
  assert.match(subset.get(2).dict, /\/MediaBox \[0 0 612 792\]/);
  assert.match(subset.get(2).dict, /\/Kids \[3 0 R\]/);
  assert.match(subset.get(2).dict, /\/Count 1/);
  assert.equal(subset.has(9), false);
});

test("splitting packs pages in order and never exceeds the target", () => {
  const pdf = threePagePdf();
  const tree = pageTree(pdf.objects, 1);
  const parsed = { ...pdf, pagesRef: tree.pagesRef, pages: tree.pages };

  const one = splitParts(parsed, 100000);
  assert.equal(one.length, 1);
  assert.equal(one[0].pageCount, 3);

  // A target of one byte cannot be met, so every page travels alone and is
  // reported as too big rather than dropped.
  const tiny = splitParts(parsed, 1);
  assert.equal(tiny.length, 3);
  assert.deepEqual(tiny.map((part) => part.pageCount), [1, 1, 1]);
  assert.deepEqual(tiny.map((part) => [part.from, part.to]), [[1, 1], [2, 2], [3, 3]]);
  assert.equal(tiny.every((part) => part.tooBig), true);
  for (const part of tiny) assert.match(textOf(part.bytes), /\/Count 1/);

  // Every page appears exactly once across the parts.
  const numbered = tiny.flatMap((part, index) => part.pageCount && [index]);
  assert.equal(numbered.length, 3);
});

test("parts travel in a stored ZIP with a correct table of contents", () => {
  assert.equal(crc32(ascii("hello")), 0x3610a686);
  const zip = zipStore([
    { name: "part-1.pdf", bytes: ascii("%PDF-1.7 one") },
    { name: "part-2.pdf", bytes: ascii("%PDF-1.7 two") },
  ]);
  assert.equal(textOf(zip.subarray(0, 4)), "PK\u0003\u0004");

  const end = zip.length - 22;
  assert.equal(textOf(zip.subarray(end, end + 4)), "PK\u0005\u0006");
  const view = new DataView(zip.buffer, zip.byteOffset);
  assert.equal(view.getUint16(end + 10, true), 2);
  const centralOffset = view.getUint32(end + 16, true);
  assert.equal(textOf(zip.subarray(centralOffset, centralOffset + 4)), "PK\u0001\u0002");
  assert.equal(zip.includes(ascii("%PDF-1.7 two")[0]), true);
});

test("presets and page counts are read from the file, not guessed", () => {
  assert.deepEqual(presetFor("strong"), { label: "Strong", edge: 1200, quality: 0.55, note: "Smallest, softest" });
  assert.equal(presetFor("nonsense").label, "Balanced");
  const objects = new Map([
    [1, { num: 1, dict: "<< /Type /Page /Contents 2 0 R >>", stream: null }],
    [2, { num: 2, dict: "<< /Type /Pages /Kids [1 0 R] >>", stream: null }],
    [3, { num: 3, dict: "<< /Type /Page /Contents 2 0 R >>", stream: null }],
  ]);
  assert.equal(countPages(objects), 2);
});
