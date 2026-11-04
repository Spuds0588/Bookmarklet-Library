import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "devtools", "task-bookmarklet-builder.js"), "utf8"))();
const { parseTarget, bookmarkletFor, SERVICES } = globalThis.__BL_TEST__.taskBuilder;
delete globalThis.__BL_TEST__;

const bodyOf = (href) => {
  assert.ok(href.startsWith("javascript:"), "a bookmarklet starts with the scheme");
  const body = href.slice("javascript:".length);
  assert.doesNotThrow(() => new Function(body), "the generated bookmarklet parses");
  return body;
};

test("a board, repo, project or list address yields the id the service wants", () => {
  assert.equal(parseTarget("https://trello.com/b/5f2cABCD/field-guide").id, "5f2cABCD");
  assert.equal(parseTarget("trello.com/b/5f2cABCD").service, "trello", "a pasted address may have no scheme");

  assert.equal(parseTarget("https://github.com/Spuds0588/Bookmarklet-Library").id, "Spuds0588/Bookmarklet-Library");
  assert.equal(parseTarget("https://github.com/Spuds0588"), null, "a profile is not a repository");

  assert.equal(parseTarget("https://gitlab.com/group/sub/project/-/issues/3").id, "group/sub/project");
  assert.equal(parseTarget("https://app.todoist.com/app/project/Field-Guide-1234567890").id, "1234567890");
  assert.equal(parseTarget("https://app.clickup.com/9015/v/li/901317097122").id, "901317097122");
  assert.equal(parseTarget("https://app.asana.com/0/1203456789/list/1203").id, "1203456789");
});

test("an address that files nowhere is refused rather than guessed at", () => {
  assert.equal(parseTarget("https://example.com/board/1"), null);
  assert.equal(parseTarget("https://trello.com/c/cardId"), null, "a card is not a board");
  assert.equal(parseTarget("https://app.todoist.com/app/today"), null, "today is not a project");
  assert.equal(parseTarget("https://app.clickup.com/9015/v/b/2kyx"), null, "a board is not a list");
  assert.equal(parseTarget(""), null);
  assert.equal(parseTarget("not a url"), null);
});

test("token services say so, and refuse to build without one", () => {
  for (const [id, service] of Object.entries(SERVICES)) {
    const target = { service: id, id: "x", label: service.label, place: service.place, needsToken: service.needsToken };
    if (!service.needsToken) continue;
    assert.throws(() => bookmarkletFor(target, "  "), /needs an API token/);
  }
  assert.throws(() => bookmarkletFor(null), /Paste a/);
});

test("Trello files into the board, with nothing but the board id", () => {
  const body = bodyOf(bookmarkletFor(parseTarget("https://trello.com/b/5f2cABCD/work")));
  assert.match(body, /trello\.com\/add-card\?mode=popup&idBoard=/);
  assert.match(body, /"5f2cABCD"/);
  assert.match(body, /window\.open/);
  assert.doesNotMatch(body, /fetch|Authorization/, "a prefilled link needs no request");
});

test("GitHub and GitLab get an issue link in that repository only", () => {
  const github = bodyOf(bookmarkletFor(parseTarget("https://github.com/o/r/pull/4")));
  assert.match(github, /"https:\/\/github\.com\/"\+"o\/r"\+"\/issues\/new\?title="/);
  const gitlab = bodyOf(bookmarkletFor(parseTarget("https://gitlab.com/g/sub/p/-/issues")));
  assert.match(gitlab, /\/issues\/new\?issue\[title\]=/);
  assert.match(gitlab, /"g\/sub\/p"/);
});

test("Todoist posts to the v1 endpoint with the project and the bearer token", () => {
  const target = parseTarget("https://app.todoist.com/app/project/Field-Guide-1234567890");
  const body = bodyOf(bookmarkletFor(target, "tok_abc123"));
  assert.match(body, /https:\/\/api\.todoist\.com\/api\/v1\/tasks/);
  assert.match(body, /Authorization:"Bearer "\+"tok_abc123"/);
  assert.match(body, /project_id:"1234567890"/);
  assert.match(body, /content:t,description:d/);
});

test("ClickUp sends its token bare and files into the list", () => {
  const target = parseTarget("https://app.clickup.com/9015/v/li/901317097122");
  const body = bodyOf(bookmarkletFor(target, "pk_123"));
  assert.match(body, /api\.clickup\.com\/api\/v2\/list\/"\+"901317097122"\+"\/task/);
  assert.match(body, /Authorization:"pk_123"/);
  assert.match(body, /name:t,description:d/);
});

test("Asana wraps the task in its data envelope and projects list", () => {
  const target = parseTarget("https://app.asana.com/0/1203456789/list/1203");
  const body = bodyOf(bookmarkletFor(target, "1/abc"));
  assert.match(body, /app\.asana\.com\/api\/1\.0\/tasks/);
  assert.match(body, /data:\{name:t,notes:d,projects:\["1203456789"\]\}/);
});

test("a token is embedded as data, so it cannot break the generated code", () => {
  const target = parseTarget("https://app.todoist.com/app/project/x-1");
  const body = bodyOf(bookmarkletFor(target, 'a"b\nc\\d'));
  assert.match(body, /\+"a\\"b\\nc\\\\d"/);
});

test("the payload reads the page at click time, not at build time", () => {
  const body = bodyOf(bookmarkletFor(parseTarget("https://trello.com/b/abc")));
  assert.match(body, /document\.title/);
  assert.match(body, /location\.href/);
  assert.match(body, /getSelection/);
  assert.doesNotMatch(body, /example\.com/, "nothing from the builder's page is baked in");
});
