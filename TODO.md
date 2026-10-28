# TODO

## Before flipping the repo public

- [x] Repo is public and GitHub Pages serves `main`, root folder, at <https://spuds0588.github.io/Bookmarklet-Library/>. No build action is needed; `data/catalog.json` is committed.
- [x] Page is crawlable without JavaScript: `build.mjs` writes a `<noscript>` tool list and `ItemList` structured data, with a canonical URL, Open Graph, Twitter cards, `WebSite` and `FAQPage` schema, `robots.txt` and `sitemap.xml`.
- [ ] Open the published URL once and repeat the smoke test: search, chip filter, theme toggle, drag one tool, download a two-tool `bookmarks.html`.
- [x] Confirm every ARIVE/Wizni tool was left out (`npm run verify` enforces this).
- [ ] Scan `README.md` and the page copy after publishing, in case a screenshot or URL is more revealing than intended.

## Screenshots

- [x] One capture per tool that shows its result (81 today) in `screenshots/`, taken by `scripts/shots.mjs` in Chrome against `scripts/fixtures/demo-page.html`.
- [x] Tools that need using before they show anything are driven with real input first: a stroke on the draw surface, an element picked to blur, a query typed into the find bar, a snippet run in **JS runner**, a region redacted with **Pixelate a section**, an image pasted into the annotation editor, a click recorded by the action recorder. The camera and audio recorders are driven inside the window they open until they say they are recording.
- [x] Tools whose work never reaches the page get no image and a reason instead (35 today): download, clipboard, records your screen, another site, reads aloud, reloads, needs a certain page, opens a browser prompt, works outside the page. A screenshot of an untouched page was worse than no screenshot.
- [x] **Zip files** and **Unzip** are photographed with their panels populated: the capture run sets a sample folder tree on the ZIP builder's hidden folder picker and opens a sample archive in the ZIP browser, both through the open shadow root.
- [x] The eleven Office converters are photographed with their panels populated and a batch selected. The captures show the bulk panel; a single output downloads directly and is described in the card.
- [x] The fifteen OpenDocument converters are photographed the same way, against the `.odt` and `.ods` fixtures the demo server hands their pickers. The read cards show a converted batch of two documents; the ODS cards show one workbook, which is already several outputs when it has several sheets.
- [x] Thirteen community bookmarklets carry `@author`/`@credit` and show **By …** on the card plus **Original source** on the detail page. Their original titles are kept after the emoji. The list's local/session storage cleaner is not a separate card because **🧹 Clear cookies and cache** already does that job.
- [x] **The floating players are photographed on a real display.** Xvfb had no root approval, so it runs in a container instead: `docker run -d --name bl-xvfb -v /tmp/.X11-unix:/tmp/.X11-unix alpine:3.20 sh -c 'apk add --no-cache xvfb && exec Xvfb :99 -screen 0 1200x750x24 -ac -nolisten tcp'`, then `node scripts/shots.mjs --display=:99 --force video-pip audio-pip web-zoom-pip`. **Video PiP**, **Audio player in PiP** and **Web Zoom in PiP** all ship a capture now, each one asserting the player really opened first.
- [x] **Record current tab** and **Grab text from screen** cannot be photographed even with a display: the recorder runs to a file with Chrome painting no indicator on a bare display, and the OCR tool's result is clipboard text. They keep their `display` and `clipboard` reasons. The `display` copy now reads "Records your screen".
- [ ] **Two captures churn on every run**: `excalidraw-room.png` (a third-party app rendering live) and `system-info.png` (it prints the moment it ran), so a full recapture always shows a diff. Either freeze what can be frozen or stop treating those two as stable.
- [ ] Re-run `node scripts/shots.mjs <slug> --force` whenever a tool's effect on a page changes. Captures are committed, so they only rot if a tool is edited and the shot is forgotten.
- [ ] Consider a `--check` mode on `scripts/shots.mjs` for CI, comparing a fresh capture against the committed PNG.

## Tests

- [x] `npm test` covers the ZIP builder and browser cores through `tests/zip-tools.test.mjs`: standard container bytes, folder paths, UTF-8 names, stored and deflated entries, data descriptors, duplicate names, size and entry limits, encrypted/ZIP64/split/symlink/unsafe-path rejection, and CRC failure cleanup.
- [x] `tests/office-tools.test.mjs` covers the eleven conversions: DOCX/HTML/RTF/TXT/Markdown in and out, Excel/CSV both ways, ordered-list restarts, table images, RTF numbered markers and PDF text around an image.
- [x] `tests/odf-tools.test.mjs` covers the fifteen OpenDocument conversions: a LibreOffice `.odt` (inherited run styles, a link, lists, a table with a spanned header) and `.ods` (typed cells, dates, booleans) read in; the same document out to HTML, Markdown, RTF, TXT and PDF; CSV, XLSX and hand-built models back into `.odt` and `.ods` with flat-list grouping, covered cells and embedded pictures; the required package layout; the wrong-format, encrypted, ZIP64 and truncated rejections; and two real files from LibreOffice and OpenOffice parsed as they are.
- [x] A manual browser pass clicked **Create ZIP**, checked the downloaded archive, downloaded one entry, and wrote a whole folder through a stubbed directory picker. Both fallback triggers were exercised with a real borrowed window: shadow mounting forced to fail, and a page CSP that dropped the shadow styles, each with a substituted Document PiP window. The popup after an unavailable PiP was exercised too, which caught the inherited `style-src` dropping its styles until the panel adopted a constructable stylesheet.
- [ ] Turn that browser pass into an automated test, so the panel-to-API wiring is checked by CI rather than by hand.
- [ ] Open the generated ODT and ODS in desktop LibreOffice once. The current checks read the packages back with the project's own reader, a second reader in the test, and Python's `zipfile`, not a desktop suite.
- [ ] Check **Save all to folder** on Firefox and Safari; both should fall back to **Download ZIP**, and that fallback has only been reasoned about, not clicked.
- [x] Check a legacy `.doc` or `.xls` gives the intended rejection message in the panel: both now say to save as `.docx` or `.xlsx` and try again.

## Phase 2 browser tools (2026-10-28)

- [x] **📊 Table to CSV / Markdown** clicks a real table, expands spans and copies CSV or GFM. Browser check: the demo table produced 5 rows and 3 columns, both formats, and the panel's copy path was exercised.
- [x] **🔦 Focus Spotlight presenter**, **📹 1-Click Jitsi Meeting**, **🔒 URL-Anchored Secret Chat**, **🎙️ Voice Macro Commander** and **🔗 Deep Fragment Citation Linker** are on the cards and live. Jitsi and chat are external/popups; voice was driven with a substituted `SpeechRecognition`; the citation was checked for a `#:~:text=` URL and local date.
- [x] **🕶️ Demo PII & Sensitive Data Masker** masks terms, emails and regexes, optionally blurs matching elements, and restores the page. Browser check: 6 nodes masked, restore returned the original header and addresses, and an invalid regex stayed in the panel.
- [x] **🏗️ Environment & Route Switcher** keeps path, query and hash, validates origins and stores three under `bl:envs`. Browser check: a valid origin produced the right URL; `ftp://` disabled the link; a click saved the mapping.
- [x] **📋 Form Harvester** and **🧾 Form Stamper** exchange JSON, skip passwords, and fire native input/change/blur events. Browser check: 4 harvested fields, 4 filled, hidden field retained, password absent, events observed.
- [x] **📮 Context Webhook Dispatcher** POSTed to a local CORS receiver and copied the payload when the request failed. Invalid schemes stay in the panel.
- [x] **💥 Will it run Doom?** opens actual shareware Doom Episode 1, not a raycaster. The 6.7 KB loader frames the hosted [doom/](doom/index.html) page in a centered window; **Expand** fills the browser, **Open in tab** covers pages that block frames, and **Close** removes the overlay. Opening does not focus the iframe or canvas. The game starts frozen behind a **Click to play** gate; Play resumes it and asks for pointer lock. The page pauses on blur, tab hide and pointer-lock loss, and drops wheel and absolute mouse input while the pointer is free, so it never turns or queues a shot from a released mouse. `prboomX.cfg` is the engine's default config plus `movement_mouselook 1`, passed with `-config`, so the mouse also tilts the view up and down. Esc is handled once, inside the iframe: it pauses, releases the pointer and does nothing while paused. It never reaches the engine menu, and the loader does not close on it; **Close** and **Open in tab** end the session. F1–F10 and Pause are captured too, so the save, load, options and help menus never open. A one-line controls legend sits under the window and the fuller key list sits under Play. Closing posts a release to the iframe and restores the previous page focus and scroll. The first load is about 7 MB; later loads use the cache.
- [x] **URL chat is a real two-tab test.** Two pages on the same room elected a host, exchanged messages both ways, and no longer echoed a guest's message back to itself. The hosted page is `noindex`.
- [x] **👾 Neon Hell** is a self-contained neon bullet-hell arena in a 960×600 shadow-root window, filed under the new **🎮 Games** category with **💥 Will it run Doom?**. `WASD` or arrows thrust with low-drag drift, the mouse aims, hold the left button to fire. Chasers, ricocheting drifters and splitting grunts scale with the session clock. Random `R`, `W`, `S`, `B` and `C` pickups drift, last eight seconds and appear every 14–22 seconds: rapid fire, spread, a one-hit shield, a bomb charge and chain rounds. `Space` spends a bomb charge on a 220 px blast; chain kills throw three bouncing shards. The header carries only status and controls, with `ARENA 01` under the score. Esc pauses and gives the page back, F expands, and Close removes every listener and node. The best score is local to the origin under `NEON_HELL_HS`; a blocked `localStorage` leaves an in-memory score. Headless Chrome: a 300 ms thrust reached 248 px/s; after release the ship glided 49 px in the next 300 ms and 80 px over 900 ms; rapid plus spread fired six bullets in 130 ms; a shield absorbed a hit without losing a life; a pickup was 19 px across, moved 13.6 px in 250 ms, lasted eight seconds and expired; a Space bomb consumed its charge and removed a neighbouring enemy; the chain effect threw three depth-1 shards and one bounced off a wall with its bounce count decremented; pause, resume, expand, best score, restart and close all behaved.
- [ ] Neon Hell has no touch controls, no sound and no high-score table. It has been played in Chrome only; Firefox and Safari are untested. The later multiplayer-bookmarklet experiments mentioned in the planning notes are not started.
- [ ] Test the URL chat with three guests, a host leaving mid-room, and Firefox/Safari. The current pass covered two tabs and the host handoff path only by code review.
- [ ] Doom has no touch controls. A phone or tablet needs a keyboard and mouse (or an external one); Dwasm's optional touch layer is not enabled here. It also needs WebAssembly and network access for the first load. A page with a strict `frame-src` CSP can block the window; **Open in tab** is the fallback.
- [ ] The phase 2 document's runtime builder/registry idea was not adopted: these tools configure in their own panel or exchange JSON, because the catalog has no build-at-runtime step. Revisit only if a builder earns its keep.
- [ ] The URL chat depends on the public PeerJS broker and CDN. If that service is unavailable, the hosted page says so; there is no fallback signalling server.

## QR code (2026-10-28)

- [x] **🔳 QR code** opens a shadow-root panel with the page URL, regenerates on input, and reports version, module count and UTF-8 byte count. It encodes Q error correction and offers Download PNG (about 1000 px), Download SVG, Copy PNG and Copy SVG. The PNG clipboard path was exercised in Chrome; the SVG image write succeeded there, and the text-markup fallback covers browsers that refuse SVG image data. Esc closes and restores focus.
- [ ] Check both copy buttons in Firefox and Safari on a secure page. Chrome only so far; the fallback is reasoned about rather than clicked in those browsers.
- [ ] Scan the downloaded PNG and SVG with a phone camera and a desktop scanner. The matrix was decoded locally with jsQR, but no physical scanner pass has been done.

## Nice to have, only if it earns its place

- [x] Shareable search: `?q=markdown` preselects the box, the target advertised in the `SearchAction` schema. Tool views deep-link as `#t/<slug>`.
- [ ] Carry the category in the URL too (`?q=markdown&cat=text`) so a filtered view can be linked as one thing.
- [ ] A search that also matches emoji, so typing `📸` finds the capture tools.
- [ ] Keyboard flow for picking tools (`J`/`K` to move, `Space` to pick) once the catalog grows.
- [ ] A CI workflow that runs `npm run verify` and `npm run check` on pull requests.
- [ ] Validate the structured data with Google's Rich Results test and the Open Graph card with each network's debugger once the site is live.
- [ ] Include `AGENTS.md` guidance in the rendered page as a "how to add a tool" link for contributors.

## Housekeeping

- [ ] Re-check the export parser against a future Chrome bookmark export, since the importer script was a one-off and is not kept in the repo.
- [ ] When tools get meaningfully changed, use `@added` for the newest tool and keep the featured flag on the one worth showing off.
