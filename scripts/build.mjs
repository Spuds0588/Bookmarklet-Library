#!/usr/bin/env node
/**
 * Builds data/catalog.json from the per-bookmarklet files.
 * Each file starts with a metadata comment; the rest is the bookmarklet source.
 *
 * It also writes the crawlable parts of index.html: the no-JavaScript list of
 * tools and the ItemList structured data, both between markers. Without them
 * the page is an empty shell to anything that does not run scripts.
 *
 *   node scripts/build.mjs           write the catalog and index.html
 *   node scripts/build.mjs --check   fail if either is stale
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "bookmarklets");
const catalogPath = path.join(root, "data", "catalog.json");
const indexPath = path.join(root, "index.html");
const SITE = "https://spuds0588.github.io/Bookmarklet-Library/";
const TOOLS_START = "<!-- tools:start -->";
const TOOLS_END = "<!-- tools:end -->";

const CATEGORIES = [
  ["capture", "📸", "Capture", "Screenshots, screen recording, OCR"],
  ["annotate", "🖍️", "Annotate", "Mark up and draw over pages"],
  ["text", "🔤", "Text", "Find, replace, read and convert text"],
  ["files", "🗂️", "Files", "Clipboard, PDFs, ZIP, Office converters and exports"],
  ["devtools", "🛠️", "Dev tools", "Inspect URLs, storage, DOM and console"],
  ["view", "👀", "View", "Preview, magnify, declutter, picture-in-picture"],
  ["games", "🎮", "Games", "Arcade, shooters and browser game experiments"],
  ["privacy", "🕶️", "Privacy", "Redact what should not be seen"],
];
const categoryIndex = new Map(CATEGORIES.map(([id], i) => [id, i]));

const FIELDS = ["name", "category", "description", "tags", "traits", "added", "featured"];

// Capability badges: what a tool needs and what it touches. The ids are the
// only accepted values, and the pairs below cannot both be claimed.
const TRAITS = [
  ["offline", "Offline", "Works offline", "Runs with no network connection at all."],
  ["network", "Online", "Needs a connection", "Loads code, data or a page over the network to do its job."],
  ["self-contained", "Self-contained", "Self-contained", "Every line it runs is in the bookmarklet itself."],
  ["third-party", "3rd-party", "Third-party code", "Uses a library or engine somebody else wrote, bundled or fetched."],
  ["web-app", "Web app", "Loads a web app", "Opens a hosted page or another site's app to do its work."],
  ["no-cors", "CORS-free", "No CORS needed", "Its job never depends on a cross-origin response, so a site without CORS headers is no obstacle."],
  ["private-safe", "Sensitive-safe", "Safe for sensitive data", "Sends nothing from the page off your device, and loads no third-party code into it."],
].map(([id, short, label, help]) => ({ id, short, label, help }));
const TRAIT_IDS = new Set(TRAITS.map((trait) => trait.id));
const TRAIT_EXCLUSIVE = [
  ["offline", "network"],
  ["self-contained", "web-app"],
];

// Install links are named after the tool, so a tool without an emoji stands out
// as a mistake in the catalog rather than a deliberate plain label.
const EMOJI = /^\p{Extended_Pictographic}|^[\u2190-\u21FF\u2300-\u27BF]/u;

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
  if (!EMOJI.test(meta.name)) throw new Error(`${file}: @name must start with an emoji or symbol`);

  const traits = meta.traits.split(",").map((trait) => trait.trim()).filter(Boolean);
  for (const trait of traits) {
    if (!TRAIT_IDS.has(trait)) {
      throw new Error(`${file}: unknown trait "${trait}" (known: ${[...TRAIT_IDS].join(", ")})`);
    }
  }
  if (new Set(traits).size !== traits.length) throw new Error(`${file}: duplicate trait`);
  for (const [a, b] of TRAIT_EXCLUSIVE) {
    if (traits.includes(a) && traits.includes(b)) throw new Error(`${file}: @traits cannot be both ${a} and ${b}`);
  }
  if (traits.includes("web-app") && !traits.includes("network")) {
    throw new Error(`${file}: a tool that loads a web app also needs the network trait`);
  }

  // A status, not a capability: "testing" means the tool works but has not
  // been run against the real service yet.
  if (meta.testing !== undefined && !["true", "false"].includes(meta.testing.trim())) {
    throw new Error(`${file}: @testing must be true or false`);
  }

  const author = (meta.author ?? "").trim();
  const credit = (meta.credit ?? "").trim();
  if (Boolean(author) !== Boolean(credit)) {
    throw new Error(`${file}: @author and @credit go together`);
  }
  if (credit && !/^https?:\/\//.test(credit)) throw new Error(`${file}: @credit must be an http(s) URL`);

  return {
    slug,
    name: meta.name,
    category: meta.category,
    description: meta.description,
    tags: meta.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    traits,
    added: meta.added,
    featured: meta.featured === "true",
    testing: meta.testing?.trim() === "true",
    author,
    credit,
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

const categories = CATEGORIES.map(([id, emoji, label, blurb]) => ({
  id,
  emoji,
  label,
  blurb,
  count: items.filter((item) => item.category === id).length,
}));
const catalog = {
  updated: items.map((item) => item.added).sort().at(-1),
  total: items.length,
  categories,
  traits: TRAITS,
  items,
};

const json = JSON.stringify(catalog, null, 2) + "\n";

/* Crawlable copies of the catalog --------------------------------------- */

const escapeHtml = (value) =>
  value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);

// The page fills its grid with fetch() and JavaScript. This list is what a
// crawler, a reader mode or a browser with scripts blocked sees instead.
const traitShort = (id) => TRAITS.find((trait) => trait.id === id)?.short ?? id;

function toolsBlock(items, categories) {
  const groups = categories
    .map((category) => {
      const tools = items.filter((item) => item.category === category.id);
      if (!tools.length) return "";
      const rows = tools
        .map((item) => {
          const by = item.author
            ? ` <span class="static-credit">By <a href="${escapeHtml(item.credit)}">${escapeHtml(item.author)}</a></span>`
            : "";
          const needs = `<span class="static-traits">${item.traits.map(traitShort).map(escapeHtml).join(" · ")}</span>`;
          const state = item.testing ? ' <span class="static-testing">In testing</span>' : "";
          return `            <li><strong>${escapeHtml(item.name)}</strong> — ${escapeHtml(item.description)}${by} ${needs}${state}</li>`;
        })
        .join("\n");
      return `        <section class="static-group">
          <h3 class="section-label">${category.emoji} ${escapeHtml(category.label)} · ${tools.length}</h3>
          <ul>
${rows}
          </ul>
        </section>`;
    })
    .filter(Boolean)
    .join("\n");

  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Bookmarklet Library tools",
    numberOfItems: items.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "SoftwareApplication",
        name: item.name,
        description: item.description,
        applicationCategory: "BrowserApplication",
        operatingSystem: "Chrome, Firefox, Safari, Edge",
        url: `${SITE}#t/${item.slug}`,
        sameAs: item.credit
          ? [`https://github.com/Spuds0588/Bookmarklet-Library/blob/main/${item.source}`, item.credit]
          : `https://github.com/Spuds0588/Bookmarklet-Library/blob/main/${item.source}`,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    })),
  };
  const structured = JSON.stringify(list).replace(/</g, "\\u003c");

  return `    <noscript>
      <div class="static-index">
        <p class="hint">The grid needs JavaScript. Every tool is listed here in the meantime.</p>
${groups}
      </div>
    </noscript>
    <script type="application/ld+json">
${structured}
    </script>`;
}

function replaceBlock(html, start, end, body) {
  const from = html.indexOf(start);
  const to = html.lastIndexOf(end);
  if (from === -1 || to === -1 || to < from) {
    throw new Error(`index.html is missing the ${start} ${end} markers`);
  }
  return html.slice(0, from) + start + "\n" + body + "\n    " + end + html.slice(to + end.length);
}

const indexHtml = await readFile(indexPath, "utf8");
const nextIndex = replaceBlock(indexHtml, TOOLS_START, TOOLS_END, toolsBlock(items, categories));

const check = process.argv.includes("--check");

if (check) {
  let current = "";
  try {
    current = await readFile(catalogPath, "utf8");
  } catch {}
  const stale = [];
  if (current !== json) stale.push("data/catalog.json");
  if (nextIndex !== indexHtml) stale.push("index.html");
  if (stale.length) {
    console.error(`${stale.join(" and ")} ${stale.length > 1 ? "are" : "is"} stale. Run: node scripts/build.mjs`);
    process.exit(1);
  }
  console.log(`catalog is up to date (${items.length} bookmarklets)`);
} else {
  await writeFile(catalogPath, json);
  console.log(`wrote data/catalog.json (${items.length} bookmarklets, ${(json.length / 1024).toFixed(0)} KB)`);
  if (nextIndex !== indexHtml) {
    await writeFile(indexPath, nextIndex);
    console.log(`wrote index.html (${items.length} tools listed for crawlers)`);
  }
}
