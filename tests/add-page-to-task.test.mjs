import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "devtools", "add-page-to-task.js"), "utf8"))();
const { taskUrl, repoFrom, bodyFor, clip, isAppScheme, DESTINATIONS, TITLE_MAX } = globalThis.__BL_TEST__.addPageToTask;
delete globalThis.__BL_TEST__;

const page = { title: "Keeping a field team in the loop", url: "https://example.com/field-guide", note: "Every crew runs on a daily report." };

test("Trello gets every field its add-card window documents", () => {
  const url = new URL(taskUrl("trello", page));
  assert.equal(url.origin, "https://trello.com");
  assert.equal(url.pathname, "/add-card");
  assert.equal(url.searchParams.get("mode"), "popup");
  assert.equal(url.searchParams.get("name"), page.title);
  assert.equal(url.searchParams.get("url"), page.url);
  assert.equal(url.searchParams.get("desc"), bodyFor(page));
  assert.ok(url.searchParams.get("desc").includes(page.url), "the page URL travels in the description");
});

test("Linear uses its documented prefill link", () => {
  const url = new URL(taskUrl("linear", page));
  assert.equal(url.origin, "https://linear.new");
  assert.equal(url.searchParams.get("title"), page.title);
  assert.ok(url.searchParams.get("description").includes(page.note));
  assert.ok(url.searchParams.get("description").includes(page.url));
});

test("a URL-only page still produces a title and a body", () => {
  const bare = { title: "", url: "https://example.com/x", note: "" };
  const url = new URL(taskUrl("trello", bare));
  assert.equal(url.searchParams.get("name"), "");
  assert.equal(url.searchParams.get("desc"), bare.url);
});

test("the repository comes from the page, never from a guess", () => {
  assert.deepEqual(repoFrom("https://github.com/Spuds0588/Bookmarklet-Library/issues/12"), {
    host: "github",
    path: "Spuds0588/Bookmarklet-Library",
  });
  assert.deepEqual(repoFrom("https://github.com/Spuds0588"), null, "a profile is not a repo");
  assert.deepEqual(repoFrom("https://gitlab.com/group/sub/project/-/issues/3"), {
    host: "gitlab",
    path: "group/sub/project",
  });
  assert.deepEqual(repoFrom("https://gitlab.com/group/project"), { host: "gitlab", path: "group/project" });
  assert.deepEqual(repoFrom("https://example.com/a/b"), null);
  assert.deepEqual(repoFrom("not a url"), null);
});

test("issues only go to a tracker the page belongs to", () => {
  const onGithub = { title: "T", url: "https://github.com/o/r/pull/4", note: "" };
  assert.match(taskUrl("github", onGithub, repoFrom(onGithub.url)), /^https:\/\/github\.com\/o\/r\/issues\/new\?/);
  assert.equal(taskUrl("gitlab", onGithub, repoFrom(onGithub.url)), null);

  const onGitlab = { title: "T", url: "https://gitlab.com/group/project/-/issues/9", note: "" };
  const gitlab = new URL(taskUrl("gitlab", onGitlab, repoFrom(onGitlab.url)));
  assert.equal(gitlab.pathname, "/group/project/-/issues/new");
  assert.equal(gitlab.searchParams.get("issue[title]"), "T");
  assert.equal(taskUrl("github", onGitlab, repoFrom(onGitlab.url)), null);

  assert.equal(taskUrl("github", page, null), null, "no repo, no issue");
});

test("Things is handed to the app with its own scheme", () => {
  const url = taskUrl("things", page);
  assert.ok(url.startsWith("things:///add?"));
  assert.equal(isAppScheme(url), true);
  assert.equal(isAppScheme("https://trello.com/add-card"), false);
  assert.equal(isAppScheme("mailto:someone@example.com"), true);
});

test("a long title is cut once, with a marker", () => {
  const long = clip("x".repeat(TITLE_MAX + 50));
  assert.equal(long.length, TITLE_MAX);
  assert.ok(long.endsWith("…"));
  assert.equal(clip("  spaced\n\ntitle  "), "spaced title");
  assert.equal(clip(undefined), "");
});

test("only destinations a page can actually reach are offered", () => {
  assert.deepEqual(
    DESTINATIONS.map((entry) => entry.id),
    ["trello", "linear", "github", "gitlab", "things"],
  );
  for (const entry of DESTINATIONS) assert.ok(entry.label && entry.hint, `${entry.id} needs a label and a hint`);
});
