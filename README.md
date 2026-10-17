# Bookmarklet Library

A searchable catalog of small browser tools. Find one that does the job, drag it to your bookmarks bar, click it on any page. Nothing to install, no accounts, no extensions.

60 bookmarklets across seven categories: capture, annotate, text, files, dev tools, view and privacy. Everything is vanilla HTML, CSS and JavaScript served as a static site.

## Use it

1. Show your bookmarks bar: `⌘ + Shift + B` on a Mac, `Ctrl + Shift + B` elsewhere.
2. Drag a tool's **Drag** handle up onto the bar.
3. Click the bookmark while you are on the page you want it to act on.

Prefer keyboard or want to install a whole set at once? Search or filter, tick the tools you want with **Pick**, then **Download bookmarks.html**. The file holds a folder per category nested under "Bookmarklet Library" — import it from your browser's bookmark manager and the whole set lands in the bar in one go.

If dragging is blocked, use **Copy** and paste the code into a new bookmark's URL field.

## What is in the catalog

| Category | Examples |
| --- | --- |
| Capture | Tab screenshot, tab screenshot with annotation, OCR a screen region, record tab/camera/audio |
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
 * @name Page to Markdown
 * @category text
 * @description Convert the page content to Markdown and download it.
 * @tags markdown, convert, export
 * @added 2026-10-17
 * @featured false
 */
```

```sh
node scripts/build.mjs     # writes data/catalog.json
node scripts/verify.mjs    # parses every tool, checks hrefs and metadata
```

See [AGENTS.md](AGENTS.md) for the full conventions (no runtime dependencies, monochrome theme, no vendor-specific tooling).

## Run it locally

```sh
python3 -m http.server 4173
# open http://127.0.0.1:4173
```

The page fetches `data/catalog.json`, so serve the folder over HTTP rather than opening `index.html` from disk.

## Repository layout

```
index.html                     the catalog page
assets/style.css               theme (light and dark, same monochrome palette)
assets/app.js                  search, filters, picks, bookmark export
bookmarklets/<category>/*.js   one file per tool, code plus metadata
data/catalog.json              generated catalog the page reads
scripts/build.mjs              builds the catalog
scripts/verify.mjs             integrity checks
```

## Notes

- Thumbs are stored in your browser only; there is no backend. See [TODO.md](TODO.md).
- Bookmarklets run with the permissions of the page you click them on. Clipboard, camera and screen tools ask the browser first.
- Raw browser bookmark exports are gitignored and are never part of this repository.
