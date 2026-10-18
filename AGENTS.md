# AGENTS

Working notes for anyone (human or agent) changing this repo.

## What this is

A static, zero-dependency catalog of bookmarklets. GitHub Pages serves <https://spuds0588.github.io/Bookmarklet-Library/> straight from `main`; there is no server, no build step at runtime and no package dependencies. `node scripts/build.mjs` generates `data/catalog.json`, plus the crawlable blocks inside `index.html`, and those generated files are committed.

## Layout

```
bookmarklets/<category>/<slug>.js   one bookmarklet per file: metadata comment + raw code
data/catalog.json                   generated — never edit by hand
data/votes.json                     generated — 👍/👎 tally, never edit by hand
data/screenshots.json               generated — screenshot manifest, never edit by hand
screenshots/<slug>.png              generated — one capture per tool, committed
assets/style.css                    the whole theme, monochrome, CSS variables only
assets/app.js                       catalog rendering, search, picks, detail view, export
scripts/build.mjs                   source files -> data/catalog.json + index.html blocks
scripts/votes.mjs                   seeds one comment per tool, counts reactions -> data/votes.json
scripts/shots.mjs                   runs every tool on the demo page, captures screenshots/
scripts/fixtures/demo-page.html     the page tools are photographed against
scripts/verify.mjs                  integrity checks (catalog, votes, screenshots)
robots.txt, sitemap.xml             what crawlers read (hand-written)
.github/workflows/votes.yml         nightly reaction tally, commits data/votes.json
```

## Adding or changing a bookmarklet

1. Create `bookmarklets/<category>/<slug>.js`. The file starts with the metadata block, then the bookmarklet code exactly as it should run in the page (no `javascript:` prefix, no wrapping).
2. Run `node scripts/build.mjs`, then `node scripts/votes.mjs --offline`, then `node scripts/verify.mjs`. The vote step adds the new row; the nightly workflow creates its comment.
3. Run `node scripts/shots.mjs <slug> --force` if the tool's effect on the demo page changed.
4. Check it in a browser before committing.

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

## Rules

- **Never commit a browser bookmark export.** `bookmarks*.html` and `.freebuff/` are gitignored. Exports contain personal and employer data.
- **No ARIVE or Wizni tooling.** Anything tied to that LOS, its lender portal, its support site or its user admin does not belong here.
- **Vanilla only.** No frameworks, no CSS library, no runtime dependencies. Prefer a one-line solution over an abstraction.
- **Monochrome.** Black and white, hairline borders, square corners, uppercase mono micro-labels. Dark theme is the same palette inverted through CSS variables in `assets/style.css`.
- **The page has no header bar.** It opens on the intro; the theme toggle sits in the intro's top row. Content and the catalog instructions carry the page.
- **Install links are named.** A bookmark dragged out of the page inherits the anchor's text, so the install button is exactly the tool's name — emoji included — with "Drag onto your bookmarks bar" underneath. Never label a drag target "Drag" or "Drag to bookmarks bar"; the bookmark would arrive with that name.
- **Screenshots are captured, not drawn.** `scripts/shots.mjs` runs each tool on `scripts/fixtures/demo-page.html` in headless Chrome and saves `screenshots/<slug>.png` at 1200x750. Never hand-edit a capture or fake one.
- **The demo page carries the hooks a tool looks for**: the ad blocks `.ad-slot` and `.ad-inline`, `.audio-wrapper` around the player, `#toast`, a `<video>` and an `<audio>` clip, an iframe, a form with demo values, and demo addresses to find and hide. Add a hook when a tool needs one — `audio-pip` looks for `.audio-wrapper` — because deleting one leaves that tool nothing to work on.
- **A tool that shows its result only after you use it gets driven.** `STEPS` in `shots.mjs` holds real input events per slug — draw a stroke, click an element, type a query run a snippet, paste an image — so the capture shows the result rather than the blank canvas or the invite to start.
- **A window a tool opens is driven too.** `AFTER` holds the steps for a popup the tool opened, run before the capture: a recorder says "ready" until somebody presses start, so it is not photographed until it says "Recording". Buttons are found by their label with `clickText` when the markup has no stable selector, and `STUBS` answers a save-file picker with a writable that goes nowhere, since a native dialog cannot be answered by a headless run.
- **No image beats a misleading image.** A tool whose work never reaches the page — a download, the clipboard, speech, another site, a recording — is recorded in `data/screenshots.json` as a `reason` with no file. The tile then shows the tool's own description with the reason under it, so the space the picture would take still says what the tool does. `REASONS` in `shots.mjs` is that list, and `verify.mjs` fails any entry that has both a file and a reason, neither, or an unknown reason. Every PNG must be named by the manifest.
- **A floating player needs a real display.** A picture-in-picture window is not part of the page surface and headless Chrome has no target for it, so the video and audio players are photographed on a display: `DISPLAY_TOOLS` lists them, `CHECKS` asserts the player really opened, and `node scripts/shots.mjs --display=:99` grabs the screen with ffmpeg (x11grab) instead of the page. Xvfb is enough and needs no root: `docker run -d --name bl-xvfb -v /tmp/.X11-unix:/tmp/.X11-unix alpine:3.20 sh -c 'apk add --no-cache xvfb && exec Xvfb :99 -screen 0 1200x750x24 -ac -nolisten tcp'`, and `docker start bl-xvfb` brings it back once it exists. Chrome is forced to `--ozone-platform=x11` with `WAYLAND_DISPLAY` dropped so it cannot land on the real desktop instead, the page is pinned to its light palette, and a document PiP window is moved into the corner with `Browser.setWindowBounds`. With no display those captures are kept as they are, and a forced run says so. The video player shows a frame because `PREP` starts playback first.
- **A screen recorder still has no image.** `record-tab` records to a file and Chrome paints no indicator for it on a bare display, so it keeps its `display` reason — the copy now says "Records your screen" rather than claiming the catalog cannot photograph a floating window. `grab-text` reads the screen and puts the text on the clipboard, so it carries the `clipboard` reason.
- **Hover is motion, not repaint.** A card lifts off the grid — `translateY(-4px)` and a soft shadow — and every colour on it, including its children's, stays put. Install and copy buttons pop the same way. No hover inverts a card or swaps its palette.
- **Cards open into the page.** Clicking a card, its screenshot or its **Details** button grows that card's rectangle into the full-page view at `#t/<slug>`: the panel animates a clip-path from the card's own rect, so the card you clicked is what becomes the page. **Back** sits at the top-left of the detail bar, and closing shrinks the panel back to the card. Under `prefers-reduced-motion` both directions are a 140 ms fade. The featured panel grows from its thumbnail, not from that tool's card further down the grid.
- **The page is also a document.** The grid is built by `fetch()`, so anything that does not run scripts would see an empty page. `build.mjs` therefore writes two blocks into `index.html` between `<!-- tools:start -->` and `<!-- tools:end -->`: a `<noscript>` list of every tool with its description, and an `ItemList` of `SoftwareApplication` entries. Edit the tool files, never those blocks — `build.mjs --check` fails when they drift. Canonical URL, Open Graph, Twitter cards, `WebSite` and `FAQPage` structured data, `robots.txt` and `sitemap.xml` are hand-written; keep the FAQ text in the page and the FAQ schema saying the same thing. `?q=` preselects the search box because the `SearchAction` advertises it.
- **The author card is one line of markup.** The footer holds `<burns-dev-card layout="full-width"></burns-dev-card>` and the script is loaded once in the head from the shared component URL. Standalone placement is `full-width`; never put the element inside a flex or grid row. Do not restyle its internals — the component owns its look, and a local override forks it.
- **Votes live on GitHub, never in the page.** One comment per tool on the issue titled "Tool votes"; 👍 and 👎 reactions are the ballots. `scripts/votes.mjs` seeds comments and tallies them into `data/votes.json`, and the workflow commits it. No `localStorage` votes, no counter API.
- **YAGNI.** Add the smallest thing that works; delete what nothing uses.

## Verify before committing

```sh
node scripts/build.mjs && node scripts/verify.mjs && node scripts/build.mjs --check
node scripts/shots.mjs        # only when a tool's on-page effect changed
node scripts/shots.mjs <slug> --force                  # one tool, when it or the fixture changed
node scripts/shots.mjs --display=:99 <slug> --force    # the floating players, with a display running
python3 -m http.server 4173   # then open http://127.0.0.1:4173
```

Stop any dev server you started and leave the workspace clean when you are done. Commit in small steps with a message that says why.
