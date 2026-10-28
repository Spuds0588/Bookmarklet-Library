# AGENTS

Working notes for anyone (human or agent) changing this repo.

## What this is

A static, zero-dependency catalog of bookmarklets. GitHub Pages serves <https://spuds0588.github.io/Bookmarklet-Library/> straight from `main`; there is no server, no build step at runtime and no package dependencies. `node scripts/build.mjs` generates `data/catalog.json`, plus the crawlable blocks inside `index.html`, and those generated files are committed.

## Layout

```
bookmarklets/<category>/<slug>.js   one bookmarklet per file: metadata comment + raw code
bookmarklets/files/<slug>.js        generated Office converters — never edit by hand
bookmarklets/src/tools/<slug>.js    Office converter source: metadata + @parts + startTool
bookmarklets/src/parts/*.js         shared panel, ZIP, XML, DOCX, PDF, RTF, Markdown, HTML, sheets and OpenDocument code
chat.html                           hosted PeerJS chat page opened by the URL chat tool
data/catalog.json                   generated — never edit by hand
data/screenshots.json               generated — screenshot manifest, never edit by hand
screenshots/<slug>.png              generated — one capture per tool, committed
assets/style.css                    the whole theme, monochrome, CSS variables only
assets/app.js                       catalog rendering, search, stars, picks, detail view, export
scripts/build.mjs                   source files -> data/catalog.json + index.html blocks
scripts/compose.mjs                 source parts + tool -> bookmarklets/files/<slug>.js
scripts/shots.mjs                   runs every tool on the demo page, captures screenshots/
scripts/fixtures/demo-page.html     the page tools are photographed against
scripts/fixtures/sample.zip         the archive the Unzip capture opens
scripts/fixtures/make-odf.mjs       writes report.odt and report.ods by hand, never through the converters
tests/zip-tools.test.mjs            ZIP builder and reader tests, run with npm test
tests/office-tools.test.mjs         Office conversion tests, run with npm test
tests/odf-tools.test.mjs            OpenDocument conversion tests, run with npm test
scripts/fixtures/office/…           sample DOCX, XLSX, ODT, ODS, RTF, TXT, MD and CSV inputs
                                    (its REAL-FILES.md says where the three real OpenDocument files came from)
scripts/verify.mjs                  integrity checks (catalog, screenshots)
robots.txt, sitemap.xml             what crawlers read (hand-written)
```

## Adding or changing a bookmarklet

1. Create `bookmarklets/<category>/<slug>.js`. The file starts with the metadata block, then the bookmarklet code exactly as it should run in the page (no `javascript:` prefix, no wrapping).
2. Run `node scripts/build.mjs`, then `node scripts/verify.mjs`.
3. Run `node scripts/shots.mjs <slug> --force` if the tool's effect on the demo page changed.
4. Check it in a browser before committing.

An Office or OpenDocument converter is generated instead. Create `bookmarklets/src/tools/<slug>.js` with the metadata block, a `// @parts ...` line and a `startTool({...})` call, then run `node scripts/compose.mjs`. That writes `bookmarklets/files/<slug>.js`, which `build.mjs` reads. Edit the source, never the generated file. `node scripts/compose.mjs --check` fails when a generated file is stale, and the composer appends the test export at the end so the browser run never sees it.

Metadata fields, all required:

```
/**
 * @name 📸 Tab screenshot
 * @category capture
 * @description Capture the visible tab and download it as a PNG named after the page.
 * @tags screenshot, png, tab
 * @added 2026-10-17
 * @featured false
 */
```

- `@name` starts with an emoji or symbol. It becomes the card title, the install button and the bookmark, so the emoji is what makes a bookmarks bar readable. `build.mjs` refuses a name without one.
- The category must match the folder. Known categories: `capture`, `annotate`, `text`, `files`, `devtools`, `view`, `privacy`. Each category also carries an emoji in `build.mjs`, used on the chips and card labels.
- Exactly one file may set `@featured true`; that tool gets the highlighted panel at the top of the page.
- The description is the card copy. One sentence, concrete, no marketing.
- Tags are searchable, so include the words people would type.
- One tool per job. If two files do the same thing, keep the better one and delete the other — a second name for one job is a second thing to maintain and a second card worth ignoring.
- `@author` and `@credit` are optional and go together. Add both when a tool comes from another developer: keep that developer's name for the card, link to the original page in `@credit`, and keep the original tool name after its emoji. `build.mjs` refuses one without the other, a non-http credit, or a name without an emoji.

## Rules

- **Never commit a browser bookmark export.** `bookmarks*.html` and `.freebuff/` are gitignored. Exports contain personal and employer data.
- **No ARIVE or Wizni tooling.** Anything tied to that LOS, its lender portal, its support site or its user admin does not belong here.
- **Vanilla only.** No frameworks, no CSS library, no runtime dependencies in a bookmarklet. The one exception is `chat.html`, which loads PeerJS from unpkg because WebRTC needs a signalling broker; it is a hosted helper page, not a bookmarklet, and it carries no build step or server of ours. Prefer a one-line solution over an abstraction.
- **Monochrome.** Black and white, hairline borders, square corners, uppercase mono micro-labels. Dark theme is the same palette inverted through CSS variables in `assets/style.css`.
- **The page has no header bar.** It opens on the intro; the theme toggle sits in the intro's top row. Content and the catalog instructions carry the page.
- **Install links are named.** A bookmark dragged out of the page inherits the anchor's text, so the install button is exactly the tool's name — emoji included — with "Drag onto your bookmarks bar" underneath. Never label a drag target "Drag" or "Drag to bookmarks bar"; the bookmark would arrive with that name.
- **Screenshots are captured, not drawn.** `scripts/shots.mjs` runs each tool on `scripts/fixtures/demo-page.html` in headless Chrome and saves `screenshots/<slug>.png` at 1200x750. Never hand-edit a capture or fake one.
- **The demo page carries the hooks a tool looks for**: the ad blocks `.ad-slot` and `.ad-inline`, `.audio-wrapper` around the player, `#toast`, a `<video>` and an `<audio>` clip, an iframe, a form with demo values, a password field, a hidden CSRF field, and demo addresses to find and hide. Add a hook when a tool needs one — `audio-pip` looks for `.audio-wrapper` — because deleting one leaves that tool nothing to work on. A result below the fold gets a `STEPS` scroll so the capture shows it, as **Reveal Hidden Passwords** and **Show Hidden Form Fields** do.
- **A tool that shows its result only after you use it gets driven.** `STEPS` in `shots.mjs` holds real input events per slug — draw a stroke, click an element, type a query, run a snippet, paste an image, scroll a result into view — so the capture shows the result rather than the blank canvas or the invite to start.
- **A window a tool opens is driven too.** `AFTER` holds the steps for a popup the tool opened, run before the capture: a recorder says "ready" until somebody presses start, so it is not photographed until it says "Recording". Buttons are found by their label with `clickText` when the markup has no stable selector, and `STUBS` answers a save-file picker with a writable that goes nowhere, since a native dialog cannot be answered by a headless run.
- **A panel in the page is a shadow root first.** The ZIP tools and the Office converters mount one panel into an open shadow root, then Document Picture-in-Picture, then a popup, then a native alert if popups are blocked. `render` takes the window and root so the same UI works in all three places; pickers, downloads and `showDirectoryPicker` use that window. The host is probed for a known computed style so a page CSP that blocks the panel's styles falls through instead of leaving an invisible overlay. A borrowed window (Document PiP or popup) gets the same probe: `about:blank` inherits the opener's CSP, so when its `<style>` is dropped the panel adopts the CSS as a constructable stylesheet. Because a closed shadow root would be invisible to the capture, both panels are `mode: "open"` and `STEPS` drives their real hidden pickers through `document.getElementById("bl-...-host").shadowRoot`. The Office converters share `bookmarklets/src/parts/ui.js` and are generated into self-contained files; the two ZIP files keep their own copy of `mountPanel` to stay installable on their own.
- **No image beats a misleading image.** A tool whose work never reaches the page — a download, the clipboard, speech, another site, a recording — is recorded in `data/screenshots.json` as a `reason` with no file. The tile then shows the tool's own description with the reason under it, so the space the picture would take still says what the tool does. `REASONS` in `shots.mjs` is that list, and `verify.mjs` fails any entry that has both a file and a reason, neither, or an unknown reason. Every PNG must be named by the manifest.
- **A floating player needs a real display.** A picture-in-picture window is not part of the page surface and headless Chrome has no target for it, so the video and audio players are photographed on a display: `DISPLAY_TOOLS` lists them, `CHECKS` asserts the player really opened, and `node scripts/shots.mjs --display=:99` grabs the screen with ffmpeg (x11grab) instead of the page. Xvfb is enough and needs no root: `docker run -d --name bl-xvfb -v /tmp/.X11-unix:/tmp/.X11-unix alpine:3.20 sh -c 'apk add --no-cache xvfb && exec Xvfb :99 -screen 0 1200x750x24 -ac -nolisten tcp'`, and `docker start bl-xvfb` brings it back once it exists. Chrome is forced to `--ozone-platform=x11` with `WAYLAND_DISPLAY` dropped so it cannot land on the real desktop instead, the page is pinned to its light palette, and a document PiP window is moved into the corner with `Browser.setWindowBounds`. With no display those captures are kept as they are, and a forced run says so. The video player shows a frame because `PREP` starts playback first.
- **A screen recorder still has no image.** `record-tab` records to a file and Chrome paints no indicator for it on a bare display, so it keeps its `display` reason — the copy now says "Records your screen" rather than claiming the catalog cannot photograph a floating window. `grab-text` reads the screen and puts the text on the clipboard, so it carries the `clipboard` reason.
- **Hover is motion, not repaint.** A card lifts off the grid — `translateY(-4px)` and a soft shadow — and every colour on it, including its children's, stays put. Install and copy buttons pop the same way. No hover inverts a card or swaps its palette.
- **Cards open into the page.** Clicking a card, its screenshot or its **Details** button grows that card's rectangle into the full-page view at `#t/<slug>`: the panel animates a clip-path from the card's own rect, so the card you clicked is what becomes the page. **Back** sits at the top-left of the detail bar, and closing shrinks the panel back to the card. Under `prefers-reduced-motion` both directions are a 140 ms fade. The featured panel grows from its thumbnail, not from that tool's card further down the grid.
- **The page is also a document.** The grid is built by `fetch()`, so anything that does not run scripts would see an empty page. `build.mjs` therefore writes two blocks into `index.html` between `<!-- tools:start -->` and `<!-- tools:end -->`: a `<noscript>` list of every tool with its description, and an `ItemList` of `SoftwareApplication` entries. Edit the tool files, never those blocks — `build.mjs --check` fails when they drift. Canonical URL, Open Graph, Twitter cards, `WebSite` and `FAQPage` structured data, `robots.txt` and `sitemap.xml` are hand-written; keep the FAQ text in the page and the FAQ schema saying the same thing. `?q=` preselects the search box because the `SearchAction` advertises it.
- **The author card is one line of markup.** The footer holds `<burns-dev-card layout="full-width"></burns-dev-card>` and the script is loaded once in the head from the shared component URL. Standalone placement is `full-width`; never put the element inside a flex or grid row. Do not restyle its internals — the component owns its look, and a local override forks it.
- **Borrowed work keeps its name and its link.** A community tool uses the original title after the emoji, and `@author`/`@credit` put the developer's name on the card and the original page on both the card and the detail view. The full page also links **Source file**, so the copied code and the upstream work are both visible. The README's community table is the human-readable index; do not drop a name or link when updating one of those tools.
- **Stars are local.** A star is a personal preference in `localStorage` (`bl:stars`), not a shared rating. Starred tools sort to the top of the grid; there is no GitHub reaction, no count file, no account and no server. A star must not change the export picks or the featured tool.
- **Browser tools own their state locally.** Environment origins live in `bl:envs`, the harvested form in `bl:form`, the webhook endpoint in `bl:webhook`, the chosen theme in `bl:theme` and stars in `bl:stars`. Nothing is uploaded. The PII masker must keep its **Restore page** action honest: store the original text and inline filters before changing them, and never apply a new pass on top of an existing one. The webhook tool must try the direct POST and fall back to the clipboard when CSP or CORS blocks it. The form pair skips password and file fields on both sides, and the stamper must dispatch native `input` and `change` events rather than assigning `.value` alone.
- **Hosted windows are still static pages.** `chat.html` is deliberately `noindex`. It derives a room from the query string, elects one host over PeerJS, relays messages through that host, and removes the peer on unload. The room name is a rendezvous key derived from the page URL, not a secret, and the page must not claim otherwise. Keep the PeerJS CDN import here, not in a bookmarklet.
- **Doom is hosted, not embedded.** `bookmarklets/view/doom.js` is a small shadow-root loader for a full-screen iframe; the shareware WAD and WebAssembly engine live in `doom/`, not in the bookmark URL. Keep the loader small, keep `doom/README.md` and its asset hashes current with the files, and keep **Open in tab** because a strict `frame-src` CSP can block the iframe. Closing the panel or `pagehide` must remove the overlay, release the iframe and restore the page's previous `overflow`; no WAD is uploaded. Expose test state only when `globalThis.__BL_TEST__` is set. `doom/` is GPLv2 (Dwasm) plus id's shareware terms; both licenses ship beside the assets.
- **Office converters are deliberately small.** They read `.docx`/`.docm`, `.xlsx`/`.xlsm`, `.odt`, `.ods`, `.html`, `.rtf`, `.txt`, `.md`, `.csv` and `.tsv`; legacy `.doc` and `.xls` are rejected. Word output carries paragraphs, headings, emphasis, links, lists, tables, page breaks and images, not fonts, colours, columns, text boxes, headers, footers, footnotes, comments or tracked changes. PDF output is Helvetica, Latin-1, with simple table grids and images as blocks; the same browser rasterizer handles PNG, JPEG, GIF, BMP, WebP and SVG sources, and links or text wrap around images are not reproduced. Images are embedded when they are data URLs or CORS-readable, and otherwise skipped. HTML and Markdown readers rasterize GIF, BMP, WebP and SVG to PNG before writing Word; RTF keeps only PNG and JPEG. One output downloads directly; two or more stay in the panel for **Save all to folder** (Chrome/Edge) or **Download ZIP**. A batch is capped at 100 files, 100 MB each and 300 MB total. The OpenDocument parts read and write LibreOffice's own packages: styles are resolved through parent styles, spans become covered cells, the page size and margins feed PDF, and output keeps the stored first `mimetype` entry OpenDocument requires. ODF formulas keep their last saved value, dates become ISO text, and encrypted, ZIP64 or split packages are refused by name rather than half-read. `scripts/fixtures/make-odf.mjs` builds the ODT and ODS fixtures with plain XML and Node's zlib, so a fixture is never written by the reader under test; add a fixture there rather than bending a converter.
- **YAGNI.** Add the smallest thing that works; delete what nothing uses.

## Verify before committing

```sh
npm test && node scripts/compose.mjs --check && node scripts/build.mjs && node scripts/verify.mjs && node scripts/build.mjs --check
node scripts/shots.mjs        # only when a tool's on-page effect changed
node scripts/shots.mjs <slug> --force                  # one tool, when it or the fixture changed
node scripts/shots.mjs --display=:99 <slug> --force    # the floating players, with a display running
python3 -m http.server 4173   # then open http://127.0.0.1:4173
# For a browser tool with state, fetch its catalog href, evaluate it on the demo page,
# then assert the real DOM/state transition rather than only the screenshot.
```

`npm test` runs `tests/zip-tools.test.mjs`, `tests/office-tools.test.mjs` and `tests/odf-tools.test.mjs`. All three load the built bookmarklets with `globalThis.__BL_TEST__` set, so their cores run in Node without a panel. The ZIP suite checks archive bytes, limits and extraction. The Office suite builds and reads DOCX, XLSX, PDF and RTF output, including ordered-list restarts, table images and PDF text around an image. The ODF suite reads a LibreOffice `.odt` and `.ods`, writes the same document back out to every target, round-trips hand-built models through the `.odt` and `.ods` writers, and parses a 56 KB OpenOffice manual as it is. The composer appends the test export at the end of each generated file; never add one by hand.

Stop any dev server you started and leave the workspace clean when you are done. Commit in small steps with a message that says why.
