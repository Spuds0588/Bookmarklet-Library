/* HTML output for Word documents and HTML input for Word. */

BL.htmlFromModel = (model) => {
  const imageHtml = (run) => {
    const image = model.images?.[run.image];
    if (!image?.bytes) return "";
    return `<img src="${BL.dataUrl(image.bytes, image.mime)}" alt="${BL.escapeHtml(image.alt || "")}" style="max-width:100%;height:auto">`;
  };
  const runHtml = (run) => {
    if (run.image !== undefined) return imageHtml(run);
    if (!run.text) return "";
    let value = BL.escapeHtml(run.text).replace(/\n/g, "<br>");
    if (run.code) value = `<code>${value}</code>`;
    if (run.bold) value = `<strong>${value}</strong>`;
    if (run.italic) value = `<em>${value}</em>`;
    if (run.underline) value = `<u>${value}</u>`;
    if (run.strike) value = `<s>${value}</s>`;
    if (run.superscript) value = `<sup>${value}</sup>`;
    if (run.subscript) value = `<sub>${value}</sub>`;
    if (run.link) value = `<a href="${BL.escapeHtml(run.link)}">${value}</a>`;
    return value;
  };
  const paragraph = (block, tag = "p", className = "") => {
    const align = block.align ? ` style="text-align:${block.align === "justify" ? "justify" : block.align}"` : "";
    return `<${tag}${className ? ` class="${className}"` : ""}${align}>${(block.runs || []).map(runHtml).join("")}</${tag}>`;
  };
  const chunks = [];
  let list = null;
  const closeList = () => { if (list) { chunks.push(`</${list}>`); list = null; } };
  for (const block of model.blocks || []) {
    if (block.type === "list") {
      const tag = block.ordered ? "ol" : "ul";
      if (list !== tag) { closeList(); chunks.push(`<${tag}>`); list = tag; }
      const level = Math.min(8, block.listLevel || 0);
      chunks.push(`<li style="margin-left:${level * 18}px">${(block.runs || []).map(runHtml).join("")}</li>`);
      continue;
    }
    closeList();
    if (block.type === "heading") chunks.push(paragraph(block, `h${Math.min(6, block.level || 1)}`));
    else if (block.type === "table") {
      const header = block.rows.find((row) => row.header);
      const renderRow = (row, tag = "td") => `<tr>${row.cells.map((cell) => `<${tag}${cell.colspan > 1 ? ` colspan="${cell.colspan}"` : ""}>${(cell.runs || []).map(runHtml).join(" ")}</${tag}>`).join("")}</tr>`;
      const head = header ? `<thead>${renderRow(header, "th")}</thead>` : "";
      const rows = block.rows.filter((row) => row !== header).map((row) => renderRow(row)).join("");
      chunks.push(`<table>${head}<tbody>${rows}</tbody></table>`);
    } else if (block.type === "pagebreak") chunks.push('<hr class="page-break">');
    else if (block.type === "image") {
      chunks.push(`<p>${(block.runs || [{ image: block.image }]).map(runHtml).join("")}</p>`);
    } else if (block.quote) chunks.push(paragraph(block, "blockquote"));
    else if (block.code) chunks.push(`<pre><code>${(block.runs || []).map((run) => BL.escapeHtml(run.text || "")).join("")}</code></pre>`);
    else chunks.push(paragraph(block));
  }
  closeList();
  const title = BL.escapeHtml(model.title || "Converted document");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
body{margin:0 auto;padding:48px 24px;max-width:760px;font:16px/1.65 Georgia,"Times New Roman",serif;color:#17181a;background:#fff}
h1,h2,h3,h4,h5,h6{font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.25;margin:1.5em 0 .5em}
h1{font-size:2em}h2{font-size:1.55em}h3{font-size:1.3em}h4,h5,h6{font-size:1.1em}
p{margin:0 0 1em}blockquote{margin:1em 0;padding-left:1.1em;border-left:3px solid #ccc;color:#444}
table{border-collapse:collapse;width:100%;margin:1em 0;font-size:.94em}th,td{border:1px solid #ccc;padding:6px 9px;text-align:left;vertical-align:top}
th{background:#f4f4f4}img{max-width:100%;height:auto}pre{background:#f4f4f4;padding:12px;overflow:auto;font:13px/1.5 ui-monospace,monospace}
code{font-family:ui-monospace,monospace;font-size:.92em}hr.page-break{border:0;border-top:1px dashed #bbb;margin:2em 0}
</style></head><body>
${chunks.join("\n")}
</body></html>`;
};

BL.htmlToModel = async (html, options = {}) => {
  if (typeof DOMParser !== "function") throw new Error("This browser cannot read HTML files.");
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  const images = [];
  let skippedImages = 0;
  const allowedLink = (href) => /^(https?:|mailto:|#)/i.test(href || "");
  const styleFormat = (element) => {
    const format = {};
    const style = element.style;
    if (!style) return format;
    if (/bold|[6-9]00/i.test(style.fontWeight)) format.bold = true;
    if (/italic|oblique/i.test(style.fontStyle)) format.italic = true;
    if (/underline/i.test(style.textDecoration || "") || /underline/i.test(style.textDecorationLine || "")) format.underline = true;
    if (/line-through/i.test(style.textDecoration || "") || /line-through/i.test(style.textDecorationLine || "")) format.strike = true;
    return format;
  };
  const imageFor = async (element) => {
    const src = element.getAttribute("src") || "";
    const data = await BL.imageBytesFromUrl(src, options.uiWindow);
    if (!data) { skippedImages++; return null; }
    const intrinsic = BL.imageSize(data.bytes);
    const width = Number(element.getAttribute("width")) || data.width || intrinsic?.width || 320;
    const height = Number(element.getAttribute("height")) || data.height || intrinsic?.height || 200;
    images.push({ bytes: data.bytes, mime: data.mime || BL.imageMime(src), width, height, alt: element.getAttribute("alt") || "" });
    return images.length - 1;
  };
  const inline = async (node, format, runs) => {
    if (node.nodeType === 3) {
      const value = String(node.nodeValue || "").replace(/\s+/g, " ");
      if (value) runs.push({ ...format, text: value });
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (["script", "style", "noscript", "template", "svg", "canvas", "iframe", "object", "form", "input", "button"].includes(tag)) return;
    if (tag === "br") { runs.push({ ...format, text: "\n" }); return; }
    if (tag === "img") {
      const index = await imageFor(node);
      if (index !== null) runs.push({ ...format, image: index });
      return;
    }
    const next = { ...format, ...styleFormat(node) };
    if (["strong", "b"].includes(tag)) next.bold = true;
    if (["em", "i"].includes(tag)) next.italic = true;
    if (tag === "u" || tag === "ins") next.underline = true;
    if (["s", "strike", "del"].includes(tag)) next.strike = true;
    if (tag === "code" || tag === "kbd" || tag === "samp") next.code = true;
    if (tag === "sup") next.superscript = true;
    if (tag === "sub") next.subscript = true;
    if (tag === "a") {
      const href = node.getAttribute("href") || "";
      if (allowedLink(href)) next.link = href;
    }
    for (const child of node.childNodes) await inline(child, next, runs);
  };
  const blockTags = new Set(["p", "div", "section", "article", "main", "header", "footer", "aside", "nav"]);
  const blocks = [];
  let listCounter = 0;
  const flushRuns = async (node, level = 0) => {
    const runs = [];
    for (const child of node.childNodes) await inline(child, {}, runs);
    const cleaned = runs.filter((run) => run.text || run.image !== undefined);
    if (!cleaned.length) return;
    if (cleaned[0].text) cleaned[0].text = cleaned[0].text.replace(/^\s+/, "");
    if (cleaned.at(-1)?.text) cleaned.at(-1).text = cleaned.at(-1).text.replace(/\s+$/, "");
    if (cleaned.some((run) => run.text?.trim()) || cleaned.some((run) => run.image !== undefined)) {
      blocks.push({ type: "paragraph", runs: cleaned, align: "" });
    }
  };
  const walk = async (node, listLevel = 0, listId = "") => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        if (child.nodeValue.trim()) blocks.push({ type: "paragraph", runs: [{ text: child.nodeValue.replace(/\s+/g, " ").trim() }], align: "" });
        continue;
      }
      if (child.nodeType !== 1) continue;
      const tag = child.tagName.toLowerCase();
      if (["script", "style", "noscript", "template", "head", "meta", "link", "title"].includes(tag)) continue;
      if (/^h[1-6]$/.test(tag)) {
        const runs = [];
        for (const item of child.childNodes) await inline(item, { bold: true }, runs);
        blocks.push({ type: "heading", level: Number(tag[1]), runs: runs.filter((run) => run.text || run.image !== undefined), align: "" });
      } else if (blockTags.has(tag)) {
        const hasBlocks = [...child.children].some((grand) => blockTags.has(grand.tagName.toLowerCase()) || /^(h[1-6]|ul|ol|table|blockquote|pre|hr)$/.test(grand.tagName.toLowerCase()));
        if (hasBlocks) await walk(child, listLevel);
        else await flushRuns(child);
      } else if (tag === "ul" || tag === "ol") {
        const currentListId = listId || `html-list-${listCounter++}`;
        const start = tag === "ol" ? Number(child.getAttribute("start")) || 1 : 0;
        for (const item of child.children) {
          if (item.tagName.toLowerCase() !== "li") continue;
          const runs = [];
          let nested = [];
          for (const part of item.childNodes) {
            if (part.nodeType === 1 && ["ul", "ol"].includes(part.tagName.toLowerCase())) nested.push(part);
            else await inline(part, {}, runs);
          }
          blocks.push({ type: "list", ordered: tag === "ol", listLevel, listId: currentListId, start, runs: runs.filter((run) => run.text || run.image !== undefined) });
          for (const nestedList of nested) await walk(nestedList, listLevel + 1, currentListId);
        }
      } else if (tag === "table") {
        const rows = [];
        for (const rowNode of child.querySelectorAll("tr")) {
          const header = rowNode.parentElement?.tagName.toLowerCase() === "thead" || [...rowNode.children].every((cell) => cell.tagName.toLowerCase() === "th");
          const cells = [];
          for (const cellNode of rowNode.children) {
            if (!["td", "th"].includes(cellNode.tagName.toLowerCase())) continue;
            const runs = [];
            for (const item of cellNode.childNodes) await inline(item, {}, runs);
            cells.push({ runs: runs.filter((run) => run.text || run.image !== undefined), blocks: [], colspan: Number(cellNode.getAttribute("colspan")) || 1, header: cellNode.tagName.toLowerCase() === "th" });
          }
          if (cells.length) rows.push({ cells, header: header || cells.every((cell) => cell.header) });
        }
        if (rows.length) blocks.push({ type: "table", rows, grid: [] });
      } else if (tag === "blockquote") {
        const runs = [];
        for (const item of child.childNodes) await inline(item, {}, runs);
        if (runs.length) blocks.push({ type: "paragraph", quote: true, runs, align: "" });
        else await walk(child, listLevel);
      } else if (tag === "pre") {
        blocks.push({ type: "paragraph", code: true, runs: [{ text: child.textContent.replace(/\n$/, "") }], align: "" });
      } else if (tag === "hr") {
        blocks.push({ type: "pagebreak" });
      } else {
        await flushRuns(child);
      }
    }
  };
  await walk(doc.body);
  return {
    title: doc.title || "",
    blocks,
    images,
    section: { width: 612, height: 792, top: 72, right: 72, bottom: 72, left: 72 },
    skippedImages,
    source: options.name || "document.html",
  };
};
