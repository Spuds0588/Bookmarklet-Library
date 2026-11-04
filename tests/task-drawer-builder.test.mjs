import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "devtools", "task-drawer-builder.js"), "utf8"))();
const { PROVIDERS, parseTarget, configFor, bookmarkletFor, RUNTIME } =
  globalThis.__BL_TEST__.taskDrawerBuilder;
delete globalThis.__BL_TEST__;

const bodyOf = (href) => {
  assert.ok(href.startsWith("javascript:"), "a bookmarklet starts with the scheme");
  const body = href.slice("javascript:".length);
  assert.doesNotThrow(() => new Function(body), "the generated bookmarklet parses");
  return body;
};

test("only services whose read API answers a cross-origin request are offered", () => {
  assert.deepEqual(Object.keys(PROVIDERS).sort(), [
    "asana",
    "clickup",
    "github",
    "linear",
    "notion",
    "todoist",
    "trello",
  ]);
  // OAuth-only and CORS-less services cannot be read with a pasted key, so they
  // are absent rather than offered and then failing.
  for (const absent of ["ticktick", "vikunja", "taskade", "google", "microsoft", "habitica"]) {
    assert.equal(PROVIDERS[absent], undefined, `${absent} has no pasted-key read path`);
  }
});

test("every service declares a token and the extra fields it really needs", () => {
  for (const [id, provider] of Object.entries(PROVIDERS)) {
    assert.equal(typeof provider.label, "string");
    assert.ok(provider.hint.length > 20, `${id} needs a hint`);
    assert.match(provider.endpoint, /^https:\/\//);
    assert.ok(provider.fields.includes("token"), `${id} is read with a token`);
    if (provider.fields.includes("target")) assert.ok(provider.target, `${id} must name its target`);
  }
  assert.deepEqual(PROVIDERS.trello.fields, ["key", "token"], "Trello needs a key and a token");
  assert.deepEqual(PROVIDERS.clickup.fields, ["token", "target"]);
  assert.deepEqual(PROVIDERS.notion.fields, ["token", "target"]);
});

test("a config carries the token, and refuses to be built without one", () => {
  assert.throws(() => configFor("todoist", {}), /needs an API token/);
  assert.throws(() => configFor("todoist", { token: "   " }), /needs an API token/);
  assert.throws(() => configFor("nope", { token: "x" }), /Pick a service/);
  assert.throws(() => configFor("trello", { token: "t" }), /API key/);

  const cfg = configFor("todoist", { token: "  tok  " });
  assert.deepEqual(cfg, { p: "todoist", t: "tok" }, "the token is trimmed and nothing else is added");

  const trello = configFor("trello", { token: "t", key: "k" });
  assert.deepEqual(trello, { p: "trello", t: "t", k: "k" });
});

test("a list or database id is read out of the URL it lives in", () => {
  assert.equal(parseTarget("clickup", "https://app.clickup.com/9015/v/li/901317097122"), "901317097122");
  assert.equal(parseTarget("clickup", "901317097122"), "901317097122");
  assert.equal(parseTarget("clickup", "list/foo"), null);

  const notion = "https://www.notion.so/Field-Guide-1f2e3d4c5b6a7890abcdef1234567890";
  assert.equal(parseTarget("notion", notion), "1f2e3d4c5b6a7890abcdef1234567890");
  assert.equal(parseTarget("notion", "1f2e3d4c-5b6a-7890-abcd-ef1234567890"), "1f2e3d4c-5b6a-7890-abcd-ef1234567890");
  assert.equal(parseTarget("notion", "not an id"), null);

  assert.equal(parseTarget("todoist", ""), null);
});

test("the generated bookmarklet is self-contained source with the token as data", () => {
  const body = bodyOf(bookmarkletFor("github", { token: 'a"b\\c\nd' }));
  assert.match(body, /const C = \{"p":"github","t":"a\\"b\\\\c\\nd"\}/);
  assert.match(body, /function RUNTIME/);
  // Nothing outside the payload may be referenced: a bookmarklet has no module
  // scope to fall back on.
  assert.doesNotMatch(body, /__BL_TEST__|PROVIDERS|openPanel|document\.currentScript/);
});

test("each service's endpoint is present in the runtime actually shipped", () => {
  const runtime = RUNTIME.toString();
  for (const [id, provider] of Object.entries(PROVIDERS)) {
    const host = new URL(provider.endpoint).host;
    assert.ok(runtime.includes(host), `${id} endpoint host ${host} is not in the runtime`);
  }
  assert.match(runtime, /api\.todoist\.com\/api\/v1\/tasks\?filter=/);
  assert.match(runtime, /api\.linear\.app\/graphql/);
  assert.match(runtime, /Notion-Version/);
});

test("the runtime is a drawer that reports a refusal instead of an empty list", () => {
  const runtime = RUNTIME.toString();
  assert.match(runtime, /data-task-drawer/);
  assert.match(runtime, /position:fixed;inset:0;z-index:2147483647;pointer-events:none/);
  assert.match(runtime, /prefers-reduced-motion/);
  assert.match(runtime, /refused that token/);
  assert.match(runtime, /Nothing open/);
  // The repo rule: nodes are built, never parsed out of markup.
  assert.doesNotMatch(runtime, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
  // A drawer is not a modal.
  assert.doesNotMatch(runtime, /\.scrim/);
});

test("the list is ordered by date, not by a human due string", () => {
  const runtime = RUNTIME.toString();
  // "Tomorrow" would sort after "9999" and after any ISO date, so the key has
  // to come from the ISO field and undated work has to sink to the bottom.
  assert.match(runtime, /row\.sort \|\|/);
  assert.match(runtime, /if \(!left\) return 1;/);
  assert.match(runtime, /Todoist's display string is human/);
});

test("the bookmarklet stays a size a URL and a bookmark can carry", () => {
  const href = bookmarkletFor("todoist", { token: "x".repeat(40) });
  assert.ok(href.length < 40000, `${href.length} characters is past what a bookmark comfortably holds`);
  assert.ok(href.length > 2000, "the runtime is embedded, not fetched at click time");
});

test("a generated payload and the runtime cannot drift", () => {
  const body = bodyOf(bookmarkletFor("linear", { token: "lin_api_x" }));
  assert.ok(body.includes(RUNTIME.toString()), "the bookmarklet runs this exact function");
});
