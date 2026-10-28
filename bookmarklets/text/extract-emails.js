/**
 * @name 📧 Extract All Emails from Page
 * @category text
 * @description Collect every email address on the page and show the unique ones in a copyable prompt.
 * @tags email, extract, scrape, regex, copy
 * @added 2026-10-27
 * @featured false
 * @author Community snippet
 * @credit https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions
 */
(() => {
  const emails = document.body.innerHTML.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
  if (!emails) return alert("No emails found.");
  prompt("Found Emails:", [...new Set(emails)].join("; "));
})();
