/* Small, non-validating XML reader for OOXML. No external entities. */

BL.decodeEntities = (value) => String(value || "").replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (match, body) => {
  if (body === "amp") return "&";
  if (body === "lt") return "<";
  if (body === "gt") return ">";
  if (body === "quot") return '"';
  if (body === "apos") return "'";
  const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
  return Number.isFinite(code) ? String.fromCodePoint(code) : match;
});

BL.parseXml = (source) => {
  const text = String(source || "");
  const root = { name: "#document", attrs: {}, children: [], text: "" };
  const stack = [root];
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf("<", index);
    if (open < 0) {
      stack.at(-1).text += BL.decodeEntities(text.slice(index));
      break;
    }
    if (open > index) stack.at(-1).text += BL.decodeEntities(text.slice(index, open));
    if (text.startsWith("<!--", open)) {
      const end = text.indexOf("-->", open + 4);
      index = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith("<![CDATA[", open)) {
      const end = text.indexOf("]]>", open + 9);
      stack.at(-1).text += text.slice(open + 9, end < 0 ? text.length : end);
      index = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith("<?", open)) {
      const end = text.indexOf("?>", open + 2);
      index = end < 0 ? text.length : end + 2;
      continue;
    }
    if (text.startsWith("<!", open)) {
      const end = text.indexOf(">", open + 2);
      index = end < 0 ? text.length : end + 1;
      continue;
    }
    const close = text.indexOf(">", open + 1);
    if (close < 0) break;
    let inside = text.slice(open + 1, close).trim();
    index = close + 1;
    if (!inside) continue;
    if (inside.startsWith("/")) {
      const name = inside.slice(1).trim().toLowerCase();
      for (let depth = stack.length - 1; depth > 0; depth--) {
        if (stack[depth].name === name) {
          stack.length = depth;
          break;
        }
      }
      continue;
    }
    const selfClosing = inside.endsWith("/");
    if (selfClosing) inside = inside.slice(0, -1).trim();
    const space = inside.search(/\s/);
    const name = (space < 0 ? inside : inside.slice(0, space)).toLowerCase();
    const attrs = {};
    if (space >= 0) {
      const rest = inside.slice(space + 1);
      const pattern = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
      let match;
      while ((match = pattern.exec(rest))) {
        attrs[match[1].toLowerCase()] = BL.decodeEntities(match[3] ?? match[4] ?? "");
      }
    }
    const node = { name, attrs, children: [], text: "" };
    stack.at(-1).children.push(node);
    if (!selfClosing) stack.push(node);
  }
  return root.children[0] || root;
};

BL.resolvePart = (base, target) => {
  const raw = String(target || "").replace(/\\/g, "/");
  const stack = raw.startsWith("/") ? [] : String(base || "").split("/").filter(Boolean);
  for (const part of raw.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
};

BL.docxRels = (xml) => {
  const rels = {};
  if (!xml) return rels;
  const root = BL.parseXml(xml);
  for (const rel of BL.children(root, "relationship")) {
    rels[rel.attrs.id] = { target: rel.attrs.target, mode: rel.attrs.targetmode || "" };
  }
  return rels;
};

BL.child = (node, name) => (node?.children || []).find((child) => child.name === name);
BL.children = (node, name) => (node?.children || []).filter((child) => child.name === name);
BL.attr = (node, name, fallback = "") => node?.attrs?.[name] ?? fallback;
BL.localName = (name) => String(name || "").split(":").at(-1);
BL.textContent = (node) => {
  if (!node) return "";
  let value = node.text || "";
  for (const child of node.children) value += BL.textContent(child);
  return value;
};
BL.findAll = (node, name, out = []) => {
  if (!node) return out;
  if (node.name === name) out.push(node);
  for (const child of node.children || []) BL.findAll(child, name, out);
  return out;
};
BL.findFirst = (node, name) => {
  if (!node) return null;
  if (node.name === name) return node;
  for (const child of node.children || []) {
    const found = BL.findFirst(child, name);
    if (found) return found;
  }
  return null;
};

BL.xmlEscape = (value) => String(value ?? "")
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");
