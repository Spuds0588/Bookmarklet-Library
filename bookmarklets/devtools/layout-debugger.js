/**
 * @name 🧱 The Layout Debugger (DOM Tinter)
 * @category devtools
 * @description Tint every element so nested boxes and the cause of a stray scrollbar show up.
 * @tags layout, debug, boxes, css, inspect
 * @traits offline, self-contained, no-cors, private-safe
 * @added 2026-10-27
 * @featured false
 * @author OpenReplay
 * @credit https://blog.openreplay.com/5-bookmarklets-developers/
 */
(() => {
  const TINT = "rgba(0, 0, 0, 0.1)";
  for (const box of document.getElementsByTagName("*")) {
    box.style.setProperty("background", TINT);
  }
})();
