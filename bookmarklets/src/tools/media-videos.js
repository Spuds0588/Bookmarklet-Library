/**
 * @name 🎬 Download all videos
 * @category files
 * @description Save the video files a page loads into a folder you choose, and flag streams it cannot.
 * @tags videos, download, bulk, save, folder, media, mp4, webm
 * @traits network, self-contained
 * @added 2026-11-01
 * @featured false
 */
// @parts media-grab
BL.mediaGrab({
  slug: "media-videos",
  kind: "video",
  title: "Download videos",
  noun: "videos",
  singular: "video",
  startIn: "videos",
  empty:
    "No video files found. This reads video elements, their source fallbacks and links to video files; a player fed by JavaScript is not a file it can fetch.",
});
