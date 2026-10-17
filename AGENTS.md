# AGENTS

Working notes for anyone (human or agent) changing this repo.

## What this is

A static, zero-dependency catalog of bookmarklets. GitHub Pages will serve `index.html` straight from `main`; there is no server, no build step at runtime and no package dependencies. `node scripts/build.mjs` generates `data/catalog.json` and that generated file is committed.

## Layout

```
bookmarklets/<category>/<slug>.js   one bookmarklet per file: metadata comment + raw code
data/catalog.json                   generated — never edit by hand
assets/style.css                    the whole theme, monochrome, CSS variables only
assets/app.js                       catalog rendering, search, picks, export (vanilla ES module)
scripts/build.mjs                   source files -> data/catalog.json
scripts/verify.mjs                  integrity checks
```

## Adding or changing a bookmarklet

1. Create `bookmarklets/<category>/<slug>.js`. The file starts with the metadata block, then the bookmarklet code exactly as it should run in the page (no `javascript:` prefix, no wrapping).
2. Run `node scripts/build.mjs`, then `node scripts/verify.mjs`.
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
- **YAGNI.** Add the smallest thing that works; delete what nothing uses.

## Verify before committing

```sh
node scripts/build.mjs && node scripts/verify.mjs && node scripts/build.mjs --check
python3 -m http.server 4173   # then open http://127.0.0.1:4173
```

Stop any dev server you started and leave the workspace clean when you are done. Commit in small steps with a message that says why.
