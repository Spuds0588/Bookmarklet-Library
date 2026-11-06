import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "devtools", "download-shelf-builder.js"), "utf8"))();
const { MAX_PARTNERS, parsePartners, configFor, bookmarkletFor, RUNTIME } =
  globalThis.__BL_TEST__.downloadShelfBuilder;
delete globalThis.__BL_TEST__;

const bodyOf = (href) => {
  assert.ok(href.startsWith("javascript:"), "a bookmarklet starts with the scheme");
  const body = href.slice("javascript:".length);
  assert.doesNotThrow(() => new Function(body), "the generated bookmarklet parses");
  return body;
};

test("partners are a name and a URL per line, with a bare URL naming itself", () => {
  const { partners, problems } = parsePartners(
    [
      "# our portals",
      "Acme claims | https://acme.example/upload",
      "",
      "https://portal.example/claims",
      "Bare host | portal2.example/upload",
    ].join("\n"),
  );
  assert.deepEqual(problems, []);
  assert.deepEqual(partners, [
    ["Acme claims", "https://acme.example/upload"],
    ["portal.example", "https://portal.example/claims"],
    ["Bare host", "https://portal2.example/upload"],
  ]);
});

test("a line that is not an http address is named, not quietly prefixed", () => {
  assert.match(parsePartners("Acme | ftp://acme.example/x").problems[0], /not an http\(s\) address/);
  assert.match(parsePartners("Acme | javascript:alert(1)").problems[0], /not an http\(s\) address/);
  assert.match(parsePartners("nonsense").problems[0], /not an http\(s\) address/);
  assert.match(parsePartners("Acme | https://acme.example:99999/x").problems[0], /not a whole URL/);
  assert.deepEqual(parsePartners("").partners, [], "an empty list is allowed, so a catcher can be built alone");
});

test("the partner list is capped at what one bookmark can hold", () => {
  const many = Array.from({ length: MAX_PARTNERS + 1 }, (_, index) => `P${index} | https://p${index}.example/`).join("\n");
  const { partners, problems } = parsePartners(many);
  assert.equal(partners.length, MAX_PARTNERS);
  assert.match(problems[0], new RegExp(`Only ${MAX_PARTNERS} partners`));
});

test("the config carries partners and the auto-open choice as data", () => {
  assert.deepEqual(configFor({}), { p: [], a: 0 });
  assert.deepEqual(configFor({ partners: "A | https://a.example/x", auto: true }), {
    p: [["A", "https://a.example/x"]],
    a: 1,
  });
  assert.throws(() => configFor({ partners: "A | ftp://a.example/x" }), /not an http/);

  const body = bodyOf(bookmarkletFor({ partners: 'He said "hi" | https://quotes.example/upload' }));
  // A quote or a backslash in a name must arrive as data, never as source.
  assert.match(body, /const C = \{"p":\[\["He said \\"hi\\"","https:\/\/quotes\.example\/upload"\]\],"a":0\};/);
  assert.match(body, /function RUNTIME/);
  assert.doesNotMatch(body, /__BL_TEST__|parsePartners|openPanel/);
});

test("the runtime catches detached anchors, blob URLs and file links", () => {
  const runtime = RUNTIME.toString();
  assert.match(runtime, /HTMLAnchorElement\.prototype/, "a detached anchor's click never reaches a listener");
  assert.match(runtime, /proto\.click === patchedClick\) proto\.click = nativeClick/, "the prototype is restored on close");
  assert.match(runtime, /addEventListener\("click", onClick, true\)/, "the capture phase runs before the page's own handler");
  assert.match(runtime, /anchor\.hasAttribute\("download"\)/);
  assert.match(runtime, /\^\(blob\|data\):/);
  assert.match(runtime, /EXTS\.test\(new URL\(href\)\.pathname\)/);
  // A refused read still leaves the file reachable.
  assert.match(runtime, /saveLink/);
});

test("a file the page builds in JavaScript is caught before its URL is revoked", () => {
  const runtime = RUNTIME.toString();
  // The Angular shape: a blob, an object URL, a detached anchor, and a revoke in
  // the same turn. Refetching that URL after the fact fails, so the blob has to
  // be remembered when it is created.
  assert.match(runtime, /URL\.createObjectURL = function createObjectURL/);
  assert.match(runtime, /if \(object instanceof Blob\) remember\(url, object\)/);
  assert.match(runtime, /const known = generated\.get\(url\)/);
  assert.match(runtime, /generated-\$\{entry\.id\}/);
  // The other sink, gated on the browser downloading the type.
  assert.match(runtime, /window\.open = function open/);
  assert.match(runtime, /downloadType\(blob\.type\)/);
  // Measured, not assumed: Location's members are unforgeable, so a location
  // change is the one generated download that cannot be wrapped.
  assert.doesNotMatch(runtime, /Location\.prototype/, "a no-op patch would only look like coverage");
  assert.match(runtime, /unforgeable/);
  assert.match(runtime, /nativeOpen\.call\(window, url, "_blank"\)/, "the shelf's own tab is not re-caught");
  // Every override is put back when the shelf closes.
  assert.match(runtime, /URL\.createObjectURL = nativeCreate/);
  assert.match(runtime, /window\.open = nativeOpen/);
});

test("bytes are read into memory and only written when asked", () => {
  const runtime = RUNTIME.toString();
  assert.match(runtime, /res\.blob\(\)/);
  assert.match(runtime, /new File\(\[item\.blob\]/);
  assert.match(runtime, /URL\.createObjectURL/);
  assert.match(runtime, /revokeObjectURL/);
  assert.ok(runtime.includes("300 * 1024 * 1024"), "the memory ceiling is a number, not a claim");
  // A closed shelf drops its holders: the button has to say so first.
  assert.match(runtime, /Click again to drop them/);
});

test("a zip is read from its central directory and inflated in the tab", () => {
  const runtime = RUNTIME.toString();
  assert.match(runtime, /0x06054b50/, "the end-of-central-directory record is what locates the entries");
  assert.match(runtime, /0x02014b50/);
  assert.match(runtime, /DecompressionStream\("deflate-raw"\)/);
  assert.match(runtime, /compression method \$\{method\} is not read here/);
  assert.match(runtime, /zip64 archives are not read here/);
  assert.match(runtime, /flags & 1/, "an encrypted entry is skipped rather than half-read");
});

test("the partner opens in a frame to the left of the shelf, never as a promise", () => {
  const runtime = RUNTIME.toString();
  assert.match(runtime, /el\("div", "stage"\)/);
  assert.match(runtime, /right:\$\{STAGE\}/);
  assert.match(runtime, /"Open in tab"/);
  assert.match(runtime, /securitypolicyviolation/);
  assert.match(runtime, /This page's CSP refuses frames/);
  assert.match(runtime, /about:blank/, "closing the panel stops the partner page rather than hiding it");
  assert.match(runtime, /autoOpen && !autoDone/, "auto-open is once per session");
});

test("the shelf is a shadow root that touches nothing else", () => {
  const runtime = RUNTIME.toString();
  assert.match(runtime, /attachShadow\(\{ mode: "open" \}\)/);
  assert.match(runtime, /position:fixed;inset:0;z-index:2147483647;pointer-events:none/);
  assert.match(runtime, /pointer-events:auto/);
  assert.match(runtime, /\(d\.body \|\| d\.documentElement\)\.appendChild/, "the sidebar is inserted at body level");
  assert.match(runtime, /data-download-shelf\]"\)\) return/, "a second click cannot stack two shelves");
  // The repo rule: nodes are built, never parsed out of markup.
  assert.doesNotMatch(runtime, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
});

test("the bookmarklet stays a size a URL and a bookmark can carry", () => {
  const href = bookmarkletFor({
    partners: "Acme | https://acme.example/upload\nClaims | https://claims.example/upload",
    auto: true,
  });
  assert.ok(href.length < 40000, `${href.length} characters is past what a bookmark comfortably holds`);
  assert.ok(href.length > 4000, "the runtime is embedded, not fetched at click time");
});
