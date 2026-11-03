import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

globalThis.location = { href: "https://chatgpt.com/c/abc", hostname: "chatgpt.com" };
globalThis.document = { title: "Retention plan — ChatGPT" };
globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "files", "chat-to-markdown.js"), "utf8"))();
const { platformFor, fileNameForChat, chatTitle, tidyMarkdown } = globalThis.__BL_TEST__.chatExport;
delete globalThis.__BL_TEST__;

test("known chat hosts are named, everything else is not", () => {
  assert.equal(platformFor("chatgpt.com"), "ChatGPT");
  assert.equal(platformFor("www.chat.openai.com"), "ChatGPT");
  assert.equal(platformFor("claude.ai"), "Claude");
  assert.equal(platformFor("gemini.google.com"), "Gemini");
  assert.equal(platformFor("notchatgpt.com"), "");
  assert.equal(platformFor("example.com"), "");
});

test("the title drops the platform suffix", () => {
  assert.equal(chatTitle(), "Retention plan");
  globalThis.document.title = "Field guide | Claude";
  assert.equal(chatTitle(), "Field guide");
  globalThis.document.title = "Gemini";
  assert.equal(chatTitle(), "Gemini");
  globalThis.document.title = "";
  assert.equal(chatTitle(), "chatgpt.com");
  globalThis.document.title = "Retention plan — ChatGPT";
});

test("the file name is dated, slugged and safe on every platform", () => {
  const date = new Date(2026, 10, 3, 14, 5);
  assert.equal(fileNameForChat("Retention plan", "chatgpt.com", date), "chat-retention-plan-2026-11-03-1405.md");
  assert.equal(fileNameForChat("  A/B: test?! ", "claude.ai", date), "chat-a-b-test-2026-11-03-1405.md");
  assert.equal(fileNameForChat("", "claude.ai", date), "chat-claude-ai-2026-11-03-1405.md");
  assert.equal(fileNameForChat("x".repeat(90), "chatgpt.com", date).length, "chat-".length + 48 + "-2026-11-03-1405.md".length);
});

test("converted blocks collapse the blank lines a DOM leaves behind", () => {
  assert.equal(tidyMarkdown("\n\n  one\n\n\n\ntwo   \n\n"), "one\n\ntwo");
  assert.equal(tidyMarkdown(""), "");
  assert.equal(tidyMarkdown(null), "");
});
