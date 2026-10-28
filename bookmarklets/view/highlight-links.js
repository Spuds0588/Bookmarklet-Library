/**
 * @name 🖍️ Highlight All Links
 * @category view
 * @description Give every hyperlink a yellow background so un-styled links stand out.
 * @tags links, highlight, accessibility, navigation
 * @added 2026-10-27
 * @featured false
 * @author Learn JavaScript
 * @credit https://bookmarklet.io/resources
 */
(() => {
  document.querySelectorAll("a").forEach((link) => {
    link.style.backgroundColor = "yellow";
    link.style.color = "black";
    link.style.padding = "2px";
  });
})();
