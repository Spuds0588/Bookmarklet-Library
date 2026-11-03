import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "files", "pdf-shrink.js"), "utf8"))();
const { isPdf, scanObjects, serializePdf, imageKind, replaceImageDict, presetFor, countPages, dictEnd } =
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
