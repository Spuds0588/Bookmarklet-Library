# TODO

## Before flipping the repo public

- [ ] Enable GitHub Pages on `main`, root folder. No build action is needed; `data/catalog.json` is committed.
- [ ] Open the published URL once and repeat the smoke test: search, chip filter, theme toggle, drag one tool, download a two-tool `bookmarks.html`.
- [x] Confirm every ARIVE/Wizni tool was left out (`npm run verify` enforces this).
- [ ] Scan `README.md` and the page copy after publishing, in case a screenshot or URL is more revealing than intended.

## Feedback (thumbs)

Thumbs currently save in `localStorage`, so they show only in the browser that cast them. Aggregate counts need one of:

- [ ] GitHub Action route: a workflow that reads 👍/👎 from a single issue per tool, writes `data/votes.json`, and commits it. Voting itself still needs a GitHub account and a prefilled issue link, so the UX is clumsy but needs no server.
- [ ] Tiny counter API route (for example a no-auth hit-counter service) called directly from the page. Simplest to build, but it is a third-party dependency on every vote and easy to game.
- [ ] Do nothing and keep the local-only behaviour, which is honest and offline-safe.

## Nice to have, only if it earns its place

- [ ] Shareable filter state in the URL (`?q=markdown&cat=text`) so a search can be linked.
- [ ] Sort toggle: catalog order vs. most liked.
- [ ] Keyboard flow for picking tools (`J`/`K` to move, `Space` to pick) once the catalog grows.
- [ ] A CI workflow that runs `npm run verify` and `npm run check` on pull requests.
- [ ] Include `AGENTS.md` guidance in the rendered page as a "how to add a tool" link for contributors.

## Housekeeping

- [ ] Re-check the export parser against a future Chrome bookmark export, since the importer script was a one-off and is not kept in the repo.
- [ ] When tools get meaningfully changed, use `@added` for the newest tool and keep the featured flag on the one worth showing off.
