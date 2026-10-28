/**
 * @name 🧱 The Layout Debugger (DOM Tinter)
 * @category devtools
 * @description Tint every element so nested boxes and the cause of a stray scrollbar show up.
 * @tags layout, debug, boxes, css, inspect
 * @added 2026-10-27
 * @featured false
 * @author OpenReplay
 * @credit https://blog.openreplay.com/5-bookmarklets-developers/
 */
document.querySelectorAll("*").forEach((element) => {
  element.style.background = "rgb(0 0 0 / 10%)";
});
void 0;
