# Doom

The hosted half of **💥 Will it run Doom?**. The bookmarklet is a small modal
loader; this directory contains the engine and the shareware game data it needs.
Keeping them here means the bookmarklet URL stays small and the game does not
depend on a third-party host at runtime.

This is the real shareware **DOOM** Episode 1, not a raycaster imitation. It
starts on E1M1 with the pistol at Hurt Me Plenty. `WASD` and the arrow keys
move, the mouse turns and fires, `Space` uses, `Esc` opens the menu, and `Tab`
shows the automap. Sound starts after you click the game.

## What is here

| File | What it is | SHA-256 |
| --- | --- | --- |
| `index.wasm` | Dwasm 2.2.0 engine | `c694887087efae4f7d969da80fad89608cb9dbad5c06e2953448fa49635b2a05` |
| `index.js` | Emscripten loader for the engine | `e12d2b83171e92818c3b74f707d531abf57cb7a1a670923aee3a681da87491a9` |
| `index.data` | Dwasm default configuration | `5643fb92207c8c10721293dddd29f7b50e7c531d6d3463f278419e830f137946` |
| `doom1.wad` | Shareware DOOM v1.9 IWAD, 4,196,020 bytes | `1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771` |
| `COPYING` | GNU General Public License v2 | — |
| `LICENSE-DOOM.txt` | id Software's shareware terms | — |

## Engine

[Dwasm](https://github.com/GMH-Code/Dwasm) by Gregory Maynard-Hoare is a
WebAssembly port of PrBoom+ and PrBoomX. The binaries here are the published
v2.2.0 build from <https://dwasm.m-h.org.uk/>, corresponding to tag `v2.2.0`
(`d63c36161965fddf4c5e2b936976220e9ee1213f`). They are unmodified. Dwasm is
distributed under the GNU General Public License v2; the complete source is at
the repository above, and `COPYING` is included here.

The page does not use Dwasm's launcher, IWAD downloader, mod picker, or age
gate. It writes `doom1.wad` into the engine's in-memory filesystem and starts
the engine with `-iwad doom1.wad -warp 1 1 -skill 3`.

## Game data

`doom1.wad` is the shareware IWAD from DOOM v1.9, the episode id Software
distributed freely. It is included so the first level works offline and does
not depend on an archive download. The shareware terms are in
`LICENSE-DOOM.txt`. DOOM, id Software, Bethesda Softworks and ZeniMax are
trademarks of their respective owners; this project is not affiliated with
them.

The copy was downloaded from the public
[universal-doom](https://github.com/nneonneo/universal-doom) mirror and checked
against the expected 4,196,020-byte shareware IWAD. Its hash is listed above so
the exact file can be verified.

## Hosting

The page is plain static HTML and must be served over HTTP(S); opening
`index.html` from `file://` will not load the WAD and WASM. GitHub Pages serves
it at `/Bookmarklet-Library/doom/`, and the bookmarklet points there.
