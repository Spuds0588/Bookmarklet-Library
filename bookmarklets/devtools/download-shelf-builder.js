/**
 * @name 📥 Build a download shelf on Page
 * @category devtools
 * @description Builds a personal bookmarklet that catches downloads into memory and lists them in a sidebar beside the partner sites you upload them to.
 * @tags download, shelf, sidebar, partner, portal, upload, builder, generator, byok, unzip, files
 * @traits network, web-app
 * @added 2026-11-06
 * @featured false
 */
(() => {
  const DRAWER_MS = 260;
  const MAX_PARTNERS = 12;

  /**
   * A partner list is one line per portal: `Name | URL`, or a bare URL that
   * names itself after its host. Blank lines and `#` comments are ignored, so a
   * list can be kept in a note and pasted in whole.
   */
  function parsePartners(text) {
    const partners = [];
    const problems = [];
    String(text ?? "")
      .split(/\r?\n/)
      .forEach((line, index) => {
        const raw = line.trim();
        if (!raw || raw.startsWith("#")) return;
        const cut = raw.indexOf("|");
        let name = cut === -1 ? "" : raw.slice(0, cut).trim();
        let url = (cut === -1 ? raw : raw.slice(cut + 1)).trim();
        if (!/^https?:\/\//i.test(url)) {
          // A bare host is a URL someone typed from memory; anything else is a
          // mistake worth naming rather than a scheme silently prepended to it.
          if (/^[\w-]+(\.[\w-]+)+([/?#]|$)/.test(url)) url = `https://${url}`;
          else {
            problems.push(`Line ${index + 1} is not an http(s) address.`);
            return;
          }
        }
        let parsed;
        try {
          parsed = new URL(url);
        } catch {
          problems.push(`Line ${index + 1} is not a whole URL.`);
          return;
        }
        if (!/^https?:$/.test(parsed.protocol)) {
          problems.push(`Line ${index + 1} has to be http or https.`);
          return;
        }
        if (partners.length >= MAX_PARTNERS) {
          problems.push(`Only ${MAX_PARTNERS} partners fit in one bookmark.`);
          return;
        }
        partners.push([name || parsed.hostname.replace(/^www\./, ""), parsed.href]);
      });
    return { partners, problems };
  }

  /** What the bookmarklet carries: the partner list and the auto-open choice. */
  function configFor(values = {}) {
    const { partners, problems } = parsePartners(values.partners);
    if (problems.length) throw new Error(problems[0]);
    return { p: partners, a: values.auto ? 1 : 0 };
  }

  // The whole shelf is one function and the bookmarklet runs its source, so the
  // payload and the code tested here cannot drift apart.
  const sourceFor = (cfg) => `(() => {\nconst C = ${JSON.stringify(cfg)};\n(${RUNTIME.toString()})(C);\n})();`;
  const bookmarkletFor = (values) => `javascript:${sourceFor(configFor(values))}`;

  function RUNTIME(C) {
    const d = document;
    if (d.querySelector("[data-download-shelf]")) return;
    const partners = Array.isArray(C.p) ? C.p : [];
    const autoOpen = Number(C.a) === 1;
    const HOLD = 300 * 1024 * 1024; // bytes the shelf will keep in this tab
    const LISTED = 40; // unzipped entries put on the shelf at once
    const STAGE = `min(360px,100vw)`;

    // A click is a download when it says so (`download`), when it points at a
    // file by extension, or when it is a blob or data URL the page built for it.
    // An ordinary page link keeps its normal navigation.
    const EXTS =
      /\.(pdf|zip|csv|tsv|txt|json|xml|rtf|md|eml|msg|docx?|xlsx?|pptx?|odt|ods|odp|png|jpe?g|gif|webp|svg|heic|mp4|mp3|wav)$/i;

    const TYPES = {
      pdf: "application/pdf",
      zip: "application/zip",
      csv: "text/csv",
      tsv: "text/tab-separated-values",
      txt: "text/plain",
      json: "application/json",
      xml: "application/xml",
      md: "text/markdown",
      rtf: "application/rtf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      heic: "image/heic",
      mp4: "video/mp4",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      odt: "application/vnd.oasis.opendocument.text",
      ods: "application/vnd.oasis.opendocument.spreadsheet",
    };

    // Types a browser downloads rather than renders. A blob of one of these is
    // a file the page built, not something it is about to show.
    const DOWNLOADS =
      /^(application\/(zip|x-zip-compressed|x-7z-compressed|x-rar-compressed|gzip|octet-stream|msword|rtf|vnd\.)|text\/csv)/i;
    const downloadType = (type) => DOWNLOADS.test(String(type || ""));

    // A page that builds its export in JavaScript hands the browser an object
    // URL, and usually revokes it in the same turn as the click. Recording the
    // blob at creation is the only moment those bytes are certain to exist.
    const generated = new Map();
    const nativeCreate = URL.createObjectURL;
    const nativeOpen = window.open;
    const remember = (url, blob) => {
      // A page can mint dozens of preview URLs; the shelf keeps the recent ones,
      // which is what a download in progress is holding.
      if (generated.size >= 60) generated.delete(generated.keys().next().value);
      generated.set(url, blob);
    };

    const CSS = [
      ":host{all:initial}",
      `.shelf{position:absolute;top:0;right:0;bottom:0;display:flex;flex-direction:column;width:${STAGE};border-left:1px solid #111;background:#fbfaf8;color:#111;font:13px/1.45 system-ui,-apple-system,sans-serif;box-shadow:-18px 0 40px rgba(17,17,17,.14);pointer-events:auto}`,
      ".bar{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid #111}",
      ".name{min-width:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".actions{display:flex;gap:6px;margin-left:auto}",
      "button{border:1px solid #111;background:#fbfaf8;color:#111;font:inherit;padding:4px 8px;cursor:pointer}",
      "button:hover{background:#111;color:#fbfaf8}",
      "button:focus-visible,a:focus-visible{outline:2px solid #111;outline-offset:1px}",
      ".status{margin:0;padding:7px 12px;border-bottom:1px solid #111;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;text-transform:uppercase;opacity:.72}",
      ".list{flex:1;min-height:0;overflow:auto;margin:0;padding:0;list-style:none}",
      ".row{display:flex;flex-direction:column;gap:4px;padding:9px 12px;border-bottom:1px solid #e6e3de}",
      '.row[draggable="true"]{cursor:grab}',
      ".head{display:flex;gap:8px;align-items:baseline}",
      ".file{flex:1;min-width:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".size,.note{font:11px ui-monospace,SFMono-Regular,Menlo,monospace;opacity:.62}",
      ".size{white-space:nowrap}",
      ".note{margin:0;overflow-wrap:anywhere}",
      ".acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}",
      ".empty{margin:0;padding:14px 12px;opacity:.7}",
      ".label{margin:0;padding:9px 12px 4px;border-top:1px solid #111;font:10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;opacity:.6}",
      ".partners{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 10px}",
      ".partners:empty{display:none}",
      `.stage{position:absolute;top:0;left:0;right:${STAGE};bottom:0;display:none;flex-direction:column;border:1px solid #111;background:#fbfaf8;box-shadow:0 24px 60px rgba(17,17,17,.25);pointer-events:auto}`,
      '.stage[data-open="true"]{display:flex}',
      ".stagebar{display:flex;gap:8px;align-items:center;padding:8px 10px;border-bottom:1px solid #111}",
      ".stagebar a{border:1px solid #111;padding:4px 8px;color:#111;text-decoration:none}",
      ".stagebar a:hover{background:#111;color:#fbfaf8}",
      ".frame{flex:1;width:100%;border:0;background:#fff}",
      ".stagenote{display:none;margin:0;padding:6px 10px;border-top:1px solid #111;font-size:11px}",
      ".stagenote:not(:empty){display:block}",
      ".foot{margin:0;padding:8px 12px;border-top:1px solid #111;font-size:11px;line-height:1.4;opacity:.7}",
      "@media (prefers-reduced-motion:reduce){*{transition:none!important}}",
    ].join("\n");

    const el = (tag, cls, text) => {
      const node = d.createElement(tag);
      if (cls) node.className = cls;
      if (text) node.textContent = text;
      return node;
    };
    const clear = (node) => {
      while (node.firstChild) node.removeChild(node.firstChild);
    };
    const button = (label, run, cls) => {
      const node = el("button", cls, label);
      node.type = "button";
      node.addEventListener("click", run);
      return node;
    };

    const host = d.createElement("div");
    host.setAttribute("data-download-shelf", "");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
    const root = host.attachShadow({ mode: "open" });
    const style = d.createElement("style");
    style.textContent = CSS;

    const shelf = el("div", "shelf");
    shelf.setAttribute("role", "complementary");
    shelf.setAttribute("aria-label", "Download shelf");
    const bar = el("div", "bar");
    const title = el("span", "name", "Download shelf");
    const actions = el("div", "actions");
    const closeBtn = button("Close", () => askClose());
    actions.append(closeBtn);
    bar.append(title, actions);
    const status = el("p", "status", "Waiting for a download on this page.");
    const list = el("ul", "list");
    const label = el("p", "label", "Partners");
    const partnerRow = el("div", "partners");
    const foot = el(
      "p",
      "foot",
      "Files stay in this tab's memory until you save them, so closing the shelf drops them. Drag a listed file onto a partner page's upload box to send its bytes without saving first.",
    );
    shelf.append(bar, status, list, label, partnerRow, foot);

    const stage = el("div", "stage");
    stage.dataset.open = "false";
    const stagebar = el("div", "stagebar");
    const stageName = el("span", "name", "Partner");
    const stageActions = el("div", "actions");
    const stageLink = el("a", "", "Open in tab");
    stageLink.target = "_blank";
    stageLink.rel = "noreferrer";
    const stageClose = button("Close", () => closeStage());
    stageActions.append(stageLink, stageClose);
    stagebar.append(stageName, stageActions);
    const frame = el("iframe", "frame");
    frame.setAttribute("title", "Partner page");
    frame.setAttribute("allow", "clipboard-write");
    const stageNote = el("p", "stagenote", "");
    stage.append(stagebar, frame, stageNote);

    root.append(style, shelf, stage);
    (d.body || d.documentElement).appendChild(host);

    let items = [];
    let serial = 0;
    let autoDone = false;
    let armed = 0;
    const madeUrls = new Set();

    // ---- small helpers ---------------------------------------------------

    const sizeText = (bytes) => {
      const n = Number(bytes) || 0;
      if (n < 1024) return `${n} B`;
      const units = ["KB", "MB", "GB"];
      let value = n / 1024;
      let unit = 0;
      while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
      }
      return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
    };

    const extOf = (name) => {
      const match = String(name).match(/\.([a-z0-9]{1,5})$/i);
      return match ? match[1].toLowerCase() : "";
    };
    const typeOf = (name, given) => (given && given !== "application/octet-stream" ? given : TYPES[extOf(name)] || "");
    const labelOf = (name) => extOf(name).toUpperCase() || "FILE";

    const said = (error) => {
      const text = String((error && error.message) || error || "unknown");
      return /failed to fetch|networkerror|load failed/i.test(text) ? "the page's CSP or CORS refused the read" : text;
    };

    // A server names a file it is handing over; that name beats the URL.
    const nameFrom = (res, url) => {
      const header = res.headers.get("content-disposition") || "";
      const star = header.match(/filename\*=UTF-8''([^;]+)/i);
      if (star) {
        try {
          return decodeURIComponent(star[1].trim());
        } catch {
          return star[1].trim();
        }
      }
      const plain = header.match(/filename="?([^";]+)"?/i);
      if (plain) return plain[1].trim();
      return "";
    };

    const nameOf = (anchor) => {
      const attr = (anchor.getAttribute("download") || "").trim();
      if (attr) return attr;
      const href = anchor.href || "";
      if (/^(blob|data):/i.test(href)) return "";
      try {
        const last = new URL(href, d.baseURI).pathname.split("/").filter(Boolean).pop() || "";
        return decodeURIComponent(last);
      } catch {
        return "";
      }
    };

    const isDownload = (anchor) => {
      const href = anchor.href || "";
      if (!/^(https?:|blob:|data:)/i.test(href)) return false;
      if (anchor.hasAttribute("download")) return true;
      if (/^(blob|data):/i.test(href)) return true;
      try {
        return EXTS.test(new URL(href).pathname);
      } catch {
        return false;
      }
    };

    // The prototype is patched because the common modern download never enters
    // the document: a detached anchor is clicked, and no click reaches a
    // listener. Restored on close.
    const proto = HTMLAnchorElement.prototype;
    const nativeClick = proto.click;

    // ---- the shelf -------------------------------------------------------

    const makeEntry = (patch) => {
      const entry = Object.assign({ id: (serial += 1), name: "", blob: null, url: "", note: "", status: "", type: "" }, patch);
      // Nothing names a blob the page built, so it gets a stable name of its own.
      if (!entry.name) entry.name = `generated-${entry.id}`;
      return entry;
    };
    const addEntry = (patch) => {
      const entry = makeEntry(patch);
      items.push(entry);
      return entry;
    };

    const open = (item) => {
      const url = URL.createObjectURL(item.blob);
      madeUrls.add(url);
      // The shelf's own tab is opened through the native call so a caught zip is
      // not taken again by the sink the shelf itself installed.
      const tab = nativeOpen.call(window, url, "_blank");
      if (!tab) {
        item.status = "The browser blocked the new tab. Use Save.";
        render();
      }
    };

    const save = (item) => {
      const url = URL.createObjectURL(item.blob);
      madeUrls.add(url);
      const anchor = d.createElement("a");
      anchor.href = url;
      anchor.download = item.name;
      nativeClick.call(anchor);
    };

    // A read that was refused leaves the file where it was: the row saves the
    // original link, so the page's own download still happens.
    const saveLink = (item) => {
      const anchor = d.createElement("a");
      anchor.href = item.url;
      anchor.download = item.name || "download";
      nativeClick.call(anchor);
    };

    const inflate = (bytes) => {
      if (typeof DecompressionStream !== "function") throw new Error("this browser cannot inflate a zip");
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Response(stream).arrayBuffer();
    };

    /** Central directory first, then only the entries that are worth listing. */
    const readZip = async (buffer) => {
      const view = new DataView(buffer);
      let end = -1;
      for (let at = buffer.byteLength - 22; at >= Math.max(0, buffer.byteLength - 65557); at -= 1) {
        if (view.getUint32(at, true) === 0x06054b50) {
          end = at;
          break;
        }
      }
      if (end < 0) throw new Error("that file is not a zip archive");
      const count = view.getUint16(end + 10, true);
      let at = view.getUint32(end + 16, true);
      if (count === 0xffff || at === 0xffffffff) throw new Error("zip64 archives are not read here");
      const files = [];
      let total = 0;
      for (let index = 0; index < count; index += 1) {
        if (view.getUint32(at, true) !== 0x02014b50) break;
        const flags = view.getUint16(at + 8, true);
        const method = view.getUint16(at + 10, true);
        const packed = view.getUint32(at + 20, true);
        const plain = view.getUint32(at + 24, true);
        const nameLen = view.getUint16(at + 28, true);
        const extraLen = view.getUint16(at + 30, true);
        const commentLen = view.getUint16(at + 32, true);
        const local = view.getUint32(at + 42, true);
        const name = new TextDecoder().decode(new Uint8Array(buffer, at + 46, nameLen));
        at += 46 + nameLen + extraLen + commentLen;
        if (name.endsWith("/") || (flags & 1) || packed === 0xffffffff || plain === 0xffffffff) continue;
        if (total + plain > HOLD) throw new Error(`the archive holds more than ${sizeText(HOLD)}`);
        total += plain;
        const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
        const slice = buffer.slice(start, start + packed);
        let bytes;
        if (method === 0) bytes = slice;
        else if (method === 8) bytes = await inflate(slice);
        else throw new Error(`compression method ${method} is not read here`);
        files.push({ name, blob: new Blob([bytes], { type: TYPES[extOf(name)] || "" }) });
      }
      return files;
    };

    const unzip = (item) => {
      item.status = "Reading the archive…";
      render();
      item.blob
        .arrayBuffer()
        .then(readZip)
        .then((files) => {
          if (!files.length) throw new Error("there is nothing inside it");
          const at = items.indexOf(item);
          const made = files.slice(0, LISTED).map((file) =>
            makeEntry({
              name: file.name,
              blob: file.blob,
              type: file.blob.type,
              note: `${labelOf(file.name)} · ${sizeText(file.blob.size)}`,
            }),
          );
          if (files.length > made.length) {
            made.push(
              makeEntry({
                name: `${files.length - made.length} more ${files.length - made.length === 1 ? "entry" : "entries"}`,
                status: `Only the first ${LISTED} entries are listed.`,
              }),
            );
          }
          items = items.filter((other) => other !== item);
          items.splice(Math.max(0, at), 0, ...made);
          render();
        })
        .catch((error) => {
          item.status = `Could not unzip it: ${said(error)}`;
          render();
        });
    };

    const accept = (entry, blob, header) => {
      if (blob.size > HOLD) {
        entry.status = `Could not read it: ${sizeText(blob.size)} is more than this shelf holds`;
        render();
        return;
      }
      const base = header || entry.name;
      const missing = extOf(base) ? "" : Object.keys(TYPES).find((key) => TYPES[key] === blob.type) || "";
      entry.name = missing ? `${base}.${missing}` : base;
      entry.blob = blob;
      entry.type = typeOf(entry.name, blob.type);
      entry.status = "";
      entry.note = `${labelOf(entry.name)} · ${sizeText(blob.size)}`;
      render();
      // The wizard's auto-open is for the first catch of a session, and only
      // while the user has not opened a partner panel of their own.
      if (autoOpen && !autoDone && partners.length && stage.dataset.open !== "true") {
        autoDone = true;
        openPartner(0);
      }
    };

    const take = (url, name) => {
      const entry = addEntry({ name: name || "", url, status: "Reading…" });
      render();
      const known = generated.get(url);
      if (known) {
        // No fetch: a page that revoked the URL already would fail one, and the
        // bytes are right here.
        accept(entry, known, "");
        return;
      }
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`the server answered ${res.status}`);
          const length = Number(res.headers.get("content-length") || 0);
          if (length > HOLD) throw new Error(`${sizeText(length)} is more than this shelf holds`);
          return res.blob().then((blob) => ({ blob, header: nameFrom(res, url) }));
        })
        .then(({ blob, header }) => accept(entry, blob, header))
        .catch((error) => {
          entry.status = `Could not read it: ${said(error)}`;
          render();
        });
    };

    URL.createObjectURL = function createObjectURL(object) {
      const url = nativeCreate.call(URL, object);
      if (object instanceof Blob) remember(url, object);
      return url;
    };

    // The other sink a generated file leaves by. It is taken only when the
    // browser would have downloaded the type rather than rendered it, so a
    // preview the page opens still opens.
    const built = (url) => generated.get(String(url || "")) || null;
    window.open = function open(url) {
      const blob = built(url);
      if (blob && downloadType(blob.type)) {
        take(String(url), "");
        return null;
      }
      return nativeOpen.apply(this, arguments);
    };
    // A location change cannot be wrapped: every member of `Location` is an
    // unforgeable own property of the instance, so `location.assign` and
    // `location.href` cannot be replaced. That was measured in Chrome, not
    // assumed, and it is the one generated download this shelf cannot take.

    const rowFor = (item) => {
      const row = el("li", "row");
      const head = el("div", "head");
      const name = el("span", "file", item.name);
      name.title = item.url || item.name;
      head.append(name);
      if (item.blob) head.append(el("span", "size", sizeText(item.blob.size)));
      row.append(head);
      if (item.note) row.append(el("p", "note", item.note));
      if (item.status) row.append(el("p", "note", item.status));

      const acts = el("div", "acts");
      if (item.blob) {
        row.draggable = true;
        row.addEventListener("dragstart", (event) => {
          const file = new File([item.blob], item.name, { type: item.type || "application/octet-stream" });
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.items.add(file);
        });
        if (extOf(item.name) === "zip" || /zip/i.test(item.type)) acts.append(button("Unzip", () => unzip(item)));
        acts.append(button("Open", () => open(item)), button("Save", () => save(item)));
      } else if (item.url) {
        acts.append(button("Save", () => saveLink(item)));
      }
      acts.append(
        button("Remove", () => {
          items = items.filter((other) => other !== item);
          render();
        }),
      );
      row.append(acts);
      return row;
    };

    const render = () => {
      clear(list);
      const held = items.reduce((sum, item) => sum + (item.blob ? item.blob.size : 0), 0);
      status.textContent = items.length
        ? `${items.length} ${items.length === 1 ? "file" : "files"} · ${sizeText(held)} in memory`
        : "Waiting for a download on this page.";
      if (!items.length) {
        list.append(el("li", "empty", "Click a download on this page and its bytes land here instead of the Downloads folder."));
      }
      for (const item of items) list.append(rowFor(item));
      closeBtn.textContent = items.length ? `Close · drop ${items.length}` : "Close";
    };

    // ---- the partner stage ----------------------------------------------

    const openPartner = (index) => {
      const partner = partners[index];
      if (!partner) return;
      stageName.textContent = partner[0];
      stageLink.href = partner[1];
      stageNote.textContent = "";
      stage.dataset.open = "true";
      frame.src = partner[1];
    };

    const closeStage = () => {
      stage.dataset.open = "false";
      // Blanking the frame stops the partner page's scripts and timers rather
      // than leaving them running behind a closed panel.
      frame.src = "about:blank";
    };

    const onViolation = (event) => {
      if (stage.dataset.open !== "true") return;
      if (!/^(frame-src|child-src|default-src)$/.test(String(event.violatedDirective || ""))) return;
      stageNote.textContent = "This page's CSP refuses frames from that partner. Open in tab is the way through.";
    };

    for (const partner of partners) partnerRow.append(button(partner[0], () => openPartner(partners.indexOf(partner))));

    // ---- catching the download -----------------------------------------

    const onClick = (event) => {
      const node = event.target;
      const anchor = node && node.closest ? node.closest("a[href]") : null;
      if (!anchor || !isDownload(anchor)) return;
      event.preventDefault();
      take(anchor.href, nameOf(anchor));
    };

    const patchedClick = function click() {
      if (isDownload(this)) {
        take(this.href, nameOf(this));
        return;
      }
      return nativeClick.call(this);
    };
    proto.click = patchedClick;
    d.addEventListener("click", onClick, true);
    d.addEventListener("securitypolicyviolation", onViolation);

    // ---- closing --------------------------------------------------------

    const closeAll = () => {
      d.removeEventListener("click", onClick, true);
      d.removeEventListener("securitypolicyviolation", onViolation);
      if (proto.click === patchedClick) proto.click = nativeClick;
      URL.createObjectURL = nativeCreate;
      window.open = nativeOpen;
      frame.src = "about:blank";
      for (const url of madeUrls) URL.revokeObjectURL(url);
      host.remove();
    };

    // Files only exist in this tab, so one press must not throw them away.
    const askClose = () => {
      if (!items.some((item) => item.blob) || armed) {
        closeAll();
        return;
      }
      armed = 1;
      closeBtn.textContent = "Click again to drop them";
      setTimeout(() => {
        armed = 0;
        if (host.isConnected) render();
      }, 4000);
    };

    shelf.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && stage.dataset.open === "true") closeStage();
    });

    render();
  }

  const CSS = [
    ":host{all:initial}",
    ".drawer{position:absolute;top:0;right:0;bottom:0;display:flex;flex-direction:column;width:min(440px,100vw);border-left:1px solid #111;background:#fbfaf8;color:#111;font:13px/1.45 system-ui,-apple-system,sans-serif;box-shadow:-24px 0 48px rgba(17,17,17,.16);pointer-events:auto;outline:none;transform:translateX(100%);transition:transform 260ms cubic-bezier(.22,.61,.36,1)}",
    '.drawer[data-open="true"]{transform:translateX(0)}',
    "@media (prefers-reduced-motion:reduce){.drawer{transition:none}}",
    ".bar{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid #111}",
    ".name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".actions{display:flex;gap:6px;margin-left:auto}",
    ".body{display:flex;flex-direction:column;gap:12px;padding:14px;overflow:auto}",
    ".field{display:flex;flex-direction:column;gap:4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.72}",
    "input,textarea{font:13px/1.45 system-ui,-apple-system,sans-serif;color:#111;background:#fff;border:1px solid #111;padding:7px 8px;width:100%;box-sizing:border-box}",
    "textarea{min-height:104px;resize:vertical;letter-spacing:0;text-transform:none}",
    ".check{display:flex;gap:8px;align-items:center;font-size:12px}",
    ".check input{width:auto;margin:0}",
    ".out{display:flex;flex-wrap:wrap;gap:8px;align-items:center;min-height:40px}",
    ".out a{display:inline-block;border:1px dashed #111;padding:9px 12px;color:#111;background:#fff;font-weight:600;text-decoration:none;cursor:grab}",
    ".out a[aria-disabled=true]{opacity:.4;pointer-events:none}",
    "button{border:1px solid #111;background:#fbfaf8;color:#111;font:inherit;cursor:pointer;padding:5px 9px}",
    "button:hover{background:#111;color:#fbfaf8}",
    "button[disabled]{opacity:.45;cursor:default}",
    "button[disabled]:hover{background:#fbfaf8;color:#111}",
    ".hint{margin:0;font-size:11px;opacity:.65}",
    ".warn{margin:0;font-size:11px;border-left:2px solid #111;padding-left:8px;opacity:.8}",
    ".warn:empty{display:none}",
    ".status{margin:0;padding:7px 12px;border-bottom:1px solid #111;font-size:12px;opacity:.75}",
    ".status[data-error=true]{opacity:1;font-weight:600}",
  ].join("\n");

  function openPanel() {
    const host = document.createElement("div");
    host.setAttribute("data-download-shelf-builder", "");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;

    const el = (tag, cls, text) => {
      const node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text) node.textContent = text;
      return node;
    };
    const field = (labelText, node) => {
      const wrap = el("label", "field", labelText);
      wrap.append(node);
      return wrap;
    };

    const drawer = el("div", "drawer");
    drawer.tabIndex = -1;
    drawer.setAttribute("role", "complementary");
    drawer.setAttribute("aria-label", "Download shelf builder");
    drawer.dataset.open = "false";

    const bar = el("div", "bar");
    const name = el("span", "name", "Download shelf builder");
    const actions = el("div", "actions");
    const closeBtn = el("button", "", "Close");
    closeBtn.type = "button";
    const status = el("p", "status", "Add a partner, then drag the link out.");
    const body = el("div", "body");

    const partners = el("textarea");
    partners.spellcheck = false;
    partners.rows = 5;
    partners.placeholder = "Acme claims portal | https://acme.example/upload\nhttps://portal.example/claims";
    partners.setAttribute("aria-label", "Partners, one name and URL per line");

    const auto = el("input");
    auto.type = "checkbox";
    const autoRow = el("label", "check");
    autoRow.append(auto, document.createTextNode("Open the first partner when a download is caught"));

    const out = el("div", "out");
    const link = el("a", "", "Drag me to the bookmarks bar");
    link.href = "#";
    link.setAttribute("aria-disabled", "true");
    const copyBtn = el("button", "", "Copy");
    copyBtn.type = "button";
    copyBtn.disabled = true;
    out.append(link, copyBtn);

    const warn = el("p", "warn", "");

    actions.append(closeBtn);
    bar.append(name, actions);
    body.append(
      field("Partners, one per line: Name | URL", partners),
      autoRow,
      el(
        "p",
        "hint",
        "The shelf catches downloads into this tab's memory, then lists them beside the partner you pick. A partner opens in a frame on the left, and Open in tab is there because many sites refuse to be framed.",
      ),
      warn,
      out,
      el(
        "p",
        "hint",
        "Nothing leaves the page until you click a partner, and nothing is saved until you press Save. Partners named here are carried in the bookmark, so build it on your own machine.",
      ),
    );
    drawer.append(bar, status, body);
    root.append(style, drawer);
    document.documentElement.appendChild(host);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        drawer.dataset.open = "true";
        partners.focus();
      });
    });

    let closing = 0;
    const closeAll = () => {
      if (closing) return;
      drawer.dataset.open = "false";
      closing = setTimeout(() => host.remove(), DRAWER_MS);
    };
    closeBtn.addEventListener("click", closeAll);
    drawer.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAll();
    });

    const render = () => {
      const parsed = parsePartners(partners.value);
      link.href = "#";
      link.setAttribute("aria-disabled", "true");
      copyBtn.disabled = true;
      warn.textContent = "";
      if (parsed.problems.length) {
        status.dataset.error = "true";
        status.textContent = parsed.problems[0];
        return;
      }
      status.dataset.error = "false";
      status.textContent = parsed.partners.length
        ? `Ready · ${parsed.partners.length} ${parsed.partners.length === 1 ? "partner" : "partners"}`
        : "Ready · files are caught, but there is no partner to open.";
      link.href = bookmarkletFor({ partners: partners.value, auto: auto.checked });
      link.setAttribute("aria-disabled", "false");
      copyBtn.disabled = false;
      if (auto.checked && !parsed.partners.length) warn.textContent = "Auto-open needs a partner to open.";
    };

    partners.addEventListener("input", render);
    auto.addEventListener("change", render);
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(link.getAttribute("href"));
        copyBtn.textContent = "Copied";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
      } catch {
        copyBtn.textContent = "Select it instead";
      }
    });

    render();
    return { host, partners, auto, link };
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.downloadShelfBuilder = {
      MAX_PARTNERS,
      parsePartners,
      configFor,
      sourceFor,
      bookmarkletFor,
      RUNTIME,
    };
  } else if (document?.body) {
    openPanel();
  }
})();
