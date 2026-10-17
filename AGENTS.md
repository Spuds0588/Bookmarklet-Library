# AGENTS

Working notes for anyone (human or agent) changing this repo.

## What this is

A static, zero-dependency catalog of bookmarklets. GitHub Pages will serve `index.html` straight from `main`; there is no server, no build step at runtime and no package dependencies. `node scripts/build.mjs` generates `data/catalog.json` and that generated file is committed.

## Layout

```
bookmarklets/<category>/<slug>.js   one bookmarklet per file: metadata comment + raw code
data/catalog.json                   generated — never edit by hand
data/votes.json                     generated — 👍/👎 tally, never edit by hand
assets/style.css                    the whole theme, monochrome, CSS variables only
assets/app.js                       catalog rendering, search, picks, export (vanilla ES module)
scripts/build.mjs                   source files -> data/catalog.json
scripts/votes.mjs                   seeds one comment per tool, counts reactions -> data/votes.json
scripts/verify.mjs                  integrity checks
.github/workflows/votes.yml         nightly reaction tally, commits data/votes.json
```

## Adding or changing a bookmarklet

1. Create `bookmarklets/<category>/<slug>.js`. The file starts with the metadata block, then the bookmarklet code exactly as it should run in the page (no `javascript:` prefix, no wrapping).
2. Run `node scripts/build.mjs`, then `node scripts/votes.mjs --offline`, then `node scripts/verify.mjs`. The vote step adds the new row; the nightly workflow creates its comment.
3. Check it in a browser before committing.

Metadata fields, all required:

```
/**
 * @name Tab screenshot
 * @category capture
 * @description Capture the visible tab and download it as a PNG named after the page.
 * @tags screenshot, png, tab
 * @added 2026-10-17
 * @featured false
 */
```

- The category must match the folder. Known categories: `capture`, `annotate`, `text`, `files`, `devtools`, `view`, `privacy`.
- Exactly one file may set `@featured true`; that tool gets the highlighted panel at the top of the page.
- The description is the card copy. One sentence, concrete, no marketing.
- Tags are searchable, so include the words people would type.

## Rules

- **Never commit a browser bookmark export.** `bookmarks*.html` and `.freebuff/` are gitignored. Exports contain personal and employer data.
- **No ARIVE or Wizni tooling.** Anything tied to that LOS, its lender portal, its support site or its user admin does not belong here.
- **Vanilla only.** No frameworks, no CSS library, no runtime dependencies. Prefer a one-line solution over an abstraction.
- **Monochrome.** Black and white, hairline borders, square corners, uppercase mono micro-labels. Dark theme is the same palette inverted through CSS variables in `assets/style.css`.
- **The page has no header bar.** It opens on the intro; the theme toggle sits in the intro's top row. Content and the catalog instructions carry the page.
- **Install links are named.** A bookmark dragged out of the page inherits the anchor's text, so every draggable anchor is the tool's name and the copy says "drag the name". Never label a drag target "Drag" — the bookmark would arrive with that name.
- **Votes live on GitHub, never in the page.** One comment per tool on the issue titled "Tool votes"; 👍 and 👎 reactions are the ballots. `scripts/votes.mjs` seeds comments and tallies them into `data/votes.json`, and the workflow commits it. No `localStorage` votes, no counter API.
- **YAGNI.** Add the smallest thing that works; delete what nothing uses.

## Verify before committing

```sh
node scripts/build.mjs && node scripts/verify.mjs && node scripts/build.mjs --check
python3 -m http.server 4173   # then open http://127.0.0.1:4173
```

Stop any dev server you started and leave the workspace clean when you are done. Commit in small steps with a message that says why.
