import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "files", "simplepdf-local.js"), "utf8"))();
const { isPdfFile, buildRequest, parseReply, EMBED, ORIGIN } = globalThis.__BL_TEST__.simplepdfLocal;
delete globalThis.__BL_TEST__;

test("the local tool frames the embeddable editor, not the one that refuses framing", () => {
  assert.equal(EMBED, "https://embed.simplepdf.com/editor");
  assert.equal(ORIGIN, "https://embed.simplepdf.com");
});

test("only a PDF is accepted from the picker", () => {
  assert.equal(isPdfFile("brief.pdf", ""), true);
  assert.equal(isPdfFile("BRIEF.PDF", ""), true);
  assert.equal(isPdfFile("brief", "application/pdf"), true);
  assert.equal(isPdfFile("photo.png", "image/png"), false);
  assert.equal(isPdfFile("", ""), false);
});

test("requests go out as a JSON string with the wire's own key names", () => {
  const body = buildRequest("LOAD_DOCUMENT", { data_url: "data:application/pdf;base64,AAA", name: "a.pdf" }, "req-1");
  assert.equal(typeof body, "string");
  const parsed = JSON.parse(body);
  assert.deepEqual(parsed, {
    type: "LOAD_DOCUMENT",
    request_id: "req-1",
    data: { data_url: "data:application/pdf;base64,AAA", name: "a.pdf" },
  });
});

test("replies are read from the JSON string the editor sends", () => {
  const ok = parseReply(JSON.stringify({ type: "REQUEST_RESULT", data: { request_id: "r1", result: { success: true, data: null } } }));
  assert.deepEqual(ok, { id: "r1", result: { success: true, data: null } });

  const refused = parseReply(
    JSON.stringify({
      type: "REQUEST_RESULT",
      data: { request_id: "r2", result: { success: false, error: { code: "forbidden:origin_not_whitelisted", message: "nope" } } },
    }),
  );
  assert.equal(refused.result.error.code, "forbidden:origin_not_whitelisted");

  // An object payload is accepted too, since some builds post it unstringified.
  assert.equal(parseReply({ type: "REQUEST_RESULT", data: { request_id: "r3", result: { success: true } } }).id, "r3");
});

test("messages that are not this editor's replies are ignored", () => {
  assert.equal(parseReply("not json"), null);
  assert.equal(parseReply(JSON.stringify({ type: "EDITOR_READY" })), null);
  assert.equal(parseReply(JSON.stringify({ type: "REQUEST_RESULT", data: {} })), null);
  assert.equal(parseReply(JSON.stringify({ type: "REQUEST_RESULT", data: { request_id: 7, result: {} } })), null);
  assert.equal(parseReply(null), null);
  assert.equal(parseReply(undefined), null);
});
