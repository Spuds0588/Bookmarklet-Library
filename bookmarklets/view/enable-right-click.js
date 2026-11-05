/**
 * @name 🔓 Enable Right-Click & Text Selection
 * @category view
 * @description Clear the handlers and styles that block right-clicking, selecting and dragging.
 * @tags right click, copy, select, context menu, portal
 * @traits offline, self-contained, no-cors, private-safe
 * @added 2026-10-27
 * @featured false
 * @author Hongkiat
 * @credit https://www.hongkiat.com/blog/100-useful-bookmarklets-for-better-productivity-ultimate-list/
 */
(() => {
  for (const handler of ["oncontextmenu", "onselectstart", "ondragstart"]) document[handler] = null;
  document.body.style.setProperty("user-select", "auto");
})();
