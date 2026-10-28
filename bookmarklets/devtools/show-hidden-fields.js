/**
 * @name 👁️ Show Hidden Form Fields
 * @category devtools
 * @description Turn hidden inputs into visible, red-outlined text fields so you can inspect what a form sends.
 * @tags forms, hidden, inputs, debug, csrf
 * @added 2026-10-27
 * @featured false
 * @author being-frank
 * @credit https://gist.github.com/being-frank/62ffe651b07ef27aa525
 */
(() => {
  for (const input of document.getElementsByTagName("input")) {
    if (input.type.toLowerCase() !== "hidden") continue;
    input.type = "text";
    input.style.border = "1px solid red";
  }
})();
