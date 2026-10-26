const $ = (selector, root = document) => root.querySelector(selector);

const STORAGE = { picks: "bl:picks", theme: "bl:theme" };

const state = {
  items: [],
  categories: [],
  query: "",
  category: "all",
  topRated: false,
  picks: new Set(read(STORAGE.picks, [])),
  votes: { tools: {} },
  shots: { tools: {} },
  detail: null,
};

const nodes = {
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
  detail: $("#detail"),
  detailCat: $("#detail-cat"),
  detailTitle: $("#detail-title"),
  detailDesc: $("#detail-desc"),
  detailShot: $("#detail-shot"),
  detailInstall: $("#detail-install"),
  detailTags: $("#detail-tags"),
  detailMeta: $("#detail-meta"),
  detailHow: $("#detail-how"),
  detailActions: $("#detail-actions"),
  detailPrev: $("#detail-prev"),
  detailNext: $("#detail-next"),
  detailClose: $("#detail-close"),
  detailScroll: $(".detail-scroll"),
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
const categoryOf = (id) => CATEGORY_BY_ID().get(id);
const labelFor = (id) => categoryOf(id)?.label ?? id;
const badgeFor = (id) => {
  const category = categoryOf(id);
  return category ? `${category.emoji} ${category.label}` : id;
};
const shotFor = (item) => state.shots.tools[item.slug];

// Tools whose work never reaches the page get no screenshot. The reason says
// what happened instead, so a blank tile is an answer rather than a gap.
const REASON_COPY = {
  download: {
    short: "Saves a file",
    long: "This one saves a file straight to your downloads folder. The page you run it on looks the same afterwards, so there is nothing to photograph here.",
  },
  clipboard: {
    short: "Copies to clipboard",
    long: "The result goes to your clipboard, ready to paste. Nothing on the page changes, so there is no screenshot to show.",
  },
  speech: {
    short: "Reads aloud",
    long: "It speaks the page through the browser's voice engine. The page itself stays put, so there is nothing to capture.",
  },
  external: {
    short: "Opens another site",
    long: "It hands the job to another site — a mail composer, your webmail, the Zoom web client. The page you started on is unchanged.",
  },
  "other-page": {
    short: "Needs a certain page",
    long: "This only does something on a page of a particular kind, such as an API reference. On the demo page it politely does nothing.",
  },
  reload: {
    short: "Reloads the page",
    long: "It clears what the site stored and reloads, so it leaves you with the page you started on.",
  },
  "no-effect": {
    short: "Works outside the page",
    long: "Nothing on the demo page needed the change this tool makes, so there is nothing to show.",
  },
  display: {
    short: "Records your screen",
    long: "It records your screen to a video file, and the page it runs on looks the same while it does. The recording lands in your downloads when you stop it, so there is nothing on the page to photograph.",
  },
};
const reasonFor = (shot) => REASON_COPY[shot?.reason] ?? REASON_COPY["no-effect"];
const bookmarkIcon = '<svg class="icon" aria-hidden="true"><use href="#i-bookmark"></use></svg>';

const score = (item) => {
  const vote = state.votes.tools[item.slug];
  return vote ? vote.up - vote.down : 0;
};

function visibleItems() {
  const tokens = state.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const items = state.items.filter((item) => {
    if (state.category !== "all" && item.category !== state.category) return false;
    if (!tokens.length) return true;
    const haystack = [item.name, item.description, item.tags.join(" "), labelFor(item.category)]
      .join(" ")
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
  return state.topRated ? items.sort((a, b) => score(b) - score(a)) : items;
}

/* Rendering ------------------------------------------------------------- */

function renderFeatured() {
  if (!state.items.length) return;
  const item = state.items.find((entry) => entry.featured) ?? state.items[0];
  const index = state.categories.findIndex((category) => category.id === item.category);
  const shot = shotFor(item);
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
          <a class="install install-lg" href="${esc(item.href)}" draggable="true" title="Drag “${esc(item.name)}” onto your bookmarks bar">
            ${bookmarkIcon}
            <span>${esc(item.name)}</span>
          </a>
          <button class="ghost-btn" type="button" data-copy="${esc(item.slug)}">
            <svg class="icon" aria-hidden="true"><use href="#i-copy"></use></svg>
            Copy code
          </button>
        </div>
        <p class="featured-hint">Drag this button onto your bookmarks bar. It installs already named. <button class="link-btn" type="button" data-open="${esc(item.slug)}">See it in action</button></p>
      </div>
      ${
        shot?.file
          ? `<button class="featured-shot" type="button" data-open="${esc(item.slug)}" aria-label="See ${esc(item.name)} at work">
              <img src="${esc(shot.file)}" alt="Screenshot of ${esc(item.name)} running on a demo page" loading="lazy">
              <span class="featured-shot-label">See it in action</span>
            </button>`
          : `<div class="featured-side" aria-hidden="true">
              <span class="featured-index">${String(index + 1).padStart(2, "0")}</span>
              <span class="featured-kind">${esc(badgeFor(item.category))}<br>${Math.round(item.bytes / 1024)} KB</span>
            </div>`
      }
    </div>`;
  nodes.featured.hidden = false;
}

function renderChips() {
  const rated = Object.keys(state.votes.tools).length;
  const chips = [
    `<button class="chip" type="button" data-cat="all" aria-pressed="${state.category === "all"}">All <span class="chip-count">${state.items.length}</span></button>`,
    ...state.categories.map(
      (category) => `
      <button class="chip" type="button" data-cat="${esc(category.id)}" aria-pressed="${state.category === category.id}">
        <span class="chip-emoji" aria-hidden="true">${esc(category.emoji)}</span> ${esc(category.label)} <span class="chip-count">${category.count}</span>
      </button>`,
    ),
    `<span class="chip-sep" aria-hidden="true"></span>`,
    `<button class="chip" type="button" data-rated="true" aria-pressed="${state.topRated}" title="Sort by GitHub votes">
      <svg class="icon" aria-hidden="true" style="width:12px;height:12px"><use href="#i-thumb-up"></use></svg>
      Top rated <span class="chip-count">${rated}</span>
    </button>`,
  ];
  nodes.chips.innerHTML = chips.join("");
}

function voteButtons(item) {
  const vote = state.votes.tools[item.slug];
  if (!vote?.url) return "";
  const link = (kind, count, label) => `
    <a class="vote" href="${esc(vote.url)}" target="_blank" rel="noopener" aria-label="${esc(label)} ${esc(item.name)} on GitHub" title="Vote on GitHub — react ${kind} to this tool's comment">
      <svg class="icon" aria-hidden="true"><use href="#i-thumb-${kind === "👍" ? "up" : "down"}"></use></svg>${count ? `<span class="vote-count">${count}</span>` : ""}
    </a>`;
  return `<div class="votes">${link("👍", vote.up, "Thumbs up for")}${link("👎", vote.down, "Thumbs down for")}</div>`;
}

function card(item) {
  const picked = state.picks.has(item.slug);
  const shot = shotFor(item);
  return `
    <article class="card" data-card="${esc(item.slug)}">
      <div class="card-top">
        <span class="card-cat">${esc(badgeFor(item.category))}</span>
        ${voteButtons(item)}
      </div>
      <h3 class="card-title">${esc(item.name)}</h3>
      ${shot?.file ? `<p class="card-desc">${esc(item.description)}</p>` : ""}
      ${
        shot?.file
          ? `<button class="card-shot" type="button" data-open="${esc(item.slug)}" aria-label="See ${esc(item.name)} at work">
              <img src="${esc(shot.file)}" alt="Screenshot of ${esc(item.name)} running on a demo page" loading="lazy" decoding="async">
            </button>`
          : `<button class="card-shot card-shot-blank" type="button" data-open="${esc(item.slug)}" aria-label="Details for ${esc(item.name)}">
              <span class="card-shot-emoji" aria-hidden="true">${esc(item.name.split(" ")[0])}</span>
              <span class="card-shot-desc">${esc(item.description)}</span>
              <span class="card-shot-note">${esc(reasonFor(shot).short)} · no capture</span>
            </button>`
      }
      <a class="install" href="${esc(item.href)}" draggable="true" title="Drag “${esc(item.name)}” onto your bookmarks bar">
        ${bookmarkIcon}
        <span>${esc(item.name)}</span>
      </a>
      <p class="install-hint">Drag onto your bookmarks bar</p>
      <div class="card-actions">
        <button class="text-btn" type="button" data-open="${esc(item.slug)}">Details</button>
        <span class="card-actions-gap"></span>
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
  if (state.topRated) status.push("top rated");
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
  nodes.footerCount.textContent = `${state.items.length} tools, ${state.categories.length} categories`;
}

function renderComposer() {
  const count = state.picks.size;
  nodes.pickCount.textContent = String(count);
  nodes.composer.hidden = count === 0;
  document.body.classList.toggle("has-composer", count > 0);
}

/* Detail view ----------------------------------------------------------- */

const HOW = {
  capture:
    "Run it on the page you want to keep. It may ask the browser for screen, camera or microphone access the first time, and the result is saved straight to your downloads.",
  annotate:
    "It puts a drawing surface over the page. Mark it up, then save or copy the result. Press Escape to cancel without keeping anything.",
  text:
    "It reads the page you run it on, or asks for a value first, then writes the result back to the page, the clipboard or a download.",
  files:
    "It turns what is on your clipboard or in a panel it opens into a downloaded file, and can add or remove a password on a PDF you pick.",
  devtools:
    "It inspects the page you are on — URL, storage, DOM, scripts or console — and shows what it finds in a panel, a new tab or a downloaded file.",
  view:
    "It changes how the page in front of you is shown, or hands its media to a floating player. Run it again or reload to undo.",
  privacy:
    "It rewrites the page in place so the details you do not want to share stay out of a screenshot or screen share. Reload to restore the page.",
};

let detailReturnFocus = null;
let detailOrigin = null;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");
const DETAIL_OPEN = { clipPath: "inset(0px 0px 0px 0px)", opacity: 1 };

function hashSlug() {
  return location.hash.match(/^#t\/(.+)$/)?.[1] ?? null;
}

// Where the panel should grow out of: the card's screenshot when it has one,
// otherwise the card itself, otherwise the featured panel.
function originFor(slug) {
  const key = CSS.escape(slug);
  const card = document.querySelector(`[data-card="${key}"]`);
  const shot = card?.querySelector(".card-shot");
  if (shot?.getBoundingClientRect().width) return shot;
  if (card) return card;
  return document.querySelector(`.featured-shot[data-open="${key}"]`);
}

function clipTo(element) {
  const rect = element?.getBoundingClientRect?.();
  if (!rect || rect.width < 4 || rect.height < 4) return null;
  const top = Math.max(0, Math.round(rect.top));
  const left = Math.max(0, Math.round(rect.left));
  const right = Math.max(0, Math.round(innerWidth - rect.right));
  const bottom = Math.max(0, Math.round(innerHeight - rect.bottom));
  return `inset(${top}px ${right}px ${bottom}px ${left}px)`;
}

// The card grows into the page instead of the page flashing into place. The
// panel is already laid out full screen, so the clip is what moves: no text is
// stretched on the way.
function animateIn(slug, origin) {
  if (REDUCED.matches) return;
  const from = clipTo(origin ?? originFor(slug));
  if (!from) {
    nodes.detail.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: "ease-out" });
    return;
  }
  nodes.detail.animate([{ clipPath: from, opacity: 0.6 }, DETAIL_OPEN], {
    duration: 340,
    easing: "cubic-bezier(0.2, 0.8, 0.25, 1)",
  });
  nodes.detailScroll.animate(
    [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
    { duration: 240, delay: 90, easing: "ease-out", fill: "backwards" },
  );
}

function animateOut(slug, done) {
  if (REDUCED.matches) return done();
  const to = clipTo(detailOrigin ?? originFor(slug));
  if (!to) return done();
  const shrink = nodes.detail.animate([DETAIL_OPEN, { clipPath: to, opacity: 0.4 }], {
    duration: 260,
    easing: "cubic-bezier(0.4, 0, 0.7, 0.3)",
    fill: "forwards",
  });
  nodes.detailScroll.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 160,
    easing: "ease-in",
    fill: "forwards",
  });
  shrink.finished.then(done, done);
}

function fillDetail(item) {
  const shot = shotFor(item);
  const date = new Date(`${item.added}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  nodes.detailCat.textContent = badgeFor(item.category);
  nodes.detailTitle.textContent = item.name;
  nodes.detailDesc.textContent = item.description;
  nodes.detailInstall.setAttribute("href", item.href);
  nodes.detailInstall.setAttribute("title", `Drag “${item.name}” onto your bookmarks bar`);
  nodes.detailInstall.innerHTML = `${bookmarkIcon}<span>${esc(item.name)}</span>`;
  nodes.detailTags.innerHTML = item.tags.map((tag) => `<span class="tag">#${esc(tag)}</span>`).join("");
  nodes.detailMeta.innerHTML = `
    <div><dt>Category</dt><dd>${esc(badgeFor(item.category))}</dd></div>
    <div><dt>Added</dt><dd>${esc(date)}</dd></div>
    <div><dt>Size</dt><dd>${Math.max(1, Math.round(item.bytes / 1024))} KB</dd></div>`;
  nodes.detailHow.textContent = HOW[item.category] ?? HOW.text;
  nodes.detailActions.innerHTML = `
    <button class="ghost-btn" type="button" data-copy="${esc(item.slug)}">
      <svg class="icon" aria-hidden="true"><use href="#i-copy"></use></svg> Copy code
    </button>
    <a class="ghost-btn" href="${esc(item.source)}" target="_blank" rel="noopener">
      <svg class="icon" aria-hidden="true"><use href="#i-arrow"></use></svg> Source file
    </a>
    ${voteButtons(item)}`;

  nodes.detailShot.innerHTML = shot?.file
    ? `<img src="${esc(shot.file)}" alt="Screenshot of ${esc(item.name)} running on a demo page">
       <figcaption>${esc(
         shot.popup
           ? "The tab the tool opened, captured after it ran on the demo page."
           : shot.changed
             ? "The demo page after running the tool."
             : "Run on a demo page. This tool works outside the page, so the page itself looks unchanged.",
       )}</figcaption>`
    : `<div class="detail-shot-empty">
         <span class="detail-shot-emoji" aria-hidden="true">${esc(item.name.split(" ")[0])}</span>
         <p>${esc(reasonFor(shot).long)}</p>
         <p class="detail-shot-note">${esc(reasonFor(shot).short)} · no capture</p>
       </div>`;
}

function openDetail(slug, mode = "push", origin = null) {
  const item = state.items.find((entry) => entry.slug === slug);
  if (!item) return;
  if (!state.detail) {
    detailReturnFocus = document.activeElement;
    detailOrigin = origin;
  }
  state.detail = slug;
  fillDetail(item);
  nodes.detail.hidden = false;
  // A panel reopened mid-close still carries the outgoing shrink, which would
  // otherwise finish and clip the fresh panel to the old card.
  nodes.detail.getAnimations().forEach((animation) => animation.cancel());
  nodes.detailScroll.getAnimations().forEach((animation) => animation.cancel());
  document.body.classList.add("has-detail");
  $("main").inert = true;
  $("footer").inert = true;
  nodes.detailScroll.scrollTop = 0;
  const target = `#t/${slug}`;
  if (mode === "push" && location.hash !== target) history.pushState(null, "", target);
  else if (mode === "replace") history.replaceState(null, "", target);
  if (mode === "push") animateIn(slug, origin);
  nodes.detailClose.focus({ preventScroll: true });
}

function closeDetail() {
  if (!state.detail) return;
  const slug = state.detail;
  state.detail = null;
  document.body.classList.remove("has-detail");
  $("main").inert = false;
  $("footer").inert = false;
  if (hashSlug()) history.replaceState(null, "", location.pathname + location.search);
  detailReturnFocus?.focus?.({ preventScroll: true });
  animateOut(slug, () => {
    // Reopened while the panel was shrinking: this close is stale.
    if (state.detail) return;
    nodes.detail.hidden = true;
    nodes.detail.getAnimations().forEach((animation) => animation.cancel());
  });
}

function stepDetail(delta) {
  if (!state.detail) return;
  const index = state.items.findIndex((entry) => entry.slug === state.detail);
  const next = state.items[(index + delta + state.items.length) % state.items.length];
  openDetail(next.slug, "replace");
  // Stepping through tools keeps the panel where it is; only a card opening
  // gets the grow-from-the-card animation.
  if (!REDUCED.matches) {
    nodes.detailScroll.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
  }
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
    if (chip.dataset.rated) {
      state.topRated = !state.topRated;
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
    state.topRated = false;
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

  document.addEventListener("click", (event) => {
    const copy = event.target.closest("[data-copy]");
    const vote = event.target.closest(".vote");
    const open = event.target.closest("[data-open]");
    const install = event.target.closest("a.install");

    if (copy) return onCopy(copy.dataset.copy);
    if (vote) return toast("Opened GitHub — add 👍 or 👎 to the comment to count your vote.");
    if (open) {
      // Grow from the picture, whichever control was clicked to get here.
      const origin =
        open.closest(".card-shot, .featured-shot") ??
        open.closest(".card")?.querySelector(".card-shot") ??
        open;
      return openDetail(open.dataset.open, "push", origin);
    }
    if (install) {
      event.preventDefault();
      return toast("Drag that button onto your bookmarks bar. A click would run it here, on the catalog.");
    }
    const card = event.target.closest("[data-card]");
    if (card && !event.target.closest("a, button, input, label")) openDetail(card.dataset.card);
  });

  nodes.detailClose.addEventListener("click", closeDetail);
  nodes.detailPrev.addEventListener("click", () => stepDetail(-1));
  nodes.detailNext.addEventListener("click", () => stepDetail(1));

  window.addEventListener("hashchange", () => {
    const slug = hashSlug();
    if (slug) openDetail(slug, "replace");
    else closeDetail();
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
    if (state.detail) {
      if (event.key === "Escape") return closeDetail();
      if (event.key === "ArrowLeft" && !typing) return stepDetail(-1);
      if (event.key === "ArrowRight" && !typing) return stepDetail(1);
    }
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
    const [catalog, votes, shots] = await Promise.all([
      fetch("data/catalog.json", { cache: "no-cache" }).then((response) => response.json()),
      fetch("data/votes.json", { cache: "no-cache" })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
      fetch("data/screenshots.json", { cache: "no-cache" })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
    ]);
    state.items = catalog.items;
    state.categories = catalog.categories;
    if (votes?.tools) state.votes = votes;
    if (shots?.tools) state.shots = shots;
    // ?q= is the search target the structured data advertises.
    const shared = new URLSearchParams(location.search).get("q")?.trim();
    if (shared) {
      state.query = shared;
      nodes.search.value = shared;
      nodes.clearSearch.hidden = false;
    }
    renderAll();
    const slug = hashSlug();
    if (slug) openDetail(slug, false);
  } catch (error) {
    console.error(error);
    nodes.footerCount.textContent = "Catalog unavailable";
    nodes.status.textContent = "Could not load data/catalog.json — serve this folder over HTTP and rebuild with node scripts/build.mjs.";
  }
}

init();
