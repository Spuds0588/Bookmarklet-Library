/**
 * @name 🔲 Wireframe Outline Mode
 * @category devtools
 * @description Draw a red outline around every element to expose the page's box model.
 * @tags layout, outline, wireframe, css, inspect
 * @added 2026-10-27
 * @featured false
 * @author Addy Osmani
 * @credit https://css-tricks.com/web-development-bookmarklets/
 */
(() => {
  const style = document.createElement("style");
  style.textContent = "* { outline: 1px solid red !important; }";
  document.head.appendChild(style);
})();
