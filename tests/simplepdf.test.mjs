import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "files", "simplepdf-open.js"), "utf8"))();
const { pdfUrlFrom, pageFrom, editorUrl, looksLikePdf } = globalThis.__BL_TEST__.simplepdf;
delete globalThis.__BL_TEST__;

test("a page that is the PDF hands over its own address", () => {
  assert.equal(
    pdfUrlFrom({ href: "https://files.example.com/report.pdf", contentType: "application/pdf" }),
    "https://files.example.com/report.pdf",
  );
  // A PDF served from a path without the extension still counts.
  assert.equal(
    pdfUrlFrom({ href: "https://api.example.com/doc?id=7", contentType: "application/pdf" }),
    "https://api.example.com/doc?id=7",
  );
});

test("a pdf.js viewer hands over the file it was told to show", () => {
  assert.equal(
    pdfUrlFrom({ href: "https://example.com/web/viewer.html?file=https%3A%2F%2Fcdn.example.com%2Fbrief.pdf" }),
    "https://cdn.example.com/brief.pdf",
  );
  // A relative file behind the viewer resolves against the viewer's own URL.
  assert.equal(
    pdfUrlFrom({ href: "https://example.com/pdfjs/viewer.html?file=/docs/brief.pdf" }),
    "https://example.com/docs/brief.pdf",
  );
});

test("an embedded viewer or a link is found when the page is not itself a PDF", () => {
  const base = "https://example.com/guide";
  assert.equal(pdfUrlFrom({ href: base, embeds: ["/files/brief.pdf"] }), "https://example.com/files/brief.pdf");
  assert.equal(pdfUrlFrom({ href: base, objects: ["/files/memo"] }), "");
  assert.equal(
    pdfUrlFrom({ href: base, objects: ["/files/memo.pdf"] }),
    "https://example.com/files/memo.pdf",
  );
  assert.equal(pdfUrlFrom({ href: base, iframes: ["/viewer/doc.PDF"] }), "https://example.com/viewer/doc.PDF");
  assert.equal(pdfUrlFrom({ href: base, links: ["/pricing"] }), "");
  assert.equal(pdfUrlFrom({ href: base, links: ["/downloads/pack.pdf#page=4"] }), "https://example.com/downloads/pack.pdf#page=4");
});

test("anything the editor could not fetch is refused", () => {
  const base = "https://example.com/";
  assert.equal(pdfUrlFrom({ href: "blob:https://example.com/8f1c", contentType: "application/pdf" }), "");
  assert.equal(pdfUrlFrom({ href: "data:application/pdf;base64,AAA", contentType: "application/pdf" }), "");
  assert.equal(pdfUrlFrom({ href: base, links: ["javascript:alert(1)"] }), "");
  assert.equal(pdfUrlFrom({ href: base }), "");
  assert.equal(looksLikePdf("application/pdf"), true);
  assert.equal(looksLikePdf("x.pdf?a=1"), true);
  assert.equal(looksLikePdf("x.pdfx"), false);
});

test("the editor link carries the PDF and the page it was on", () => {
  const url = editorUrl("https://files.example.com/report.pdf", 3);
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, "https://simplepdf.com/editor");
  assert.equal(parsed.searchParams.get("open"), "https://files.example.com/report.pdf");
  assert.equal(parsed.searchParams.get("page"), "3");

  // A presigned PDF URL survives the trip with its query string intact.
  const signed = "https://bucket.s3.amazonaws.com/a.pdf?X-Amz-Signature=abc&X-Amz-Date=20261103";
  assert.equal(new URL(editorUrl(signed)).searchParams.get("open"), signed);

  assert.equal(new URL(editorUrl("https://x.test/a.pdf")).searchParams.has("page"), false);
  assert.equal(pageFrom("https://x.test/a.pdf#page=12"), 12);
  assert.equal(pageFrom("https://x.test/a.pdf"), 0);
});
