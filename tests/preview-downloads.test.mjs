import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The tool exposes its pure helpers and starts no listener when __BL_TEST__ is
// set, so the classification can be checked without a DOM.
globalThis.location = { href: "https://library.example.com/reports/" };
globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "view", "preview-downloads.js"), "utf8"))();
const { extensionOf, kindOf, isFileLink, nameFor, sizeLabel } = globalThis.__BL_TEST__.preview;
delete globalThis.__BL_TEST__;

test("only links the panel can actually show are taken over", () => {
  assert.equal(isFileLink("/report.csv"), true);
  assert.equal(isFileLink("https://cdn.example.com/clip.MP4?token=1"), true);
  assert.equal(isFileLink("/handoff.pdf"), true);
  assert.equal(isFileLink("report.docx"), true);
  assert.equal(isFileLink("/archive.zip"), false);
  assert.equal(isFileLink("/download?id=5"), false);
  assert.equal(isFileLink("#section"), false);
  assert.equal(isFileLink("mailto:crew@example.com"), false);
  assert.equal(isFileLink("javascript:void 0"), false);
  assert.equal(isFileLink(""), false);
});

test("each extension maps to the way it is shown", () => {
  assert.equal(kindOf(extensionOf("/a/b/photo.JPEG")), "image");
  assert.equal(kindOf(extensionOf("/a/b/clip.webm")), "video");
  assert.equal(kindOf(extensionOf("/a/b/take.m4a")), "audio");
  assert.equal(kindOf(extensionOf("/a/b/guide.pdf")), "pdf");
  assert.equal(kindOf(extensionOf("/a/b/table.csv")), "text");
  assert.equal(kindOf(extensionOf("/a/b/deck.pptx")), "office");
  assert.equal(kindOf(extensionOf("/a/b/notes.rtf")), "office");
  assert.equal(kindOf(extensionOf("/a/b/archive.zip")), null);
  assert.equal(kindOf(extensionOf("/a/b/no-extension")), null);
  assert.equal(extensionOf("https://example.com/x/y.PDF?download=1#p2"), "pdf");
  assert.equal(extensionOf("not a url at all"), "");
});

test("a name comes from the header first, then the path", () => {
  assert.equal(nameFor("/files/quarterly.pdf", 'attachment; filename="Q3 report.pdf"'), "Q3 report.pdf");
  assert.equal(nameFor("/files/x.bin", "attachment; filename*=UTF-8''caf%C3%A9.txt"), "café.txt");
  assert.equal(nameFor("/files/field%20notes.md"), "field notes.md");
  assert.equal(nameFor("https://example.com/download"), "download");
  assert.equal(nameFor("https://example.com/a/"), "a");
  assert.equal(nameFor("/files/report.csv", ""), "report.csv");
});

test("sizes read the way a person would say them", () => {
  assert.equal(sizeLabel(0), "0 B");
  assert.equal(sizeLabel(1023), "1023 B");
  assert.equal(sizeLabel(1536), "1.5 KB");
  assert.equal(sizeLabel(5 * 1024 * 1024), "5.0 MB");
  assert.equal(sizeLabel(12 * 1024 * 1024), "12 MB");
  assert.equal(sizeLabel(3 * 1024 ** 3), "3.0 GB");
  assert.equal(sizeLabel(Number.NaN), "");
});
