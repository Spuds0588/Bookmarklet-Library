#!/usr/bin/env node
/**
 * Builds data/catalog.json from the per-bookmarklet files.
 * Each file starts with a metadata comment; the rest is the bookmarklet source.
 *
 *   node scripts/build.mjs           write the catalog
 *   node scripts/build.mjs --check   fail if the committed catalog is stale
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "bookmarklets");
const catalogPath = path.join(root, "data", "catalog.json");

const CATEGORIES = [
  ["capture", "Capture", "Screenshots, screen recording, OCR"],
  ["annotate", "Annotate", "Mark up and draw over pages"],
  ["text", "Text", "Find, replace, read and convert text"],
  ["files", "Files", "Clipboard to files, snippets and exports"],
  ["devtools", "Dev tools", "Inspect URLs, storage, DOM and console"],
  ["view", "View", "Preview, magnify, declutter, picture-in-picture"],
  ["privacy", "Privacy", "Redact what should not be seen"],
];
const categoryIndex = new Map(CATEGORIES.map(([id], i) => [id, i]));

const FIELDS = ["name", "category", "description", "tags", "added", "featured"];

function parseSource(slug, file, text) {
  const match = text.match(/^\/\*\*([\s\S]*?)\*\//);
  if (!match) throw new Error(`${file}: missing metadata comment`);
  const meta = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^\s*\*\s*@(\w+)\s+(.+?)\s*$/);
    if (m) meta[m[1]] = m[2];
  }
  for (const field of FIELDS) {
    if (!meta[field]) throw new Error(`${file}: missing @${field}`);
  }
  const code = text.slice(match[0].length).trim();
  if (!code) throw new Error(`${file}: empty source`);
  if (!categoryIndex.has(meta.category)) throw new Error(`${file}: unknown category "${meta.category}"`);
  if (path.basename(path.dirname(file)) !== meta.category) {
    throw new Error(`${file}: category does not match its folder`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.added)) throw new Error(`${file}: @added must be YYYY-MM-DD`);

  return {
    slug,
    name: meta.name,
    category: meta.category,
    description: meta.description,
    tags: meta.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    added: meta.added,
    featured: meta.featured === "true",
    bytes: Buffer.byteLength(code),
    source: path.relative(root, file).split(path.sep).join("/"),
    // Percent-encoding keeps quotes, hashes and percent signs intact in an href.
    href: "javascript:" + encodeURIComponent(code),
  };
}

async function readItems() {
  const items = [];
  for (const folder of (await readdir(sourceDir)).sort()) {
    if (!categoryIndex.has(folder)) continue;
    for (const entry of (await readdir(path.join(sourceDir, folder))).sort()) {
      if (!entry.endsWith(".js")) continue;
      const file = path.join(sourceDir, folder, entry);
      const slug = path.basename(entry, ".js");
      if (items.some((item) => item.slug === slug)) throw new Error(`duplicate slug: ${slug}`);
      items.push(parseSource(slug, file, await readFile(file, "utf8")));
    }
  }
  return items.sort(
    (a, b) =>
      categoryIndex.get(a.category) - categoryIndex.get(b.category) ||
      a.name.localeCompare(b.name),
  );
}

const items = await readItems();
if (items.length === 0) throw new Error("no bookmarklets found");
if (items.filter((item) => item.featured).length > 1) throw new Error("only one featured item is supported");

const categories = CATEGORIES.map(([id, label, blurb]) => ({
  id,
  label,
  blurb,
  count: items.filter((item) => item.category === id).length,
}));
const catalog = {
  updated: items.map((item) => item.added).sort().at(-1),
  total: items.length,
  categories,
  items,
};

const json = JSON.stringify(catalog, null, 2) + "\n";
const check = process.argv.includes("--check");

if (check) {
  let current = "";
  try {
    current = await readFile(catalogPath, "utf8");
  } catch {}
  if (current !== json) {
    console.error("data/catalog.json is stale. Run: node scripts/build.mjs");
    process.exit(1);
  }
  console.log(`catalog is up to date (${items.length} bookmarklets)`);
} else {
  await writeFile(catalogPath, json);
  console.log(`wrote data/catalog.json (${items.length} bookmarklets, ${(json.length / 1024).toFixed(0)} KB)`);
}
