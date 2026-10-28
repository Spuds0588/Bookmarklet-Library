/**
 * @name 🔓 Enable Right-Click & Text Selection
 * @category view
 * @description Clear the handlers and styles that block right-clicking, selecting and dragging.
 * @tags right click, copy, select, context menu, portal
 * @added 2026-10-27
 * @featured false
 * @author Hongkiat
 * @credit https://www.hongkiat.com/blog/100-useful-bookmarklets-for-better-productivity-ultimate-list/
 */
void (document.oncontextmenu = null),
  (document.onselectstart = null),
  (document.ondragstart = null),
  (document.body.style.userSelect = "auto");
