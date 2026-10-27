/* GFM writer for Word documents and a compact Markdown reader for Word. */

BL.markdownEscape = (value) => String(value ?? "").replace(/([\\`*_{}\[\]()#>|~])/g, "\\$1");

BL.markdownInline = (run, model) => {
  if (run.image !== undefined) {
    const image = model.images?.[run.image];
    if (!image?.bytes) return "";
    return `![${BL.markdownEscape(image.alt || "image")}](${BL.dataUrl(image.bytes, image.mime)})`;
  }
  if (!run.text) return "";
  let value = BL.markdownEscape(run.text).replace(/\n/g, "  \n");
  if (run.code) value = `\`${value.replace(/`/g, "\\`")}\``;
  if (run.bold) value = `**${value}**`;
  if (run.italic) value = `*${value}*`;
  if (run.strike) value = `~~${value}~~`;
  if (run.underline && !run.link) value = `<u>${value}</u>`;
  if (run.link) value = `[${value}](${run.link.replace(/\)/g, "\\)")})`;
  return value;
};

BL.markdownFromModel = (model) => {
  const lines = [];
  let listNumber = 0;
  let listLevel = -1;
  let listOrdered = null;
  const closeList = () => { listNumber = 0; listLevel = -1; listOrdered = null; };
  for (const block of model.blocks || []) {
    if (block.type === "list") {
      if (!block.ordered) listNumber = 0;
      if (listLevel !== (block.listLevel || 0)) listLevel = block.listLevel || 0;
      if (listOrdered !== null && listOrdered !== Boolean(block.ordered)) lines.push("");
      listOrdered = Boolean(block.ordered);
      if (block.ordered) listNumber++;
      const indent = "  ".repeat(Math.min(8, block.listLevel || 0));
      const marker = block.ordered ? `${block.start || listNumber}.` : "-";
      lines.push(`${indent}${marker} ${(block.runs || []).map((run) => BL.markdownInline(run, model)).join("")}`);
      continue;
    }
    closeList();
    if (block.type === "heading") {
      lines.push(`${"#".repeat(Math.min(6, block.level || 1))} ${(block.runs || []).map((run) => BL.markdownInline({ ...run, bold: false }, model)).join("")}`);
    } else if (block.type === "pagebreak") {
      lines.push("---");
    } else if (block.type === "table") {
      if (lines.length && lines.at(-1) !== "") lines.push("");
      const header = block.rows.find((row) => row.header) || block.rows[0];
      if (!header) continue;
      const cell = (item) => {
        const runs = item.runs || [];
        const text = runs.filter((run) => run.image === undefined).map((run) => run.text || "").join("");
        const images = runs.filter((run) => run.image !== undefined).map((run) => BL.markdownInline(run, model)).join(" ");
        return [BL.markdownEscape(text.replace(/\n/g, " ")), images].filter(Boolean).join(" ");
      };
      const rowLine = (row) => `| ${row.cells.map((item) => cell(item)).join(" | ")} |`;
      lines.push(rowLine(header));
      lines.push(`| ${header.cells.map(() => "---").join(" | ")} |`);
      for (const row of block.rows.filter((item) => item !== header)) lines.push(rowLine(row));
      lines.push("");
    } else if (block.type === "image") {
      lines.push(`![${BL.markdownEscape(model.images?.[block.image]?.alt || "image")}](${BL.dataUrl(model.images?.[block.image]?.bytes || new Uint8Array(), model.images?.[block.image]?.mime || "image/png")})`);
    } else if (block.quote) {
      lines.push(...`> ${(block.runs || []).map((run) => BL.markdownInline(run, model)).join("")}`.split("\n"));
    } else if (block.code) {
      const body = (block.runs || []).map((run) => run.text || "").join("");
      const fence = body.includes("```") ? "````" : "```";
      lines.push(`${fence}\n${body}\n${fence}`);
    } else {
      lines.push((block.runs || []).map((run) => BL.markdownInline(run, model)).join(""));
    }
    lines.push("");
  }
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
};

/* Reader --------------------------------------------------------------- */

BL.parseMarkdown = async (source, options = {}) => {
  const text = String(source || "").replace(/\r\n?/g, "\n");
  const images = [];
  let skippedImages = 0;
  const linkSafe = (url) => /^(https?:|mailto:|#)/i.test(url || "");
  const imageFor = async (url, alt) => {
    const data = await BL.imageBytesFromUrl(url, options.uiWindow);
    if (!data) { skippedImages++; return null; }
    const intrinsic = BL.imageSize(data.bytes);
    images.push({ bytes: data.bytes, mime: data.mime || "image/png", width: data.width || intrinsic?.width || 320, height: data.height || intrinsic?.height || 200, alt: alt || "" });
    return images.length - 1;
  };
  const readInline = async (input, format = {}) => {
    const runs = [];
    let index = 0;
    const push = (value, extra = {}) => { if (value) runs.push({ ...format, ...extra, text: value }); };
    while (index < input.length) {
      if (input[index] === "\\" && index + 1 < input.length) { push(input[index + 1]); index += 2; continue; }
      if (input[index] === "`") {
        const end = input.indexOf("`", index + 1);
        if (end > index) { runs.push({ ...format, text: input.slice(index + 1, end), code: true }); index = end + 1; continue; }
      }
      if (input[index] === "!" && input[index + 1] === "[") {
        const close = input.indexOf("]", index + 2);
        const end = close > 0 && input[close + 1] === "(" ? input.indexOf(")", close + 2) : -1;
        if (end > close) {
          const label = input.slice(index + 2, close);
          const image = await imageFor(input.slice(close + 2, end), label);
          if (image !== null) runs.push({ ...format, image });
          index = end + 1;
          continue;
        }
      }
      if (input[index] === "[") {
        const close = input.indexOf("]", index + 1);
        const end = close > 0 && input[close + 1] === "(" ? input.indexOf(")", close + 2) : -1;
        if (end > close) {
          const label = input.slice(index + 1, close);
          const url = input.slice(close + 2, end).split(/\s+/)[0].replace(/^<|>$/g, "");
          const inner = await readInline(label, { ...format, link: linkSafe(url) ? url : "" });
          runs.push(...inner);
          index = end + 1;
          continue;
        }
      }
      let matched = false;
      for (const marker of ["**", "__", "~~", "*", "_"]) {
        if (!input.startsWith(marker, index)) continue;
        const end = input.indexOf(marker, index + marker.length);
        if (end <= index + marker.length) continue;
        const inner = await readInline(input.slice(index + marker.length, end), {
          ...format,
          ...(marker === "**" || marker === "__" ? { bold: true } : marker === "~~" ? { strike: true } : { italic: true }),
        });
        runs.push(...inner);
        index = end + marker.length;
        matched = true;
        break;
      }
      if (matched) continue;
      push(input[index]);
      index++;
    }
    return BL.mergeRuns(runs);
  };
  const blocks = [];
  const lines = text.split("\n");
  let index = 0;
  let listCounter = 0;
  const pushParagraph = async (value) => {
    const runs = (await readInline(value)).filter((run) => run.text || run.image !== undefined);
    if (runs.length) blocks.push({ type: "paragraph", runs, align: "" });
  };
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    const fence = /^\s*(```+|~~~+)/.exec(line);
    if (fence) {
      const marker = fence[1][0].repeat(3);
      const content = [];
      index++;
      while (index < lines.length && !lines[index].trim().startsWith(marker)) content.push(lines[index++]);
      index++;
      if (content.length) blocks.push({ type: "paragraph", code: true, runs: [{ text: content.join("\n") }], align: "" });
      continue;
    }
    const heading = /^\s*(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, runs: await readInline(heading[2].trim()), align: "" });
      index++;
      continue;
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s\S]*$/.test(line)) {
      blocks.push({ type: "pagebreak" });
      index++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ""));
      for (const item of quote) await pushParagraph(item);
      continue;
    }
    const listLine = /^(\s*)([-+*]|\d+[.)])\s+(.*)$/;
    if (listLine.test(line)) {
      const listId = `md-list-${listCounter++}`;
      while (index < lines.length && listLine.test(lines[index])) {
        const match = listLine.exec(lines[index]);
        const indent = match[1].replace(/\t/g, "  ").length;
        const ordered = /^\d/.test(match[2]);
        const start = ordered ? Number(match[2]) : 0;
        const runs = await readInline(match[3].trim());
        blocks.push({ type: "list", ordered, listLevel: Math.min(8, Math.floor(indent / 2)), start, listId, runs, align: "" });
        index++;
      }
      continue;
    }
    if (/\|/.test(line) && index + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[index + 1])) {
      const split = (value) => value.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((cell) => cell.trim());
      const header = split(line);
      index += 2;
      const rows = [{ header: true, cells: await Promise.all(header.map(async (value) => ({ runs: await readInline(value), blocks: [], colspan: 1, header: true }))) }];
      while (index < lines.length && /\|/.test(lines[index]) && lines[index].trim()) {
        const cells = split(lines[index]);
        rows.push({ header: false, cells: await Promise.all(cells.map(async (value) => ({ runs: await readInline(value), blocks: [], colspan: 1, header: false }))) });
        index++;
      }
      blocks.push({ type: "table", rows, grid: [] });
      continue;
    }
    const paragraph = [line.trim()];
    index++;
    while (index < lines.length && lines[index].trim() && !/^\s*(#{1,6}\s|```|\||>|[-+*]\s|\d+[.)]\s)/.test(lines[index])) {
      paragraph.push(lines[index].trim());
      index++;
    }
    await pushParagraph(paragraph.join(" "));
  }
  return {
    title: "",
    blocks,
    images,
    section: { width: 612, height: 792, top: 72, right: 72, bottom: 72, left: 72 },
    skippedImages,
    source: options.name || "document.md",
  };
};
