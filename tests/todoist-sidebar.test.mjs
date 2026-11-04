import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "devtools", "todoist-sidebar.js"), "utf8"))();
const { fallbackOrder, blocksFrame, frameVerdict, EMBED, ORIGIN, SURFACES, FRAME_MS, POPUP, NOTE, CSS, HOST_STYLE, DRAWER_MS } =
  globalThis.__BL_TEST__.todoistSidebar;
delete globalThis.__BL_TEST__;

test("the sidebar frames Todoist's app, not its marketing page", () => {
  assert.equal(EMBED, "https://app.todoist.com/app/today");
  assert.equal(ORIGIN, "https://app.todoist.com");
  assert.ok(EMBED.startsWith(ORIGIN), "the frame and the origin it is checked against have to agree");
});

test("the drawer frame comes first, then document picture-in-picture, then a popup", () => {
  assert.deepEqual(SURFACES, ["iframe", "float", "popup"]);

  assert.deepEqual(fallbackOrder({ documentPictureInPicture: true, open: true }), ["float", "popup"]);
  assert.deepEqual(fallbackOrder({ documentPictureInPicture: false, open: true }), ["popup"]);
  assert.deepEqual(fallbackOrder({ documentPictureInPicture: true, open: false }), ["float"]);
  assert.deepEqual(fallbackOrder({ documentPictureInPicture: false, open: false }), []);
});

test("only a framing directive aimed at Todoist counts as a refusal", () => {
  assert.equal(blocksFrame({ violatedDirective: "frame-src", blockedURI: "https://app.todoist.com/app/today" }), true);
  assert.equal(blocksFrame({ violatedDirective: "child-src", blockedURI: "https://todoist.com/" }), true);
  assert.equal(blocksFrame({ violatedDirective: "default-src", blockedURI: "https://app.todoist.com/" }), true);
  // The page may refuse plenty of other things; none of it is our frame.
  assert.equal(blocksFrame({ violatedDirective: "img-src", blockedURI: "https://app.todoist.com/favicon.ico" }), false);
  assert.equal(blocksFrame({ violatedDirective: "frame-src", blockedURI: "https://example.com/" }), false);
  assert.equal(blocksFrame({}), false);
});

test("a refusal outranks a load, and a load on its own means the frame rendered", () => {
  assert.equal(frameVerdict({ violated: true, loaded: true }), "blocked");
  assert.equal(frameVerdict({ violated: true }), "blocked");
  assert.equal(frameVerdict({ loaded: true }), "ready");
  assert.equal(frameVerdict({}), "pending");
  assert.equal(frameVerdict(), "pending");
});

test("the popup is a window we own at Todoist's own URL", () => {
  // A popup that carried a frame would still be a third-party page to Todoist,
  // which is the whole reason this surface opens the app directly.
  assert.match(POPUP, /popup/);
  assert.match(NOTE, /third-party cookies/);
  assert.match(NOTE, /first-party/);
});

test("the first surface is a drawer that slides in from the right edge", () => {
  // A drawer, not a modal: anchored to the right edge, full height, and it
  // arrives by moving rather than appearing over a scrim.
  assert.match(CSS, /right:0/);
  assert.match(CSS, /bottom:0/);
  assert.match(CSS, /transform:translateX\(100%\)/);
  assert.match(CSS, /\.drawer\[data-open="true"\]\{transform:translateX\(0\)\}/);
  assert.match(CSS, /prefers-reduced-motion/);
  assert.doesNotMatch(CSS, /scrim/);
  assert.match(CSS, /pointer-events:auto/);

  // The host spans the viewport for positioning but must not swallow clicks,
  // or a drawer becomes a modal with extra steps.
  assert.match(HOST_STYLE, /pointer-events:none/);
  assert.match(HOST_STYLE, /position:fixed/);

  assert.equal(typeof DRAWER_MS, "number");
  assert.ok(DRAWER_MS >= 200 && DRAWER_MS <= 400, `${DRAWER_MS}ms is not a slide`);
});

test("the frame attempt is bounded well before a user would give up", () => {
  assert.ok(FRAME_MS > 0);
  assert.ok(FRAME_MS <= 15000, `${FRAME_MS} is too long to leave a fallback any time`);
});
