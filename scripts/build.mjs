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
  ["files", "🗂️", "Files", "Clipboard, PDFs, ZIP archives and exports"],
  ["devtools", "🛠️", "Dev tools", "Inspect URLs, storage, DOM and console"],
  ["view", "👀", "View", "Preview, magnify, declutter, picture-in-picture"],
  ["privacy", "🕶️", "Privacy", "Redact what should not be seen"],
];
const categoryIndex = new Map(CATEGORIES.map(([id], i) => [id, i]));

const FIELDS = ["name", "category", "description", "tags", "added", "featured"];

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
  items,
};

const json = JSON.stringify(catalog, null, 2) + "\n";

/* Crawlable copies of the catalog --------------------------------------- */

const escapeHtml = (value) =>
  value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);

// The page fills its grid with fetch() and JavaScript. This list is what a
// crawler, a reader mode or a browser with scripts blocked sees instead.
function toolsBlock(items, categories) {
  const groups = categories
    .map((category) => {
      const tools = items.filter((item) => item.category === category.id);
      if (!tools.length) return "";
      const rows = tools
        .map((item) => `            <li><strong>${escapeHtml(item.name)}</strong> — ${escapeHtml(item.description)}</li>`)
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
        sameAs: `https://github.com/Spuds0588/Bookmarklet-Library/blob/main/${item.source}`,
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
