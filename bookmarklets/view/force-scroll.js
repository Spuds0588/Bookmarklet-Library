/**
 * @name ⬇️ Force scroll
 * @category view
 * @description Remove overflow locks so pages with frozen scroll can move again.
 * @tags scroll, overflow, unlock
 * @added 2026-10-17
 * @featured false
 */
void function(){javascript:(function(){const a=[document.documentElement,document.body];a.forEach(a=>{a.style.setProperty("overflow","auto","important"),a.style.setProperty("height","auto","important"),a.style.setProperty("position","static","important")});const b=document.querySelectorAll("[style*=\"z-index: 999\"], .overlay, .modal-backdrop");b.forEach(a=>{"fixed"===window.getComputedStyle(a).position&&a.style.setProperty("pointer-events","none","important")}),console.log("Force Scroll: Root overflow restrictions removed.")})()}();
