#!/usr/bin/env node
/**
 * Composes the Office converter bookmarklets from shared parts.
 *
 * Each tool under bookmarklets/src/tools carries its metadata comment, a
 * `// @parts` list and the `startTool(...)` call. The generated file in
 * bookmarklets/files is self-contained: no part is fetched at runtime.
 *
 *   node scripts/compose.mjs           write the generated bookmarklets
 *   node scripts/compose.mjs --check   fail if any generated file is stale
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const partsDir = path.join(root, "bookmarklets", "src", "parts");
const toolsDir = path.join(root, "bookmarklets", "src", "tools");
const outDir = path.join(root, "bookmarklets", "files");
const check = process.argv.includes("--check");
const problems = [];
let written = 0;

const parts = new Map();
for (const entry of (await readdir(partsDir)).sort()) {
  if (!entry.endsWith(".js")) continue;
  parts.set(entry.slice(0, -3), (await readFile(path.join(partsDir, entry), "utf8")).trim());
}

const tools = (await readdir(toolsDir)).filter((entry) => entry.endsWith(".js")).sort();
for (const entry of tools) {
  const source = await readFile(path.join(toolsDir, entry), "utf8");
  const meta = source.match(/^\/\*\*[\s\S]*?\*\//);
  if (!meta) {
    problems.push(`${entry}: missing metadata comment`);
    continue;
  }
  const list = source.match(/^\/\/\s*@parts\s+(.+)$/m);
  if (!list) {
    problems.push(`${entry}: missing // @parts`);
    continue;
  }
  const wanted = list[1].split(",").map((name) => name.trim()).filter(Boolean);
  const missing = wanted.filter((name) => !parts.has(name));
  if (missing.length) {
    problems.push(`${entry}: unknown part(s) ${missing.join(", ")}`);
    continue;
  }
  const body = source.slice(meta[0].length).replace(/^\/\/\s*@parts.*$/m, "").trim();
  if (!body) {
    problems.push(`${entry}: no tool body`);
    continue;
  }
  const slug = path.basename(entry, ".js");
  const generated = `${meta[0]}
// Generated from bookmarklets/src by scripts/compose.mjs. Edit the source, not this file.
(() => {
const BL = {};
${wanted.map((name) => `/* ---- ${name} ---- */\n${parts.get(name)}`).join("\n")}
const startTool = BL.startTool;
${body}
if (globalThis.__BL_TEST__) globalThis.__BL_TEST__.BL = BL;
})();
`;
  const target = path.join(outDir, `${slug}.js`);
  if (check) {
    const current = await readFile(target, "utf8").catch(() => "");
    if (current !== generated) problems.push(`${slug}.js is stale (run node scripts/compose.mjs)`);
  } else {
    await writeFile(target, generated);
    written++;
  }
}

if (problems.length) {
  console.error(`${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(check ? `composed ${tools.length} converters are up to date` : `wrote ${written} converter bookmarklets`);
