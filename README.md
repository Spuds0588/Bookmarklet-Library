# Bookmarklet Library

**[Open the library →](https://spuds0588.github.io/Bookmarklet-Library/)**

A searchable catalog of small browser tools. Find one that does the job, drag it to your bookmarks bar, click it on any page. Nothing to install, no accounts, no extensions.

126 bookmarklets across eight categories: capture, annotate, text, files, dev tools, view, games and privacy. Everything is vanilla HTML, CSS and JavaScript served as a static site. Four tools use a hosted helper page: the URL chat loads PeerJS from a CDN, Doom loads its own WebAssembly engine and shareware WAD from this site, the QR reader decodes screen captures locally, and the WebMCP hub runs the local agent window.

## Use it

1. Show your bookmarks bar: `⌘ + Shift + B` on a Mac, `Ctrl + Shift + B` elsewhere.
2. Drag a tool's **button** up onto the bar. Every tool has a button named after it, emoji and all, so the bookmark arrives named and ready. There is nothing to rename.
3. Click the bookmark while you are on the page you want it to act on.

Click any card to open it full page: a screenshot of the tool at work on a demo page, what it does, and the same install button.

Prefer keyboard or want to install a whole set at once? Search or filter, tick the tools you want with **Pick**, then **Download bookmarks.html**. The file holds one folder per category and nothing above them: a browser already wraps an import in a folder of its own, so a library level on top only buries the tools one level deeper. Import it from your bookmark manager and the whole set lands in the bar in one go.

A few entries point at a bookmarklet that lives in another repository, such as **📊 Turnstone on any page**. Those cards say so, credit the author and open that repository's install page instead of offering a drag button, because this catalog does not host a copy.

If dragging is blocked, use **Copy** and paste the code into a new bookmark's URL field.

## What is in the catalog

| Category | Examples |
| --- | --- |
| Capture | Tab screenshot, OCR a screen region, record tab/camera/audio, Loom links |
| Annotate | Screenshot markup (arrows, boxes, numbered steps), freehand draw |
| Text | Advanced find, find and replace on inputs, page to Markdown, read aloud, extract emails, table to CSV/Markdown, text-fragment citations, password generation, QR codes |
| Files | Clipboard to .md/.csv/.txt/.css/.html/.png, PDF lock/unlock, ZIP create/extract, Word/HTML/RTF/TXT/Markdown and Excel/CSV conversion both ways, OpenDocument `.odt`/`.ods` conversion both ways, HTML snippet saver, Loom export, send a PDF to DocuSign, export a whole chat to Markdown, shrink a PDF |
| Dev tools | URL parameter reports, site map to CSV, local storage export, console monitor, selector recorder, layout and accessibility overlays, environment switcher, form harvester/stamper, a webhook bookmarklet builder, a local AI agent that drives the page |
| View | Picture-in-picture for video and audio, phone preview, zoom lens, ad decluttering, sticky-header removal, link highlighting, dark mode, force scroll, presenter spotlight, Jitsi meeting, URL chat, voice commands, preview downloads |
| Games | Doom, Neon Hell |
| Privacy | Redact page text, hide email addresses, blur elements, pixelate a region, hide notification toasts, PII masker |

## What the badges mean

Every card carries a few small badges saying what the tool needs, and the full page shows the same list. They come from each tool's `@traits` line and the build checks them, so a badge cannot quietly stop being true.

| Badge | Means |
| --- | --- |
| **Offline** | Runs with no network connection at all. |
| **Online** | Loads code, data or a page over the network to do its job. |
| **Self-contained** | Every line it runs is in the bookmarklet itself. |
| **3rd-party** | Uses a library or engine somebody else wrote, bundled into the file or fetched from a CDN. |
| **Web app** | Opens a hosted page or another site's app — the QR reader, the chat, Doom, Jitsi, Excalidraw, the Markdown scratchpad. |
| **CORS-free** | Its job never needs a cross-origin response, so a site without CORS headers is no obstacle. |

One badge is not a trait. **In testing** marks a tool that does its job but has not been run against the real service yet, and it comes from `@testing true` in the source. The DocuSign tool carries it until a developer account proves an upload end to end.
| **Sensitive-safe** | Sends nothing from the page off your device and loads no third-party code into it, so it is the shortlist for a page with private data. |

Most of the catalog is offline, self-contained and safe for sensitive pages. The exceptions are honest ones: the CDN-backed tools (markup, OCR, pixelate, the Markdown readers) need a connection and drop **Sensitive-safe** because remote code runs in the page; the media downloaders need the network and drop **CORS-free** because a file served without CORS headers cannot be read; the webhook builder's output posts the page somewhere by design; and the hosted helpers listed under **Web app** need a connection for their page.

A missing badge is information too: no **CORS-free** on a downloader means a cross-origin file may be marked blocked, and no **Sensitive-safe** on a converter means running it on a confidential page is a decision worth making deliberately.

## Community tools

Thirteen cards started as other developers' published tools. Their names stay as the authors wrote them, with an emoji added for the bookmarks bar. Each card says **By …** and links that name to the original, and the full page puts **Original source** beside **Source file**: the technique is theirs, and the readable code here was written in this repository from that behaviour rather than pasted from it. Five of the thirteen are a single property assignment — `document.designMode`, `playbackRate`, an inverting filter — so their code necessarily reads like anyone's would; the eleven lines that make up those five are the idea itself, which is not something a rewrite can separate.

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

## Bulk media downloads

**🖼️ Download all images**, **🎬 Download all videos**, **🎧 Download all audio** and **📥 Download all linked files** open a panel that lists what the page already loads. The image tool reads `img` and `picture` sources, `srcset`, the usual lazy-load attributes and social preview tags; the video and audio tools read the elements and their `source` fallbacks; the file tool reads anchors that carry `download` or point at a file extension. **Save all to folder** asks for a folder with the File System Access API and writes every file there, numbering names that already exist instead of overwriting them. **Download each** uses the browser's downloads folder when it cannot pick one. Each file is fetched from its own URL, so a file served without CORS headers is marked blocked and gets an **Open** link rather than a quiet failure. HLS and DASH playlists (`.m3u8`, `.mpd`) are listed but skipped, as is any single file over 600 MB. Nothing is uploaded and nothing is decrypted or re-encoded: a canvas, a CSS background, an encrypted stream or a player fed by JavaScript is not a file this can read.

## Shrink a PDF

**🗜️ Shrink PDF** makes a scan-heavy PDF smaller without turning it into a pile of pictures. It reads the file, re-encodes the images it can safely touch, and rebuilds the PDF around them: every page, every link and the whole text layer stay where they were.

**Drop PDFs and it starts.** There is no preset to pick and no button to press: every file is compressed at the strongest setting that keeps text readable (1800 px long edge, JPEG 0.62), and a file is only replaced when the new stream is genuinely smaller. While it runs, the drop zone folds away into one line — **2 PDFs · 0.24 MB · max 20 MB** — with **Add more** to bring it back, and each file gets a row with its own progress bar and outcome (`0.12 MB → 0.05 MB · 55% smaller`, `no gain`, or the reason it failed).

**The finished files appear below as tiles.** Each tile is a draggable PDF: drag one onto an upload box that accepts drops, or use **Drag all** and drop the batch in one go — Chromium carries the files themselves, so a page's own file input sees several files from a single drop. **Save all to folder** writes them to a folder you choose with the File System Access API, with no ZIP in the way, so the page's upload control can take them from disk. **Download all (.zip)** is the fallback where drops or folder picks are blocked, since a browser stops after the first of several separate downloads. A file that had to be split arrives as one archive per source. **Save** on a tile writes just that file, and the title bar still moves the panel off whatever it is covering.

Files are rebuilt one at a time in the order they were dropped, split parts keep their page ranges in their names, and two files with the same name get distinct entries rather than overwriting each other. A single page that cannot get under the ceiling is reported instead of dropped.

The images are the weight in a scan. Each JPEG is decoded, drawn at a smaller size or a lower quality, and written back as a JPEG; raw Flate bitmaps go through a canvas and come out as JPEGs too. There is one setting because the goal is the smallest file that still reads: pages are held at 1800 px on the long edge and JPEG quality drops to 0.62. Resolution is what keeps small print legible, so the saving comes from compression rather than from shrinking the page — on synthetic 150, 200 and 300 dpi scans, 99.6% of words survived OCR at this setting, and on a real 150 dpi capture, 96.4% to 100%. An image is only replaced when the new stream is genuinely smaller, so a file that is already tight comes back with no change and no tile. Grey pages stay grey, because colour costs bytes and adds nothing to a scanned form.

What it deliberately leaves alone: transparency masks and soft masks, `ImageMask` stencils, CCITT and JBIG2 fax images, CMYK and indexed colour, and predictors. Shrinking one half of a mask pair would leave the other misaligned, so those are skipped rather than guessed at. Encrypted PDFs are refused, because their streams cannot be read without the key.

**Max file size (MB)** is set with a slider or by typing a number and defaults to 20. The same pass packs the pages, in page-tree order, into parts under that ceiling, and a part that still does not fit is recompressed at the next stronger setting before it is reported. Each part is rebuilt from only the objects its pages can reach, so a part does not carry the images of the pages it left out, and all parts arrive in one ZIP — a browser blocks the second download a page starts, so separate files would silently stop after the first. A single page that is still too heavy is reported as over the limit rather than quietly dropped.

It has now been through 30 files: 15 public PDFs and 15 generated 2400×3200 scans. The scans went 0.18 MB → 0.06 MB, 1.11 MB → 0.15 MB (87% smaller), 5.44 MB → 1.24 MB and 6.56 MB → 1.39 MB (79%). `pdfinfo` page counts match, image object counts are unchanged, and page content streams hash identical before and after. Text was checked by rendering every page at 200 dpi and running OCR over the original and the rebuild: body text matched word for word (0.9996 similarity on a two-page BERT scan, 1.0 on its second page), and the only differences were small labels inside a diagram, which were confirmed legible by eye. Splitting a 3-page 6.56 MB scan at a 0.3 MB ceiling produced a 0.17 MB two-page part plus a 1.24 MB single page that the panel flags as too heavy to fit.

A `pdftotext` mismatch on two of those vector PDFs turned out to be a real bug, not a reader quirk: a stream whose `/Length` is an indirect reference was being trimmed at its final line break, which shortened and corrupted embedded fonts. Lengths are resolved from the length object now, and the rebuilt pages render to byte-identical PNGs with matching text. The card keeps its **In testing** badge because the corpus is still small, and because a single page that cannot be compressed under the ceiling is reported instead of quietly dropped. A text-only PDF has nothing to recompress, so the panel says there is no gain rather than handing back a file that grew.

## Edit a PDF from your disk

**📝 Edit PDF on Page** picks a PDF from your disk and opens it in SimplePDF's embedded editor: by default in a modal over the page you are on, and, if that page will not allow the frame, in a floating picture-in-picture window or a popup rather than in the site's own chrome. No upload, no public URL, no download round trip. The bytes are read in the page, encoded as a data URL and handed to the editor's `LOAD_DOCUMENT` call over its `postMessage` bridge, so the file never leaves the browser and closing the modal discards it.

Three things had to be true for that to work. `?open=` cannot carry a local file: it is http(s) only, and the editor fetches through `https://simplepdf.com/cors/<url>` on its own servers, where a `127.0.0.1` address means SimplePDF's machine rather than yours (a loopback server answered `400`). `simplepdf.com/editor` also sends `frame-ancestors 'self'`, so the framing host is `embed.simplepdf.com`, which sets no such limit. And `LOAD_DOCUMENT` is the one editor call available without the embedding origin being allowlisted, which matters because a bookmarklet runs on an arbitrary site.

The editor never announces that it is ready, so the bridge asks for its field list every half second until something answers — the answer itself may be a refusal, which still proves the bridge is up — and then loads the document. Verified against a real PDF: the probe answered `bad_request:no_document_loaded`, `LOAD_DOCUMENT` answered `success: true`, and `DOCUMENT_LOADED` and `PAGE_FOCUSED` (page 1) followed.

Framing can fail without saying so: a site whose CSP has no `frame-src` for `embed.simplepdf.com` raises no error and sends no message, so the modal attempt is bounded at twelve seconds and then falls through to a floating window and then a popup. Those two surfaces are worth having because a page can decline the modal without forbidding its editor outright — but a popup the tool creates is an `about:blank` document, and Chrome gives it the opener's policy, so on a page that really does forbid the frame `npm run fallbacks` measures the popup failing too. Document picture-in-picture gives a floating, always-on-top editor window; a popup is the floor when the browser has neither. Picture-in-picture needs a live user gesture, which a timeout no longer has, so **Float** and **Popup** are buttons in the bar as well as an automatic fallback, and a browser that offers neither still gets the editor's own picker and drag-and-drop to fall back on.

## Edit a photo, or the page's own markup, on the page

**📷 Edit photo on Page** picks a photo from disk and opens it in Photopea's editor: in a modal over the page you are on, or in a floating picture-in-picture window or a popup if that page will not allow the frame. **Save PNG** brings the edited image back and downloads it as `<name>-edited.png`. The file reaches the editor as bytes over its messaging API, so nothing is uploaded and no account or key is involved.

**💻 Edit code on Page** opens a runnable code editor over the page, preloaded with the page's own HTML — or with your selection, when you have picked a block worth editing. It is OneCompiler's embeddable editor, so the code runs; **Copy code** covers the case where the editor refuses the handoff.

Both follow the same order as the PDF editor: the modal frame first, then a floating window, then a popup. Photopea is the only photo editor that can be framed without credentials: Pixlr's embeddable editor needs a server-signed token from a client secret, and Canva's embed shows a finished design rather than editing one.

## File the page you are on as a task

**📝 Add page to a task** takes the page's title, its URL and any text you have selected, and offers the places that accept them without a key: Trello's add-card window, Linear's new issue, a GitHub or GitLab issue when you are already inside that repository, and Things on a Mac. **Float** puts the form in a picture-in-picture window, so you can keep selecting text on the page underneath while it stays on top.

None of those services can be framed — Trello sends `X-Frame-Options: DENY`, GitHub `deny`, Linear, GitLab and Notion `SAMEORIGIN` — so the destination opens in a window the tool owns, where your existing session counts. Nothing is stored and no token is involved: the tool builds the service's own prefilled link and hands it over.

### When the service publishes no prefilled link

**📌 Task bookmarklet builder** covers the rest. Paste the address of a board, repository, project or list and it reads the id out of that address, then hands you a bookmarklet of your own. Trello, GitHub and GitLab stay keyless, because their create pages already take query parameters. **Todoist**, **ClickUp** and **Asana** publish no such link but do have an open API, so their bookmarklet carries an API token you paste in and posts the page straight to the project or list you chose.

The token lives inside that bookmarklet, so build it on your own machine: bookmarks sync to your browser account, and this is the one thing a shared tool could not do, since storage is per-origin and a token saved on one site is invisible on the next.

### A drawer of your own tasks, built on your token

**📋 Build a task drawer on Page** writes you a personal bookmarklet that slides your own task list out of the right edge of any page — the same drawer as the Todoist tool, but fed by the service's API. Pick Todoist, Trello, Linear, GitHub, ClickUp, Notion or Asana, paste a token, and drag the result to your bookmarks bar. ClickUp and Notion also want a list or database, which it reads out of the URL you paste.

**📥 Build a download shelf on Page** writes the same kind of bookmarklet for a workflow rather than a list. Give it the portals you upload files to, one `Name | URL` per line, and the generated bookmarklet catches the next download into the tab's memory instead of the Downloads folder, lists it in a sidebar, and opens a partner in a frame to the left of that sidebar. A ZIP is unzipped in memory and its entries join the list, a file opens in a new tab or saves when you ask, and a row drags onto a partner's upload box so the bytes arrive without being written to disk first. Tick **Open the first partner when a download is caught** and the portal is already up when the file lands, which is the whole download → unzip → open → upload run in one click.

Those seven are the services that let a page read them with a pasted key: Trello and GitHub send `Access-Control-Allow-Origin: *`, and Asana, Linear, ClickUp, Notion and Todoist's v1 API echo the caller's origin, all measured. Vikunja sends no CORS header at all, Taskade refuses the preflight, and TickTick, Google Tasks and Microsoft To Do only speak OAuth, so none of them can be read this way and none is offered.

The token is baked into the bookmarklet you build, so build it on your own machine: bookmarks sync to your browser account. The drawer calls the service directly and shows what came back — a refused token says which status came with it rather than showing an empty list, and a page whose CSP blocks the request says that instead of pretending you have no tasks.

## Open Todoist over the page you are on

**📋 Open Todoist on Page** slides Todoist out of the right edge of whatever you are reading — a drawer as tall as the window, with the page still live beside it — then a floating picture-in-picture window, then a popup, whichever your browser and that page allow. It is a drawer rather than a dialog on purpose: there is no scrim, the page behind stays clickable and scrollable, and the drawer arrives by sliding in so you can see where it came from. Close slides it back out, and Esc does the same. Todoist is the only task manager here whose own documentation shows its app running signed in inside another site's frame — its help centre tells you to add `todoist.com/app` to a Notion `/embed` block — and it sends neither `X-Frame-Options` nor `frame-ancestors`, which was measured. What stops the frame is the page's own CSP, or nothing at all.

That same help page names the catch: a browser that blocks third-party cookies "won't recognize you logging in to Todoist". A frame is a third-party page to Todoist and always will be, so the drawer's frame shows what any third-party frame shows. **Popup** is the rung that fixes it, because it opens `app.todoist.com` at its own URL instead of framing it, and there the page is first-party and your session counts. The bar says so rather than promising a signed-in sidebar the browser may not give you.

The frame is bounded at twelve seconds and a `securitypolicyviolation` on the host page is read as a refusal, since a page that forbids `frame-src` says nothing and paints nothing. Neither signal can see inside Todoist, so the tool never claims the app loaded — only that the frame was allowed to try.

## Edit a PDF in SimplePDF

**📝 Open in SimplePDF** finds the PDF this tab already has — the document itself, the file behind a pdf.js viewer, or an embed, object or link on the page — and redirects the same window to `https://simplepdf.com/editor?open=…`, so editing starts without downloading the file and picking it again (both that address and `embed.simplepdf.com` accept `open`). A `#page=4` on the original address is carried over as the editor's `page` parameter, and a presigned S3 or Azure URL keeps its query string.

The editor fetches the file itself, so the address has to be reachable without your cookies. A PDF that is a `file://` path on your disk, a `blob:`, a `data:` URL or behind a login cannot be handed over as an address at all, so the tool names the case it hit instead of landing you in an editor that cannot load it: a local file gets a button that opens the editor for you to drag the file into, since no website can read your disk, and a `blob:` or `data:` URL belongs to the page that made it, which for `file://` is an opaque origin the editor can never fetch. A PDF on your disk has its own one-step route in **📝 Edit PDF on Page**, below. Chrome's built-in PDF viewer does not run bookmarklets at all, so on those tabs start from a page that links the PDF, or from a Firefox tab.
## Export a chat to Markdown

**💬 Export chat to Markdown** saves the whole conversation as one `.md` file, so a long thread can be handed to another model or a colleague without the clipboard cutting it short at the first thousand words.

It reads the page rather than asking a service for a transcript. On ChatGPT, Claude, Gemini and Google AI Studio it finds the messages themselves and writes them in order with `## You` and `## Assistant` headings, converting the rendered HTML to Markdown as it goes: headings, lists, fenced code with its language, tables, quotes, links and emphasis. Everything else runs a container fallback: a page with something that looks like a conversation gets a panel saying what was found and how many characters it holds, with **Save this area** and **Pick an area**. If nothing is recognisable at all, the click-to-select mode opens straight away: hover to see what each block holds, click the one you want, `Esc` to back out.

No CDN, no Turndown, no network. The conversion is a few hundred lines in the bookmarklet, which matters because ChatGPT, Claude and Gemini all serve their pages under a content security policy that would block a script pulled from unpkg in the first place.

Google AI Studio goes further and enforces Trusted Types, which blocks the usual habit of assigning a panel's HTML to a shadow root. Every panel, picker and toast here is built node by node instead, and a test reads the source and fails if an HTML sink creeps back in. The page in `scripts/fixtures/trusted-types.html` enforces the same rule, so the exporter can be run against it: the panel and the picker both open there without an HTML assignment.

Limits worth knowing: a conversation that loads older messages lazily only exports what is in the page, so scroll up before exporting. The role selectors are written against those four sites; AI Studio's turn markup is best effort, and a custom studio lands on the confirmation panel or the picker instead.

## Send to DocuSign

**🚀 Send PDF to DocuSign** takes the PDF you are looking at and turns it into a DocuSign draft envelope without a download, an upload dialog or a second tab of clicking. It reads the PDF's bytes in the browser, posts them to the eSignature API as an envelope with `status: "created"`, then asks DocuSign for the sender view of that envelope and opens it in a new tab, ready for fields and recipients.

It is bring-your-own-key. The panel asks for the **Account ID** and an **access token** from DocuSign's Apps and Keys page, plus whether they belong to Developer (demo) or Production — the two environments do not share tokens. An optional signer email becomes the one recipient; leave it blank to add recipients in DocuSign, because it rejects a recipient with no address. Nothing is stored on a server: the token stays in this browser, and only the account, environment, subject and address are remembered unless you tick the box to remember the token too. That box saves it in the current site's storage, where any script on that site could read it.

If a browser will not run a bookmarklet on its own PDF tab, the panel offers **Choose a PDF** and uploads the file straight from disk. A page that embeds a PDF with `<embed>` or `<object>` is picked up automatically.

The API answers CORS preflights for any endpoint with an account ID in the path, which is what makes a bookmarklet possible at all. A 401 usually means the token expired (they last eight hours) or belongs to the other environment; a 403 usually means it lacks the `signature` scope.

## Preview downloads

**📄 Preview downloads** catches a click on a link to an image, video, audio file, PDF, plain text, CSV or an Office document and shows the file in a panel over the page instead of downloading it or leaving the tab. The panel names the file, says what it is and how big it is, and then renders it: an image or a player for media, an embedded PDF, the text for a CSV or log, and a note with Save and Open for Word, Excel, PowerPoint and OpenDocument files, which a browser cannot display. Everything it fetched sits behind one **Download** button, so the file is still one click away.

The panel is a shadow-root overlay, because staying in place is the point. If a page refuses the overlay, it opens in a Document Picture-in-Picture window; if that is missing, in a pop-up window. Esc or a click outside closes it and drops the fetched bytes.

It reads the file with `fetch` first, which is what makes the text preview and the save possible. When the file sits on another origin without CORS headers, the panel shows it straight from its link and says so, and the download button keeps working. Links it cannot show (ZIP, installers, an extension it does not know) are left alone, so they still download normally.

## QR codes

**🔳 Create QR code** opens a panel with the current page URL, or with a web URL it finds on the clipboard, and regenerates the code as you edit the text. It encodes UTF-8 bytes with Q error correction (25%) and reports the version, module count and byte count under the field. **Ink** and **Paper** set the code and background colours, and **Transparent background** drops the paper. A low-contrast or transparent palette gets a warning, not a block. **Download PNG** saves a roughly 1000 px raster, **Download SVG** saves a vector with a four-module quiet zone, and the **Copy** buttons put the PNG or SVG on the clipboard. If a browser refuses SVG image data, Copy SVG falls back to the SVG markup as text. Clipboard reading is best effort: if permission is refused or the clipboard holds something that is not a web URL, the page URL is left in place. Everything happens in the page; nothing is uploaded. Esc or Close dismisses the panel and returns focus to the page.

**🔎 Scan QR from screen** asks for screen capture, freezes the chosen screen or window and asks you to drag a box around the code. The crop is decoded locally in [a hosted reader window](qr-reader/index.html) with a bundled jsQR build; the image is passed to that window with `postMessage` and nothing is uploaded. The result offers **Open in this page** (the page that launched the reader), **Open in a new tab** and **Copy to clipboard**. Only an http(s) result gets the open actions; any other text can still be copied. **Cancel** or Esc ends the selection, and Esc or **×** closes the reader. The bookmarklet asks for `getDisplayMedia`, so it needs a browser and a page that allow screen capture; a page can still block the pop-up or the capture. The decoder is jsQR 1.4.0 under Apache-2.0, with the license in [qr-reader/](qr-reader/).

## Forms, environments and webhooks

**📋 Form Harvester** writes the current form's labels, names, types and values to `localStorage` under `bl:form` and to the clipboard. Password and file fields are skipped, hidden fields are kept, and the panel lists what it found.

**🧾 Form Stamper** reads that JSON, or one pasted into the panel, lets you edit and deselect fields, then fills the matching fields. Matching tries the saved selector, ID, name, label, placeholder and finally position. It uses the native value setter and dispatches `input`, `change` and `blur`, so React and Vue forms notice the change. Passwords are never filled.

**🏗️ Environment & Route Switcher** keeps the current path, query and hash while changing only the origin. Production, staging and local origins live in `localStorage` under `bl:envs`; each must be a valid http(s) origin before its **Go** link is enabled.

**📮 Webhook Bookmarklet Builder** writes a bookmarklet for you instead of sending anything itself. Give it a webhook URL, a method and a JSON template with placeholders — `{{url}}`, `{{title}}`, `{{host}}`, `{{selection}}`, `{{time}}` — and it emits a `javascript:` bookmarklet with the endpoint and template baked in as literals. Clicking that bookmark on any page fills the placeholders from that page, sends the JSON, and shows a toast: green with the status that came back, red with the CORS refusal, CSP block or HTTP error that stopped it. Placeholder values are escaped the way JSON escapes them, so a quote or a newline in a page title cannot corrupt the payload. Because the endpoint sits inside the bookmark, treat the bookmark itself as the secret. The builder keeps only its draft, under `bl:webhook`.

## Drive this page

**🤖 Drive this page** opens a companion [hub](webmcp/) window that drives the tab where you clicked. A page that publishes its own WebMCP tools (through `document.modelContext`) hands those tools to the model, which calls them by name with arguments the page itself validates. Otherwise the hub indexes up to 30 visible controls and asks a local model for one JSON action at a time: click, type, select, or done. After each move the next turn is told what actually happened — the page tool's answer, the new control count, `no visible change`, or the reason the page refused — so it works from the result instead of assuming the click landed. A run allows 25 steps by default, up to 100, and a refusal gets another turn rather than ending the run. Chrome's built-in Prompt API (Gemini Nano) is tried first, and when that API is missing the hub shows the two `chrome://flags` switches that turn it on plus a link to Chrome's own setup notes, instead of only reporting that no model was found. A browser with a real WebGPU adapter can load SmolLM2 360M, Qwen2.5 0.5B or Llama 3.2 1B through WebLLM; the weights download once and stay in the browser cache. The page map and the model's replies stay between the two windows, and no page content is uploaded.

The bookmarklet opens the hub during the click, so pop-ups must be allowed. The target accepts only messages from the hub's exact origin, the hub accepts only messages from the window it opened, and every later message carries a 128-bit session token. Password and file inputs are never indexed. **Kill** sends a halt before stopping the loop, an in-flight model call is discarded, and a run is capped at 12 steps. Closing the hub or reloading the page ends the session; clicking the bookmarklet again opens a fresh one.

Limits: a `Cross-Origin-Opener-Policy: same-origin` page severs `window.opener`; only the top document is visible, not cross-origin iframes; a full navigation loses the bridge; and the local model can still return an unusable action, which stops the run rather than guessing. `navigator.gpu` alone is not enough: the hub asks for an adapter before offering WebLLM, because some browsers expose the API without one. The bookmarklet is about 8 KB raw, above the 3 KB prototype target but well under Firefox's 64 KB bookmark limit.

## Doom

**💥 Will it run Doom?** opens a centered window with actual shareware **DOOM** Episode 1, not a lookalike. The bookmarklet is a small loader; [doom/](doom/index.html) hosts the unmodified Dwasm 2.2.0 WebAssembly engine and the shareware `DOOM1.WAD`. It starts on E1M1 at Hurt Me Plenty. **Expand** fills the browser, and **Open in tab** is there because a strict `frame-src` CSP can block the iframe.

The game loads frozen behind a **Click to play** gate. Opening the window, hovering over it or scrolling past it does not take the keyboard or the mouse. **Play** resumes the engine, asks for pointer lock and enables sound. `WASD` moves, `←`/`→` turn, the mouse looks, click or Ctrl fires, Space opens, Shift runs and Tab shows the map; the same list sits in the footer under the window. Mouse movement is only read while the canvas holds pointer lock, so a released pointer cannot spin or fire the player. Free-look is on: moving the mouse up or down tilts the view, while aiming still uses Doom's autoaim. Esc is captured before the engine sees it: it pauses the game and releases the mouse instead of opening the engine menu. The other menu keys (F1–F10) are captured as well, so save, load, options and help screens never interrupt the level. Close (or the header **×**) exits; Esc does not close the window. Closing releases the pointer, removes the overlay and restores the page's scroll and focus. The first load is about 7 MB; later visits use the browser cache. The engine and WAD provenance, licenses and hashes are in [doom/README.md](doom/README.md).

## Neon Hell

**👾 Neon Hell** is a Geometry Wars inspired neon bullet-hell arena, entirely contained in one bookmarklet and opened in a floating 960×600 window. There is no hosted page and no external asset: the bookmarklet is the whole game. It opens paused with **CLICK TO PLAY**, leaving the page its mouse, its keys and its scroll position until you click the arena. `WASD` moves with low-drag inertia, the arrow keys aim in eight directions, `Space` fires and `X` drops a banked bomb. The mouse can still aim and the left button can still fire; pressing an arrow switches to keyboard aim, and moving the mouse switches back. A standard gamepad is picked up silently: the left stick moves, the right stick aims and auto-fires, B or X drops a bomb, and Start pauses or resumes.

Chasers follow you, drifters ricochet, and purple grunts take three hits before splitting into micro-chasers. The enemy cap and spawn rate scale with the session clock. Pickups drift across the arena, expire after eight seconds and appear every 14–22 seconds: `R` grants rapid fire, `W` a three-way spread, `S` a one-hit shield, `B` a bomb charge, `C` ten seconds of chain rounds and `M` ten seconds of **MORTAR** rounds. Mortar shots fire slowly, fly through ships and detonate 250 px out in an 82 px blast that deals three damage, so placement matters more than holding the button. `Space` fires, `X` spends a bomb charge on a 220 px blast, and chain kills throw out three ricochet shards.

A boss enters at 40 seconds, then another 50 seconds after each spawn, in random order. The Prism Warden, Helix Core and Hive Mother mix two larger shapes, carry 54–72 base health plus a bonus per boss, and sit behind a health bar under the score. They fire rings, spirals and aimed fans, and the Hive Mother adds micro-chasers. `Esc` pauses, releases the page and lets you use the page behind the window; click the arena or press Start on a gamepad to resume. `F` expands to the viewport, and **Close** (or **×**) tears the game down and restores the page. The best score is stored in `localStorage` under `NEON_HELL_HS`, scoped to the origin you are on; storage failures fall back to the in-memory score. There are no touch controls yet.

## Tests

```sh
npm test
```

`tests/zip-tools.test.mjs` loads both ZIP bookmarklets in a VM with only their test exports and Node's web APIs. It builds archives and checks the central directory, deflate and stored entries, folder paths, UTF-8 names, duplicate names, size and entry caps; then reads them back, including data descriptors, duplicate paths, encrypted flags, ZIP64, split archives, symlinks, unknown methods, unsafe paths, and CRC failures with partial-folder cleanup. File System Access is exercised through an in-memory directory handle.

`scripts/fixtures/make-odf.mjs` writes `report.odt` and `report.ods` with plain XML and Node's own zlib, so the fixtures never come from the readers they test. The two files from LibreOffice and OpenOffice are kept as they were saved.

`tests/odf-tools.test.mjs` covers the OpenDocument converters: an `.odt` written by LibreOffice (headings, inherited run styles, links, lists, a table with a spanned header) read into the model; the same document out to HTML, Markdown, RTF, TXT and PDF; an `.ods` with typed cells, dates and booleans out to CSV, TSV and XLSX; CSV, XLSX and hand-built models back into `.odt` and `.ods`, including flat-list grouping, covered cells and embedded pictures; the package layout OpenDocument requires; the wrong-format, encrypted, ZIP64 and truncated rejection paths; and two real files from LibreOffice and OpenOffice — a character-style sample and a 56 KB manual with 21 tables and 40 lists — parsed as they are.

`tests/qr-tools.test.mjs` loads the QR tool's test export and checks a known URL's version, finder and timing patterns, the SVG quiet zone, UTF-8 byte counting, filenames and the too-long rejection.

`tests/qr-reader.test.mjs` loads the bundled jsQR 1.4.0 build and decodes the encoder's own matrices: a URL, an inverted light-on-dark code, UTF-8 text, and a blank image that must not report a result. It also checks the Apache-2.0 header and the shipped license.

`tests/webmcp.test.mjs` checks the protocol's JSON validation and limits, tool-call names and arguments, tools replacing the control map in the prompt, the 128-bit token shape, prompt bounds and path trimming, Prompt API/legacy/WebGPU detection including an adapter-less `navigator.gpu` and the two Gemini Nano flags, and the bookmarklet's origin, token, page-tool, HALT and cleanup gates against a fake DOM. Browser runs cover the handshake, a typed action, a full model loop driven by a deterministic test engine, Kill and recovery, and close-and-relaunch. A real local model was not available in the verification browser.

`tests/office-tools.test.mjs` builds and reads DOCX, XLSX, PDF and RTF output in Node: Word paragraphs, headings, lists, tables and images; HTML/Markdown/RTF/TXT to Word; CSV quoting; Excel sheet export; ordered-list restarts; table images; and PDF text in a paragraph that also carries an image. It also covers the cases real documents raise: a row that starts in a later column, a table row inside a content control, a cell with several paragraphs, a big Chinese RTF run, two RTF table rows, and an RTF picture with nested blip groups. Node has no canvas, so the PDF tests assert the skipped-image path; the image path is checked in Chrome.

## Add your own

For a normal tool, create `bookmarklets/<category>/<slug>.js` with a metadata comment, then rebuild:

```
/**
 * @name 📝 Page to Markdown
 * @category text
 * @description Convert the page content to Markdown and download it.
 * @tags markdown, convert, export
 * @traits offline, self-contained, no-cors, private-safe
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
qr-reader/                     hosted result window and bundled jsQR decoder for the screen QR tool
webmcp/                        hosted WebMCP hub: setup page, agent loop, protocol and model adapters
screenshots/<slug>.png         one capture per tool
scripts/fixtures/…             the demo page and media clips tools are captured against
scripts/fixtures/make-odf.mjs  writes report.odt and report.ods by hand, never through the code under test
scripts/fixtures/office/…      sample DOCX, XLSX, ODT, ODS, RTF, TXT, MD and CSV inputs, three of them real files from other apps (see its REAL-FILES.md)
tests/zip-tools.test.mjs       ZIP builder and reader tests
tests/office-tools.test.mjs    Office conversion tests
tests/odf-tools.test.mjs       OpenDocument conversion tests
tests/qr-tools.test.mjs        QR encoder, SVG and filename tests
tests/qr-reader.test.mjs       bundled jsQR decoder tests
tests/webmcp.test.mjs          WebMCP protocol, prompt and bookmarklet gate tests
scripts/build.mjs              builds the catalog
scripts/shots.mjs              runs tools in headless Chrome, captures screenshots
scripts/verify.mjs             integrity checks
robots.txt, sitemap.xml        what crawlers read
```

## Notes

- Stars are stored in this browser and sort starred tools to the top; there is no account, no shared count and no tracking.
- Bookmarklets run with the permissions of the page you click them on. Clipboard, camera and screen tools ask the browser first.
- Raw browser bookmark exports are gitignored and are never part of this repository.
