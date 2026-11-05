/**
 * @name 🖍️ Highlight All Links
 * @category view
 * @description Give every hyperlink a yellow background so un-styled links stand out.
 * @tags links, highlight, accessibility, navigation
 * @traits offline, self-contained, no-cors, private-safe
 * @added 2026-10-27
 * @featured false
 * @author Learn JavaScript
 * @credit https://bookmarklet.io/resources
 */
(() => {
  const HIGHLIGHT = { backgroundColor: "yellow", color: "black", padding: "2px" };
  for (const link of document.querySelectorAll("a")) {
    for (const [property, value] of Object.entries(HIGHLIGHT)) link.style[property] = value;
  }
})();
