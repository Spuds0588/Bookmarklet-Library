/**
 * @name 📝 Open in SimplePDF
 * @category files
 * @description Sends the PDF this tab already has open to SimplePDF's editor in the same window, so editing starts without downloading the file and picking it again.
 * @tags pdf, editor, annotate, fill, sign, simplepdf
 * @traits network, web-app
 * @added 2026-11-03
 * @featured false
 */
(() => {
  // The free editor, checked in a browser: it honours `open` here as well as
  // on embed.simplepdf.com. An account would use its own subdomain instead.
  const EDITOR = "https://simplepdf.com/editor";

  const absolute = (value, base) => {
    try {
      const url = new URL(String(value).trim(), base);
      return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };

  const looksLikePdf = (value) => /\.pdf(?:$|[?#])/i.test(String(value)) || /^application\/pdf$/i.test(String(value));

  // The PDF may be the document itself, the file behind a pdf.js viewer, or an
  // embed, object or link on the page. Pure, so the choice can be tested.
  function pdfUrlFrom({ href = "", contentType = "", embeds = [], objects = [], iframes = [], links = [] } = {}) {
    if (/^application\/pdf/i.test(contentType)) {
      const direct = absolute(href, href);
      if (direct) return direct;
    }
    const viewer = /[?&#]file=([^&#]+)/.exec(href);
    if (viewer && /viewer\.html|pdfjs/i.test(href)) {
      const fromViewer = absolute(decodeURIComponent(viewer[1]), href);
      if (fromViewer) return fromViewer;
    }
    for (const candidate of [...embeds, ...objects, ...iframes]) {
      const url = absolute(candidate, href);
      if (url && (looksLikePdf(candidate) || looksLikePdf(url))) return url;
    }
    for (const candidate of links) {
      const url = absolute(candidate, href);
      if (url && looksLikePdf(url)) return url;
    }
    return "";
  }

  // Why a page has no handoff-able URL. A file on disk is out of reach for a
  // web editor, and a blob belongs to this page's origin (an opaque one for
  // file://), so neither can be sent as a URL.
  function blockedReason({ href = "", embeds = [], objects = [], iframes = [], links = [] } = {}) {
    if (/^file:/i.test(href)) return "local";
    const framed = [href, ...embeds, ...objects, ...iframes, ...links].map((value) => String(value).trim());
    if (framed.some((value) => /^(blob:|data:)/i.test(value))) return "blob";
    return "none";
  }

  function pageFrom(url = "") {
    const match = /#page=(\d+)/i.exec(url);
    return match ? Number(match[1]) : 0;
  }

  // `open` is the editor's own parameter: it fetches that URL and opens it. The
  // value is encoded once, here, which also keeps a presigned query string
  // intact when the PDF lives on S3 or Azure.
  function editorUrl(pdfUrl, page = 0) {
    const url = new URL(EDITOR);
    url.searchParams.set("open", pdfUrl);
    if (page > 0) url.searchParams.set("page", String(page));
    return url.href;
  }

  function toast(message, action) {
    const node = document.createElement("div");
    node.style.cssText =
      "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;display:flex;gap:12px;align-items:center;max-width:min(460px,90vw);padding:12px 16px;border:1px solid #111;background:#fbfaf8;color:#111;font:13px/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)";
    const text = document.createElement("span");
    text.textContent = message;
    node.appendChild(text);
    if (action) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.style.cssText =
        "flex:none;padding:6px 10px;border:1px solid #111;background:#111;color:#fbfaf8;font:inherit;cursor:pointer";
      button.addEventListener("click", () => {
        node.remove();
        action.run();
      });
      node.appendChild(button);
    }
    (document.body || document.documentElement).appendChild(node);
    setTimeout(() => node.remove(), action ? 12000 : 4500);
  }

  function collect() {
    const pick = (selector) =>
      [...document.querySelectorAll(selector)]
        .map((node) => node.getAttribute("src") || node.getAttribute("data") || node.getAttribute("href") || "")
        .filter(Boolean);
    return {
      href: location.href,
      contentType: document.contentType || "",
      embeds: pick("embed"),
      objects: pick("object"),
      iframes: pick("iframe"),
      links: pick('a[href*=".pdf" i]'),
    };
  }

  function start() {
    if (/(^|\.)simplepdf\.com$/i.test(location.hostname)) return;
    const found = collect();
    const source = pdfUrlFrom(found);
    if (!source) {
      const reason = blockedReason(found);
      if (reason === "local") {
        toast("This PDF is a file on your disk, which a website cannot fetch. Use 📝 Edit a Local PDF, or open the editor and drag the file in.", {
          label: "Open editor",
          run: () => location.assign(EDITOR),
        });
      } else if (reason === "blob") {
        toast("This PDF only exists inside the page, so the editor cannot fetch it. Download it first, then open the editor.");
      } else {
        toast("No PDF on this page. Open the PDF, or a page that links it, then click this again.");
      }
      return;
    }
    location.assign(editorUrl(source, pageFrom(location.href)));
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.simplepdf = { pdfUrlFrom, blockedReason, pageFrom, editorUrl, absolute, looksLikePdf, EDITOR };
  } else if (document?.body) {
    start();
  }
})();
