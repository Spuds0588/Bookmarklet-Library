# HISTORY

What has been done, in order. Newest entries first.

## 2026-10-28 — QR codes from the page, as PNG or SVG

**Changed**

- Added **🔳 QR code** under Text. It opens a shadow-root panel prefilled with the page URL, regenerates as you type, encodes UTF-8 bytes with Q error correction (25%), and shows the module count, version and byte count.
- **Download PNG** writes a roughly 1000 px image; **Download SVG** writes a vector with a four-module quiet zone. The **Copy** buttons put the PNG or SVG on the clipboard, and SVG falls back to the markup as text when image clipboard data is refused.
- The panel closes with Esc, × or Close, traps Tab, and restores page focus. The text never leaves the page. The bundled qr.js 0.0.0 encoder is MIT, attributed at the top of the source.
- README, AGENTS, TODO, the catalog card and the screenshot describe the tool. The capture uses `https://example.com/field-guide`.

**Verified**

- `npm test`: 53 tests pass. `build.mjs --check`, `compose.mjs --check` and `verify.mjs` pass with 116 bookmarklets, eight categories, 81 screenshots and 35 explained tools.
- Chrome against the local catalog: the panel opened with the page URL and a 29×29 version 3 code for a 31-byte URL. Live updates handled UTF-8 (`café ☕` gave 21×21 and 9 bytes); 3,000 characters showed the too-long message and disabled all four actions; **Use page URL** restored the code.
- The PNG was 999×999 and 46,678 bytes for the local URL; the SVG was 3,219 bytes with `viewBox="0 0 37 37"`. **Copy PNG** resolved as `image/png`; **Copy SVG** resolved as `image/svg+xml` in Chrome, and the text-markup fallback was exercised with a substituted clipboard.
- The QR matrix for a URL and UTF-8 text decoded correctly with jsQR before the UI work. Esc closed the panel and returned focus to the page.

**Limit**

- Copy has only been clicked in Chrome. Firefox and Safari fall back to SVG markup but were not tested there, and there has been no physical scanner pass.

## 2026-10-28 — Neon Hell clears its chrome and adds bombs and chains

**Changed**

- The window header now carries only `RUNNING`, **F** and **×**. The title and `ARENA 01 // BULLET HELL` kicker are gone, and `ARENA 01` sits under the score block with the effect timers below it.
- Pickups are now 19 px across and drift at 38–70 px/s, bouncing off the arena walls. They expire after eight seconds, only two can be on the field, and one appears every 14–22 seconds after the first at 4.5 seconds.
- **B** adds a bomb charge, up to three. `Space` spends one on a 220 px blast that clears nearby ships, shakes the screen and draws an expanding ring; the count sits under the multiplier.
- **C** grants ten seconds of chain rounds. Each kill throws three purple shards that ricochet twice and can kill two further generations of enemies before stopping. Bullets and shards render separately.
- Restart clears bomb charges, chain time, the wave and every pickup. README, AGENTS, TODO and the detail view describe the pickup spacing, movement, bomb and chain rules. The screenshot was regenerated with the larger drifting pickup.

**Verified**

- `npm test`: 49 tests pass. `build.mjs --check`, `compose.mjs --check` and `verify.mjs` pass with 115 bookmarklets, eight categories, 80 screenshots and 35 explained tools.
- Headless Chrome, built bookmarklet on the demo page: a pickup was `r: 19`, had eight seconds of life, moved 13.6 px in 250 ms and disappeared when its timer expired. The next spawn was 17.1 seconds away. A `Space` keydown with one bomb charge cleared a nearby enemy and left zero charges. With chain active, a bullet killed one enemy and left three `shard` bullets at depth 1; moving one shard into the left wall reversed its velocity from -300 to 300 and reduced `bounce` from 2 to 1. The shield still absorbed one hit, and restart cleared all effects.
- Source is 25.9 KB, bookmark URL 45.1 KB, under the 64 KB ceiling.
- Production after the push (`ce4fa29`): the served source matched the checkout's SHA-256, the catalog reported 26,471 bytes and a 45.1 KB URL, and the screenshot hash matched. The live install opened with no brand block; a `Space` keydown consumed the one bomb charge and cleared the adjacent enemy; the chevron pickup reported `r: 19`, eight seconds of life, wall-relative drift and the next spawn 17.7 seconds out; the chain test left three depth-1 shards with two bounces each.

**Limit**

- Power-ups are still random and temporary; there is no inventory beyond the bomb charges. The game has no touch controls or sound, and Firefox and Safari remain untested.

## 2026-10-28 — Neon Hell drifts into power-ups

**Changed**

- Player movement now uses low-drag thrust: releasing a direction keeps the ship sliding for about a second instead of stopping like a cursor. The speed cap stays at 300 px/s, and hitting a wall now clears only the velocity into that wall, so the next input leaves immediately.
- Random pickups join the loop. The first lands around 3.5 seconds, later ones every 9–14 seconds, at up to three on the field for 14 seconds each. **R** gives rapid fire for 9 seconds, **W** gives a three-way spread for 9 seconds, and **S** gives a shield that absorbs one hit. Collecting one adds 50 points and bursts its colour.
- Active effects sit under the score with their timers; the shield also draws a cyan ring around the ship. Restart clears the pickups, effects and power-up clock. The screenshot now waits for the first pickup and shows it in the arena.
- README, AGENTS, TODO and the detail view describe the drift and the three pickups.

**Verified**

- Headless Chrome, built bookmarklet on the demo page: 300 ms of `d` reached 248 px/s; after release the ship travelled another 49 px in 300 ms and 80 px over 900 ms, ending at 20 px/s. Rapid plus spread produced six bullets in 130 ms. A shield absorbed `damage()` without changing lives, then cleared itself. A spawned pickup sat 184 px from the player. Restart cleared all three effects, both timers and the pickups.
- `npm test`: 49 tests pass. `build.mjs --check`, `compose.mjs --check` and `verify.mjs` pass with 115 bookmarklets, eight categories, 80 screenshots and 35 explained tools. `screenshots/neon-hell.png` was regenerated with a pickup on screen.
- Source is 23.0 KB, bookmark URL 39.6 KB, under the 64 KB ceiling.
- Production after the push (`60077bc`): the served source matched the checkout's SHA-256, the catalog reported 23,588 bytes and a 39.6 KB URL, and the screenshot hash matched. Running the install link from the live detail page opened the game; a 300 ms thrust reached 247.9 px/s and the ship glided another 70.4 px in the next 600 ms; rapid plus spread fired six bullets in 130 ms; and a fresh shield absorbed one hit with lives staying at three.

**Limit**

- Pickups are random, so a run may go a while without the one you want; there is no inventory or carry-over. Touch controls, sound and a shared leaderboard are still absent, and the game remains Chrome-tested only.

## 2026-10-28 — Neon Hell opens the Games category

**Changed**

- Added **👾 Neon Hell**, a self-contained neon bullet-hell arena in a shadow-root window. `WASD` or the arrow keys move with inertia, the mouse aims, and holding the left button fires ten shots a second. Chasers home in, drifters ricochet, and purple grunts take three hits before splitting. The enemy cap and spawn rate rise with the session clock; particles, screen shake, a live score and a local best score keep the run readable. Esc pauses, F expands and Close tears down every node and listener.
- Added a **🎮 Games** category after View, with `Doom, Neon Hell` in the README and its own how-to copy on the detail page. **💥 Will it run Doom?** moved from `bookmarklets/view/` to `bookmarklets/games/`; `build.mjs` now emits the category, the catalog, the crawlable `<noscript>` block and the `ItemList` all agree, and the old path is gone.
- The game's best score lives in `localStorage` under `NEON_HELL_HS`, scoped to the origin it runs on. A blocked store leaves the in-memory score working rather than breaking the game. There is no network request and no hosted page.
- README, AGENTS, TODO, the Games chip, the catalog card and the full-page controls note describe the game and the new category. `scripts/shots.mjs` waits for enemies, aims right and holds fire, so the capture shows the arena in motion.
- The source is 19.1 KB and its bookmark URL is 32.4 KB, under the 64 KB self-imposed ceiling.

**Verified**

- `npm test`: 49 tests pass. `build.mjs --check`, `compose.mjs --check` and `verify.mjs` pass with 115 bookmarklets, eight categories, 80 screenshots and 35 explained tools.
- Headless Chrome, built bookmarklet on the demo page: the window opened at 960×600 with the canvas focused; `d` moved the player 41 px in 300 ms; holding the left button produced four bullets and killed a target for 100 points; Esc paused and released the page, and Esc or a click on the canvas resumed it and hid the page overflow again; F filled a 1200×750 viewport; the game-over path wrote a best of 1234 to storage; restart returned three lives and no enemies; Close removed `#nh-root`, restored overflow and focus, and a second run reopened cleanly.
- Local catalog: the Games chip reads 2, filtering shows only Neon Hell and Doom, both cards use `screenshots/neon-hell.png` and `screenshots/doom.png`, and the detail view names the category and links `bookmarklets/games/neon-hell.js`.
- Structured data: the ItemList carries 115 items and both games point at `bookmarklets/games/` rather than the old `view/` path.
- Production after the push (`59ddfc5`): GitHub Pages served the eight-category catalog with Games at 2, the static Games block and the new `bookmarklets/games/` URLs. `bookmarklets/games/neon-hell.js` returned 200 with the same SHA-256 as the checkout, the old `bookmarklets/view/doom.js` returned 404, and both card screenshots loaded at 1200 px wide. Filtering the live page to Games showed only Neon Hell and Doom; the live detail view named the category and linked the new source path. Running the published install href on the live page opened the game, paused and resumed it by clicking the canvas, and closed back to the page.

**Limit**

- The game has no touch controls, sound or shared high-score table. It has only been played in Chrome; Firefox and Safari are untested.

## 2026-10-28 — Doom stops taking input until Play, and looks up

**Changed**

- The game only turns, looks or fires while the canvas actually holds pointer lock. Absolute mouse movement and wheel events are dropped before SDL when the pointer is free, and gameplay keys are stopped while the gate is up. Hovering the window or moving the mouse across it no longer spins the player or queues a weapon switch for later.
- Esc has one job. The loader no longer listens for it at all, and the hosted page captures it before PrBoom: it pauses, releases pointer lock and suspends audio, then does nothing while paused. It cannot both stop mouse capture and close the window. Enter, Space or **Resume** start the level again.
- Free-look is on. `doom/prboomX.cfg` is Dwasm's default config with `movement_mouselook 1` appended; the page fetches it and passes `-config /prboomX.cfg`, so the packaged binaries and `index.data` are untouched. Moving the mouse up or down tilts the view; aiming still uses Doom's autoaim.
- The controls footer under the window now lists the keys players actually have: `WASD moves · ←/→ turns · mouse looks · Ctrl / click fires · Space opens · Shift runs · Tab map · Esc pauses · Close exits`. The gate shows the same list. The iframe now asks for `pointer-lock` explicitly.
- README, AGENTS, TODO, the detail copy, both FAQ copies and `doom/README.md` describe the input freeze, the config override and vertical look.

**Verified**

- `npm test`: 49 tests pass. `build.mjs --check`, `compose.mjs --check` and `verify.mjs` pass with 114 bookmarklets, 79 screenshots and 35 explained tools. The Doom capture was regenerated from the new footer.
- Local direct page: the gate is up with audio suspended; a `w`, a wheel event and a mousemove all fail to reach a spy listener added after the page's handlers. Space hides the gate, focuses the canvas and starts audio; Esc suspends audio and shows **Paused**; Esc while paused does nothing.
- Separate headless Chrome, direct page: Play granted pointer lock, the config file at `/prboomX.cfg` contained `movement_mouselook 1`, and moving the mouse upward changed the rendered view from the corridor to the ceiling. The temporary before/after captures were deleted; the committed card capture stays at the starting view.
- Separate headless Chrome, modal: opening left focus on `BODY`; Play granted pointer lock to the iframe canvas; Esc released the lock, paused and left the window open; a second Esc did nothing; **Close** removed the window and restored `overflow`.

**Limit**

- The Freebuff preview browser refuses pointer lock (`SecurityError: The root document of this element is not valid for pointer lock`), so mouse capture cannot be clicked through there. A plain headless Chrome did grant it for the look test. Touch controls remain absent, and a strict `frame-src` CSP still needs **Open in tab**.

## 2026-10-28 — Doom waits for Play, and Esc means pause

**Changed**

- The game now loads frozen behind a **Click to play** gate with its audio context suspended. Nothing is focused, moved or captured until that button is pressed; Play resumes the engine, focuses the canvas, enables sound and asks for pointer lock. The host page still does not move focus when the window opens.
- Esc is captured before the engine sees it and only pauses: it releases pointer lock, freezes the main loop, suspends audio and shows **Paused**. Pressing Esc again while paused does nothing. Enter or Space resumes. The loader no longer closes or shrinks on Esc; the header **×** closes. Window blur, tab hide and pointer-lock loss also pause, so the game cannot keep taking input when it is not focused.
- PrBoom's menus are no longer reachable: F1–F10 and Pause are captured along with Esc, so save, load, options, help and quit screens never open. Keyboard events are stopped before the engine while paused, so a stray key cannot queue movement for the resume.
- The loader has a plain-text controls footer under the stage: **WASD / arrows move · Mouse turns · Click / Ctrl fires · Space opens · Shift runs · Tab map · Esc pauses · Close exits**. The gate repeats the same list for the Open-in-tab page. The capture was regenerated with the game running and the footer visible.
- README, AGENTS, TODO, the detail note and both FAQ copies now describe the gate, the controls footer and the single-purpose Esc.

**Verified**

- `npm test`: 49 tests pass. `build.mjs --check`, `compose.mjs --check` and `verify.mjs` pass with 114 bookmarklets, 79 screenshots and 35 explained tools. `node scripts/shots.mjs doom --force` captured the real game in the window with the footer and no hint over the HUD.
- Local direct page: the gate is visible and the audio context is suspended; Enter or **Click to play** hides the gate, starts the loop and focuses the canvas. Esc shows **Paused**, suspends audio and increments the pause call; Enter resumes. A blur pauses. A paused `w` keydown does not reach a spy listener added after the page's own, and an F1 keydown while playing is also stopped. A denied pointer-lock request emits `pointerlockerror` but no longer pauses the game.
- Local modal: 960×685 with the footer, focus stays on the page link, Esc pauses the game without closing the host, host-level Esc no longer closes or shrinks, and **Close** removes the window and restores focus and `overflow`.
- Headless capture: pointer lock was granted after Play (the temporary "Mouse captured" hint appeared in the earlier capture), and the final capture is live gameplay with the footer rather than the gate.

**Limit**

- The Freebuff preview surface refuses pointer lock (`SecurityError: The root document of this element is not valid for pointer lock`), so releasing an actual pointer lock with Esc was not exercised there. The same page did grant lock in the headless Chrome capture. Touch controls remain absent, the first load is about 7 MB, and a strict `frame-src` CSP still needs **Open in tab**.

## 2026-10-28 — Doom becomes a window, not a takeover

**Changed**

- **💥 Will it run Doom?** now opens as a centered 960 px, 16:10 window over a dimmed page instead of filling the viewport. The header has **Expand** (fills the browser), **Open in tab** and **Close**; **Shrink** returns to the window. On narrow screens the tab label shortens to **Tab**.
- Opening no longer focuses the iframe or the game canvas, so typing stays on the page until the game is clicked. The hosted page requests pointer lock only from a real canvas click, explicitly exits pointer lock on Esc, and listens for a close message from the loader. Closing the loader sends that message, restores the page's previous focus and scroll, and leaves no frame or overlay behind. Escape while expanded shrinks first and closes on the next press.
- README, AGENTS, TODO, the bookmarklet description, the detail note and both FAQ copies now describe the window, Expand and the focus behaviour. The 1200×750 capture was regenerated from the new panel.

**Verified**

- `npm test`: 49 tests pass. `build.mjs --check`, `compose.mjs --check` and `verify.mjs` pass with 114 bookmarklets, 79 screenshots and 35 explained tools. `node scripts/shots.mjs doom --force` captured the real game in the new window.
- Local Chrome at 1280×901: the window is 960×652 with a 958×599 stage, focus stays on the link that had it, Expand fills the 1120×887 viewport, Shrink returns to 960×652, the first Escape shrinks, the second closes, and close restores the link's focus and the page's `overflow`.
- The hosted page loads with `activeElement` on `BODY`, no pointer lock, and the hint visible. A synthetic canvas click focuses the canvas but this embedded preview refuses pointer lock with `SecurityError: The root document of this element is not valid for pointer lock`, so the game's mouse-look and the Esc release need a regular browser window.

**Limit**

- The first load is still about 7 MB. There are no touch controls, and a strict `frame-src` CSP needs **Open in tab**. Pointer lock cannot be exercised inside the Freebuff preview surface; the release path itself is explicit in the hosted page and the loader.

## 2026-10-28 — Actual Doom replaces the raycaster

**Changed**

- **💥 Will it run Doom?** opens actual shareware DOOM Episode 1 instead of the 19 KB E1M1-inspired raycaster. The bookmarklet is a 4.5 KB loader; `doom/` hosts Dwasm 2.2.0 (`index.js`, `index.wasm`, `index.data`) and the 4,196,020-byte shareware `DOOM1.WAD`. It starts on E1M1 at Hurt Me Plenty.
- The panel is a shadow-root full-screen iframe. It grants `autoplay`, `fullscreen` and `gamepad`, keeps **Open in tab** for pages whose `frame-src` CSP blocks the iframe, and restores the host page's previous `overflow` when it closes. The hosted page writes the WAD into the engine's memory filesystem and starts with `-iwad doom1.wad -warp 1 1 -skill 3`.
- `doom/` carries GPLv2 (`COPYING`), id's shareware terms (`LICENSE-DOOM.txt`) and provenance with SHA-256 hashes. The page is `noindex`. The detail view has a Doom-specific note; README, AGENTS, TODO and the FAQ now describe the hosted load and the tab fallback. The old raycaster specification is marked superseded.
- The screenshot fixture server serves `doom/`; the 1200×750 card capture is the real game, not a blank frame.

**Verified**

- `npm test`: 49 tests pass. `build.mjs --check`, `compose.mjs --check` and `verify.mjs` pass with 114 bookmarklets, 79 screenshots and 35 explained tools. The visible FAQ and FAQPage schema match 10 for 10.
- Local Chrome: the overlay reaches E1M1, the iframe is `Dwasm 2.2.0` with a 1366×768 canvas, `Space` reaches the game, **Open in tab** points at `/doom/`, and the close button removes the host and restores `overflow`. The page and all engine assets hash as committed.
- Production: `/doom/` returns 200 for the page, JS, WASM, config and WAD; the WASM is `application/wasm`, the WAD `application/x-doom`. All seven served files match their local SHA-256. The live bookmarklet opens E1M1 from the production page, `Space` registers, and close restores the page. The live detail view shows the new capture and the Doom-specific note.

**Limit**

- The first load is about 7 MB. There are no touch controls; pointer lock was not exercised in the preview browser, though keyboard input was. A strict `frame-src` CSP requires **Open in tab**.

## 2026-10-28 — Twelve browser tools for presenting, forms and demos

**Changed**

- Twelve new cards, each its own bookmarklet: **📊 Table to CSV / Markdown**, **🔗 Deep Fragment Citation Linker**, **🕶️ Demo PII & Sensitive Data Masker**, **🏗️ Environment & Route Switcher**, **📋 Form Harvester**, **🧾 Form Stamper**, **📮 Context Webhook Dispatcher**, **🔦 Focus Spotlight presenter**, **📹 1-Click Jitsi Meeting**, **🔒 URL-Anchored Secret Chat**, **🎙️ Voice Macro Commander** and **💥 Will it run Doom?**.
- **URL chat** is the one hosted helper: `chat.html` hashes the page origin and path into a PeerJS room, elects one host, relays through it and removes the peer on unload. The room name is a rendezvous key, not a password, and the page is `noindex`. It loads PeerJS from unpkg; no bookmarklet gained a runtime dependency.
- **PII masker** replaces terms, emails and optional regular expressions, can blur the matching elements, and restores the original text from the snapshot it kept. The form pair writes and reads `bl:form`, skips password and file fields, and the stamper uses the native value setter plus `input`, `change` and `blur`. The environment switcher stores valid origins under `bl:envs` and keeps the current path, query and hash; the webhook stores its endpoint under `bl:webhook` and copies the payload when CORS or CSP blocks the POST.
- **Doom** is a self-contained 19 KB raycaster with Web Audio, no WAD, WASM, WebGL or network request. It stays under the 64 KB source and encoded budget, and Escape or `pagehide` removes the overlay, listeners, animation frame and `AudioContext`.
- README, AGENTS, TODO, the visible page FAQ and the FAQPage schema describe the new tools, their local storage keys, the PeerJS exception and Doom's budget. The FAQ no longer claims there is no runtime dependency at all.

**Verified**

- `npm test`: 49 tests pass. `node scripts/build.mjs` writes 114 bookmarklets, `node scripts/verify.mjs` reports 114 bookmarklets, 79 screenshots and 35 tools explained without one, and both `build.mjs --check` and `compose.mjs --check` exit 0.
- Browser checks on the demo page: the table picker copied 5 rows by 3 columns as CSV and GFM; the PII masker changed 6 nodes and restored the header and addresses; a valid origin produced the expected URL and `ftp://` disabled the link; the form pair harvested and refilled 4 fields, skipped the password, kept the hidden field and fired the native events; the webhook reached a local CORS receiver and fell back to the clipboard on failure; Doom moved, hit an imp for 20 damage, took 12 damage, killed one, reached the death state, toggled music, and tore down on Escape.
- URL chat was exercised with two tabs in the same room: one host was elected, messages went both ways, and a guest's message was no longer echoed back to itself. Voice commands were driven with a substituted `SpeechRecognition`; the citation produced a `#:~:text=` URL and a local date.

**Production**

- `main` is live at <https://spuds0588.github.io/Bookmarklet-Library/>. Pages serves 114 tools, 79 captures and 35 explained tools, and the page carries 114 cards, 114 stars and nine FAQ questions matching the FAQPage schema.
- The served page, catalog, screenshot manifest, app, stylesheet, chat page and all twelve new bookmarklets hash the same as the commit. The live page in Chrome shows the twelve new cards and logs no console errors or failed requests.
- The live catalog's PII bookmarklet ran on the production demo page: it masked 6 text nodes, all four `mailto` labels became `[email]`, and **Restore page** put the four addresses back, and the panel then closed cleanly. The demo page's missing `demo.mp4`, `demo.mp3` and `/embed` are fixture 404s, not tool errors.

**Limit**

- URL chat has not been tested with three guests, a host leaving mid-room, or Firefox and Safari. It depends on the public PeerJS broker and CDN. Doom has no touch controls.

## 2026-10-27 — Thirteen credited community bookmarklets

**Changed**

- Thirteen cards now come from other developers: **The "Redactor" (Live Page Editor)**, **Reveal Hidden Passwords**, **Kill Sticky Headers**, **Training Video Speeder**, **Enable Right-Click & Text Selection**, **Extract All Emails from Page**, **Highlight All Links**, **The Layout Debugger (DOM Tinter)**, **Wireframe Outline Mode**, **Native Hex EyeDropper**, **Instant Dark Mode (Invert Colors)**, **Show Hidden Form Fields** and **Display Image Alt Text (A11y Check)**. Each keeps the original tool name after its emoji and carries `@author` and `@credit`.
- The card shows **By …** linked to the original. The detail view adds a **Credit** row and an **Original source** button beside **Source file**, so the borrowed work and this repository's copy are both one click away. `build.mjs` refuses an author without a credit or a credit that is not an http(s) URL, and the generated `<noscript>` list plus `ItemList.sameAs` carry the original link too.
- **Show Hidden Form Fields** is the being-frank gist; **Kill Sticky Headers** links Alisdair McDiarmid's page; the Thomas Orlita tools link his `awesome-bookmarklets` repo. Snippets with no named author are labelled **Community snippet** and link the reference they follow.
- The list's local/session storage cleaner is not a separate card because **🧹 Clear cookies and cache** already clears both, plus cookies and cache. The README says so rather than dropping the item silently.
- The demo fixture gains a password field and a hidden CSRF field so both reveal tools can be photographed; their captures scroll the form into view. Seven new visible results get captures; the six tools that change page state or open a browser dialog get reasons instead.
- README, AGENTS, TODO, the page FAQ and the FAQPage schema now explain the credit fields and the community cards.

**Verified**

- `npm test`: 49 tests pass. `node scripts/build.mjs` writes 102 tools, `node scripts/verify.mjs` reports 102 tools, 71 screenshots and 31 explained without one, and both `build.mjs --check` and `compose.mjs --check` pass.
- All ten distinct credit URLs return HTTP 200.
- Browser on `http://127.0.0.1:4173`: 102 cards, 13 **By** labels, the detail **Credit** row and **Original source** href on **The "Redactor"**, 7 FAQ questions matching 7 FAQPage entries, and an `ItemList` with 102 items and 13 credit `sameAs` pairs.
- Built bookmarklet code was fetched from the catalog and run on the demo page with assertions: password type `text`, hidden input `text` with a red border, video `playbackRate` 2, fixed toast `static`, context-menu handler cleared, links yellow, body outline red, body tint `rgba(0, 0, 0, 0.1)`, dark filter `invert(1)`, design mode `on`, alt label shown, email prompt unique, and the eyedropper prompt `#123456`. The only console errors were the demo fixture's missing media files (`demo.mp4`, `demo.mp3`, `/embed`), not the tools.

**Production**

- `main` is live at <https://spuds0588.github.io/Bookmarklet-Library/>. Pages serves the new catalog: 102 tools, 13 credited cards, 71 captures and 31 explained tools.
- All 25 changed served files hash the same on Pages as in the commit: the page, app, styles, both manifests, the thirteen bookmarklets and the seven new captures.
- The live page in Chrome: 102 cards, 13 **By** labels, 102 stars, no thumbs, 7 FAQ questions and an `ItemList` of 102 with 13 credit `sameAs` pairs. **The "Redactor"** opens with its **Credit** row and both **Source file** and **Original source** links, and the page logs no console errors or failed requests.
- This deployment also carries the local-star change documented below: no vote file, no tally workflow and no thumbs.

**Limit**

- A credit records one source. A tool with several upstream versions names the one this code follows; it does not claim every version.

## 2026-10-27 — Local stars replace the shared vote tally

**Changed**

- The 👍/👎 pair is gone. Each card's top row and the detail bar now carry one star that toggles a personal preference in `localStorage` under `bl:stars`. Starred tools sort to the top of the active category or search, and the star keeps its state across reloads.
- The GitHub reaction ballot is removed: `data/votes.json`, `scripts/votes.mjs` and `.github/workflows/votes.yml` are deleted, and `scripts/verify.mjs` no longer checks vote rows. The **Top rated** chip goes with them; starring is the only ordering control.
- README, AGENTS, TODO and the footer now describe stars as local, with no account, shared count or server.

**Verified**

- `npm test`: 49 tests pass. `node scripts/build.mjs` wrote 89 bookmarklets, `node scripts/verify.mjs` reported 89 bookmarklets, 64 screenshots and 25 tools explained without one, and `node scripts/build.mjs --check` and `node scripts/compose.mjs --check` both pass.
- Browser run at `http://127.0.0.1:4173`: 89 cards and 89 star buttons, no thumb controls and no **Top rated** chip. Starring **Advanced find** moved it to the first card and wrote `bl:stars`; a reload kept it first. In a "markdown" search, starring **Word to Markdown** moved it to the first of 10 results. In the **View** filter, starring **Zoom lens** moved it to the first of 12. The detail star switched between **Star** and **Starred** and reordered the grid underneath. No console errors, and the page no longer requests `data/votes.json`.

**Limit**

- Stars are per browser profile. Clearing site storage or using another browser starts with no stars; there is no shared count by design.

## 2026-10-27 — Converter corpus fixes, and one stack for the questions

**Changed**

- The Office and OpenDocument converters were run against a wider corpus of real documents. The fixes:
  - A DOCX table row inside a content control, custom XML or smart tag is read, and a cell with several paragraphs keeps its lines in every target instead of running them together.
  - Nested numbered lists write `1.1.` and `1.1.1.` in Word instead of restarting at `1.` at each depth.
  - HTML `<caption>` becomes a paragraph. Table cells with several paragraphs join with `<br>` in HTML and Markdown, `\line` in RTF, and a space in PDF and plain text.
  - An XLSX row whose first value starts in a later column keeps its position instead of sliding left. ODS keeps a numeric zero, leading blank column runs keep later cells aligned, trailing padding costs nothing, and a repeated row run over the 100,000-row limit is refused by name rather than silently truncated (the old 10,000-row cap is gone).
  - ODT nested lists continue their parent's numbering.
  - RTF matches `\pict` groups by braces, so a nested `\*\blipuid` group no longer leaks hex into the text; `\ucN` skips are honored; Big5, Shift-JIS, GBK, EUC-KR and UTF-8 runs decode as units; and table rows merge into one table instead of duplicating it.
- The page's Questions section is a single stack with a readable measure, replacing the two-column pairs whose ragged bottoms cut the last answer under the row rule. It also sits in the same centered, padded column as the catalog and how-it-works sections instead of running to the viewport edge.
- README now says cells keep their paragraphs and OpenDocument lists continue numbering, and the test summary names the real-document cases.

**Verified**

- `npm test`: 49 tests pass (10 ZIP, 24 Office, 15 OpenDocument). `node scripts/compose.mjs --check`, `node scripts/build.mjs`, `node scripts/verify.mjs` and `node scripts/build.mjs --check` exit 0; the catalog reports 89 bookmarklets, 89 vote rows and 64 screenshots.
- The FAQ was inspected in Chrome at 1440px: six questions in one column, every answer at a 68-character measure, and the last answer ending at the section rule with no overflow. The heading now starts at 151px, the same as the catalog and how-it-works headings; at 390px the section keeps its 18px inset.

**Production**

- `main` is live at <https://spuds0588.github.io/Bookmarklet-Library/>. All 28 served files this pass changed — the 26 generated converters, `data/catalog.json` and `assets/style.css` — hash the same on Pages as in the commit.
- The live page in Chrome: 89 cards, six questions in one column, the last answer inside the section rule, the featured panel still **🔓 Unlock PDF**, and no console errors or failed requests.
- The production bookmarklets, fetched from Pages and run in Node against the new cases: **Word to HTML** reads a table row inside a content control, **RTF to Word** decodes a Big5 run and merges two table rows into one table, **CSV to ODS → ODS to CSV** keeps a numeric zero and a leading blank column run, and **Excel to CSV** keeps a row that starts in column B.

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
