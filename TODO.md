# TODO

## Before flipping the repo public

- [ ] Enable GitHub Pages on `main`, root folder. No build action is needed; `data/catalog.json` is committed.
- [ ] Open the published URL once and repeat the smoke test: search, chip filter, theme toggle, drag one tool, download a two-tool `bookmarks.html`.
- [x] Confirm every ARIVE/Wizni tool was left out (`npm run verify` enforces this).
- [ ] Scan `README.md` and the page copy after publishing, in case a screenshot or URL is more revealing than intended.

## Screenshots

- [x] One capture per tool that shows its result (32 today) in `screenshots/`, taken by `scripts/shots.mjs` in headless Chrome against `scripts/fixtures/demo-page.html`.
- [x] Tools that need using before they show anything are driven with real input first: a stroke on the draw surface, an element picked to blur, a query typed into the find bar, an image pasted into the annotation editor, a click recorded by the action recorder.
- [x] Tools whose work never reaches the page get no image and a reason instead (28 today): download, clipboard, floating window, another site, reads aloud, reloads, needs a certain page, works outside the page. A screenshot of an untouched page was worse than no screenshot.
- [ ] **Blocked on approval: install Xvfb so the floating windows can be photographed.** `apt-get install -y xvfb` needs admin rights and the two approval prompts timed out. The display path in `scripts/shots.mjs` (`--display=:99`) is written but has never run. After installing:
      `Xvfb :99 -screen 0 1200x750x24 &` then `node scripts/shots.mjs --display=:99 --force video-pip audio-pip web-zoom-pip record-tab grab-text`,
      and check the five captures by eye before committing them.
- [ ] Re-run `node scripts/shots.mjs <slug> --force` whenever a tool's effect on a page changes. Captures are committed, so they only rot if a tool is edited and the shot is forgotten.
- [ ] Consider a `--check` mode on `scripts/shots.mjs` for CI, comparing a fresh capture against the committed PNG.

## Feedback (thumbs)

- [x] GitHub Action route, built: one comment per tool on the **Tool votes** issue, 👍/👎 reactions counted by `scripts/votes.mjs` into `data/votes.json` on a nightly schedule. No server, no browser storage.
- [ ] Run `.github/workflows/votes.yml` once (Actions → Tally votes → Run workflow) so the issue and its 60 comments exist; until then the page hides the thumbs because there is nothing to link to.
- [ ] Pin the **Tool votes** issue so people can find it from the repo page.
- [ ] GitHub disables scheduled workflows after 60 days without commits; if the counts freeze, run the workflow by hand.
- [ ] If `main` ever gets branch protection, the tally job needs a bypass or its `git push` will fail and the counts will stop updating.
- [ ] Voting needs a GitHub account by design. If that proves too high a fence, the alternative is a small counter API, which adds a third-party dependency and is easy to game.

## Nice to have, only if it earns its place

- [ ] Shareable filter state in the URL (`?q=markdown&cat=text`) so a search can be linked. Tool views already deep-link as `#t/<slug>`.
- [ ] A search that also matches emoji, so typing `📸` finds the capture tools.
- [ ] Keyboard flow for picking tools (`J`/`K` to move, `Space` to pick) once the catalog grows.
- [ ] A CI workflow that runs `npm run verify` and `npm run check` on pull requests.
- [ ] Include `AGENTS.md` guidance in the rendered page as a "how to add a tool" link for contributors.
- [ ] Show the featured tool's vote count in the highlighted panel once the tally has run.

## Housekeeping

- [ ] Re-check the export parser against a future Chrome bookmark export, since the importer script was a one-off and is not kept in the repo.
- [ ] When tools get meaningfully changed, use `@added` for the newest tool and keep the featured flag on the one worth showing off.
