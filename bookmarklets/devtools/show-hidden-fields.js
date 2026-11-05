/**
 * @name 👁️ Show Hidden Form Fields
 * @category devtools
 * @description Turn hidden inputs into visible, red-outlined text fields so you can inspect what a form sends.
 * @tags forms, hidden, inputs, debug, csrf
 * @traits offline, self-contained, no-cors, private-safe
 * @added 2026-10-27
 * @featured false
 * @author being-frank
 * @credit https://gist.github.com/being-frank/62ffe651b07ef27aa525
 */
(() => {
  for (const field of document.querySelectorAll('input[type="hidden" i]')) {
    field.setAttribute("type", "text");
    field.style.border = "1px solid red";
  }
})();
