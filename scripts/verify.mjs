#!/usr/bin/env node
/**
 * Verifies the built catalog against the bookmarklet source files.
 * Run after `node scripts/build.mjs`, or with `npm run verify`.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(path.join(root, "data", "catalog.json"), "utf8"));

const FORBIDDEN = /arive|wizni|lender portal|freshdesk/i;
const problems = [];
const seenNames = new Set();

for (const item of catalog.items) {
  const source = await readFile(path.join(root, item.source), "utf8");
  const body = source.slice(source.indexOf("*/") + 2).trim();

  if (decodeURIComponent(item.href.replace(/^javascript:/, "")) !== body) {
    problems.push(`${item.slug}: href does not decode back to ${item.source}`);
  }
  try {
    new Function(body);
  } catch (error) {
    problems.push(`${item.slug}: does not parse (${error.message})`);
  }
  if (FORBIDDEN.test(body) || FORBIDDEN.test(item.name) || FORBIDDEN.test(item.description)) {
    problems.push(`${item.slug}: contains a forbidden vendor reference`);
  }
  if (!item.description || item.description.length < 20) problems.push(`${item.slug}: description too short`);
  if (!item.tags.length) problems.push(`${item.slug}: no tags`);
  if (seenNames.has(item.name)) problems.push(`${item.slug}: duplicate name "${item.name}"`);
  seenNames.add(item.name);
  if (item.bytes !== Buffer.byteLength(body)) problems.push(`${item.slug}: byte count mismatch`);
}

let votes = null;
try {
  votes = JSON.parse(await readFile(path.join(root, "data", "votes.json"), "utf8"));
} catch {
  problems.push("data/votes.json is missing or is not JSON (run node scripts/votes.mjs --offline)");
}

if (votes) {
  const slugs = new Set(catalog.items.map((item) => item.slug));
  for (const [slug, vote] of Object.entries(votes.tools ?? {})) {
    if (!slugs.has(slug)) problems.push(`votes: "${slug}" is not in the catalog`);
    if (!Number.isInteger(vote.up) || vote.up < 0) problems.push(`votes: ${slug} up count is not a non-negative integer`);
    if (!Number.isInteger(vote.down) || vote.down < 0) problems.push(`votes: ${slug} down count is not a non-negative integer`);
  }
}

if (catalog.total !== catalog.items.length) problems.push("catalog.total does not match items");
for (const category of catalog.categories) {
  const actual = catalog.items.filter((item) => item.category === category.id).length;
  if (actual !== category.count) problems.push(`${category.id}: count says ${category.count}, found ${actual}`);
}
if (catalog.items.filter((item) => item.featured).length !== 1) problems.push("expected exactly one featured item");

if (problems.length) {
  console.error(`${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(
  `verified ${catalog.items.length} bookmarklets across ${catalog.categories.length} categories, ${Object.keys(votes?.tools ?? {}).length} vote rows`,
);
