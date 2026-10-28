import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadQR() {
  globalThis.__BL_TEST__ = {};
  new Function(readFileSync(path.join(root, "bookmarklets", "text", "qr-code.js"), "utf8"))();
  const QR = globalThis.__BL_TEST__.QR;
  delete globalThis.__BL_TEST__;
  return QR;
}

function loadDecoder() {
  const source = readFileSync(path.join(root, "qr-reader", "jsqr.js"), "utf8");
  return new Function(`${source}\nreturn jsQR;`)();
}

// Turn the encoder's matrix into the RGBA pixels a canvas would hand jsQR.
// The quiet zone is four modules, the same as the generator's SVG.
function pixelsFor(code, { scale = 6, quiet = 4, invert = false } = {}) {
  const side = (code.count + quiet * 2) * scale;
  const data = new Uint8ClampedArray(side * side * 4);
  const background = invert ? 0 : 255;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = background;
    data[i + 1] = background;
    data[i + 2] = background;
    data[i + 3] = 255;
  }
  for (let row = 0; row < code.count; row++) {
    for (let column = 0; column < code.count; column++) {
      if (!code.modules[row][column]) continue;
      const value = invert ? 255 : 0;
      const startX = (column + quiet) * scale;
      const startY = (row + quiet) * scale;
      for (let y = startY; y < startY + scale; y++) {
        for (let x = startX; x < startX + scale; x++) {
          const index = (y * side + x) * 4;
          data[index] = value;
          data[index + 1] = value;
          data[index + 2] = value;
        }
      }
    }
  }
  return { data, width: side, height: side };
}

test("the bundled jsQR decodes the encoder's URL matrix", () => {
  const QR = loadQR();
  const jsQR = loadDecoder();
  const code = QR.makeCode("https://example.com/field-guide");
  const image = pixelsFor(code);
  const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
  assert.ok(result, "jsQR found no code");
  assert.equal(result.data, "https://example.com/field-guide");
  assert.equal(result.version, code.version);
});

test("the bundled jsQR reads a light-on-dark code as well as a dark-on-light one", () => {
  const QR = loadQR();
  const jsQR = loadDecoder();
  const code = QR.makeCode("https://example.com/field-guide");
  const image = pixelsFor(code, { invert: true });
  const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
  assert.ok(result, "jsQR missed the inverted code");
  assert.equal(result.data, "https://example.com/field-guide");
});

test("the bundled jsQR keeps UTF-8 text intact", () => {
  const QR = loadQR();
  const jsQR = loadDecoder();
  const code = QR.makeCode("café ☕");
  const image = pixelsFor(code);
  const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
  assert.ok(result, "jsQR found no code");
  assert.equal(result.data, "café ☕");
});

test("a blank image is not reported as a code", () => {
  const jsQR = loadDecoder();
  const side = 180;
  const data = new Uint8ClampedArray(side * side * 4).fill(255);
  assert.equal(jsQR(data, side, side, { inversionAttempts: "attemptBoth" }), null);
});

test("the reader ships jsQR's version and license", () => {
  const decoder = readFileSync(path.join(root, "qr-reader", "jsqr.js"), "utf8");
  const license = readFileSync(path.join(root, "qr-reader", "LICENSE-jsqr.txt"), "utf8");
  assert.match(decoder, /^\/\*! jsQR 1\.4\.0 \| Apache-2\.0 \| https:\/\/github\.com\/cozmo\/jsQR \*\//);
  assert.match(license, /Apache License/);
  assert.match(license, /Version 2\.0/);
});
