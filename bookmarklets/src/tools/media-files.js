/**
 * @name 📥 Download all linked files
 * @category files
 * @description Save every file a page links to into a folder you choose, keeping readable names.
 * @tags links, files, download, bulk, save, folder, pdf, zip, documents
 * @traits network, self-contained
 * @added 2026-11-01
 * @featured false
 */
// @parts media-grab
BL.mediaGrab({
  slug: "media-files",
  kind: "file",
  title: "Download linked files",
  noun: "file links",
  singular: "file link",
  startIn: "downloads",
  empty:
    "No file links found. This reads anchors with a download attribute or a file extension; ordinary page links and mail links are left alone.",
});
