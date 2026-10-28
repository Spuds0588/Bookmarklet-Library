/**
 * @name 🔑 Reveal Hidden Passwords
 * @category devtools
 * @description Turn password fields into plain text so you can check what you typed.
 * @tags password, forms, reveal, login
 * @added 2026-10-27
 * @featured false
 * @author Hongkiat
 * @credit https://www.hongkiat.com/blog/100-useful-bookmarklets-for-better-productivity-ultimate-list/
 */
(() => {
  document.querySelectorAll("input[type=password]").forEach((field) => {
    field.type = "text";
  });
})();
