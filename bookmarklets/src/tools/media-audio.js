/**
 * @name 🎧 Download all audio
 * @category files
 * @description Save every audio file the page loads into a folder you choose, with streams flagged.
 * @tags audio, download, bulk, save, folder, media, mp3, wav
 * @traits network, self-contained
 * @added 2026-11-01
 * @featured false
 */
// @parts media-grab
BL.mediaGrab({
  slug: "media-audio",
  kind: "audio",
  title: "Download audio",
  noun: "audio files",
  singular: "audio file",
  startIn: "music",
  empty:
    "No audio files found. This reads audio elements, their source fallbacks and links to audio files; a player fed by JavaScript is not a file it can fetch.",
});
