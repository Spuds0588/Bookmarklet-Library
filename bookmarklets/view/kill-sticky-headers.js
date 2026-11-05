/**
 * @name 📌 Kill Sticky Headers
 * @category view
 * @description Remove fixed and sticky elements so long documents use the full screen.
 * @tags sticky, header, fixed, reading, declutter
 * @traits offline, self-contained, no-cors, private-safe
 * @added 2026-10-27
 * @featured false
 * @author Alisdair McDiarmid
 * @credit https://alisdair.mcdiarmid.org/kill-sticky-headers/
 */
(() => {
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT);
  const pinned = [];
  for (let node = walker.currentNode; node; node = walker.nextNode()) {
    const { position } = getComputedStyle(node);
    if (position === "fixed" || position === "sticky") pinned.push(node);
  }
  for (const node of pinned) node.style.setProperty("position", "static");
})();
