# Bookmarklet Library

**[Open the library →](https://spuds0588.github.io/Bookmarklet-Library/)**

A searchable catalog of small browser tools. Find one that does the job, drag it to your bookmarks bar, click it on any page. Nothing to install, no accounts, no extensions.

114 bookmarklets across seven categories: capture, annotate, text, files, dev tools, view and privacy. Everything is vanilla HTML, CSS and JavaScript served as a static site; the one hosted chat page loads PeerJS from a CDN.

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
| Text | Advanced find, find and replace on inputs, page to Markdown, read aloud, extract emails, table to CSV/Markdown, text-fragment citations, password generation |
| Files | Clipboard to .md/.csv/.txt/.css/.html/.png, PDF lock/unlock, ZIP create/extract, Word/HTML/RTF/TXT/Markdown and Excel/CSV conversion both ways, OpenDocument `.odt`/`.ods` conversion both ways, HTML snippet saver, Loom export |
| Dev tools | URL parameter reports, site map to CSV, local storage export, console monitor, selector recorder, layout and accessibility overlays, environment switcher, form harvester/stamper, webhook dispatcher |
| View | Picture-in-picture for video and audio, phone preview, zoom lens, ad decluttering, sticky-header removal, link highlighting, dark mode, force scroll, presenter spotlight, Jitsi meeting, URL chat, voice commands, Doom |
| Privacy | Redact page text, hide email addresses, blur elements, pixelate a region, hide notification toasts, PII masker |

## Community tools

Thirteen cards are other developers' tools. Their names stay as the authors wrote them, with an emoji added for the bookmarks bar. Each card says **By …** and links that name to the original; the full page puts **Original source** beside **Source file**, so the borrowed work and this repository's readable copy are one click apart.

| Tool | Author | Original |
| --- | --- | --- |
| The "Redactor" (Live Page Editor) | OpenReplay | [5 bookmarklets developers use](https://blog.openreplay.com/5-bookmarklets-developers/) |
| Reveal Hidden Passwords | Hongkiat | [100 useful bookmarklets](https://www.hongkiat.com/blog/100-useful-bookmarklets-for-better-productivity-ultimate-list/) |
| Kill Sticky Headers | Alisdair McDiarmid | [Kill sticky headers](https://alisdair.mcdiarmid.org/kill-sticky-headers/) |
| Training Video Speeder | Community snippet | [HTMLMediaElement.playbackRate](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate) |
| Enable Right-Click & Text Selection | Hongkiat | [100 useful bookmarklets](https://www.hongkiat.com/blog/100-useful-bookmarklets-for-better-productivity-ultimate-list/) |
| Extract All Emails from Page | Community snippet | [MDN regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions) |
| Highlight All Links | Learn JavaScript | [Bookmarklet resources](https://bookmarklet.io/resources) |
| The Layout Debugger (DOM Tinter) | OpenReplay | [5 bookmarklets developers use](https://blog.openreplay.com/5-bookmarklets-developers/) |
| Wireframe Outline Mode | Addy Osmani | [Web development bookmarklets](https://css-tricks.com/web-development-bookmarklets/) |
| Native Hex EyeDropper | Thomas Orlita | [awesome-bookmarklets](https://github.com/ThomasOrlita/awesome-bookmarklets) |
| Instant Dark Mode (Invert Colors) | Thomas Orlita | [awesome-bookmarklets](https://github.com/ThomasOrlita/awesome-bookmarklets) |
| Show Hidden Form Fields | being-frank | [Show hidden form fields](https://gist.github.com/being-frank/62ffe651b07ef27aa525) |
| Display Image Alt Text (A11y Check) | Team A11Y Collective | [Accessibility bookmarklets](https://www.a11y-collective.com/blog/accessibility-bookmarklets/) |

The list also included a local/session storage cleaner. It is not a separate card because **🧹 Clear cookies and cache** already clears both, plus cookies and cache. The community snippets that have no named author are credited to the reference their technique comes from rather than to this repository.

## ZIP tools

**🗜️ Zip files** drops a panel over the page, takes files and folders by drag or by picker, and downloads one standard ZIP. It keeps the folder paths, writes UTF-8 names and uses native `CompressionStream` deflate, falling back to stored entries when compression does not help. A selection is limited to 1 GB and 65,535 entries. The output is ZIP32 with no password and no encryption, and nothing is uploaded.

**📂 Unzip** reads a ZIP's central directory, shows the folder tree, and downloads any file on its own. **Save all to folder** writes the whole tree in one step, keeping the folders, which needs the File System Access API: Chrome or Edge on a secure page. Other browsers keep the individual downloads. The reader refuses encrypted archives, ZIP64, split archives, symbolic links and unsafe paths, and stops at the 4 GB ZIP32 limit. It reads entry names as UTF-8.

Both panels render into an open shadow root over the page. If a page blocks that, they try Document Picture-in-Picture, then a popup; if that is blocked too, a native alert asks you to allow popups for the site. A popup can inherit the page's `style-src`, which drops its `<style>`; the panel then applies its CSS as a constructable stylesheet, which that rule does not cover. On a page whose CSP blocks bookmarklets outright, no bookmarklet runs, these included.

## Office and OpenDocument conversions

Twenty-six tools convert one file or a batch without opening Office or LibreOffice:

| From | To |
| --- | --- |
| Word `.docx` / `.docm` | HTML, TXT, RTF, PDF, Markdown, OpenDocument `.odt` |
| OpenDocument `.odt` | Word `.docx`, HTML, TXT, RTF, PDF, Markdown |
| HTML `.html` / `.htm` | Word `.docx`, OpenDocument `.odt` |
| RTF `.rtf` | Word `.docx`, OpenDocument `.odt` |
| TXT `.txt` | Word `.docx`, OpenDocument `.odt` |
| Markdown `.md` / `.markdown` | Word `.docx`, OpenDocument `.odt` |
| Excel `.xlsx` / `.xlsm` | CSV or TSV, OpenDocument `.ods` |
| OpenDocument `.ods` | CSV or TSV, Excel `.xlsx` |
| CSV / TSV | Excel `.xlsx`, OpenDocument `.ods` |

One output downloads by itself. Two or more outputs stay in the panel with **Save all to folder** (File System Access, Chrome or Edge) and **Download ZIP**; a workbook with several sheets counts as several outputs. A batch is limited to 100 files, 100 MB each and 300 MB in total.

The Word readers carry paragraphs, headings, bold/italic/underline/strike, hyperlinks, bullet and numbered lists, tables, page breaks and images. A table cell keeps its own paragraphs, so a cell holding several lines stays several lines in every target. They do not carry fonts, colours, columns, text boxes, headers, footers, footnotes, comments or tracked changes. DOCX images become data URLs in HTML and Markdown, hex pictures in RTF and rasterized blocks in PDF. Data-URL and CORS-accessible remote images are embedded; relative paths and blocked images are skipped. HTML and Markdown readers rasterize GIF, BMP, WebP and SVG to PNG before writing Word when the browser can draw them. DOCX images keep their format in HTML and Markdown, while RTF keeps only PNG and JPEG.

The OpenDocument side reads and writes `.odt` and `.ods` the way LibreOffice saves them: paragraphs, headings, emphasis, links, bullet and numbered lists, tables with spanned cells, page breaks and images. It reads the document's own styles, so a heading that inherits its bold from a parent style still comes across, and it takes the page size and margins for PDF. Nested lists continue their parent's numbering, and a numeric zero is a value, not an empty cell. Output is a standard package with a stored first `mimetype` entry, a manifest, content, styles and meta parts, and embedded pictures under `Pictures/`. OpenDocument formulas keep their last saved value, dates become ISO text in CSV, and formatting, colours, columns, text boxes, headers, footers, footnotes, comments, charts and tracked changes are not carried. Encrypted, ZIP64 and split packages are refused rather than half-read.

The PDF writer uses the Helvetica family, Latin-1 text, the DOCX page size and margins, simple table grids and images as blocks without text wrap. It rasterizes images through the browser, so PNG, JPEG, GIF, BMP, WebP and SVG sources can be drawn. Unsupported characters are replaced and counted. Links, headers, footers and text wrap around images are not reproduced. Legacy `.doc` and `.xls` files are not read; save them as OOXML first. Nothing is uploaded.

## Present, meet and chat

**🔦 Focus Spotlight presenter** dims the page except a circle that follows the pointer. Right-click toggles the dimming, `[` and `]` resize the circle, and Esc exits.

**📹 1-Click Jitsi Meeting** makes a random room on `meet.jit.si`, copies the join link and opens a 640×480 pop-up. It needs no account; if the browser blocks the pop-up, the link is offered in a prompt instead.

**🔒 URL-Anchored Secret Chat** hashes the page's origin and path into a room name and opens the hosted [chat.html](chat.html) page. The page uses PeerJS and WebRTC, picks a host when the room is empty, and relays messages through that host. Anyone who knows the page URL can derive the room; the name is a rendezvous key, not a password. Messages are ephemeral and the hosted page is `noindex`. It needs a network connection to the public PeerJS broker and CDN; there is no server of ours.

**🎙️ Voice Macro Commander** uses the browser's speech recognition for `scroll down`, `scroll up`, `top`, `bottom`, `submit`, `clear`, `refresh` and `stop`. It needs a microphone permission and a browser that provides `SpeechRecognition` (Chrome and Edge do; Firefox and Safari do not). The badge can be paused or closed.

## Tables, citations and demos

**📊 Table to CSV / Markdown** highlights tables as the pointer moves and opens a panel after one is clicked. It expands row and column spans, pads short rows, and copies RFC 4180 CSV or a GFM table. It does not read CSS grids.

**🔗 Deep Fragment Citation Linker** turns the selected passage into a Markdown quote with a `#:~:text=` link, the page title and the local date. Selections are capped at 500 characters.

**🕶️ Demo PII & Sensitive Data Masker** replaces terms, email addresses and optional regular expressions in the page's text, with an optional blur on the matching elements. **Restore page** puts the original text back. The edit is in memory only; a reload also discards it.

## Forms, environments and webhooks

**📋 Form Harvester** writes the current form's labels, names, types and values to `localStorage` under `bl:form` and to the clipboard. Password and file fields are skipped, hidden fields are kept, and the panel lists what it found.

**🧾 Form Stamper** reads that JSON, or one pasted into the panel, lets you edit and deselect fields, then fills the matching fields. Matching tries the saved selector, ID, name, label, placeholder and finally position. It uses the native value setter and dispatches `input`, `change` and `blur`, so React and Vue forms notice the change. Passwords are never filled.

**🏗️ Environment & Route Switcher** keeps the current path, query and hash while changing only the origin. Production, staging and local origins live in `localStorage` under `bl:envs`; each must be a valid http(s) origin before its **Go** link is enabled.

**📮 Context Webhook Dispatcher** builds a small JSON body from the page URL, title, selected text and metadata, then POSTs it to a webhook. If the site's `connect-src` CSP or the endpoint's CORS policy blocks the request, it copies the same payload to the clipboard. The endpoint URL is stored under `bl:webhook`; nothing else is saved.

## Doom

**💥 Will it run Doom?** is a 19 KB raycaster, not a WAD player. It draws a 16×16 room at 320×200, renders walls and billboard imps, fires a hitscan pistol, and synthesizes the pistol, imp and E1M1 audio with Web Audio. `WASD` or the arrow keys move and turn, Space or a click fires, `M` toggles music, and Esc tears down the overlay, listeners, animation frame and audio context. It needs no network request, WAD, WASM or WebGL. There are three imps and no mobile controls.

## Tests

```sh
npm test
```

`tests/zip-tools.test.mjs` loads both ZIP bookmarklets in a VM with only their test exports and Node's web APIs. It builds archives and checks the central directory, deflate and stored entries, folder paths, UTF-8 names, duplicate names, size and entry caps; then reads them back, including data descriptors, duplicate paths, encrypted flags, ZIP64, split archives, symlinks, unknown methods, unsafe paths, and CRC failures with partial-folder cleanup. File System Access is exercised through an in-memory directory handle.

`scripts/fixtures/make-odf.mjs` writes `report.odt` and `report.ods` with plain XML and Node's own zlib, so the fixtures never come from the readers they test. The two files from LibreOffice and OpenOffice are kept as they were saved.

`tests/odf-tools.test.mjs` covers the OpenDocument converters: an `.odt` written by LibreOffice (headings, inherited run styles, links, lists, a table with a spanned header) read into the model; the same document out to HTML, Markdown, RTF, TXT and PDF; an `.ods` with typed cells, dates and booleans out to CSV, TSV and XLSX; CSV, XLSX and hand-built models back into `.odt` and `.ods`, including flat-list grouping, covered cells and embedded pictures; the package layout OpenDocument requires; the wrong-format, encrypted, ZIP64 and truncated rejection paths; and two real files from LibreOffice and OpenOffice — a character-style sample and a 56 KB manual with 21 tables and 40 lists — parsed as they are.

`tests/office-tools.test.mjs` builds and reads DOCX, XLSX, PDF and RTF output in Node: Word paragraphs, headings, lists, tables and images; HTML/Markdown/RTF/TXT to Word; CSV quoting; Excel sheet export; ordered-list restarts; table images; and PDF text in a paragraph that also carries an image. It also covers the cases real documents raise: a row that starts in a later column, a table row inside a content control, a cell with several paragraphs, a big Chinese RTF run, two RTF table rows, and an RTF picture with nested blip groups. Node has no canvas, so the PDF tests assert the skipped-image path; the image path is checked in Chrome.

## Add your own

For a normal tool, create `bookmarklets/<category>/<slug>.js` with a metadata comment, then rebuild:

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
node scripts/verify.mjs    # parses every tool, checks hrefs and screenshots
```

The name must start with an emoji: it becomes the card title, the install button and the bookmark in someone's bar. If the tool comes from another developer, add `@author` and `@credit` together; the card and detail page link the credit, and the name stays as the original author wrote it.

An Office or OpenDocument converter is generated instead. Create `bookmarklets/src/tools/<slug>.js` with the same metadata plus a `// @parts ...` line, run `node scripts/compose.mjs`, and edit the source rather than `bookmarklets/files/<slug>.js`. Shared readers and writers live in `bookmarklets/src/parts`, with the ODF ones in `odf.js`, `ods.js`, `odt-out.js`, `ods-out.js` and `odf-package.js`. `node scripts/compose.mjs --check` fails if a generated file is stale.

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

Tools whose work never reaches the page get no image at all. Instead the manifest records why, and the tile shows the tool's own description with the reason underneath: **Saves a file** (14 tools), **Copies to clipboard** (4), **Opens another site** (5), **Opens a browser prompt** (3), **Works outside the page** (5), **Records your screen** (1), plus reads aloud, reloads the page and needs a certain page. A screenshot of an untouched demo page would be worse than no screenshot, and a blank tile would say less than the sentence the tool already carries.

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

The page fetches `data/catalog.json` and `data/screenshots.json`, so serve the folder over HTTP rather than opening `index.html` from disk.

## Stars

A star is a personal shortcut, not a public rating. Star a tool and it sorts to the top of the catalog in this browser; the list stays in that order across reloads. Stars live in `localStorage` under `bl:stars`, so there is no account, no shared tally, no backend and nothing to moderate. Clearing this site's storage clears them.

The star changes the grid order only. It does not change which tools a search matches, the export picks or the featured tool.

## The published site

The catalog is served from `main` by GitHub Pages at <https://spuds0588.github.io/Bookmarklet-Library/>. There is no build action: `data/catalog.json` and `data/screenshots.json` are committed and the page fetches them.

Search engines get real markup rather than the rendered grid. `node scripts/build.mjs` writes two generated blocks into `index.html` between `<!-- tools:start -->` and `<!-- tools:end -->`: a `<noscript>` list of every tool with its description, and an `ItemList` of `SoftwareApplication` entries. `scripts/build.mjs --check` fails if those blocks, or the catalog, have drifted from the tool files. The rest of the head — canonical URL, Open Graph and Twitter cards, `WebSite` and `FAQPage` structured data — is hand-written, as are `robots.txt` and `sitemap.xml`.

`?q=markdown` preselects the search box, which is the target advertised in the `SearchAction` structured data. Tool views deep-link as `#t/<slug>`.

## Repository layout

```
index.html                     the catalog page and the full-page detail view
assets/style.css               theme (light and dark, same monochrome palette)
assets/app.js                  search, filters, stars, picks, detail view, bookmark export
bookmarklets/<category>/*.js   one file per tool, code plus metadata
bookmarklets/src/tools/*.js    source for the generated Office converters
bookmarklets/src/parts/*.js    shared panel, ZIP, DOCX, PDF, RTF, Markdown, HTML and OpenDocument code
scripts/compose.mjs            source parts + tool -> bookmarklets/files/<slug>.js
data/catalog.json              generated catalog the page reads
data/screenshots.json          generated screenshot manifest the page reads
screenshots/<slug>.png         one capture per tool
scripts/fixtures/…             the demo page and media clips tools are captured against
scripts/fixtures/make-odf.mjs  writes report.odt and report.ods by hand, never through the code under test
scripts/fixtures/office/…      sample DOCX, XLSX, ODT, ODS, RTF, TXT, MD and CSV inputs, three of them real files from other apps (see its REAL-FILES.md)
tests/zip-tools.test.mjs       ZIP builder and reader tests
tests/office-tools.test.mjs    Office conversion tests
tests/odf-tools.test.mjs       OpenDocument conversion tests
scripts/build.mjs              builds the catalog
scripts/shots.mjs              runs tools in headless Chrome, captures screenshots
scripts/verify.mjs             integrity checks
robots.txt, sitemap.xml        what crawlers read
```

## Notes

- Stars are stored in this browser and sort starred tools to the top; there is no account, no shared count and no tracking.
- Bookmarklets run with the permissions of the page you click them on. Clipboard, camera and screen tools ask the browser first.
- Raw browser bookmark exports are gitignored and are never part of this repository.
