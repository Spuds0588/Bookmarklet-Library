/**
 * @name 🔗 Deep Fragment Citation Linker
 * @category text
 * @description Copy the selected passage as a Markdown citation with a text-fragment link and today's date.
 * @tags citation, quote, text fragment, markdown, research, link
 * @added 2026-10-28
 * @featured false
 */
(async () => {
  const selected = String(window.getSelection?.() ?? "").replace(/\s+/g, " ").trim();
  if (!selected) {
    alert("Select the passage you want to cite, then run this again.");
    return;
  }
  document.getElementById("bl-citation-toast")?.remove();

  const text = selected.slice(0, 500);
  const title = (document.title || location.hostname).replace(/\s+/g, " ").trim();
  const page = location.origin + location.pathname + location.search;
  const fragment = `${page}#:~:text=${encodeURIComponent(text)}`;
  const label = (value) => value.replace(/([\\\[\]])/g, "\\$1");
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const markdown = `[“${label(text)}”](${fragment}) — [${label(title)}](${page}), ${date}`;

  const show = () => {
    const host = document.createElement("div");
    host.id = "bl-citation-toast";
    host.style.cssText = "position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483647";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>:host{color-scheme:light dark}div{max-width:min(420px,calc(100vw - 32px));padding:9px 13px;background:#111;color:#fff;font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;box-shadow:0 8px 28px rgba(0,0,0,.3)}@media(prefers-color-scheme:dark){div{background:#f5f5f5;color:#111}}</style><div role="status">Citation copied — paste it into your notes.</div>`;
    (document.body || document.documentElement).appendChild(host);
    setTimeout(() => host.remove(), 2600);
  };

  try {
    await navigator.clipboard.writeText(markdown);
    show();
  } catch {
    prompt("Copy this citation:", markdown);
  }
})();
