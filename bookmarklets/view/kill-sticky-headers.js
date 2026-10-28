/**
 * @name 📌 Kill Sticky Headers
 * @category view
 * @description Remove fixed and sticky elements so long documents use the full screen.
 * @tags sticky, header, fixed, reading, declutter
 * @added 2026-10-27
 * @featured false
 * @author Alisdair McDiarmid
 * @credit https://alisdair.mcdiarmid.org/kill-sticky-headers/
 */
(() => {
  for (const element of document.querySelectorAll("*")) {
    const position = getComputedStyle(element).position;
    if (position === "fixed" || position === "sticky") element.style.position = "static";
  }
})();
