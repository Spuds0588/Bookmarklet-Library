import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function load() {
  globalThis.__BL_TEST__ = {};
  new Function(readFileSync(path.join(root, "bookmarklets", "text", "qr-code.js"), "utf8"))();
  const QR = globalThis.__BL_TEST__.QR;
  delete globalThis.__BL_TEST__;
  return QR;
}

test("QR code picks a version that fits and draws the three finder patterns", () => {
  const QR = load();
  const code = QR.makeCode("https://example.com/field-guide");
  assert.equal(code.version, 3);
  assert.equal(code.count, 29);
  assert.equal(code.bytes, 31);
  assert.equal(code.modules.length, 29);
  for (let row = 0; row < 7; row++) {
    for (let column = 0; column < 7; column++) {
      const border = row === 0 || row === 6 || column === 0 || column === 6;
      const core = row >= 2 && row <= 4 && column >= 2 && column <= 4;
      assert.equal(Boolean(code.modules[row][column]), border || core, `finder ${row},${column}`);
    }
  }
  // Timing runs between the finders, starting dark on an even column.
  for (let column = 8; column < code.count - 8; column++) {
    assert.equal(Boolean(code.modules[6][column]), column % 2 === 0, `timing column ${column}`);
  }
});

test("QR SVG carries a quiet zone and one crisp path", () => {
  const QR = load();
  const art = QR.svg(QR.makeCode("https://example.com/field-guide"));
  assert.match(art, /^<svg /);
  assert.match(art, /viewBox="0 0 37 37"/);
  assert.match(art, /width="1024" height="1024"/);
  assert.match(art, /shape-rendering="crispEdges"/);
  assert.match(art, /<rect width="37" height="37" fill="#ffffff"\/>/);
  assert.match(art, /<path d="M[^"]+" fill="#000000"\/>/);
  assert.match(art, /aria-label="QR code"/);
  assert.doesNotMatch(art, /NaN|undefined/);
});

test("QR SVG draws custom ink and paper, or no paper at all", () => {
  const QR = load();
  const code = QR.makeCode("https://example.com/field-guide");
  const branded = QR.svg(code, { foreground: "#123456", background: "#FEFEFE", label: "Field guide" });
  assert.match(branded, /<rect width="37" height="37" fill="#fefefe"\/>/);
  assert.match(branded, /<path d="[^"]+" fill="#123456"\/>/);
  assert.match(branded, /aria-label="Field guide"/);

  const transparent = QR.svg(code, { foreground: "#0f0", transparent: true });
  assert.doesNotMatch(transparent, /<rect /);
  assert.match(transparent, /<path d="[^"]+" fill="#00ff00"\/>/);
  assert.ok(Math.abs(QR.contrastRatio("#000000", "#ffffff") - 21) < 0.01);
});

test("only a web URL from the clipboard replaces the page URL", () => {
  const QR = load();
  assert.equal(QR.clipboardUrl(" https://example.com/a?b=c "), "https://example.com/a?b=c");
  assert.equal(QR.clipboardUrl("example.com/path"), "https://example.com/path");
  assert.equal(QR.clipboardUrl("www.example.com"), "https://www.example.com/");
  assert.equal(QR.clipboardUrl("not a url"), "");
  assert.equal(QR.clipboardUrl("javascript:alert(1)"), "");
  assert.equal(QR.clipboardUrl("ftp://example.com"), "");
});

test("QR encodes UTF-8 bytes rather than JavaScript code units", () => {
  const QR = load();
  const code = QR.makeCode("café ☕");
  assert.equal(code.bytes, 9);
  assert.equal(code.count, 21);
});

test("QR filenames use the host and reject empty or oversized input", () => {
  const QR = load();
  assert.equal(QR.fileName("png", "https://www.example.com/field-guide"), "qr-example.com.png");
  assert.equal(QR.fileName("svg", "not a URL"), "qr-code.svg");
  assert.throws(() => QR.makeCode("   "), /empty/);
  assert.throws(() => QR.makeCode("x".repeat(3000)), /code length overflow/);
});
