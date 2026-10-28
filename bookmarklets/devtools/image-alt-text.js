/**
 * @name 🖼️ Display Image Alt Text (A11y Check)
 * @category devtools
 * @description Print each image's alt text above it so missing or weak descriptions are obvious.
 * @tags images, alt, accessibility, a11y, audit
 * @added 2026-10-27
 * @featured false
 * @author Team A11Y Collective
 * @credit https://www.a11y-collective.com/blog/accessibility-bookmarklets/
 */
(() => {
  for (const image of document.getElementsByTagName("img")) {
    if (!image.alt) continue;
    const label = document.createElement("span");
    label.style.cssText =
      "background:black;color:white;padding:2px;font-size:12px;position:absolute;z-index:9999;";
    label.textContent = image.alt;
    image.parentNode.insertBefore(label, image);
  }
})();
