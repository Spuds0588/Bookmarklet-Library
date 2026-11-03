import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "files", "photo-editor-local.js"), "utf8"))();
const { isImageFile, editedName, fallbackOrder, parseSize, askSize, askPng, EMBED, ORIGIN, SURFACES, FRAME_MS, READY_MS } =
  globalThis.__BL_TEST__.photoEditorLocal;
delete globalThis.__BL_TEST__;

test("the tool frames Photopea, which publishes no framing restriction", () => {
  // The bare root is Photopea's marketing page; only a hash URL boots the app.
  assert.equal(EMBED, "https://www.photopea.com/#%7B%7D");
  assert.ok(EMBED.includes("#"), "the editor only starts for a hash or query URL");
  assert.equal(ORIGIN, "https://www.photopea.com");
});

test("only an image is accepted from the picker", () => {
  assert.equal(isImageFile("beach.jpg", ""), true);
  assert.equal(isImageFile("BEACH.JPEG", ""), true);
  assert.equal(isImageFile("logo.svg", ""), true);
  assert.equal(isImageFile("artwork.psd", ""), true);
  assert.equal(isImageFile("photo", "image/png"), true);
  assert.equal(isImageFile("brief.pdf", "application/pdf"), false);
  assert.equal(isImageFile("notes.txt", ""), false);
  assert.equal(isImageFile("", ""), false);
});

test("the saved file is named after the original and is always a PNG", () => {
  assert.equal(editedName("beach.jpeg"), "beach-edited.png");
  assert.equal(editedName("no-extension"), "no-extension-edited.png");
  assert.equal(editedName("two.dots.png"), "two.dots-edited.png");
  assert.equal(editedName(""), "image-edited.png");
  assert.equal(editedName(undefined), "image-edited.png");
});

test("the modal frame comes first, then document picture-in-picture, then a popup", () => {
  assert.deepEqual(SURFACES, ["iframe", "float", "popup"]);

  assert.deepEqual(fallbackOrder({ documentPictureInPicture: true, open: true }), ["float", "popup"]);
  assert.deepEqual(fallbackOrder({ documentPictureInPicture: false, open: true }), ["popup"]);
  assert.deepEqual(fallbackOrder({ documentPictureInPicture: true, open: false }), ["float"]);
  assert.deepEqual(fallbackOrder({ documentPictureInPicture: false, open: false }), []);
});

test("the framed attempt gives up before the readiness ceiling", () => {
  assert.ok(FRAME_MS > 0, "FRAME_MS must be positive");
  assert.ok(FRAME_MS < READY_MS, `${FRAME_MS} should be well under ${READY_MS}`);
});

test("the size echo is what proves the file arrived, not just that the app booted", () => {
  assert.deepEqual(parseSize("size:1200x800"), { width: 1200, height: 800 });
  assert.deepEqual(parseSize("size:1x1"), { width: 1, height: 1 });
  // "done" only means the last message was processed.
  assert.equal(parseSize("done"), null);
  assert.equal(parseSize("size:1200"), null);
  assert.equal(parseSize("size:axb"), null);
  assert.equal(parseSize(new ArrayBuffer(4)), null);
  assert.equal(parseSize(null), null);

  assert.match(askSize, /echoToOE/);
  assert.match(askPng, /saveToOE\("png"\)/);
});
