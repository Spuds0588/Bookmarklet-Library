/**
 * @name 🖼️ Display Image Alt Text (A11y Check)
 * @category devtools
 * @description Print each image's alt text above it so missing or weak descriptions are obvious.
 * @tags images, alt, accessibility, a11y, audit
 * @traits offline, self-contained, no-cors, private-safe
 * @added 2026-10-27
 * @featured false
 * @author Team A11Y Collective
 * @credit https://www.a11y-collective.com/blog/accessibility-bookmarklets/
 */
(() => {
  for (const image of document.getElementsByTagName("img")) {
    if (!image.alt) continue;
    const label = document.createElement("span");
    Object.assign(label.style, {
      background: "black",
      color: "white",
      padding: "2px",
      fontSize: "12px",
      position: "absolute",
      zIndex: "9999",
    });
    label.textContent = image.alt;
    image.insertAdjacentElement("beforebegin", label);
  }
})();
