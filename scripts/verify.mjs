#!/usr/bin/env node
/**
 * Verifies the built catalog against the bookmarklet source files.
 * Run after `node scripts/build.mjs`, or with `npm run verify`.
 */
import { readdir, readFile } from "node:fs/promises";
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
  if (Boolean(item.author) !== Boolean(item.credit)) {
    problems.push(`${item.slug}: author and credit must be present together`);
  }
  if (item.credit && !/^https?:\/\//.test(item.credit)) problems.push(`${item.slug}: credit is not an http(s) URL`);
  if (seenNames.has(item.name)) problems.push(`${item.slug}: duplicate name "${item.name}"`);
  seenNames.add(item.name);
  if (item.bytes !== Buffer.byteLength(body)) problems.push(`${item.slug}: byte count mismatch`);
  if (!EMOJI.test(item.name)) problems.push(`${item.slug}: name has no leading emoji`);
}

let shots = null;
try {
  shots = JSON.parse(await readFile(path.join(root, "data", "screenshots.json"), "utf8"));
} catch {
  problems.push("data/screenshots.json is missing or is not JSON (run node scripts/shots.mjs)");
}

const REASONS = ["download", "clipboard", "speech", "external", "other-page", "reload", "no-effect", "dialog", "display"];

if (shots) {
  for (const item of catalog.items) {
    const shot = shots.tools?.[item.slug];
    if (!shot) {
      problems.push(`screenshots: ${item.slug} has no capture (run node scripts/shots.mjs ${item.slug})`);
      continue;
    }
    if (typeof shot.changed !== "boolean") problems.push(`screenshots: ${item.slug} is missing its changed flag`);

    // A tool either has a capture or an explanation, never a capture it does not mean.
    if (shot.file && shot.reason) problems.push(`screenshots: ${item.slug} has both a file and a reason`);
    if (!shot.file && !shot.reason) problems.push(`screenshots: ${item.slug} has neither a file nor a reason`);
    if (shot.file && !shot.changed) problems.push(`screenshots: ${item.slug} ships an image but is marked unchanged`);
    if (shot.reason && !REASONS.includes(shot.reason)) problems.push(`screenshots: ${item.slug} has an unknown reason "${shot.reason}"`);

    if (shot.file) {
      try {
        const png = await readFile(path.join(root, shot.file));
        const header = png.subarray(0, 8).toString("hex");
        if (header !== "89504e470d0a1a0a") problems.push(`screenshots: ${item.slug} is not a PNG`);
        else if (png.readUInt32BE(16) !== shots.width || png.readUInt32BE(20) !== shots.height) {
          problems.push(`screenshots: ${item.slug} is ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}, expected ${shots.width}x${shots.height}`);
        }
      } catch {
        problems.push(`screenshots: ${item.slug} points at a missing file (${shot.file})`);
      }
    }
  }
  for (const slug of Object.keys(shots.tools ?? {})) {
    if (!slugs.has(slug)) problems.push(`screenshots: "${slug}" is not in the catalog`);
  }

  // Stale captures are noise: every PNG has to be one the manifest names.
  const named = new Set(
    Object.values(shots.tools ?? {}).map((shot) => shot.file ? path.basename(shot.file) : null).filter(Boolean),
  );
  for (const entry of await readdir(path.join(root, "screenshots"))) {
    if (entry.endsWith(".png") && !named.has(entry)) problems.push(`screenshots: ${entry} is not in the manifest`);
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
const entries = Object.values(shots?.tools ?? {});
console.log(
  `verified ${catalog.items.length} bookmarklets across ${catalog.categories.length} categories, ` +
    `${entries.filter((entry) => entry.file).length} screenshots, ` +
    `${entries.filter((entry) => entry.reason).length} tools explained without one`,
);
