/**
 * @name 🖼️ Download all images
 * @category files
 * @description Save every image the page loads into a folder you choose, without leaving the tab.
 * @tags images, download, bulk, save, folder, media, png, jpg
 * @added 2026-11-01
 * @featured false
 */
// @parts media-grab
BL.mediaGrab({
  slug: "media-images",
  kind: "image",
  title: "Download images",
  noun: "images",
  singular: "image",
  startIn: "pictures",
  empty:
    "No images found. This reads img, picture, lazy-load attributes and social preview tags; a canvas or a CSS background is not a file it can fetch.",
});
