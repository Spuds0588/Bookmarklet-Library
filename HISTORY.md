# HISTORY

What has been done, in order. Newest entries first.

## 2026-10-27 — OpenDocument converters: ODT and ODS, both ways

**Changed**

- Fifteen new Files cards convert to and from OpenDocument: `.odt` out to Word, HTML, TXT, RTF, PDF and Markdown, and OpenDocument text in from Word, HTML, RTF, TXT and Markdown; `.ods` out to CSV/TSV and Excel, and OpenDocument sheets in from Excel and CSV/TSV. They are generated from `bookmarklets/src/tools` like the Office converters, over new shared parts: `odf.js` (ODT reader), `ods.js` (ODS reader), `odt-out.js`, `ods-out.js` and `odf-package.js`.
- The readers resolve styles the way an office suite writes them, so a run that inherits its bold from a parent style still comes across; spans become covered cells on the way back; the page size and margins feed the PDF writer; the writer keeps the stored first `mimetype` entry OpenDocument requires, plus the manifest, content, styles and meta parts, and embeds pictures under `Pictures/`.
- The catalog is now 89 tools, 89 vote rows and 64 captures. The fifteen new cards are photographed in Chrome with their panels populated: two documents converted, or one workbook whose sheets already count as several outputs.
- `scripts/fixtures/make-odf.mjs` writes `report.odt` and `report.ods` with plain XML and Node's own zlib, so no fixture is produced by the reader it tests.
- README, AGENTS, TODO and the page FAQ now cover OpenDocument: the formats, the fidelity, the limits (encrypted, ZIP64 and split packages refused; formulas keep their last saved value; dates become ISO text) and the fixture rule.

**Verified**

- `npm test`: 40 tests pass (10 ZIP, 18 Office, 12 OpenDocument), and `compose.mjs --check`, `build.mjs`, `verify.mjs` and `build.mjs --check` all exit 0.
- Independent readers, on output the shipping files produced. The OpenDocument Engine Suite (`odt-engine`/`ods-engine`, a separate codebase) parses `report.docx → .odt` with the title, the page layout, two headings, three paragraphs, two list groups and the table, and reads `report.csv → .ods` back as `[["0012", "Northwind", 12, "Gate opens at 8, bring the deck"]]` — numbers typed as numbers, the leading-zero id kept as text — and `report.xlsx → .ods` as two named sheets with typed values. Python's `zipfile` and `ElementTree` see `mimetype` first and stored, the manifest listing every part, and `Pictures/image1.png` both in the package and referenced from `content.xml`. `pdftotext` reads the whole document, headings, lists and table out of the ODT-to-PDF output at letter size.
- Chrome, through the capture harness: **ODT to HTML** with two files reports "Converted 2 files" and offers **Save all to folder** and **Download ZIP**; **ODS to CSV** turns one workbook into two outputs the same way; **Excel to ODS** with one file downloads `field-report.ods` directly.

**Production**

- `main` is live at <https://spuds0588.github.io/Bookmarklet-Library/> and serves the committed bytes: `index.html`, `data/catalog.json` (89 tools), `data/screenshots.json`, the generated bookmarklets and the new captures all hash the same as the checkout.
- The live page in Chrome: 89 cards, 64 thumbnails, all fifteen new titles in place, the featured panel still **🔓 Unlock PDF**, and `#t/odt-to-pdf` opens with its own capture and install button.
- The live bookmarklet code, fetched from Pages and run on the live page against live fixtures. **ODT to HTML** took three `.odt` files and clicked **Download ZIP** into `converted-2026-10-28.zip` (12,883 bytes, `PK\x03\x04`) holding exactly `field-report.html`, `site-report.html` and `handoff.html`. **Word to ODT** took a live `.docx` and downloaded `field-report.odt` directly. The two bulk buttons report as visible only while a batch is pending, and hidden after a single download. No console errors, every request 200.

**Limits**

- No desktop LibreOffice on this machine, so the desktop render check stays open in TODO; the checks are the engine suite, Python's `zipfile`/`ElementTree` and poppler.
- OpenDocument formulas keep their last saved value and dates become ISO text. Charts, columns, text boxes, headers, footers and tracked changes are not carried, the same real limits as the rest of the conversion set.
- The largest new card, **ODT to PDF**, is 96,785 bytes of code and a 159,666-character install URL, longer than any Office card before it.

## 2026-10-26 — Office converters: legacy hints, list starts and SVG PDFs

**Changed**

- The Word and Excel tools now name a legacy `.doc` or `.xls` file and tell you to save it as `.docx` or `.xlsx`, instead of falling back to the generic “not one of the formats this tool reads” message.
- HTML ordered lists now carry their `start` attribute into Word. `<ol start="3">` writes a `startOverride` of 3 in `numbering.xml` instead of always starting at 1.
- Word to PDF now sends every source image through the same browser rasterizer used by Word output. PNG, JPEG, GIF, BMP, WebP and SVG sources can be drawn; unsupported images are still counted as skipped.
- The Office suite adds an ordered-list start-override assertion. The eleven generated files are now 59,045 to 89,617 bytes of code; their encoded install URLs are 96,976 to 148,006 characters.
- README and AGENTS now say PDF uses the browser rasterizer for GIF, BMP, WebP and SVG, and TODO records the legacy-format panel check as done.

**Verified**

- `npm test`: 28 tests pass. `node scripts/compose.mjs --check`, `node scripts/build.mjs`, `node scripts/verify.mjs` and `node scripts/build.mjs --check` exit 0 after the catalog is rebuilt.
- Chrome: dragging `legacy.doc` into **Word to HTML** reports `"legacy.doc" is a legacy .doc file. Save it as .docx and try again.`; `legacy.xls` in **Excel to CSV** reports the matching `.xlsx` message.
- Chrome: `<ol start="3">` produces `start: 3` in the model and `w:startOverride w:val="3"` in `numbering.xml`.
- Chrome: Word to PDF with an inline SVG image reports `skippedImages: 0`, writes an image XObject, and keeps `Before` and `after` text in the content stream.
- No desktop Office suite is installed on this machine, so the Word/LibreOffice render check remains open.

**Limits**

- The same limits as the entry below apply: no desktop Word/LibreOffice pass, PDF is Latin-1 Helvetica with images as blocks, and legacy `.doc`/`.xls` files must be saved as OOXML first.

## 2026-10-26 — Eleven Office converters join Files

**Changed**

- Added **📄 Word to HTML**, **📄 Word to TXT**, **📄 Word to RTF**, **📄 Word to PDF**, **📄 Word to Markdown**, **📝 HTML to Word**, **📝 RTF to Word**, **📝 TXT to Word**, **📝 Markdown to Word**, **📊 Excel to CSV** and **📈 CSV to Excel**. Each card accepts one file or a batch and writes the converted files locally.
- One output downloads directly. Two or more outputs stay in the panel with **Save all to folder** (File System Access, Chrome or Edge) and **Download ZIP**; a multi-sheet workbook counts as several outputs, so it never starts an automatic download. A batch is capped at 100 files, 100 MB each and 300 MB total.
- The Word readers carry paragraphs, headings, bold/italic/underline/strike, hyperlinks, bullet and numbered lists, tables, page breaks and images. They do not carry fonts, colours, columns, text boxes, headers, footers, footnotes, comments or tracked changes. DOCX images become data URLs in HTML and Markdown, hex `\pict` pictures in RTF and rasterized blocks in PDF. Data-URL and CORS-readable remote images are embedded; relative, blocked and undrawable images are skipped. HTML and Markdown readers rasterize GIF, BMP, WebP and SVG to PNG before writing Word when the browser can draw them. DOCX images keep their format in HTML and Markdown, while RTF keeps only PNG and JPEG.
- The PDF writer uses Helvetica, Latin-1, the DOCX page size and margins, simple table grids and images as blocks without text wrap. Unsupported characters are replaced and counted. Links, headers, footers and text wrap around images are not reproduced. Legacy `.doc` and `.xls` files are rejected; save them as OOXML first.
- The eleven tools share `bookmarklets/src/parts` and are composed by `scripts/compose.mjs` into self-contained `bookmarklets/files/<slug>.js` files. There is no runtime dependency and no change to how a bookmarklet is installed. At that commit, the generated files were 58,557 to 88,990 bytes of code; their encoded install URLs were 96,114 to 146,937 characters.
- Fixed the conversion paths found in review: RTF numbered lists now carry their label and spacing, PDF keeps text in a paragraph that also holds an image and draws table images, DOCX keeps table images, separate ordered lists restart instead of continuing, TXT keeps text that shares a paragraph with an image, SVG/GIF/BMP/WebP are rasterized to PNG instead of being written into DOCX as `.bin` media, a failed batch shows the converter's reason in the panel instead of only in a row tooltip, and the progress bar hides when work finishes.
- README, AGENTS, TODO and the page FAQ cover the converters, their fidelity and their limits. The Files category blurb and the Files "how it works" copy now mention Office conversion. The page FAQ schema carries the same question as the visible FAQ.
- Files now has 25 tools, the catalog 74, the vote file 74 rows, 49 screenshots and 25 tools explained without one. **🔓 Unlock PDF** remains the featured tool.

**Verified**

- `npm test`: 28 tests pass. The Office suite builds and reads DOCX, XLSX, PDF and RTF output, checks HTML/Markdown/RTF/TXT to Word, CSV quoting, Excel sheet export, ordered-list restarts, table images, RTF numbered markers and PDF text around an image. The ZIP suite is unchanged and still passes.
- `node scripts/compose.mjs --check`, `node scripts/build.mjs`, `node scripts/verify.mjs` and `node scripts/build.mjs --check` exit 0 after the docs and catalog are rebuilt.
- In Chrome at `http://127.0.0.1:4173`, the Word to HTML panel opened in the page's shadow root. A corrupt `.docx` produced `broken.docx: This is not a ZIP-based Office file.` in the visible status, marked the row failed, and hid the progress bar.
- The Office panel fallback was driven through a real borrowed window: `attachShadow` was forced to fail, a substituted `documentPictureInPicture.requestWindow` returned a separate same-origin window, and the panel rendered there. Its file input, convert action, error status and close all worked, and the page kept no host element.
- Word to PDF was run in Chrome on a paragraph containing text before and after a PNG. The PDF was 2,720 bytes with one page, one `/Subtype /Image`, and `skippedImages` 0; with compression temporarily disabled, the content stream contained `(Before)` and `(After)`.
- HTML to Word was run in Chrome on two separate ordered lists and an SVG image. The parser gave each list its own id, the DOCX used `numId` 2 for the first and 3 for the second, `numbering.xml` carried both, and the SVG became `word/media/image1.png` with `Extension="png"` and no skipped image.
- `pdftoppm` rendered the earlier Word to PDF fixture, Python's docx and openpyxl opened the DOCX and XLSX outputs, and `unzip -t` accepted the converter ZIP. The RTF writer output was read back by the RTF reader with its numbered marker intact.
- The eleven captures are 1200x750 and show populated panels with a selected batch.
- GitHub Pages rebuilt `07030c4` and the live catalog reports 74 tools, Files 25, all eleven Office cards and the six-question FAQ. A production **Word to HTML** bookmarklet converted `report.docx` to `report.html` with an ok status, and a two-file batch showed `2 files ready` with **Save all to folder** and **Download ZIP** and no automatic download.

**Limits**

- No desktop Word, Excel or LibreOffice run yet. The checks use Python readers, `pdftoppm`, Chrome and RTF round-trips.
- PDF is deliberately simple: Helvetica only, Latin-1 only, no clickable links, no headers or footers, no text wrap around images, and table images are blocks inside the cell. Fonts, colours, columns, text boxes, comments and tracked changes are dropped in every format.
- Images must be data URLs or CORS-readable remote images. Relative paths cannot be resolved from one selected file, and images the browser cannot draw are skipped with a count.
- **Save all to folder** needs the File System Access API and a secure page; Firefox and Safari keep the ZIP fallback. The folder permission belongs to the page origin.
- Legacy `.doc` and `.xls` are not read, and encrypted or password-protected Office files are not supported.
- A page CSP that blocks bookmarklets stops every tool here, these included. If it blocks the panel's shadow styles, the panel falls through to Document PiP or a popup.

## 2026-10-26 — ZIP files and Unzip join the library

**Changed**

- **🗜️ Zip files** takes files and folders by drag or by picker, keeps the folder tree, and downloads one standard ZIP through the browser's normal download flow. It uses native `CompressionStream("deflate-raw")` with a stored fallback for files that do not shrink, writes UTF-8 names, parent folders and CRC32 checksums, and is ZIP32 without a password. The limit is 1 GB of input and 65,535 entries.
- **📂 Unzip** reads the central directory first, shows the archive name, unpacked size and a collapsible folder tree, and downloads any file on its own. **Save all to folder** writes the whole tree through `showDirectoryPicker`, so the folders are recreated instead of forcing one download per file. It stops at 4 GB, refuses encrypted, ZIP64, split and symbolic-link archives, rejects unsafe or duplicate paths, verifies every CRC, and removes a partially written folder when an entry fails.
- Both tools render one panel into an open shadow root over the page. If that mount is blocked, they try Document Picture-in-Picture, then a popup with the same UI, then a native alert asking for popups. The panel uses the window it was given for its pickers, downloads and folder permission prompt.
- A popup opened from a page with `style-src 'none'` starts as `about:blank` and inherits that CSP, so its `<style>` is dropped. When the borrowed window's style probe fails, the same CSS is now installed through a constructable stylesheet, which is not subject to `style-src`.
- The Files category blurb now says ZIP archives, the Files "how it works" copy covers choosing files and archives, and the page FAQ answers what ZIP tools need. README, AGENTS and TODO carry the same limits and the new test command.
- The two files are 29,768 and 32,479 bytes of code; their encoded install URLs are 48,147 and 52,614 characters. Both remain self-contained, with no library and no runtime request.
- Files now has 14 tools, the catalog 63, and the vote file 63 rows. The new captures bring the total to 38 screenshots with 25 tools explained without one.
- Cards and details use the captured panels: **🗜️ Zip files** shows a selected folder tree and stack of files, and **📂 Unzip** shows an opened archive with its Download buttons and folder warning.

**Verified**

- `npm test`: 10 tests pass. The builder is checked for standard local and central headers, deflate and stored methods, UTF-8 names, folder entries (including an empty folder), duplicate names, 1 GB and 65,535-entry caps, and CRC32. The reader is checked against data descriptors, duplicate and unsafe paths, encrypted, ZIP64, split, symlink and unknown-method archives, the 4 GB cap, bad checksums, and partial-folder cleanup. Folder writing runs against an in-memory directory handle, including the archive-name root that would otherwise become `project/project/`.
- `node scripts/build.mjs && node scripts/votes.mjs --offline && node scripts/verify.mjs && node scripts/build.mjs --check` exits 0: 63 bookmarklets, 63 vote rows, 38 screenshots, 25 tools explained without one. All structured-data blocks parse; the FAQ has five questions and the page carries the same five.
- Browser run at `http://127.0.0.1:4173`: **Zip files** accepted a three-file, two-folder selection through its hidden folder picker and **Create ZIP** downloaded `project.zip` (675 bytes, `application/zip`) with an ok status. **Unzip** opened that archive, listed all three paths, downloaded `day-1.md` with the expected text, and **Save all** wrote the complete tree through the picker, correct contents included.
- The fallback chain was exercised through real borrowed windows with a substituted `requestWindow` that returned a separate same-origin page. With `attachShadow` forced to throw, both panels rendered in that window: the ZIP builder's two picker buttons fired, **Create ZIP** downloaded `fallback.zip` (556 bytes) with 100% progress and an ok status, its Close closed the window, and the Unzip panel downloaded `2026-10-20.md`, showed 50% progress while **Save all** wrote the four-file `field-notes/` tree, and closed cleanly.
- The same pair ran on a page with `Content-Security-Policy: style-src 'none'`. The shadow probe failed, no `bl-*-host` was left in the page, and both panels completed the same picker, create, progress, per-file download, Save all and Close checks in the borrowed window.
- With Document PiP made unavailable, the popup path first reproduced a real defect: the `about:blank` popup inherited `style-src 'none'`, so the panel computed to `position: static`, zero width. Adopting the CSS as a `CSSStyleSheet` fixed it. On a 643x762 popup the backdrop now computes `position: fixed`, the panel measures 594.9px wide with its own display intact, and both tools pass the full control sequence, including `popup.zip` (525 bytes) and the four-file folder extraction.
- Both captures are 1200x750 and driven through the panels' own hidden inputs: the ZIP builder shows `project/README.md` plus two notes and a CSV, and the Unzip tree shows `field-notes/` with `assets`, `notes` and `README.md`. The unzip capture also caught the drop zone staying visible after an archive loaded; `.bl-drop[hidden]` now hides it and the capture was retaken.

**Limits**

- **Save all to folder** needs the File System Access API, which is Chrome and Edge only. Firefox and Safari keep the per-file downloads. It also needs a secure page, and the directory permission belongs to the page origin rather than the bookmarklet.
- The builder reads whole files into memory and refuses a selection over 1 GB. It writes ZIP32 only; it cannot make password-protected archives, ZIP64 or split archives.
- The reader assumes UTF-8 entry names, because it does not decode the legacy CP437 code page. It does not open encrypted or ZIP64 archives, does not join split archives, and refuses symbolic links.
- A page CSP that blocks `javascript:` URLs stops every bookmarklet, these included. If CSP blocks the panel's shadow styles, the tool falls through to PiP or a popup; a blocked popup is reported through a native alert.
- A direct `documentPictureInPicture.requestWindow()` call still blocks this browser automation harness, so the native PiP surface itself was not driven. The PiP branch was exercised with a real same-origin window returned by a substituted `requestWindow`, including the full control sequence; the popup after it was exercised separately.

## 2026-10-26 — The passphrase pool grows from 60 words to 361

**Changed**

- **🔑 Generate passphrase** now draws from 361 words instead of 60, an addition of 301 common, lower-case English nouns, verbs and adjectives. The original 60 are kept, the whole list is sorted, every entry is unique, and words run from 3 to 8 letters.
- The four-word draw is now about 34 bits of randomness instead of 24. The bookmarklet grows from 707 to 3,171 bytes of code and its encoded install URL to 5,430 characters, still well inside the length the other tools use.

**Verified**

- Parsed both the source and the catalog's encoded install URL: 361 words, 361 unique entries.
- Ran the built bookmarklet 2,000 times in a VM with a stubbed clipboard and deterministic `Math.random` values: every output was exactly the four drawn words concatenated, and all 2,000 outputs were distinct.
- `build → votes --offline → verify → build --check` exits 0: 61 bookmarklets, 61 vote rows, 36 screenshots, 25 tools explained without one. The votes file was restored because only its timestamp changed.
- No capture was recaptured: the result is still clipboard text, and the manifest already records the `clipboard` reason for this tool.

**Limits**

- The format is unchanged: four words joined without separators, using `Math.random`. Only the size of the pool behind those choices changed.

## 2026-10-26 — PDF passwords join the library

**Changed**

- **🔒 Lock PDF** and **🔓 Unlock PDF** are in the catalog under Files, copied as built from the standalone PDF password bookmarklet project. Lock writes an AES-256 R6 copy with the password used for both the user and owner passwords; unlock removes RC4 40/128, AES-128 or AES-256 protection and asks for the password only when an empty user password does not open the file. Both download `<name>-locked.pdf` or `<name>-unlocked.pdf` and never upload the document.
- The two files are 18,962 and 18,971 bytes of code. The catalog's `encodeURIComponent` install URLs are 27,945 and 27,972 characters, the longest in the library; the standalone project's own page uses minimal encoding and stays near 21.8 KB.
- Files now covers PDFs as well as clipboard downloads. The category blurb reads "Clipboard, PDFs, snippets and exports" and the Files "how it works" note says the tool can add or remove a PDF password, instead of implying everything starts on the clipboard.
- Neither tool gets a capture: the result is a downloaded file behind a dialog, so both are in the manifest with the `download` reason and the card says **Saves a file · no capture**. The counts are now 61 tools, 36 screenshots, 25 tools explained without one, and 61 vote rows.
- **🔓 Unlock PDF** is the featured tool now; **🖼️ Screenshot markup** returns to the grid. The highlighted panel uses the PDF tool's name, description and install button, and because it has no capture its picture slot carries the Files badge and file size instead of an image.
- The featured side no longer prints the category ordinal — the big **04** was Files' position in the category list, not a count or a rank. The panel now shows only **🗂️ Files · 19 KB** in that corner.
- Cards keep one height across the grid: `grid-auto-rows: 1fr` plus `height: 100%` on each card, with the screenshot or no-capture tile growing into the leftover space and `object-fit: cover` scaling the image. Install buttons and the Details row now line up across every card.

**Verified**

- `build → votes --offline → shots lock-pdf unlock-pdf → verify → build --check` exits 0: 61 bookmarklets, 61 vote rows, 36 screenshots, 25 tools explained without one.
- Browser check at `http://127.0.0.1:4173`: 61 cards, the Files chip reads 12, both cards show their description with **Saves a file · no capture**, both detail views open with the right name, description, tags, size, added date and install button, and searching `pdf` returns exactly the two tools.
- The featured panel names **🔓 Unlock PDF** with its description and named install button; its no-capture side reads **🗂️ Files · 19 KB**. **See it in action** opens `#t/unlock-pdf`, closing returns to the grid, and **🖼️ Screenshot markup** is still one of the 61 cards.
- Card heights were measured with all 61 cards rendered: 447 px at 1200, 455 px at 900, 655 px at 700 and 481 px at 420, with no card's content exceeding its box. Media heights vary with the text above them, but their bottom edges align with the install button.
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
