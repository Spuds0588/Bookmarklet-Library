import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "devtools", "code-editor-local.js"), "utf8"))();
const { clip, markupFor, populateMessage, isEditorMessage, fallbackOrder, EMBED, BASE, ORIGIN, SURFACES, FRAME_MS, LIMIT_BYTES } =
  globalThis.__BL_TEST__.codeEditorLocal;
delete globalThis.__BL_TEST__;

test("the editor is asked to listen for events, which populateCode depends on", () => {
  assert.equal(BASE, "https://onecompiler.com/embed/html");
  assert.equal(ORIGIN, "https://onecompiler.com");
  assert.match(EMBED, /listenToEvents=true/);
  assert.match(EMBED, /codeChangeEvent=true/);
});

test("the handoff is the documented populateCode event", () => {
  assert.deepEqual(populateMessage("<p>hi</p>"), {
    eventType: "populateCode",
    language: "html",
    files: [{ name: "index.html", content: "<p>hi</p>" }],
  });
});

test("only the editor's own state object counts as an answer", () => {
  assert.equal(isEditorMessage({ language: "html", files: [] }), true);
  assert.equal(isEditorMessage({ language: "" }), true);
  // A bare null is posted by frames that are not the editor.
  assert.equal(isEditorMessage(null), false);
  assert.equal(isEditorMessage("done"), false);
  assert.equal(isEditorMessage({}), false);
  assert.equal(isEditorMessage({ language: 3 }), false);
});

test("a big page is clipped and says so in the code itself", () => {
  const small = clip("<p>short</p>");
  assert.equal(small.truncated, false);
  assert.equal(small.text, "<p>short</p>");
  assert.equal(small.bytes, Buffer.byteLength("<p>short</p>"));

  const big = "<p>" + "x".repeat(LIMIT_BYTES) + "</p>";
  const cut = clip(big);
  assert.equal(cut.truncated, true);
  assert.match(cut.text, /^<!-- \d+ bytes of page markup; kept the first \d+\. -->\n/);
  assert.equal(typeof cut.bytes, "number", "the status line needs a byte count, not a buffer");
  assert.ok(cut.bytes > LIMIT_BYTES, "the original size is reported, not the clipped one");
  // The comment is the only thing added; the kept markup is a prefix of the source.
  assert.ok(cut.text.includes("xxxx"));
});

test("a worthwhile selection is edited instead of the whole page", () => {
  const doc = (selection, html) => ({
    getSelection: () => selection,
    documentElement: { outerHTML: html },
  });

  const page = markupFor(doc("", "<html><body>page</body></html>"));
  assert.equal(page.source, "page");
  assert.equal(page.text, "<html><body>page</body></html>");

  const picked = "<section><h2>A selected block worth editing in place</h2></section>";
  const fromSelection = markupFor(doc(picked, "<html><body>page</body></html>"));
  assert.equal(fromSelection.source, "selection");
  assert.equal(fromSelection.text, picked);

  // A stray word from a double-click is not markup worth editing.
  const tiny = markupFor(doc("word", "<html><body>page</body></html>"));
  assert.equal(tiny.source, "page");
});

test("a document that refuses getSelection still yields its markup", () => {
  const hostile = {
    getSelection: () => {
      throw new Error("blocked");
    },
    documentElement: { outerHTML: "<html><body>ok</body></html>" },
  };
  const result = markupFor(hostile);
  assert.equal(result.text, "<html><body>ok</body></html>");
  assert.equal(result.source, "page");
});

test("the modal frame comes first, then document picture-in-picture, then a popup", () => {
  assert.deepEqual(SURFACES, ["iframe", "float", "popup"]);
  assert.deepEqual(fallbackOrder({ documentPictureInPicture: true, open: true }), ["float", "popup"]);
  assert.deepEqual(fallbackOrder({ documentPictureInPicture: false, open: true }), ["popup"]);
  assert.deepEqual(fallbackOrder({ documentPictureInPicture: true, open: false }), ["float"]);
  assert.deepEqual(fallbackOrder({ documentPictureInPicture: false, open: false }), []);
  assert.ok(FRAME_MS > 0);
});
