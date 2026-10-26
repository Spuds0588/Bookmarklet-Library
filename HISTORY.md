# HISTORY

What has been done, in order. Newest entries first.

## 2026-10-26 — PDF passwords join the library

**Changed**

- **🔒 Lock PDF** and **🔓 Unlock PDF** are in the catalog under Files, copied as built from the standalone PDF password bookmarklet project. Lock writes an AES-256 R6 copy with the password used for both the user and owner passwords; unlock removes RC4 40/128, AES-128 or AES-256 protection and asks for the password only when an empty user password does not open the file. Both download `<name>-locked.pdf` or `<name>-unlocked.pdf` and never upload the document.
- The two files are 18,962 and 18,971 bytes of code. The catalog's `encodeURIComponent` install URLs are 27,945 and 27,972 characters, the longest in the library; the standalone project's own page uses minimal encoding and stays near 21.8 KB.
- Files now covers PDFs as well as clipboard downloads. The category blurb reads "Clipboard, PDFs, snippets and exports" and the Files "how it works" note says the tool can add or remove a PDF password, instead of implying everything starts on the clipboard.
- Neither tool gets a capture: the result is a downloaded file behind a dialog, so both are in the manifest with the `download` reason and the card says **Saves a file · no capture**. The counts are now 61 tools, 36 screenshots, 25 tools explained without one, and 61 vote rows.

**Verified**

- `build → votes --offline → shots lock-pdf unlock-pdf → verify → build --check` exits 0: 61 bookmarklets, 61 vote rows, 36 screenshots, 25 tools explained without one.
- Browser check at `http://127.0.0.1:4173`: 61 cards, the Files chip reads 12, both cards show their description with **Saves a file · no capture**, both detail views open with the right name, description, tags, size, added date and install button, and searching `pdf` returns exactly the two tools.
- Both catalog URLs were run on the page with `plain.pdf`: **Lock PDF** downloaded `plain-locked.pdf` (4,607 bytes, `/Encrypt` present), **Unlock PDF** downloaded `plain-locked-unlocked.pdf` (3,693 bytes, `/Encrypt` absent, 114 bytes from the original), and unlocking the locked file with a wrong password left no download and reported "That password didn't work." The standalone project's 28 tests pass.

**Limits**

- Both tools need a secure context for Web Crypto: HTTPS, localhost, or a local file in Chrome. On a plain HTTP page the tool refuses with a message saying so.
- The PDF is rebuilt rather than patched, so existing digital signatures become invalid and the file size can change slightly.
- The install URLs are about 28 KB of characters. Chrome accepted them; a browser or bookmark manager with a smaller URL cap was not tested.

## 2026-10-18 — The catalog is published, and it reads like a document

**Changed**

- The library is live: the repo is public and GitHub Pages serves `main` at <https://spuds0588.github.io/Bookmarklet-Library/>. The README opens with that link instead of burying it in setup notes.
- Every tool without a capture now puts its own description in the picture slot, with the reason underneath — **Saves a file · no capture**, **Copies to clipboard · no capture**. The 23 explained tiles were a dashed box with an emoji and two words; they now say what the tool does in the space a screenshot would take, and the card drops the sentence above the tile so nothing is said twice. The detail view keeps its description where it was and the panel keeps the longer explanation.
- The page got a real head: canonical URL, Open Graph and Twitter cards with a 1200x750 capture, a theme colour for each palette, `WebSite` and `FAQPage` structured data, `robots.txt` and `sitemap.xml`.
- Search engines and answer engines no longer get an empty grid. `build.mjs` writes a `<noscript>` list of all 59 tools grouped by category, each with its description, plus an `ItemList` of `SoftwareApplication` entries, into `index.html` between markers. `build.mjs --check` now fails if either the catalog or those blocks have drifted, so the crawlable copy cannot go stale.
- Four questions answered on the page itself — what a bookmarklet is, how to install one, whether it needs an extension or account, and whether it is safe — with the same four answered in `FAQPage` schema.
- `?q=markdown` preselects the search box. The structured data advertises that URL as the site search, so it had to exist.
- The author card is in the footer: one `<burns-dev-card layout="full-width">` element and the shared component script loaded once, so credit is a single edit point.

**Verified**

- `build → verify → build --check` exits 0: 59 bookmarklets, 59 vote rows, 36 screenshots, 23 tools explained without one. Running `build.mjs` twice leaves `index.html` byte-identical.
- In a browser: canonical, Open Graph and Twitter tags present with absolute URLs; all three JSON-LD blocks parse as JSON and the `ItemList` counts 59 items; the four FAQ answers render; `?q=markdown` loads with the box filled and the grid filtered; the 23 captureless cards show their description and reason; the author element mounts; no console errors.

**Limits**

- The hash detail routes (`#t/<slug>`) are one URL to a crawler, so per-tool pages are not indexed — the `ItemList` is what carries them.
- No Rich Results or social-card debugger run yet; both need the deployed URL and are listed in `TODO.md`.

## 2026-10-18 — The catalog moves, and the tools that were only described get photographed

**Changed**

- The hero no longer explains the install gesture. The title, the catalog instructions and the install hint already do; the paragraph was three sentences of the same thing above the fold.
- Cards stopped inverting on hover. A hovered or keyboard-focused card now lifts off the grid — `translateY(-4px)` with a soft shadow — and keeps every colour it had, including its screenshot, description and install button. The install and copy buttons pop the same way instead of swapping their fill. Chips, text buttons and icon buttons keep their existing border and label treatment.
- Clicking a card now grows that card into the full-page view instead of flashing a panel over the page. The panel animates a `clip-path` from the clicked element's own rectangle to the viewport, so the layout is full-screen the whole time and no text is stretched on the way; the content fades in just behind it. Closing shrinks it back to the same card, then hides the panel and returns focus. The featured panel grows from its thumbnail. Under `prefers-reduced-motion` both directions are a 140 ms colour fade, and prev/next cross-fade instead of growing from a card that is off screen.
- The detail's close button became a **Back** button at the top-left, with a back arrow and the tool's category beside it. Previous and next stay at the right.
- **Tab screenshot + annotate** was deleted: **Screenshot markup** does the same job — capture, crop, arrows, boxes, numbers, labels — with a better editor, and two cards for one job is one card too many. The catalog is 59 tools.
- **JS Runner** is captured running: a snippet is typed into its floating console, **Run Code** is pressed with a real click, and the demo page's heading shows the line it ran. `clickText` was added to the harness because the console's buttons carry no ids.
- Two tools that were declared unphotographable now have honest images. **Pixelate a section** and **Generate password** were photographed before their own feedback existed: the pixelate overlay takes a second to build and its redaction toast lasts three, and the password tool's toast was gone by the time the old 850 ms wait ended. Both are driven now, so the redaction toast and the "Password generated & copied to clipboard" toast are what the capture shows.
- **Record camera** and **Record audio** are photographed mid-recording. `AFTER` runs steps inside the window a tool opens — the camera gets **Start Recording** pressed, the audio recorder gets a microphone chosen and **2. Start Recording** pressed. The audio recorder asks for a save file before it will start, so `STUBS` hands `showSaveFilePicker` a writable that goes nowhere; a native picker cannot be answered by a headless run.

**Verified**

- `build → verify → build --check` exits 0: 59 bookmarklets, 59 vote rows, 36 screenshots, 23 tools explained without one.
- The opening animation was recorded through a `Element.prototype.animate` wrapper in headless Chrome with reduced motion off: the first frame's clip is the card's rect (`inset(365px 939px 382px 97px)` for a card at 97,366 against a 1280x900 viewport), the animation is still running at 117 ms with intermediate insets, and the panel ends at `inset(0px)`. Closing starts one animation, clears `#t/<slug>`, hides the panel and puts focus back on the card's screenshot.
- Hover was checked with a real pointer move: `transform: matrix(1,0,0,1,0,-4)`, the shadow applied, background still transparent and text still `rgb(11,11,11)` — motion, no repaint.
- The detail bar was checked at 1280x900: **Back** renders at x=40, y=16 in mono micro-label type, previous/next at x=1048. The old close button's X icon is gone from the bar.
- Captures were read back with OCR: **JS Runner** shows `JS Runner ran this line` on the page with the snippet in its console and the Run Code button; **Pixelate a section** shows its redaction toast; **Generate password** shows its confirmation toast; **Record camera** shows `Recording...`; **Record audio** shows `00:01` and `Stop Recording`.
- A capture run with nothing to do reports *"nothing to capture — 59 tools already up to date"* and writes a manifest without the deleted tool's row.

**Limits**

- The recorder captures are the recorder window's own document at 1200x750, the size every page capture uses. On a desktop that window is much smaller, so the image shows the interface with more empty black than a person would see.
- **Record current tab** and **Grab text from screen** still have no image: the recorder paints no indicator anywhere, and the OCR tool's result is clipboard text.
- The three display-only captures are still only as fresh as the last run with a display; nothing in CI regenerates them.

## 2026-10-18 — The floating players are photographed on a real display at last

**Changed**

- **Video PiP**, **Audio player in PiP** and **Web Zoom in PiP** now ship captures. They were the tools the catalog could only apologise for: a picture-in-picture window is not part of the page surface, and headless Chrome hands out no target for it, so the shot came back byte-identical whether the player was floating or not. With `--display=:99` the harness drives headed Chrome on a display and grabs the screen with ffmpeg's x11grab instead of the page.
- Xvfb was needed for that display and `apt-get install -y xvfb` still has no approval, so the display runs in a container, mounted through `/tmp/.X11-unix`: `docker run -d --name bl-xvfb -v /tmp/.X11-unix:/tmp/.X11-unix alpine:3.20 sh -c 'apk add --no-cache xvfb && exec Xvfb :99 -screen 0 1200x750x24 -ac -nolisten tcp'`. No root, no packages on the host, and the display is 1200x750 to match the capture size.
- Chrome is forced to `--ozone-platform=x11` and `WAYLAND_DISPLAY` is dropped for display runs, because the first attempt picked the desktop's Wayland session instead of the display it was handed. `Emulation.setEmulatedMedia` pins the page to its light palette in both paths — the fixture follows `prefers-color-scheme`, so the first display captures came back dark.
- A document picture-in-picture window opens at `0,0` and hides the page, and Chrome sizes it at 80% of the screen whatever the tool asks for. It is a DevTools target of its own, so `Browser.setWindowBounds` moves it into the corner Chrome uses for the video player, leaving the page visible around it. The video player is not a target and needs no help.
- Each display capture asserts the player really opened (`CHECKS`: `document.pictureInPictureElement.videoWidth`, `documentPictureInPicture.window.innerWidth`) before its image is kept, and `PREP` starts the media first so the floating player shows a frame rather than a poster.
- **Record current tab** was driven on the display to see whether Chrome paints anything: it does not. The recorder starts (its 1x1 keep-alive element lands on the page, so `getDisplayMedia` and `MediaRecorder` ran) and the screen is unchanged to the pixel, in an app window and in a tabbed one, with tab capture and whole-screen capture alike. It keeps the `display` reason and its copy now says **Records your screen** instead of claiming a floating window cannot be photographed. **Grab text from screen** moves to the `clipboard` reason, since the OCR text is the result.
- `audio-pip` looks for `.audio-wrapper` and the demo page never had one, so the tool alerted on a page with a perfectly good audio element. The fixture now wraps the player; that is the one hook it was missing.
- `--force` with no display used to strip the three display captures and delete their files. It now keeps them and says so in its notes.

**Verified**

- Pixel checks on the three new captures: the video one is a light page with the player in the bottom-right corner showing a decoded frame; the audio one shows Chrome's 960x600 window with the player and its controls inside; the zoom one shows the dark `#222` player carrying the page's header container. In all three the page is visible around the floating window, and the page strip reads light (#fbfaf8), not the dark palette the first attempt produced.
- A full forced headless recapture of the other 32 changed only `advanced-find.png`, which the fixture's new wrapper had shifted and which is now stable across runs. `excalidraw-room.png` and `system-info.png` differ on every run (a third-party app and the clock) — recorded in `TODO.md` rather than papered over.
- A capture run with no display reports *"nothing to capture — 60 tools already up to date"*, keeps the 35 captures, and explains the three it kept.
- `npm run verify` passes: 60 bookmarklets, 60 vote rows, 35 screenshots, 25 tools explained without one. The chain `build → verify → build --check` exits 0.

**Limits**

- The three display captures are only as fresh as the last run that had a display. Nothing regenerates them in CI, and a tool whose window behaviour changes will not be noticed by a run without one.
- The floating players are 80% of the screen wide because that is Chrome's own size for a document PiP window, so the page around them is a thin frame. Hiding the rest is the browser's choice, not a crop.

## 2026-10-17 — Captures now show results, and tools that leave the page get none

**Changed**

- Screenshots were taken 850 ms after a tool ran, which is honest but shallow: a drawing surface was photographed blank, a picker before the pick, an annotation editor showing "Paste Image Here". `scripts/shots.mjs` now drives real input first, per tool: **Draw on page** gets a stroke dragged across the page, **Blur an element** picks the ad block and blurs it, **Advanced find** types a query into its own field, **Screenshot markup** has the page's screenshot pasted into it, **Record actions** records a click.
- Tools whose work never touches the page no longer ship a picture of an untouched page. They get a reason in `data/screenshots.json` and the card and detail view say what happened: download, clipboard, floating window, another site, reads aloud, reloads, needs a certain page, works outside the page. 32 tools have captures; 28 are explained without one.
- A tab a tool opens is now captured after it finishes loading, plus 1.5 s, so Excalidraw, Scratchpad, the URL parameter reports and system info show their real interface instead of a spinner.
- A capture run with nothing to do no longer starts Chrome at all, and a run for named tools no longer orphans the other captures — that bug deleted 40+ committed PNGs once, which `git checkout` undid.
- `verify.mjs` now fails an entry that has both a file and a reason, neither, or an unknown reason key, and fails any PNG in `screenshots/` that the manifest does not name.

**Verified**

- Pixel-level checks against a fresh rendering of the demo page: the draw-on-page stroke reads as a diagonal band of changed pixels between the drag points (the same path on the untouched page is blank), the blur-picker capture leaves the ad block unreadable to OCR, the markup capture changes nearly the whole viewport as the editor takes over with the pasted image, and the advanced-find capture shows the query typed with matches. The record-actions capture contains the recorder panel, with its red stop button present in the pixels.
- **Pixelate a section** was going to get a drag step too; its redacted image goes to the clipboard and it leaves no visible result, so it is now in the reason list instead.
- OCR of all 32 captures finds no loading or spinner state left anywhere.
- `npm run verify` passes: 60 bookmarklets, 60 vote rows, 32 screenshots, 28 tools explained without one. Re-running the capture reports "nothing to capture — 60 tools already up to date" and changes nothing.

**Not verified**

- The display path for the floating-window tools (`--display=:99`, Xvfb, ffmpeg x11grab) is written and the fallback is exercised — with no display the five tools keep the `display` reason and the run says so — but the capture path itself has never run, because installing Xvfb needs admin approval and both prompts timed out. It is untested code, not a working feature, until someone installs Xvfb and checks the five captures.

## 2026-10-17 — Emoji names, install buttons, captured screenshots, full-page tool view

**Changed**

- Every tool now carries an emoji in `@name` (60 files) and every category carries one in `build.mjs`. The emoji rides along wherever the name goes: card titles, install buttons, the bookmark that lands in someone's bar, and the exported `bookmarks.html`. `build.mjs` refuses a `@name` that does not start with one.
- Cards and the featured panel now show a dedicated install button — the tool's name, emoji included — with "Drag onto your bookmarks bar" underneath, instead of a draggable title. Clicking the button no longer runs the bookmarklet on the catalog page; it tells you to drag it.
- Cards open. Clicking a card, its screenshot or **Details** opens a full-page view of that tool: a screenshot of it at work, the description, tags, size, added date, the install button with its direction, and a short "how it works" note per category. The view is a link (`#t/<slug>`), scrolls on its own, keeps the page behind it inert, and steps through the catalog with the arrow keys.
- New capture harness: `scripts/shots.mjs` drives headless Chrome over the DevTools pipe (no dependencies) and runs every tool on `scripts/fixtures/demo-page.html`, a fake field guide with form fields, an ad, a notification, real video and audio, an iframe and a live theme query. It saves `screenshots/<slug>.png` and `data/screenshots.json`, recording whether the demo page visibly changed, whether the shot came from a tab the tool opened, and the capture size.

**Verified**

- 60 screenshots captured at 1200x750. 23 change the demo page in place, 12 come from a tab the tool opened (recorders, scratchpad, URL reports, local storage, Excalidraw, iFrame to new tab), and the remaining 25 download a file, rewrite links, write to the clipboard or take over the screen, so the page looks untouched — the detail view says exactly that rather than implying a no-op.
- Checked the captures by eye and by OCR: `Replace text on page` really rewrites demo to DEMO on the page, `Hide email addresses` leaves the addresses gone, `Screenshot markup` shows its toolbar over the page, `Hide ads` and `Replace ads` leave placeholder boxes where the ad blocks were, `Toggle light / dark` flips the whole page, `Hide notifications` removes the toast.
- Browser run: 60 cards, 60 named install buttons (each one's text equals its card title), 35 thumbnails and 25 "works outside the page" tiles, clicking a card opens the view with the right screenshot and hash, arrow keys step through tools, Escape closes and restores focus and scroll, clicking an install button warns instead of running the tool, deep link `#t/markup` opens on load, dark theme inverts the whole view, one column at 420 px with no horizontal overflow.
- `npm run verify` now also fails on a missing or stale screenshot, a PNG that is not the manifest's size, or a capture for a tool that no longer exists. `npm run check` passes; the catalog, votes and screenshot manifests are all current.

**Limits**

- Picture-in-picture and screen-capture tools are photographed on a page that looks unchanged, because headless Chrome does not composite a PiP window or grant a screen capture.
- Recapturing all 60 rewrites about 3 MB, so the images are committed and only regenerated when a tool's on-page effect changes.

## 2026-10-17 — Named install links, no header, GitHub-backed votes

**Changed**

- Removed the masthead. The page now opens on the intro; the theme toggle moved into the intro's top row. The footer count is the only remaining chrome.
- Every draggable anchor is now the tool's name: the featured panel's install button reads **Screenshot markup**, and each card's title is the drag target (bookmark icon, grab cursor). Dragging therefore installs a bookmark called "Screenshot markup" instead of "Drag to bookmarks bar". The catalog header and the featured panel both say to drag the name.
- Voting moved off `localStorage`. `scripts/votes.mjs` creates one GitHub comment per tool on the **Tool votes** issue, counts 👍/👎 on each, and writes `data/votes.json`; `.github/workflows/votes.yml` runs it nightly and commits the file. Thumbs on cards are links to the matching comment and show the live counts. The "Liked" filter became **Top rated**, which sorts by vote score.
- Fixed theme persistence: the head script stored the theme through `JSON.stringify` but read it raw, so `data-theme` came back as `"dark"` with quotes and the dark palette dropped on reload.

**Verified**

- Tally logic exercised end to end against a local mock of the GitHub API: first run created the issue and 60 comments, a second run with reactions set produced the expected counts (12 👍 / 2 👎, 3 / 1), a third run reported "votes unchanged" and left the file untouched, and adding a temporary tool created exactly one new comment and row. `npm run verify` then rejected the stale row for the removed tool.
- Browser run at `http://127.0.0.1:4173`: no masthead, 60 cards, 60 named draggable titles, featured install button named **Screenshot markup**, clicking a title ran its bookmarklet (Hide notifications injected its style), Top rated sorted Record camera to the front, theme toggle survived a reload in both palettes, one-column grid at 420 px with no horizontal overflow, vote click showed the GitHub toast.
- `npm run verify` and `npm run check` pass; the workflow YAML parses.

**Limit**

- Votes require a GitHub account and one reaction click after the thumb opens GitHub. The page hides the vote row until `data/votes.json` has comment URLs, which the first workflow run supplies.

## 2026-10-17 — Initial build from the personal bookmark export

**Source:** `bookmarks_10_14_26.html` (95 `javascript:` bookmarks). The export was copied into the repo, parsed once, and then deleted; it is gitignored so it can never be committed. All bookmarklets now live as individual files under `bookmarklets/<category>/`.

**Shipped**

- 60 bookmarklets split out of the export into one file each, with metadata headers, plus a generated `data/catalog.json`.
- Static catalog page (`index.html`, `assets/style.css`, `assets/app.js`): search with tokens across name/description/tags/category, category chips, "liked" filter, keyboard `/` to search, drag-to-install anchors, copy-code buttons, source links, thumbs stored in `localStorage`, dark/light theme that inverts the monochrome palette.
- Featured panel at the top for one highlighted tool (`@featured true`), currently **Screenshot markup**.
- Multi-select composer: pick tools, download `bookmarks.html` with one folder per category nested under "Bookmarklet Library", ready to import.
- Tooling: `node scripts/build.mjs` (catalog, `--check` for CI), `node scripts/verify.mjs` (href ⇄ source round trip, parse check, vendor exclusion, description/tag checks).
- Docs: `AGENTS.md`, `TODO.md`, `HISTORY.md`, this file, and an updated `README.md`.

**Left out of the library, and why**

| Dropped | Reason |
| --- | --- |
| Support article editor, ARIVE typo flagger, ARIVE text replacer, Article Checker v3/v4/v5, ARIVE Tour Maker, LOS keep-awake, leads-to-dialer, lender-portal data obscuré v4/v9/v10/v11, bulk task deletion, bulk add user v2/v6 | ARIVE-specific, per the project brief |
| Freshdesk page-to-Markdown (x2) | Article-body scraper for one vendor's support site |
| Canva template launchers (x4) | Thin link wrappers around personal templates, not utilities |
| Netlify app launchers (Record Screen v3, Record Live Mix v5) | Open a personal app; a plain bookmark does the same job |
| Older versions: Record Current Tab v2, Record Audio v4, Markup v3 + v2, Tab screenshot+annotate v1, Hide Ads duplicate, Hide Emails duplicate | Superseded by the newest version |
| LMS content preview | Near-duplicate of Peek HTML |

**Verified**

- `npm run verify`: 60 bookmarklets, all parse, every catalog href decodes back to its source file, no ARIVE/Wizni/lender references remain.
- `npm run check`: committed catalog matches the source files.
- Browser run on `http://127.0.0.1:4173`: 60 cards render, search returns 6 results for "markdown", Capture chip narrows to 7, Liked filter follows a thumbs-up click, `/` focuses search, theme toggle flips to the inverted palette and persists, and clicking a card's drag link executed the bookmarklet on the page (Hide notifications injected its style tag).
- Full export test: select all → download produced 60 `<DT><A HREF>` entries in 7 category folders, every href decoding to the matching source file.
