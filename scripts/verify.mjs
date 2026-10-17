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
const EMOJI = /^(?:\p{Extended_Pictographic}|[\u2190-\u21FF\u2300-\u27BF])/u;
const problems = [];
const seenNames = new Set();
const slugs = new Set(catalog.items.map((item) => item.slug));

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
  if (!EMOJI.test(item.name)) problems.push(`${item.slug}: name has no leading emoji`);
}

let votes = null;
try {
  votes = JSON.parse(await readFile(path.join(root, "data", "votes.json"), "utf8"));
} catch {
  problems.push("data/votes.json is missing or is not JSON (run node scripts/votes.mjs --offline)");
}

if (votes) {
  for (const [slug, vote] of Object.entries(votes.tools ?? {})) {
    if (!slugs.has(slug)) problems.push(`votes: "${slug}" is not in the catalog`);
    if (!Number.isInteger(vote.up) || vote.up < 0) problems.push(`votes: ${slug} up count is not a non-negative integer`);
    if (!Number.isInteger(vote.down) || vote.down < 0) problems.push(`votes: ${slug} down count is not a non-negative integer`);
  }
}

let shots = null;
try {
  shots = JSON.parse(await readFile(path.join(root, "data", "screenshots.json"), "utf8"));
} catch {
  problems.push("data/screenshots.json is missing or is not JSON (run node scripts/shots.mjs)");
}

if (shots) {
  for (const item of catalog.items) {
    const shot = shots.tools?.[item.slug];
    if (!shot) {
      problems.push(`screenshots: ${item.slug} has no capture (run node scripts/shots.mjs ${item.slug})`);
      continue;
    }
    if (typeof shot.changed !== "boolean") problems.push(`screenshots: ${item.slug} is missing its changed flag`);
    try {
      const png = await readFile(path.join(root, shot.file ?? ""));
      const header = png.subarray(0, 8).toString("hex");
      if (header !== "89504e470d0a1a0a") problems.push(`screenshots: ${item.slug} is not a PNG`);
      else if (png.readUInt32BE(16) !== shots.width || png.readUInt32BE(20) !== shots.height) {
        problems.push(`screenshots: ${item.slug} is ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}, expected ${shots.width}x${shots.height}`);
      }
    } catch {
      problems.push(`screenshots: ${item.slug} points at a missing file (${shot.file})`);
    }
  }
  for (const slug of Object.keys(shots.tools ?? {})) {
    if (!slugs.has(slug)) problems.push(`screenshots: "${slug}" is not in the catalog`);
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
  `verified ${catalog.items.length} bookmarklets across ${catalog.categories.length} categories, ` +
    `${Object.keys(votes?.tools ?? {}).length} vote rows, ${Object.keys(shots?.tools ?? {}).length} screenshots`,
);
