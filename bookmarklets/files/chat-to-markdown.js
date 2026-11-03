/**
 * @name 💬 Export chat to Markdown
 * @category files
 * @description Save a whole LLM conversation as one Markdown file, found automatically or picked by clicking the chat yourself.
 * @tags chatgpt, claude, gemini, markdown, export, conversation, transcript, llm
 * @traits self-contained, offline
 * @added 2026-11-03
 * @featured false
 */
(() => {
  const SKIP_TAGS = new Set([
    "script", "style", "svg", "button", "noscript", "canvas", "iframe",
    "input", "select", "textarea", "form", "template", "audio", "video",
  ]);
  const BLOCK_TAGS = new Set([
    "p", "div", "section", "article", "header", "footer", "main", "aside",
    "figure", "figcaption", "dl", "dt", "dd", "details", "summary", "address", "fieldset",
  ]);
  const CONTENT_SELECTORS = [
    ".markdown", "[class*='markdown']", ".font-claude-message",
    "[data-message-content]", ".whitespace-pre-wrap", ".prose",
  ];
  const GENERIC_USER = [
    '[data-message-author-role="user"]', '[data-testid="user-message"]',
    '[data-role="user"]', "user-query", ".user-message",
  ];
  const GENERIC_ASSISTANT = [
    '[data-message-author-role="assistant"]', '[data-testid="assistant-message"]',
    '[data-role="assistant"]', "model-response", ".assistant-message", ".font-claude-message",
  ];
  const CONTAINERS = [
    '[data-testid*="conversation"]',
    '[class*="conversation-container"]',
    'div[class*="chat-container"]',
    'div[class*="react-scroll-to-bottom"]',
    '[role="main"]',
    "main",
  ];
  const PLATFORMS = [
    {
      name: "ChatGPT",
      host: /(^|\.)(chatgpt\.com|chat\.openai\.com)$/i,
      user: ['[data-message-author-role="user"]'],
      assistant: ['[data-message-author-role="assistant"]'],
    },
    {
      name: "Claude",
      host: /(^|\.)(claude\.ai|claude\.com)$/i,
      user: ['[data-testid="user-message"]'],
      assistant: [".font-claude-message", '[data-testid="assistant-message"]'],
    },
    {
      name: "Gemini",
      host: /(^|\.)gemini\.google\.com$/i,
      user: ["user-query"],
      assistant: ["model-response"],
    },
  ];

  const CSS = `
    .wrap { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,.72); font: 14px/1.5 system-ui, -apple-system, sans-serif; color: #111; }
    .panel { display: flex; flex-direction: column; width: min(480px, 92vw); max-height: 88vh; background: #fbfaf8;
      border: 1px solid #111; box-shadow: 0 24px 60px rgba(0,0,0,.45); }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px;
      border-bottom: 1px solid #111; }
    .title { margin: 0; font-size: 14px; font-weight: 600; }
    .meta { margin: 2px 0 0; font: 600 9.5px/1.4 ui-monospace, monospace; letter-spacing: .08em;
      text-transform: uppercase; color: #666; }
    .close { padding: 4px 8px; border: 1px solid #111; background: transparent; color: #111;
      font: 600 10px/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
    .body { display: flex; flex-direction: column; gap: 10px; padding: 14px; overflow: auto; }
    .status { margin: 0; padding: 9px 10px; border: 1px solid #111; background: #fff; font-size: 12.5px;
      overflow-wrap: anywhere; }
    .hint { margin: 0; font-size: 11.5px; color: #666; }
    .foot { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; padding: 10px 14px;
      border-top: 1px solid #111; }
    .foot button { padding: 6px 10px; border: 1px solid #111; background: transparent; color: #111;
      font: 600 10px/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase;
      cursor: pointer; text-align: center; }
    .foot .primary { background: #111; color: #fbfaf8; }
  `;

  const PICKER_CSS = `
    .scrim { position: fixed; inset: 0; z-index: 2147483646; background: rgba(16,185,129,.10); cursor: crosshair; }
    .box { position: fixed; z-index: 2147483647; pointer-events: none; border: 2px solid #10b981;
      box-shadow: 0 0 0 9999px rgba(0,0,0,.06); display: none; }
    .tip { position: fixed; z-index: 2147483647; top: 16px; left: 50%; transform: translateX(-50%);
      display: flex; align-items: baseline; gap: 8px; max-width: 92vw; padding: 9px 13px; background: #111;
      color: #fbfaf8; font: 12px/1.4 system-ui, sans-serif; box-shadow: 0 8px 24px rgba(0,0,0,.35); }
    .tip b { font: 600 10px/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; }
    .tip em { font-style: normal; color: #b9b3a8; }
  `;

  const TOAST_CSS = `
    .toast { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 2147483647;
      display: flex; align-items: center; gap: 10px; max-width: min(560px, 92vw); padding: 9px 13px;
      border: 1px solid #111; background: #fbfaf8; color: #111; font: 12px/1.4 system-ui, sans-serif;
      box-shadow: 0 10px 30px rgba(0,0,0,.28); }
    b { flex: none; font: 600 10px/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; }
    span { overflow-wrap: anywhere; }
  `;

  /* Markdown conversion --------------------------------------------------- */

  function tidyMarkdown(text) {
    return String(text || "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^[\s\n]+|[\s\n]+$/g, "");
  }

  function skipNode(node) {
    if (node.nodeType !== 1) return false;
    const tag = node.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag)) return true;
    if (node.getAttribute("aria-hidden") === "true") return true;
    if (node.hasAttribute("hidden")) return true;
    const cls = node.getAttribute("class") || "";
    if (/(^|\s)(sr-only|visually-hidden|visuallyhidden|screen-reader-text|sr-hidden)(\s|$)/i.test(cls)) return true;
    const role = node.getAttribute("role") || "";
    if (["button", "menu", "menubar", "toolbar", "navigation"].includes(role)) return true;
    const label = `${node.getAttribute("data-testid") || ""} ${node.getAttribute("aria-label") || ""}`;
    // A "Copy code" chip carries text a reader does not want in a transcript.
    if (/copy|toolbar|menu|action/i.test(label) && node.textContent.trim().length < 40) return true;
    if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(node.getAttribute("style") || "")) return true;
    return false;
  }

  function inlineText(text) {
    return String(text || "").replace(/\s+/g, " ").replace(/</g, "&lt;");
  }

  function absolute(href) {
    try {
      return new URL(href, location.href).href;
    } catch {
      return href;
    }
  }

  function languageOf(node) {
    const raw = `${node.getAttribute("class") || ""} ${node.getAttribute("data-language") || ""}`;
    const match = raw.match(/(?:language|lang|highlight-source)-([\w+#.-]+)/i);
    if (match) return match[1].toLowerCase();
    const inner = node.querySelector?.("[class*=language-]")?.getAttribute("class") || "";
    const nested = inner.match(/language-([\w+#.-]+)/i);
    return nested ? nested[1].toLowerCase() : "";
  }

  function convertChildren(node, ctx) {
    let out = "";
    for (const child of node.childNodes) out += convertNode(child, ctx);
    return out;
  }

  function emphasis(node, ctx, marker) {
    const inner = convertChildren(node, ctx).replace(/\s+/g, " ").trim();
    return inner ? `${marker}${inner}${marker}` : "";
  }

  function inlineCode(node) {
    const text = node.textContent.replace(/\s+/g, " ").trim();
    if (!text) return "";
    const fence = text.includes("`") ? "``" : "`";
    const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
    return `${fence}${pad}${text}${pad}${fence}`;
  }

  function preBlock(node) {
    const code = node.querySelector("code") || node;
    const source = code.textContent.replace(/^\n+/, "").replace(/\n+$/, "");
    if (!source.trim()) return "";
    const language = languageOf(code) || languageOf(node);
    const fence = source.includes("```") ? "````" : "```";
    return `\n\n${fence}${language}\n${source}\n${fence}\n\n`;
  }

  function listBlock(node, ctx, ordered) {
    let index = Number(node.getAttribute("start") || 1) || 1;
    const lines = [];
    for (const child of node.children) {
      if (child.tagName.toLowerCase() !== "li" || skipNode(child)) continue;
      const marker = ordered ? `${index++}. ` : "- ";
      const inner = tidyMarkdown(convertChildren(child, { ...ctx, inList: true }));
      if (!inner) continue;
      const parts = inner.split("\n");
      lines.push(marker + parts[0]);
      for (const line of parts.slice(1)) lines.push(line ? `  ${line}` : "");
    }
    return lines.length ? `\n\n${lines.join("\n")}\n\n` : "";
  }

  function tableBlock(node, ctx) {
    const rows = [];
    for (const row of node.querySelectorAll("tr")) {
      if (skipNode(row)) continue;
      const cells = [...row.children]
        .filter((cell) => /^(td|th)$/i.test(cell.tagName))
        .map((cell) =>
          tidyMarkdown(convertChildren(cell, ctx))
            .replace(/\n+/g, " ")
            .replace(/\|/g, "\\|")
            .trim(),
        );
      if (cells.length) rows.push(cells);
    }
    if (!rows.length) return "";
    const width = Math.max(...rows.map((row) => row.length));
    const line = (cells) => `| ${[...cells, ...Array(width - cells.length).fill("")].join(" | ")} |`;
    const out = [line(rows[0]), `| ${Array(width).fill("---").join(" | ")} |`, ...rows.slice(1).map(line)];
    return `\n\n${out.join("\n")}\n\n`;
  }

  function linkBlock(node, ctx) {
    const href = node.getAttribute("href") || "";
    const text = tidyMarkdown(convertChildren(node, ctx)).replace(/\n+/g, " ").trim();
    if (!href || /^javascript:/i.test(href) || href === "#" || href.startsWith("#")) return text;
    if (!text) return "";
    return `[${text}](${absolute(href).replace(/\(/g, "%28").replace(/\)/g, "%29")})`;
  }

  function imageBlock(node) {
    const src = node.getAttribute("src") || "";
    if (!src || /^data:/i.test(src)) return "";
    const alt = (node.getAttribute("alt") || "image").replace(/\s+/g, " ").trim();
    return `![${alt}](${absolute(src)})`;
  }

  function convertNode(node, ctx) {
    if (node.nodeType === 3) return inlineText(node.nodeValue);
    if (node.nodeType !== 1) return "";
    if (skipNode(node)) return "";
    const tag = node.tagName.toLowerCase();

    if (tag === "br") return "\n";
    if (tag === "hr") return "\n\n---\n\n";
    if (/^h[1-6]$/.test(tag)) {
      const text = convertChildren(node, ctx).replace(/\s+/g, " ").trim();
      return text ? `\n\n${"#".repeat(Number(tag[1]))} ${text}\n\n` : "";
    }
    if (tag === "pre") return preBlock(node);
    if (tag === "code") return inlineCode(node);
    if (tag === "ul") return listBlock(node, ctx, false);
    if (tag === "ol") return listBlock(node, ctx, true);
    if (tag === "table") return tableBlock(node, ctx);
    if (tag === "a") return linkBlock(node, ctx);
    if (tag === "img") return imageBlock(node);
    if (tag === "strong" || tag === "b") return emphasis(node, ctx, "**");
    if (tag === "em" || tag === "i") return emphasis(node, ctx, "_");
    if (tag === "del" || tag === "s" || tag === "strike") return emphasis(node, ctx, "~~");
    if (tag === "blockquote") {
      const inner = tidyMarkdown(convertChildren(node, ctx));
      if (!inner) return "";
      return `\n\n${inner.split("\n").map((line) => (line ? `> ${line}` : ">")).join("\n")}\n\n`;
    }

    if (BLOCK_TAGS.has(tag)) {
      const inner = tidyMarkdown(convertChildren(node, ctx));
      return inner ? `\n\n${inner}\n\n` : "";
    }
    return convertChildren(node, ctx);
  }

  function htmlToMarkdown(root) {
    return tidyMarkdown(convertChildren(root, { inList: false }));
  }

  /* Finding the conversation --------------------------------------------- */

  function platformFor(hostname) {
    const host = String(hostname || "");
    return PLATFORMS.find((spec) => spec.host.test(host))?.name || "";
  }

  // Role detection degrades gracefully: the platform's own selectors first,
  // then the attributes several tools share.
  function chatSelectors() {
    const spec = PLATFORMS.find((entry) => entry.name === platformFor(location.hostname));
    return {
      user: spec ? [...spec.user, ...GENERIC_USER] : GENERIC_USER,
      assistant: spec ? [...spec.assistant, ...GENERIC_ASSISTANT] : GENERIC_ASSISTANT,
    };
  }

  function collect(selectors) {
    const found = [];
    for (const selector of selectors) {
      let nodes = [];
      try {
        nodes = [...document.querySelectorAll(selector)];
      } catch {
        continue;
      }
      for (const node of nodes) {
        if (!node.isConnected) continue;
        // Nested matches would duplicate a message, so keep only the outer one.
        if (found.some((other) => other === node || other.contains(node))) continue;
        for (let index = found.length - 1; index >= 0; index--) {
          if (node.contains(found[index])) found.splice(index, 1);
        }
        found.push(node);
      }
    }
    return found.sort((a, b) => (a.compareDocumentPosition(b) & 4 ? -1 : 1));
  }

  function messageContent(node) {
    for (const selector of CONTENT_SELECTORS) {
      const match = node.matches?.(selector) ? node : node.querySelector(selector);
      if (match && match.textContent.trim().length > 20) return match;
    }
    return node;
  }

  function chatMessages() {
    const selectors = chatSelectors();
    const messages = [
      ...collect(selectors.user).map((node) => ({ node, role: "user" })),
      ...collect(selectors.assistant).map((node) => ({ node, role: "assistant" })),
    ].sort((a, b) => (a.node.compareDocumentPosition(b.node) & 4 ? -1 : 1));

    // A transcript needs both sides; three user bubbles alone are a search page.
    if (!messages.some((message) => message.role === "assistant")) return [];

    return messages
      .map((message) => ({
        role: message.role,
        markdown: htmlToMarkdown(messageContent(message.node)),
      }))
      .filter((message) => message.markdown.length > 0);
  }

  function bestContainer() {
    let best = null;
    for (const selector of CONTAINERS) {
      for (const node of document.querySelectorAll(selector)) {
        const text = node.innerText ? node.innerText.trim() : node.textContent.trim();
        if (text.length < 400) continue;
        if (!best || text.length > best.length) best = { node, length: text.length };
      }
    }
    return best;
  }

  function chatTitle() {
    const raw = String(document.title || "").replace(/\s+/g, " ").trim();
    const cleaned = raw
      .replace(/\s*[|·:]\s*(ChatGPT|Claude|Gemini|Copilot|Perplexity|Grok|AI Studio).*$/i, "")
      .replace(/\s+[-–—]\s+(ChatGPT|Claude|Gemini|Copilot|Perplexity|Grok|AI Studio).*$/i, "")
      .trim();
    return cleaned || raw || location.hostname;
  }

  function fileNameForChat(title, host, date = new Date()) {
    const slug = String(title || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/, "");
    const fallback = String(host || "export").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
    const pad = (value) => String(value).padStart(2, "0");
    const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
    return `chat-${slug || fallback || "export"}-${stamp}.md`;
  }

  function humanDate(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function transcript(messages, meta) {
    const header = [
      `# ${meta.title}`,
      "",
      `> Exported from ${meta.url} on ${meta.when}${meta.platform ? ` · ${meta.platform}` : ""} · ${messages.length} message${messages.length === 1 ? "" : "s"}`,
      "",
    ];
    const body = messages.map((message) =>
      [`## ${message.role === "user" ? "You" : "Assistant"}`, "", message.markdown, ""].join("\n"),
    );
    return `${header.join("\n")}\n${body.join("\n---\n\n")}`.trimEnd() + "\n";
  }

  /* Saving ---------------------------------------------------------------- */

  function download(markdown, filename) {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    // Revoking too early can cancel the save in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function toast(message) {
    document.getElementById("bl-chat-export-toast")?.remove();
    const host = document.createElement("div");
    host.id = "bl-chat-export-toast";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>:host{all:initial}${TOAST_CSS}</style><div class="toast" role="status"><b>Saved</b><span></span></div>`;
    root.querySelector("span").textContent = message;
    document.body.append(host);
    setTimeout(() => host.remove(), 7000);
  }

  function meta(count) {
    return {
      title: chatTitle(),
      url: location.href,
      when: humanDate(new Date()),
      platform: platformFor(location.hostname),
      count,
    };
  }

  function saveMessages(messages) {
    const filename = fileNameForChat(chatTitle(), location.hostname);
    download(transcript(messages, meta(messages.length)), filename);
    toast(`${messages.length} messages in ${filename}`);
  }

  function saveArea(node) {
    const markdown = htmlToMarkdown(node);
    if (!markdown) {
      toast("That area had no text to save.");
      return;
    }
    const filename = fileNameForChat(chatTitle(), location.hostname);
    const body = `# ${chatTitle()}\n\n> Exported from ${location.href} on ${humanDate(new Date())}${platformFor(location.hostname) ? ` · ${platformFor(location.hostname)}` : ""}\n\n${markdown}\n`;
    download(body, filename);
    toast(`${Math.round(markdown.length / 1000) || 1}k characters in ${filename}`);
  }

  /* Fallbacks ------------------------------------------------------------- */

  function openPanel(node) {
    document.getElementById("bl-chat-export-host")?.remove();
    const host = document.createElement("div");
    host.id = "bl-chat-export-host";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>:host{all:initial}${CSS}</style>
      <div class="wrap"><section class="panel" role="dialog" aria-modal="true" aria-label="Export chat to Markdown">
        <header class="head">
          <div><h2 class="title">Export chat to Markdown</h2><p class="meta">No transcript found automatically</p></div>
          <button class="close" type="button" data-close>Close</button>
        </header>
        <div class="body">
          <p class="status"></p>
          <p class="hint">One .md file, written straight to your downloads. No clipboard, so nothing is truncated.</p>
        </div>
        <footer class="foot">
          <button type="button" data-pick>Pick an area</button>
          <button type="button" class="primary" data-save>Save this area</button>
        </footer>
      </section></div>`;

    const wrap = root.querySelector(".wrap");
    const status = root.querySelector(".status");
    const text = node.innerText.trim();
    status.textContent = `This page looks like it holds a conversation: ${text.length.toLocaleString()} characters, ${node.querySelectorAll("p").length} paragraphs. Nothing was recognised as a message, so the structure will be plain.`;
    root.querySelector(".meta").textContent = platformFor(location.hostname) || location.hostname;

    const close = () => {
      window.removeEventListener("keydown", onKey, true);
      host.remove();
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    root.querySelector("[data-close]").addEventListener("click", close);
    wrap.addEventListener("click", (event) => {
      if (event.target === wrap) close();
    });
    root.querySelector("[data-save]").addEventListener("click", () => {
      close();
      saveArea(node);
    });
    root.querySelector("[data-pick]").addEventListener("click", () => {
      close();
      startPicker();
    });
    document.body.append(host);
  }

  // The click a person makes lands on a paragraph or a span. The useful export
  // is the block around it, so climb until there is enough text to be that.
  function pickCandidate(target) {
    let node = target;
    for (let depth = 0; depth < 8 && node && node !== document.body; depth++) {
      if (node.textContent.trim().length >= 600) return node;
      node = node.parentElement;
    }
    return node || target;
  }

  function startPicker() {
    document.getElementById("bl-chat-export-picker")?.remove();
    const host = document.createElement("div");
    host.id = "bl-chat-export-picker";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>:host{all:initial}${PICKER_CSS}</style>
      <div class="scrim"></div><div class="box"></div>
      <div class="tip"><b>Export chat</b><span>Click the conversation</span><em>Esc cancels</em></div>`;
    const scrim = root.querySelector(".scrim");
    const box = root.querySelector(".box");
    const tip = root.querySelector(".tip span");
    document.body.append(host);

    let current = null;

    const cleanup = () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
      host.remove();
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cleanup();
      }
    };
    const hover = (event) => {
      // Hide the overlay for one frame so the point reports the page beneath it.
      scrim.style.pointerEvents = "none";
      const under = document.elementFromPoint(event.clientX, event.clientY);
      scrim.style.pointerEvents = "";
      if (!under || host.contains(under) || under === document.documentElement) return;
      current = under;
      const rect = under.getBoundingClientRect();
      box.style.display = rect.width > 0 ? "block" : "none";
      box.style.left = `${Math.round(rect.left)}px`;
      box.style.top = `${Math.round(rect.top)}px`;
      box.style.width = `${Math.round(rect.width)}px`;
      box.style.height = `${Math.round(rect.height)}px`;
      const label = under.tagName.toLowerCase();
      const size = Math.round(under.textContent.trim().length).toLocaleString();
      tip.textContent = `<${label}> · ${size} characters`;
    };
    const onMove = (event) => hover(event);
    const onClick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const target = current || event.target;
      cleanup();
      if (!target || target === document.body) return;
      saveArea(pickCandidate(target));
    };

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    tip.textContent = "Click the conversation";
  }

  function run() {
    document.getElementById("bl-chat-export-host")?.remove();
    document.getElementById("bl-chat-export-picker")?.remove();

    const messages = chatMessages();
    if (messages.length >= 2) {
      saveMessages(messages);
      return;
    }
    const container = bestContainer();
    if (container) {
      openPanel(container.node);
      return;
    }
    startPicker();
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.chatExport = { platformFor, fileNameForChat, chatTitle, tidyMarkdown };
  } else if (document?.body) {
    run();
  }
})();
