/**
 * @name 📧 Extract All Emails from Page
 * @category text
 * @description Collect every email address on the page and show the unique ones in a copyable prompt.
 * @tags email, extract, scrape, regex, copy
 * @traits offline, self-contained, no-cors, private-safe
 * @added 2026-10-27
 * @featured false
 * @author Community snippet
 * @credit https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions
 */
(() => {
  const ADDRESS = /[a-z0-9._-]+@[a-z0-9._-]+\.[a-z0-9._-]+/gi;
  const unique = new Set(document.body.innerHTML.match(ADDRESS) || []);
  if (!unique.size) {
    alert("No emails found.");
    return;
  }
  prompt("Found Emails:", [...unique].join("; "));
})();
