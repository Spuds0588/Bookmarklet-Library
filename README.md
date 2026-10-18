# Bookmarklet Library

**[Open the library →](https://spuds0588.github.io/Bookmarklet-Library/)**

A searchable catalog of small browser tools. Find one that does the job, drag it to your bookmarks bar, click it on any page. Nothing to install, no accounts, no extensions.

59 bookmarklets across seven categories: capture, annotate, text, files, dev tools, view and privacy. Everything is vanilla HTML, CSS and JavaScript served as a static site.

## Use it

1. Show your bookmarks bar: `⌘ + Shift + B` on a Mac, `Ctrl + Shift + B` elsewhere.
2. Drag a tool's **button** up onto the bar. Every tool has a button named after it, emoji and all, so the bookmark arrives named and ready. There is nothing to rename.
3. Click the bookmark while you are on the page you want it to act on.

Click any card to open it full page: a screenshot of the tool at work on a demo page, what it does, and the same install button.

Prefer keyboard or want to install a whole set at once? Search or filter, tick the tools you want with **Pick**, then **Download bookmarks.html**. The file holds a folder per category nested under "Bookmarklet Library" — import it from your browser's bookmark manager and the whole set lands in the bar in one go.

If dragging is blocked, use **Copy** and paste the code into a new bookmark's URL field.

## What is in the catalog

| Category | Examples |
| --- | --- |
| Capture | Tab screenshot, OCR a screen region, record tab/camera/audio, Loom links |
| Annotate | Screenshot markup (arrows, boxes, numbered steps), freehand draw |
| Text | Advanced find, find and replace on inputs, page to Markdown, read aloud, password generation |
| Files | Clipboard to .md/.csv/.txt/.css/.html/.png, HTML snippet saver, Loom export |
| Dev tools | URL parameter reports, site map to CSV, local storage export, console monitor, selector recorder |
| View | Picture-in-picture for video and audio, phone preview, zoom lens, ad decluttering, force scroll |
| Privacy | Hide email addresses, blur elements, pixelate a region, hide notification toasts |

## Add your own

Create `bookmarklets/<category>/<slug>.js` with a metadata comment, then rebuild:

```
/**
 * @name 📝 Page to Markdown
 * @category text
 * @description Convert the page content to Markdown and download it.
 * @tags markdown, convert, export
 * @added 2026-10-17
 * @featured false
 */
```

```sh
node scripts/build.mjs     # writes data/catalog.json
node scripts/verify.mjs    # parses every tool, checks hrefs, votes and screenshots
```

The name must start with an emoji: it becomes the card title, the install button and the bookmark in someone's bar.

See [AGENTS.md](AGENTS.md) for the full conventions (no runtime dependencies, monochrome theme, no vendor-specific tooling).

## Screenshots

Captures are taken by running each tool on `scripts/fixtures/demo-page.html` in Chrome, and only the tools that show their result get one.

```sh
npm run shots            # capture anything missing
npm run shots -- --force # recapture everything
npm run shots -- markup hide-emails --force   # recapture named tools
```

The script needs Chrome on `PATH` (or `CHROME=/path/to/chrome`). It writes `screenshots/<slug>.png` and `data/screenshots.json`.

Tools that only make sense once you have used them are driven with real input first — a stroke drawn on the page, an element picked to blur, a search typed into the find bar, a snippet run in the JS console, a region redacted with the pixelate picker, a screenshot pasted into the annotation editor — so the capture shows the result rather than the blank canvas.

Tools that open a window are driven there too: the camera and audio recorders are photographed while recording, not sitting at "ready".

Tools whose work never reaches the page get no image at all. Instead the manifest records why, and the tile shows the tool's own description with the reason underneath: **Saves a file** (12 tools), **Copies to clipboard** (3), **Opens another site** (3), **Records your screen** (1), plus reads aloud, reloads the page, needs a certain page and works outside the page. A screenshot of an untouched demo page would be worse than no screenshot, and a blank tile would say less than the sentence the tool already carries.

Picture-in-picture windows live on the display rather than in the page, so the video and audio players are captured with a display running. Xvfb is enough and needs no admin rights, since it can start in a container:

```sh
docker run -d --name bl-xvfb -v /tmp/.X11-unix:/tmp/.X11-unix alpine:3.20 \
  sh -c 'apk add --no-cache xvfb && exec Xvfb :99 -screen 0 1200x750x24 -ac -nolisten tcp'
npm run shots -- --display=:99 --force video-pip audio-pip web-zoom-pip
```

Each of those runs asserts the floating player really opened before the image is kept, and a capture run without a display leaves the three images alone rather than deleting them.

Run captures only when a tool's on-page effect changes — the images are committed, so recapturing everything rewrites a few megabytes.

## Run it locally

```sh
python3 -m http.server 4173
# open http://127.0.0.1:4173
```

The page fetches `data/catalog.json` and `data/votes.json`, so serve the folder over HTTP rather than opening `index.html` from disk.

## Votes

Thumbs up and down are real, shared counts with no server behind them. One comment per tool lives on the issue titled **Tool votes**; a 👍 or 👎 reaction on that comment is a vote. Clicking a thumb opens the comment on GitHub, where you add the reaction.

`.github/workflows/votes.yml` runs nightly (and on demand): it creates any missing comments, counts the reactions, and commits `data/votes.json`. The page reads that file. Reactions do not fire workflow events, so counts can be up to a day behind.

```sh
GITHUB_TOKEN=<token with issues:write> node scripts/votes.mjs   # seed and tally now
node scripts/votes.mjs --offline                                # add rows for new tools, no network
```

## The published site

The catalog is served from `main` by GitHub Pages at <https://spuds0588.github.io/Bookmarklet-Library/>. There is no build action: `data/catalog.json`, `data/votes.json` and `data/screenshots.json` are committed and the page fetches them.

Search engines get real markup rather than the rendered grid. `node scripts/build.mjs` writes two generated blocks into `index.html` between `<!-- tools:start -->` and `<!-- tools:end -->`: a `<noscript>` list of every tool with its description, and an `ItemList` of `SoftwareApplication` entries. `scripts/build.mjs --check` fails if those blocks, or the catalog, have drifted from the tool files. The rest of the head — canonical URL, Open Graph and Twitter cards, `WebSite` and `FAQPage` structured data — is hand-written, as are `robots.txt` and `sitemap.xml`.

`?q=markdown` preselects the search box, which is the target advertised in the `SearchAction` structured data. Tool views deep-link as `#t/<slug>`.

## Repository layout

```
index.html                     the catalog page and the full-page detail view
assets/style.css               theme (light and dark, same monochrome palette)
assets/app.js                  search, filters, picks, detail view, bookmark export
bookmarklets/<category>/*.js   one file per tool, code plus metadata
data/catalog.json              generated catalog the page reads
data/votes.json                generated vote tally the page reads
data/screenshots.json          generated screenshot manifest the page reads
screenshots/<slug>.png         one capture per tool
scripts/fixtures/…             the demo page and media clips tools are captured against
scripts/build.mjs              builds the catalog
scripts/votes.mjs              seeds vote comments, counts reactions
scripts/shots.mjs              runs tools in headless Chrome, captures screenshots
scripts/verify.mjs             integrity checks
.github/workflows/votes.yml    nightly vote tally
robots.txt, sitemap.xml        what crawlers read
```

## Notes

- Votes are GitHub reactions tallied by a workflow; there is no backend and no tracking.
- Bookmarklets run with the permissions of the page you click them on. Clipboard, camera and screen tools ask the browser first.
- Raw browser bookmark exports are gitignored and are never part of this repository.
