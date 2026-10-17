const $ = (selector, root = document) => root.querySelector(selector);

const STORAGE = { picks: "bl:picks", votes: "bl:votes", theme: "bl:theme" };

const state = {
  items: [],
  categories: [],
  query: "",
  category: "all",
  likedOnly: false,
  picks: new Set(read(STORAGE.picks, [])),
  votes: read(STORAGE.votes, {}),
};

const nodes = {
  count: $("#count"),
  footerCount: $("#footer-count"),
  theme: $("#theme"),
  featured: $("#featured"),
  chips: $("#chips"),
  search: $("#search"),
  clearSearch: $("#clear-search"),
  status: $("#status"),
  selectAll: $("#select-all"),
  grid: $("#grid"),
  empty: $("#empty"),
  composer: $("#composer"),
  pickCount: $("#pick-count"),
  download: $("#download"),
  toast: $("#toast"),
};

function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CATEGORY_BY_ID = () => new Map(state.categories.map((category) => [category.id, category]));
const labelFor = (id) => CATEGORY_BY_ID().get(id)?.label ?? id;

function visibleItems() {
  const tokens = state.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return state.items.filter((item) => {
    if (state.category !== "all" && item.category !== state.category) return false;
    if (state.likedOnly && state.votes[item.slug] !== 1) return false;
    if (!tokens.length) return true;
    const haystack = [item.name, item.description, item.tags.join(" "), labelFor(item.category)]
      .join(" ")
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

/* Rendering ------------------------------------------------------------- */

function renderFeatured() {
  if (!state.items.length) return;
  const item = state.items.find((entry) => entry.featured) ?? state.items[0];
  const index = state.categories.findIndex((category) => category.id === item.category);
  const date = new Date(`${item.added}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  nodes.featured.innerHTML = `
    <div class="featured-inner">
      <div class="featured-copy">
        <p class="featured-eyebrow">Featured · added ${esc(date)}</p>
        <h2 id="featured-title">${esc(item.name)}</h2>
        <p class="featured-desc">${esc(item.description)}</p>
        <div class="featured-actions">
          <a class="drag-btn" href="${esc(item.href)}" draggable="true" title="Drag onto your bookmarks bar">
            <svg class="icon" aria-hidden="true"><use href="#i-bookmark"></use></svg>
            Drag to bookmarks bar
          </a>
          <button class="ghost-btn" type="button" data-copy="${esc(item.slug)}">
            <svg class="icon" aria-hidden="true"><use href="#i-copy"></use></svg>
            Copy code
          </button>
        </div>
      </div>
      <div class="featured-side" aria-hidden="true">
        <span class="featured-index">${String(index + 1).padStart(2, "0")}</span>
        <span class="featured-kind">${esc(labelFor(item.category))}<br>${Math.round(item.bytes / 1024)} KB</span>
      </div>
    </div>`;
  nodes.featured.hidden = false;
}

function renderChips() {
  const liked = Object.values(state.votes).filter((vote) => vote === 1).length;
  const chips = [
    `<button class="chip" type="button" data-cat="all" aria-pressed="${state.category === "all"}">All <span class="chip-count">${state.items.length}</span></button>`,
    ...state.categories.map(
      (category) => `
      <button class="chip" type="button" data-cat="${esc(category.id)}" aria-pressed="${state.category === category.id}">
        ${esc(category.label)} <span class="chip-count">${category.count}</span>
      </button>`,
    ),
    `<span class="chip-sep" aria-hidden="true"></span>`,
    `<button class="chip" type="button" data-liked="true" aria-pressed="${state.likedOnly}" title="Filter by the tools you rated">
      <svg class="icon" aria-hidden="true" style="width:12px;height:12px"><use href="#i-thumb-up"></use></svg>
      Liked <span class="chip-count">${liked}</span>
    </button>`,
  ];
  nodes.chips.innerHTML = chips.join("");
}

function voteButtons(item) {
  const current = state.votes[item.slug];
  return `
    <div class="votes">
      <button class="vote" type="button" data-vote="1" data-slug="${esc(item.slug)}" aria-pressed="${current === 1}" aria-label="More tools like ${esc(item.name)}" title="More like this">
        <svg class="icon" aria-hidden="true"><use href="#i-thumb-up"></use></svg>
      </button>
      <button class="vote" type="button" data-vote="-1" data-slug="${esc(item.slug)}" aria-pressed="${current === -1}" aria-label="Not useful: ${esc(item.name)}" title="Not for me">
        <svg class="icon" aria-hidden="true"><use href="#i-thumb-down"></use></svg>
      </button>
    </div>`;
}

function card(item) {
  const picked = state.picks.has(item.slug);
  return `
    <article class="card" data-card="${esc(item.slug)}">
      <div class="card-top">
        <span class="card-cat">${esc(labelFor(item.category))}</span>
        ${voteButtons(item)}
      </div>
      <h3 class="card-title">${esc(item.name)}</h3>
      <p class="card-desc">${esc(item.description)}</p>
      <div class="card-actions">
        <a class="drag" href="${esc(item.href)}" draggable="true" title="Drag onto your bookmarks bar">
          <svg class="icon" aria-hidden="true"><use href="#i-bookmark"></use></svg>
          Drag
        </a>
        <button class="copy-btn" type="button" data-copy="${esc(item.slug)}" aria-label="Copy code for ${esc(item.name)}" title="Copy the bookmarklet code">
          <svg class="icon" aria-hidden="true"><use href="#i-copy"></use></svg>
        </button>
        <a class="copy-btn" href="${esc(item.source)}" target="_blank" rel="noopener" aria-label="View source for ${esc(item.name)}" title="View source">
          <svg class="icon" aria-hidden="true"><use href="#i-arrow"></use></svg>
        </a>
        <label class="pick">
          <input type="checkbox" data-pick="${esc(item.slug)}" ${picked ? "checked" : ""}>
          Pick
        </label>
      </div>
    </article>`;
}

function updateSelectAll() {
  const items = visibleItems();
  const allPicked = items.length > 0 && items.every((item) => state.picks.has(item.slug));
  nodes.selectAll.textContent = allPicked ? "Clear shown" : "Select all shown";
  nodes.selectAll.hidden = items.length === 0;
  nodes.selectAll.disabled = items.length === 0;
}

function renderGrid() {
  const items = visibleItems();
  nodes.grid.innerHTML = items.map(card).join("");
  updateSelectAll();

  const status = [`${items.length} of ${state.items.length} tools`];
  if (state.category !== "all") status.push(labelFor(state.category));
  if (state.likedOnly) status.push("liked");
  if (state.query.trim()) status.push(`“${state.query.trim()}”`);
  nodes.status.textContent = status.join(" · ");

  nodes.empty.hidden = items.length > 0;
  nodes.grid.hidden = items.length === 0;
}

function renderAll() {
  renderFeatured();
  renderChips();
  renderGrid();
  renderComposer();
  nodes.count.textContent = `${state.items.length} tools · ${state.categories.length} categories`;
  nodes.footerCount.textContent = `${state.items.length} tools, ${state.categories.length} categories`;
}

function renderComposer() {
  const count = state.picks.size;
  nodes.pickCount.textContent = String(count);
  nodes.composer.hidden = count === 0;
  document.body.classList.toggle("has-composer", count > 0);
}

/* Feedback -------------------------------------------------------------- */

let toastTimer;
function toast(message) {
  nodes.toast.textContent = message;
  nodes.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => nodes.toast.classList.remove("is-visible"), 2600);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.cssText = "position:fixed;top:-999px;opacity:0";
    document.body.append(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  }
}

function syncVotes(slug) {
  document.querySelectorAll(`[data-vote][data-slug="${CSS.escape(slug)}"]`).forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.vote) === state.votes[slug]));
  });
}

/* Composer -------------------------------------------------------------- */

function buildBookmarkFile(items) {
  const stamp = Math.floor(Date.now() / 1000);
  const groups = state.categories
    .map((category) => ({ category, items: items.filter((item) => item.category === category.id) }))
    .filter((group) => group.items.length);

  const lines = [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    "<!-- Exported from Bookmarklet Library -->",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarklets</TITLE>",
    "<H1>Bookmarklets</H1>",
    "<DL><p>",
    `    <DT><H3 ADD_DATE="${stamp}" LAST_MODIFIED="${stamp}">Bookmarklet Library</H3>`,
    "    <DL><p>",
  ];

  for (const { category, items: group } of groups) {
    lines.push(`        <DT><H3 ADD_DATE="${stamp}" LAST_MODIFIED="${stamp}">${esc(category.label)}</H3>`);
    lines.push("        <DL><p>");
    for (const item of group) {
      lines.push(`            <DT><A HREF="${esc(item.href)}" ADD_DATE="${stamp}">${esc(item.name)}</A>`);
      lines.push(`            <DD>${esc(item.description)}`);
    }
    lines.push("        </DL><p>");
  }

  lines.push("    </DL><p>", "</DL><p>");
  return { html: lines.join("\n") + "\n", groups: groups.length };
}

function downloadSelection() {
  const items = state.items.filter((item) => state.picks.has(item.slug));
  if (!items.length) return;

  const { html, groups } = buildBookmarkFile(items);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "bookmarks.html";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  const folderWord = groups === 1 ? "folder" : "folders";
  toast(`bookmarks.html downloaded — ${items.length} tools in ${groups} ${folderWord}`);
}

/* Theme ----------------------------------------------------------------- */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const next = theme === "dark" ? "light" : "dark";
  nodes.theme.setAttribute("aria-label", `Switch to ${next} theme`);
  nodes.theme.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-${theme === "dark" ? "sun" : "moon"}"></use></svg>`;
}

/* Events ---------------------------------------------------------------- */

function bindStaticEvents() {
  nodes.theme.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    write(STORAGE.theme, next);
  });

  nodes.search.addEventListener("input", () => {
    state.query = nodes.search.value;
    nodes.clearSearch.hidden = !state.query;
    renderGrid();
  });

  nodes.clearSearch.addEventListener("click", () => {
    nodes.search.value = "";
    state.query = "";
    nodes.clearSearch.hidden = true;
    renderGrid();
    nodes.search.focus();
  });

  nodes.chips.addEventListener("click", (event) => {
    const chip = event.target.closest("button");
    if (!chip) return;
    if (chip.dataset.liked) {
      state.likedOnly = !state.likedOnly;
    } else if (chip.dataset.cat) {
      state.category = chip.dataset.cat;
    }
    renderChips();
    renderGrid();
  });

  nodes.selectAll.addEventListener("click", () => {
    const items = visibleItems();
    const allPicked = items.length > 0 && items.every((item) => state.picks.has(item.slug));
    items.forEach((item) => (allPicked ? state.picks.delete(item.slug) : state.picks.add(item.slug)));
    write(STORAGE.picks, [...state.picks]);
    renderGrid();
    renderComposer();
  });

  $("#reset").addEventListener("click", () => {
    state.query = "";
    state.category = "all";
    state.likedOnly = false;
    nodes.search.value = "";
    nodes.clearSearch.hidden = true;
    renderChips();
    renderGrid();
  });

  nodes.grid.addEventListener("change", (event) => {
    const box = event.target.closest("[data-pick]");
    if (!box) return;
    if (box.checked) state.picks.add(box.dataset.pick);
    else state.picks.delete(box.dataset.pick);
    write(STORAGE.picks, [...state.picks]);
    updateSelectAll();
    renderComposer();
  });

  const onCopy = async (slug) => {
    const item = state.items.find((entry) => entry.slug === slug);
    if (!item) return;
    const copied = await copyText(item.href);
    toast(copied ? "Copied. Paste it into a bookmark's URL field." : "Copy failed. Select the code from the source file instead.");
  };

  const onVote = (slug, value) => {
    const current = state.votes[slug];
    if (current === value) delete state.votes[slug];
    else state.votes[slug] = value;
    write(STORAGE.votes, state.votes);
    syncVotes(slug);
    renderChips();
    if (state.likedOnly) renderGrid();
    toast("Rating saved. Thumbs stay in this browser.");
  };

  document.addEventListener("click", (event) => {
    const copy = event.target.closest("[data-copy]");
    if (copy) {
      onCopy(copy.dataset.copy);
      return;
    }
    const vote = event.target.closest("[data-vote]");
    if (vote) onVote(vote.dataset.slug, Number(vote.dataset.vote));
  });

  nodes.download.addEventListener("click", downloadSelection);

  $("#clear-picks").addEventListener("click", () => {
    state.picks.clear();
    write(STORAGE.picks, []);
    document.querySelectorAll("[data-pick]").forEach((box) => (box.checked = false));
    updateSelectAll();
    renderComposer();
  });

  document.addEventListener("keydown", (event) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "");
    if (event.key === "/" && !typing) {
      event.preventDefault();
      nodes.search.focus();
    }
    if (event.key === "Escape" && document.activeElement === nodes.search) {
      if (nodes.search.value) {
        nodes.search.value = "";
        state.query = "";
        nodes.clearSearch.hidden = true;
        renderGrid();
      } else {
        nodes.search.blur();
      }
    }
  });
}

/* Boot ------------------------------------------------------------------ */

async function init() {
  applyTheme(document.documentElement.dataset.theme || "light");
  bindStaticEvents();

  try {
    const response = await fetch("data/catalog.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = await response.json();
    state.items = catalog.items;
    state.categories = catalog.categories;
    renderAll();
  } catch (error) {
    console.error(error);
    nodes.count.textContent = "Catalog unavailable";
    nodes.status.textContent = "Could not load data/catalog.json — serve this folder over HTTP and rebuild with node scripts/build.mjs.";
  }
}

init();
