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
  // The free editor. A SimplePDF account would swap this for
  // https://<company>.simplepdf.com/editor and the same `open` parameter.
  const EDITOR = "https://embed.simplepdf.com/editor";

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

  function toast(message) {
    const node = document.createElement("div");
    node.textContent = message;
    node.style.cssText =
      "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;max-width:min(440px,90vw);padding:12px 16px;border:1px solid #111;background:#fbfaf8;color:#111;font:13px/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)";
    (document.body || document.documentElement).appendChild(node);
    setTimeout(() => node.remove(), 4500);
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
      toast(
        /^application\/pdf/i.test(found.contentType)
          ? "This PDF is a local blob, so SimplePDF cannot fetch it. Download it, then open SimplePDF directly."
          : "No PDF on this page. Open the PDF, or a page that links it, then click this again.",
      );
      return;
    }
    location.assign(editorUrl(source, pageFrom(location.href)));
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.simplepdf = { pdfUrlFrom, pageFrom, editorUrl, absolute, looksLikePdf, EDITOR };
  } else if (document?.body) {
    start();
  }
})();
