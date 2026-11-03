import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "devtools", "webhook-dispatch.js"), "utf8"))();
const { buildWebhookBookmarklet, fillWebhookTemplate, unresolvedTokens, isHttpUrl, DEFAULT_TEMPLATE, TOKENS } =
  globalThis.__BL_TEST__.webhookBuilder;
delete globalThis.__BL_TEST__;

const decode = (href) => decodeURIComponent(href.replace(/^javascript:/, ""));

test("only an http(s) endpoint is accepted", () => {
  assert.equal(isHttpUrl("https://hooks.example.com/abc"), "https://hooks.example.com/abc");
  assert.equal(isHttpUrl(" http://127.0.0.1:8080/hook "), "http://127.0.0.1:8080/hook");
  assert.equal(isHttpUrl("javascript:alert(1)"), null);
  assert.equal(isHttpUrl("ftp://example.com/hook"), null);
  assert.equal(isHttpUrl("not a url"), null);
});

test("placeholder values are JSON-escaped so the payload stays valid", () => {
  const page = { url: "https://x.test/?a=\"b\"", title: "Line one\nLine two", host: "x.test", selection: "back\\slash", time: "2026-11-03T00:00:00.000Z" };
  const filled = fillWebhookTemplate(DEFAULT_TEMPLATE, page);
  const parsed = JSON.parse(filled);
  assert.equal(parsed.url, page.url);
  // A newline survives as a JSON escape rather than being flattened into a space.
  assert.equal(parsed.title, "Line one\nLine two");
  assert.equal(parsed.selected, "back\\slash");
  assert.equal(parsed.sentAt, page.time);
});

test("an unknown placeholder is named instead of silently dropped", () => {
  assert.deepEqual(unresolvedTokens('{"a":"{{url}}","b":"{{nope}}"}', { url: "" }), ["nope"]);
  assert.deepEqual(unresolvedTokens('{"a":"{{url}}"}', { url: "" }), []);
  assert.deepEqual(TOKENS, ["url", "title", "host", "selection", "time"]);
});

test("the built bookmarklet carries the endpoint, the payload and a toast", () => {
  const { href, code, method } = buildWebhookBookmarklet({
    endpoint: "https://hooks.example.com/incoming/ABC123",
    method: "POST",
    template: '{"url":"{{url}}","note":"{{title}}"}',
  });
  assert.equal(method, "POST");
  assert.match(href, /^javascript:/);
  assert.equal(decode(href), code);
  // The endpoint is a literal in the output, not read from storage at click time.
  assert.match(code, /hooks\.example\.com\/incoming\/ABC123/);
  assert.doesNotMatch(code, /localStorage/);
  assert.match(code, /fetch\(/);
  assert.match(code, /Webhook sent/);
  assert.match(code, /Webhook failed/);
  assert.doesNotThrow(() => new Function(code));
});

test("the emitted code is valid JavaScript whatever the endpoint contains", () => {
  const endpoint = "https://hooks.example.com/a?x=\"q\"&y='z'";
  const { code } = buildWebhookBookmarklet({ endpoint, method: "PUT", template: '{"t":"{{title}}"}' });
  assert.doesNotThrow(() => new Function(code));
  assert.match(code, /"PUT"/);
});

test("a bad endpoint, a bad method or a payload that is not JSON is refused", () => {
  assert.throws(() => buildWebhookBookmarklet({ endpoint: "javascript:alert(1)" }), /valid http\(s\) webhook URL/);
  assert.throws(() => buildWebhookBookmarklet({ endpoint: "https://x.test/hook", method: "DELETE" }), /POST, PUT, PATCH, GET/);
  assert.throws(
    () => buildWebhookBookmarklet({ endpoint: "https://x.test/hook", template: '{"a": {{title}} }' }),
    /not valid JSON/,
  );
  assert.throws(
    () => buildWebhookBookmarklet({ endpoint: "https://x.test/hook", template: '{"a":"{{nonsense}}"}' }),
    /Unknown placeholder \{\{nonsense\}\}/,
  );
});

test("GET sends no body and still fires the toast path", () => {
  const { code } = buildWebhookBookmarklet({ endpoint: "https://x.test/hook", method: "GET" });
  assert.match(code, /"GET"/);
  assert.doesNotMatch(code, /body:JSON/);
  assert.doesNotThrow(() => new Function(code));
});
