# TODO

## Before flipping the repo public

- [x] Repo is public and GitHub Pages serves `main`, root folder, at <https://spuds0588.github.io/Bookmarklet-Library/>. No build action is needed; `data/catalog.json` is committed.
- [x] Page is crawlable without JavaScript: `build.mjs` writes a `<noscript>` tool list and `ItemList` structured data, with a canonical URL, Open Graph, Twitter cards, `WebSite` and `FAQPage` schema, `robots.txt` and `sitemap.xml`.
- [ ] Open the published URL once and repeat the smoke test: search, chip filter, theme toggle, drag one tool, download a two-tool `bookmarks.html`.
- [x] Done on the published URL on 2026-11-03: 122 cards with their badge rows, `#t/webmcp-bridge` chips and install href, and search for `offline` (97) and `sensitive-safe` (104). The chip filter, theme toggle, drag and export in the line above are still unexercised.
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
- [x] **👾 Neon Hell** is a Geometry Wars inspired neon bullet-hell arena entirely contained in one bookmarklet, in a 960×600 shadow-root window, filed under the new **🎮 Games** category with **💥 Will it run Doom?**. It opens paused with **CLICK TO PLAY** and does not focus the canvas or lock page scroll; the page keeps its mouse and keys until the arena is clicked. `WASD` moves with low-drag drift, arrows aim in eight directions, `Space` fires, `X` drops a banked bomb, and the mouse or left button still aim and fire. A standard gamepad is detected silently: left stick moves, right stick aims and auto-fires, B/X bombs, Start pauses or resumes. Chasers, ricocheting drifters and splitting grunts scale with the session clock. Random `R`, `W`, `S`, `B`, `C` and `M` pickups drift, last eight seconds and appear every 14–22 seconds: rapid fire, spread, a one-hit shield, a bomb charge, chain rounds and ten seconds of mortar rounds. `M` mortar shots fire slowly, pass through ships and detonate at 250 px in an 82 px, three-damage AOE. `Space` fires, `X` spends a bomb on a 220 px blast, and chain kills throw three bouncing shards. A boss enters at 40 seconds and another 50 seconds after each spawn, in random order; the Prism Warden, Helix Core and Hive Mother mix two larger shapes, add health per boss, show a health bar under the score and fire rings, spirals, aimed fans or micro-chasers. Esc pauses and gives the page back, F expands, and Close removes every listener and node. The best score is local to the origin under `NEON_HELL_HS`; a blocked `localStorage` leaves an in-memory score. Headless Chrome: the ready gate left focus on the page link, page overflow untouched and Space unhandled; click started it, focused the canvas and hid page overflow; Space fired four bullets in 420 ms with no bomb spent; ArrowLeft switched aim and the next bullet had `vx -620`; Esc paused, released focus to BODY and left paused keys unhandled. A stubbed standard gamepad was detected, left stick produced `vx 280`, right stick gave `dy -1` and three `vy -620` bullets, and Start paused then resumed. Mortar travel measured 114 px at 320 ms, then detonated with one blast, killed an hp-3 target and scored. A boss spawned as HELIX CORE with `r 42`, `hp 72`, sides `[6,4]` and 22 shots at 3.6 seconds; killing it cleared `G.boss` and added 3,200, and the next random boss was HIVE MOTHER with `hp 88`.
- [ ] Neon Hell has no touch controls, no sound and no high-score table. Gamepad support has been driven with a stubbed standard mapping, not physical hardware. Its 67 KB install URL is above Firefox's 64 KB bookmark limit, so that browser needs a shorter build or selective URI encoding. It has been played in Chrome only; Firefox and Safari are untested. The later multiplayer-bookmarklet experiments mentioned in the planning notes are not started.
- [ ] Test the URL chat with three guests, a host leaving mid-room, and Firefox/Safari. The current pass covered two tabs and the host handoff path only by code review.
- [ ] Doom has no touch controls. A phone or tablet needs a keyboard and mouse (or an external one); Dwasm's optional touch layer is not enabled here. It also needs WebAssembly and network access for the first load. A page with a strict `frame-src` CSP can block the window; **Open in tab** is the fallback.
- [ ] The phase 2 document's runtime builder/registry idea was not adopted: these tools configure in their own panel or exchange JSON, because the catalog has no build-at-runtime step. Revisit only if a builder earns its keep.
- [ ] The URL chat depends on the public PeerJS broker and CDN. If that service is unavailable, the hosted page says so; there is no fallback signalling server.

## Preview downloads (2026-11-03)

- [x] **📄 Preview downloads** takes over clicks on image, video, audio, PDF, text and Office links with a capture-phase listener and shows the file in a shadow-root panel: media and images by URL, PDFs in an iframe, CSV/npm-style text in a `<pre>`, and a Save/Open note for Office formats.
- [x] The panel names the file from `Content-Disposition` or the path, reports kind and size, and offers Download, Open in tab and Close. Esc, the backdrop and Close revoke the object URL.
- [x] Fallbacks are Document PiP then a pop-up when the overlay cannot mount; links it cannot render keep their normal download.
- [x] `tests/preview-downloads.test.mjs` covers classification, name parsing and size labels; `shots.mjs` clicks the demo CSV so the capture shows a real preview.
- [ ] Cross-origin files without CORS headers are shown from their link but cannot be saved from the panel. A range-request or redirect reader could close that.
- [ ] Office files get no preview at all. Converting them needs a parser far past the 64 KB bookmark limit, so they stay a Save/Open card.

## QR code (2026-10-28)

- [x] **🔳 Create QR code** opens a shadow-root panel with the page URL, or a web URL found on the clipboard, regenerates on input, and reports version, module count and UTF-8 byte count. It encodes Q error correction and offers Download PNG (about 1000 px), Download SVG, Copy PNG and Copy SVG. The PNG clipboard path was exercised in Chrome; the SVG image write succeeded there, and the text-markup fallback covers browsers that refuse SVG image data. Esc closes and restores focus.
- [x] Ink and Paper colour pickers and a transparent background, with the checkerboard preview and inline contrast or surface hint. Low contrast and transparency never disable a download.
- [x] Clipboard-first prefill keeps the page URL when the clipboard has no web URL. The successful path was exercised in Chrome with a clipboard stub: the page URL stayed for non-URL text and a refused read.
- [ ] Exercise the real clipboard permission prompt, a denied read and a non-URL clipboard in Chrome, Edge, Firefox and Safari. The browser harness had no focused document, so the successful read used a stub rather than the OS clipboard.
- [ ] Check both copy buttons in Firefox and Safari on a secure page. Chrome only so far; the fallback is reasoned about rather than clicked in those browsers.
- [ ] Scan the downloaded PNG and SVG with a phone camera and a desktop scanner, including a coloured code and a transparent code on light and dark surfaces. The matrices were decoded locally with jsQR, but no physical scanner pass has been done.
- [x] The install URL is 59,972 characters (60.0 KB), under Firefox's 65,536-character limit. The centre-logo picker was removed to make room; colour and transparency stayed.

## QR screen reader (2026-10-28)

- [x] **🔎 Scan QR from screen** asks for a display stream before opening the hosted reader, freezes the frame, dims it and takes a drag selection. The crop is padded, capped at 1600 px and sent to the reader with `postMessage`; nothing is uploaded. The reader offers Open in this page, Open in a new tab and Copy, and only enables the open actions for http(s) results. Esc and Cancel clean up the overlay; a blocked reader is retried when the selection ends.
- [x] The reader uses a bundled jsQR 1.4.0 (Apache-2.0) build, tries inverted and upscaled passes, and ships its license. Five Node tests decode URL, inverted and UTF-8 matrices and reject a blank image.
- [x] Headless Chrome: the stubbed screen stream was selected and cropped, the popup decoded `https://example.com/field-guide` as a 31-character QR v3 code, the open actions enabled, and Copy, Open in a new tab and Open in this page each ran and showed their success note. The capture is committed and the manifest marks it as a popup.
- [ ] The headless run fakes the display stream, so the real `getDisplayMedia` picker, a denied permission, a cancelled picker and a blocked reader window still need a Chrome, Edge, Firefox and Safari pass. The tool now asks for capture before it opens the reader to keep the click activation; confirm the reader still opens while the picker is up in each browser.
- [ ] Open in this page sent its message and the bookmarklet acknowledged it, but the external sample URL was not followed to the end. Confirm the opener actually navigates, and that Open in a new tab lands on the URL, in a real browser.
- [ ] Read a real phone-screen QR, a dark-mode inverted code and a long text code. The fixture is a 260 px generated SVG, not a photograph or a screen.
- [ ] Force the no-`adoptedStyleSheets` overlay fallback and try a page with a strict `style-src`. The fallback is implemented but has not been exercised in a browser.

## Bulk media downloads (2026-11-01)

- [x] **🖼️ Download all images**, **🎬 Download all videos**, **🎧 Download all audio** and **📥 Download all linked files** share one composed scan/save part. Each opens a shadow-root panel that lists the URLs the page already holds: `img`/`picture` sources, `srcset`, lazy-load attributes and social preview tags for images; `video`/`audio` with their `source` fallbacks for media; anchors with `download` or a file extension for linked files. `.m3u8`/`.mpd` playlists are tagged and skipped, and duplicates are removed by URL.
- [x] **Save all to folder** asks with `showDirectoryPicker`, writes up to four files at a time, picks the start folder by kind and probes existing names so it numbers (`report-2.pdf`) rather than overwrites. **Download each** is the fallback when the picker is missing. A CORS-blocked file becomes **Blocked** with an **Open** link instead of a silent failure; files over 600 MB and stream playlists are counted as skipped.
- [x] The shared core is covered by Node tests: each tool's selector set, URL dedupe, MIME/extension classification, stream detection, `srcset` with a data URL, unsafe and long names, and numbered collision names.
- [ ] Exercise the real folder picker, write into a folder with an existing name, and a folder the user cancels, in Chrome and Edge. The browser harness stubs the picker.
- [ ] Check the **Download each** fallback and the multiple-download prompt in Firefox and Safari, which have no File System Access API.
- [ ] Large videos are buffered in memory before writing, capped at 600 MB. Streaming straight to the file handle would need a different write loop and has not been built.
- [ ] HLS/DASH, encrypted media, canvas drawings, CSS background images and players fed by JavaScript are out of scope; the panel says so rather than guessing at segments.
- [ ] No physical test of a site with dozens of images or a Content-Disposition filename that disagrees with the URL name; the URL name wins.

## Drive this page (WebMCP bridge, 2026-11-02)

- [x] **🕸️ WebMCP bridge** opens a hosted companion hub, connects to the page that opened it, indexes up to 30 visible controls and drives clicks, typing and selects from validated JSON actions. Password and file inputs are excluded.
- [x] The target checks the hub origin and its popup source; the hub checks `window.opener`; every later message carries a 128-bit token. `HALT`/`ARM` implement Kill, `TARGET_HELLO` reclaims a named hub after a reload, and closing the hub re-arms on the next click.
- [x] The hub prefers Chrome's built-in Prompt API and offers SmolLM2 360M, Qwen2.5 0.5B or Llama 3.2 1B through WebLLM only when `requestAdapter()` returns an adapter. Runs are capped at 12 steps and stop on an unusable reply, a failed action or the same move three times.
- [x] Node tests cover validation, token shape, prompt trimming, engine detection, bookmarklet origin/token/kill gates and cleanup. A local Chrome run verified the handshake, 20 indexed controls, a typed action, a two-step test-engine run, Kill and recovery, and close-and-relaunch.
- [x] The connected hub is captured at 1200x750 and committed.
- [x] Because Gemini Nano sits behind `chrome://flags`, a missing Prompt API is reported as a setup step: both switches are named and Chrome's Prompt API notes are linked, on the setup page and under the engine note. `modelSetup()` in `webmcp/engine.js` holds the list and a Node test pins it.
- [ ] Load a real local model and run a task end to end. The verification browser exposed no built-in model and no WebGPU adapter; Chrome 156 on localhost reported Gemini Nano downloadable during the capture, but its weights were not downloaded, and the flags were never turned on.
- [x] Handshake with the deployed cross-origin hub from a normal page: a `127.0.0.1:4173` page connected to `spuds0588.github.io/Bookmarklet-Library/webmcp/`, logged the connection, and delivered its 20-control map with the password field excluded. Closing the hub cleared the session and its IDs, and the next click reconnected with a fresh hub.
- [x] The hub pop-up itself was attached with the DevTools pipe and driven from a scripted engine: `live` badge, 19 controls, one real `type` step that changed the mapped input and fired a single `input` event, then `done`. Kill mid-run set `halted`, delivered exactly one `HALT`, and the next action was refused with “The hub's kill switch is on.”
- [x] Renamed to **🤖 Drive this page** so the label says what it does. The file, hub directory and capture keep the `webmcp-bridge` slug.
- [x] A page that publishes WebMCP tools is now driven through them: the handshake carries up to 12 tool names, schemas and annotations, and `EXEC_TOOL` runs one through `document.modelContext.executeTool()`. Pages without tools keep the scraped control map.
- [x] `node scripts/shots.mjs --webmcp-probe [--tools] [--kill] [--prompts] [--hub=prod]` drives a whole run without a model: scripted decisions, a real hub window, and a WebMCP-shaped `document.modelContext` installed by `--tools` so the page-tool path runs here. The first runs caught the hub not passing `session.tools` into the prompt and a system prompt written only for control ids; both are fixed.
- [ ] The probe's `--tools` stub is shaped like the documented API, not Chrome's implementation, and no weights ran — so the wording is checked for shape, not for whether a real model follows it. A run in a Chrome with WebMCP switched on is still the missing half.
- [ ] A COOP-isolated page and a page that blocks the pop-up are still untested; the harness ran with `--disable-popup-blocking` and Chrome opened the hub without a click gesture, so that branch never ran.
- [ ] The harness that attached to the pop-up lives in `/tmp` and is not committed. If this check earns its keep, teach `scripts/shots.mjs` a probe mode for it rather than adding a second browser driver.
- [ ] Exercise a select, a checkbox and a React/Vue-controlled form. Typing was verified against the demo form's native input event.
- [ ] Bring the 8 KB bookmarklet down to the 3 KB prototype target by moving re-arm bookkeeping into the hub or minifying at build time, without losing the readable source.

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
