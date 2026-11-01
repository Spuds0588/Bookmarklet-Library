import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function load(slug) {
  const code = await readFile(path.join(root, "bookmarklets", "files", `${slug}.js`), "utf8");
  globalThis.__BL_TEST__ = {};
  new Function(code)();
  const BL = globalThis.__BL_TEST__.BL;
  delete globalThis.__BL_TEST__;
  assert.ok(BL?.mediaGrabCore, `${slug} did not export its core`);
  return BL.mediaGrabCore;
}

const IMAGES = await load("media-images");
const VIDEOS = await load("media-videos");
const AUDIO = await load("media-audio");
const FILES = await load("media-files");

function element(attributes = {}, children = []) {
  return {
    ...attributes,
    currentSrc: attributes.currentSrc || "",
    getAttribute: (name) => (name in attributes ? String(attributes[name]) : null),
    hasAttribute: (name) => name in attributes,
    querySelectorAll: () => children,
  };
}

function page() {
  return {
    baseURI: "https://example.com/guide/",
    querySelectorAll(selector) {
      const nodes = {
        img: [
          element({
            src: "/media/hero.png",
            srcset: "/media/hero.png 1x, /media/hero@2x.png 2x",
            "data-src": "/media/lazy.webp",
          }),
        ],
        "picture source": [element({ srcset: "https://cdn.example.com/photo.jpg 800w" })],
        'meta[property="og:image"], meta[name="twitter:image"]': [element({ content: "/media/social.png" })],
        video: [
          element({ src: "/media/clip.mp4" }, [
            element({ src: "/media/clip.webm", type: "video/webm" }),
            element({ src: "/stream/master.m3u8", type: "application/vnd.apple.mpegurl" }),
          ]),
        ],
        audio: [element({}, [element({ src: "/media/theme.mp3", type: "audio/mpeg" })])],
        "a[href]": [
          element({ href: "/files/report.pdf" }),
          element({ href: "/files/kit.zip", download: "" }),
          element({ href: "/watch/clip", download: "" }),
          element({ href: "/routes/demo" }),
          element({ href: "mailto:crew@example.com" }),
          element({ href: "#faq" }),
          element({ href: "/media/song.mp3?dl=1" }),
        ],
      };
      return nodes[selector] || [];
    },
  };
}

const urls = (entries) => entries.map((entry) => entry.url).sort();

test("the image tool keeps img, picture, lazy and social image URLs once each", () => {
  const entries = IMAGES.collect(page(), "image");
  assert.deepEqual(urls(entries), [
    "https://cdn.example.com/photo.jpg",
    "https://example.com/media/hero.png",
    "https://example.com/media/hero@2x.png",
    "https://example.com/media/lazy.webp",
    "https://example.com/media/social.png",
  ]);
  assert.equal(entries.find((entry) => entry.url.endsWith("hero.png")).name, "hero.png");
});

test("the video tool follows source fallbacks and marks an HLS playlist as a stream", () => {
  const entries = VIDEOS.collect(page(), "video");
  assert.deepEqual(urls(entries), [
    "https://example.com/media/clip.mp4",
    "https://example.com/media/clip.webm",
    "https://example.com/stream/master.m3u8",
  ]);
  assert.equal(entries.find((entry) => entry.url.endsWith(".m3u8")).stream, true);
  assert.equal(entries.find((entry) => entry.url.endsWith(".webm")).type, "video/webm");
});

test("the audio tool reads audio sources and audio file links", () => {
  const entries = AUDIO.collect(page(), "audio");
  assert.deepEqual(urls(entries), [
    "https://example.com/media/song.mp3?dl=1",
    "https://example.com/media/theme.mp3",
  ]);
});

test("the file tool takes download attributes and file extensions but not page links", () => {
  const entries = FILES.collect(page(), "file");
  assert.deepEqual(urls(entries), [
    "https://example.com/files/kit.zip",
    "https://example.com/files/report.pdf",
    "https://example.com/media/song.mp3?dl=1",
    "https://example.com/watch/clip",
  ]);
  const names = Object.fromEntries(entries.map((entry) => [entry.url, entry.name]));
  assert.equal(names["https://example.com/files/report.pdf"], "report.pdf");
  assert.equal(names["https://example.com/watch/clip"], "clip");
});

test("kind detection trusts a file extension before the declared MIME type", () => {
  assert.equal(IMAGES.kindOf("https://example.com/a/PHOTO.JPG?size=2"), "image");
  assert.equal(IMAGES.kindOf("https://example.com/watch", "video/mp4"), "video");
  assert.equal(IMAGES.kindOf("https://example.com/a.m3u8"), "video");
  assert.equal(IMAGES.kindOf("https://example.com/a.zip"), "file");
  assert.equal(IMAGES.kindOf("https://example.com/a.bin"), "");
});

test("stream playlists are recognised by extension and by MIME type", () => {
  assert.equal(VIDEOS.isStream("https://example.com/live.mpd", ""), true);
  assert.equal(VIDEOS.isStream("https://example.com/live", "application/x-mpegURL"), true);
  assert.equal(VIDEOS.isStream("https://example.com/clip.mp4", "video/mp4"), false);
});

test("file names come from the path, decode safely and gain an extension from the type", () => {
  assert.equal(IMAGES.fileNameFromUrl("https://example.com/a/report%20final.pdf?token=1#page=2"), "report final.pdf");
  assert.equal(IMAGES.fileNameFromUrl("https://example.com/download", "image/jpeg", "image"), "download.jpg");
  assert.equal(IMAGES.fileNameFromUrl("https://example.com/", "audio/mpeg", "audio"), "audio.mp3");
  assert.equal(IMAGES.fileNameFromUrl("data:image/png;base64,iVBORw0KGgo=", "", "image"), "image.png");
  assert.equal(IMAGES.ensureExtension("clip", "video/mp4", "video"), "clip.mp4");
  assert.equal(IMAGES.ensureExtension("clip.mp4", "video/webm", "video"), "clip.mp4");
});

test("unsafe names are flattened and folder names never overwrite silently", () => {
  assert.equal(IMAGES.safeName("../../etc/passwd"), "etc-passwd");
  assert.equal(IMAGES.safeName('a<b>:"c|d?.png'), "a-b-c-d-.png");
  assert.equal(IMAGES.safeName("..."), "file");
  assert.equal(IMAGES.numbered("report.pdf", 1), "report.pdf");
  assert.equal(IMAGES.numbered("report.pdf", 2), "report-2.pdf");
  assert.equal(IMAGES.numbered("report", 3), "report-3");
});

test("srcset parsing keeps descriptors out and data URLs whole", () => {
  assert.deepEqual(IMAGES.parseSrcset("/a.png 1x, /b.png 2x"), ["/a.png", "/b.png"]);
  assert.deepEqual(IMAGES.parseSrcset("data:image/png;base64,AAA 1x, /b.png 2x"), [
    "data:image/png;base64,AAA",
    "/b.png",
  ]);
});
