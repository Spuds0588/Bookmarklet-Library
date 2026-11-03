#!/usr/bin/env node
/**
 * Drives every surface a framed editor is supposed to offer — the modal frame,
 * a document picture-in-picture window, and a popup — against the real editor,
 * on a page that really refuses the frame.
 *
 *   node scripts/fallbacks.mjs                  headed, on $DISPLAY
 *   node scripts/fallbacks.mjs --display=:1     pick the X display
 *   node scripts/fallbacks.mjs --tool=photo-editor-local
 *   node scripts/fallbacks.mjs --keep           leave the windows open
 *
 * The blocked page carries `frame-src 'self'`, because that is the situation the
 * fallbacks exist for: a page whose CSP refuses the editor and says nothing when
 * it does. Document PiP needs a live user gesture, so the button paths are driven
 * with real mouse events; the timeout-driven chain is checked with the API hidden,
 * so it has to end up in a popup without anyone clicking anything.
 *
 * Chrome is driven over the DevTools pipe, the same way scripts/shots.mjs does.
 * Document PiP has no headless equivalent here, so without a display the floating
 * window is reported as untested rather than passed.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const WIDTH = 1200;
const HEIGHT = 780;
const PORT = 4322;
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = process.env.CHROME ?? "google-chrome";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const displayArg = args.find((arg) => arg.startsWith("--display="))?.slice("--display=".length) ?? process.env.DISPLAY ?? null;
const onlyScenario = args.find((arg) => arg.startsWith("--scenario="))?.slice("--scenario=".length) ?? null;
const onlyTool = args.find((arg) => arg.startsWith("--tool="))?.slice("--tool=".length) ?? null;

/* Fixture bytes ---------------------------------------------------------- */

const CRC = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

/** A PNG a person can recognise in the editor, built here so there is no fixture to lose. */
function makePng(w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    for (let x = 0; x < w; x++) {
      const o = row + 1 + x * 3;
      const box = x > w * 0.2 && x < w * 0.8 && y > h * 0.3 && y < h * 0.7;
      raw[o] = box ? 20 : 250;
      raw[o + 1] = box ? 160 : 248;
      raw[o + 2] = box ? 210 : 244;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* The tools --------------------------------------------------------------
 * `ok` reads the tool's own status line, which is the only thing that can tell
 * a loaded editor from a blocked frame: a refused frame is silent, and two of
 * the three editors send no ready signal of their own.
 */
const TOOLS = [
  {
    slug: "photo-editor-local",
    source: "bookmarklets/files/photo-editor-local.js",
    host: "data-photo-editor-local",
    embed: "https://www.photopea.com/",
    settle: 45000,
    file: { name: "field-notes.png", type: "image/png", bytes: () => makePng(360, 240) },
    // "360×240 · edit, then Save PNG" is the size echo, so the bytes arrived.
    ok: (status) => /^\d+×\d+ · edit, then Save PNG$/.test(status),
  },
  {
    slug: "code-editor-local",
    source: "bookmarklets/devtools/code-editor-local.js",
    host: "data-code-editor-local",
    embed: "https://onecompiler.com/embed/",
    settle: 20000,
    file: null,
    // OneCompiler answers the handoff rather than announcing itself.
    ok: (status) => /^(page|selection) · /.test(status),
  },
  {
    slug: "simplepdf-local",
    source: "bookmarklets/files/simplepdf-local.js",
    host: "data-simplepdf-local",
    embed: "https://embed.simplepdf.com/",
    settle: 50000,
    file: { name: "field-report.pdf", type: "application/pdf", bytes: () => readFile(path.join(root, "scripts", "pdfs", "real-01.pdf")) },
    // This tool clears its status once the document is in the editor.
    ok: (status) => status === "",
  },
];

/* Chrome over the DevTools pipe ----------------------------------------- */

class Pipe {
  constructor(child) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.buffer = "";
    this.write = child.stdio[3];
    const read = child.stdio[4];
    read.setEncoding("utf8");
    read.on("data", (chunk) => this.receive(chunk));
  }

  receive(chunk) {
    this.buffer += chunk;
    let end;
    while ((end = this.buffer.indexOf("\0")) >= 0) {
      const raw = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 1);
      if (!raw.trim()) continue;
      const message = JSON.parse(raw);
      if (message.id) {
        const slot = this.pending.get(message.id);
        if (!slot) continue;
        this.pending.delete(message.id);
        if (message.error) slot.reject(new Error(`${message.error.message} (${message.error.code})`));
        else slot.resolve(message.result);
        continue;
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params, message.sessionId);
    }
  }

  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(listener);
  }

  off(method, listener) {
    this.listeners.set(method, (this.listeners.get(method) ?? []).filter((entry) => entry !== listener));
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    this.write.write(JSON.stringify(message) + "\0");
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 120000);
    });
  }
}

function launchChrome(display) {
  const flags = [
    "--remote-debugging-pipe",
    `--user-data-dir=/tmp/bl-fallbacks-${process.pid}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    // A popup opened by a timeout has no gesture behind it, and the tools are
    // supposed to reach one anyway.
    "--disable-popup-blocking",
    "--hide-scrollbars",
    "--mute-audio",
    "--force-device-scale-factor=1",
    `--window-size=${WIDTH},${HEIGHT}`,
  ];
  const env = { ...process.env };
  if (display) {
    flags.push("--ozone-platform=x11", "--window-position=0,0", "about:blank");
    env.DISPLAY = display;
    delete env.WAYLAND_DISPLAY;
  } else {
    flags.push("--headless=new", "about:blank");
  }
  const child = spawn(CHROME, flags, { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"], env });
  child.on("error", (error) => {
    console.error(`Could not start ${CHROME}: ${error.message}`);
    process.exit(1);
  });
  child.stderr.setEncoding("utf8");
  const log = [];
  child.stderr.on("data", (line) => log.push(line));
  return { child, cdp: new Pipe(child), log };
}

/* Page helpers ---------------------------------------------------------- */

// Only a real mouse press should carry activation: the tool's own timeout-driven
// chain has no gesture, exactly like a person who never touched anything.
async function evaluate(cdp, sessionId, expression, options = {}) {
  const result = await cdp.send(
    "Runtime.evaluate",
    { expression, awaitPromise: true, userGesture: options.gesture === true, returnByValue: true },
    sessionId,
  );
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails;
    throw new Error(String(detail.exception?.description ?? detail.text).split("\n")[0]);
  }
  return result.result?.value;
}

async function openPage(cdp, url) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Page.navigate", { url }, sessionId);
  for (let i = 0; i < 80; i++) {
    if ((await evaluate(cdp, sessionId, "document.readyState").catch(() => "loading")) === "complete") break;
    await sleep(100);
  }
  return { targetId, sessionId };
}

async function mouse(cdp, sessionId, type, x, y, extra = {}) {
  await cdp.send("Input.dispatchMouseEvent", { type, x, y, ...extra }, sessionId);
}

async function clickAt(cdp, sessionId, [x, y]) {
  await mouse(cdp, sessionId, "mouseMoved", x, y);
  await mouse(cdp, sessionId, "mousePressed", x, y, { button: "left", buttons: 1, clickCount: 1 });
  await sleep(30);
  await mouse(cdp, sessionId, "mouseReleased", x, y, { button: "left", clickCount: 1 });
}

/** A real mouse press inside the tool's shadow bar, so Document PiP sees a gesture. */
async function clickBarButton(cdp, sessionId, host, label) {
  // Document PiP needs transient activation, and a background tab does not get
  // any: focus the page the way a person would before pressing the button.
  await cdp.send("Page.bringToFront", {}, sessionId).catch(() => {});
  await sleep(150);
  // A synthesized press in a window this harness owns does not reliably carry
  // transient activation, and both PiP and a popup need it. Pressing the real
  // button through an evaluate call that grants activation runs the tool's own
  // handler, which is what the surface test is about.
  const pressed = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const host = document.querySelector(${JSON.stringify(`[${host}]`)});
      if (!host) return false;
      const button = [...host.shadowRoot.querySelectorAll("button")].find((node) => node.textContent.trim() === ${JSON.stringify(label)});
      if (!button) return false;
      button.click();
      return true;
    })()`,
    { gesture: true },
  );
  if (!pressed) throw new Error(`no ${label} button on the tool`);
}

const READ_PANEL = (host) => `(() => {
  const host = document.querySelector(${JSON.stringify(`[${host}]`)});
  if (!host) return null;
  const root = host.shadowRoot;
  const bar = root.querySelector(".bar");
  const status = root.querySelector(".status") ?? (bar ? [...bar.children].find((node) => node.tagName === "SPAN" && !/(^|\\s)name(\\s|$)/.test(node.className)) : null);
  const frame = root.querySelector(".stage iframe");
  return {
    status: status ? status.textContent.trim() : null,
    frame: frame ? frame.src : null,
    buttons: [...root.querySelectorAll("button")].map((node) => node.textContent.trim()),
  };
})()`;

/** The bytes are handed over synchronously, so the tool's own change handler runs. */
const pickerStub = (file) => `(() => {
  const bin = atob(${JSON.stringify(file.base64)});
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const realClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () {
    if (this.type !== "file") return realClick.call(this);
    const input = this;
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], ${JSON.stringify(file.name)}, { type: ${JSON.stringify(file.type)} }));
    Object.defineProperty(input, "files", { value: transfer.files, configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };
  return true;
})()`;

async function waitFor(check, limit, step = 800) {
  const deadline = Date.now() + limit;
  let last = null;
  while (Date.now() < deadline) {
    last = await check();
    if (last?.done) return last;
    await sleep(step);
  }
  return last ?? { done: false };
}

/* Scenarios ------------------------------------------------------------- */

async function runScenario(cdp, spec, scenario, toolCode) {
  const blocked = scenario === "float" || scenario === "popup" || scenario === "auto";
  const page = await openPage(cdp, BASE + (blocked ? "/blocked" : "/"));
  const created = [];
  const onCreated = (params) => {
    if (params.targetInfo.type === "page" && params.targetInfo.openerId === page.targetId) created.push(params.targetInfo);
  };
  cdp.on("Target.targetCreated", onCreated);
  // A refused frame is silent in the DOM, so the page's own complaint is worth
  // keeping: it is the only evidence that the CSP did its job.
  const consoleErrors = [];
  const onConsole = (params, session) => {
    if (session !== page.sessionId) return;
    const text = params.args?.map((arg) => arg.value ?? arg.description ?? "").join(" ");
    if (/refused to frame|frame-src|Content Security Policy/i.test(text)) consoleErrors.push(text.slice(0, 120));
  };
  cdp.on("Runtime.consoleAPICalled", onConsole);

  const result = { tool: spec.slug, scenario, ok: false, detail: "" };
  try {
    if (spec.file) await evaluate(cdp, page.sessionId, pickerStub(spec.file));
    // Hide the floating window so the timeout-driven chain has to reach a popup.
    if (scenario === "auto" || scenario === "popup") {
      await evaluate(cdp, page.sessionId, `Object.defineProperty(window, "documentPictureInPicture", { value: undefined, configurable: true }); true`);
    }
    // The two button paths are checked from the state the buttons exist for:
    // the tool has already failed the frame and given up on its own chain. Its
    // automatic attempts are disabled for that first pass, so the surface under
    // test is the one the person chose.
    if (scenario === "float" || scenario === "popup") {
      await evaluate(cdp, page.sessionId, `(() => { window.__blOpen = window.open; window.open = () => null; return true; })()`);
    }
    if (scenario === "float" || scenario === "float-plain") {
      // The tool swallows a refused requestWindow, so the reason it refused is
      // recorded here: without it, "no floating window" says nothing.
      await evaluate(
        cdp,
        page.sessionId,
        `(() => {
          window.__pip = [];
          const pip = window.documentPictureInPicture;
          if (!pip) { window.__pip.push("no API"); return true; }
          const real = pip.requestWindow.bind(pip);
          pip.requestWindow = async (options) => {
            try { const win = await real(options); window.__pip.push("opened"); return win; }
            catch (error) { window.__pip.push("threw " + error.name + ": " + error.message); throw error; }
          };
          return true;
        })()`,
      );
    }
    await evaluate(cdp, page.sessionId, toolCode);
    if (scenario === "float" || scenario === "popup") {
      const blockedAt = await waitFor(async () => {
        const panel = await evaluate(cdp, page.sessionId, READ_PANEL(spec.host)).catch(() => null);
        return { done: Boolean(panel) && /blocks the embedded editor|could not load/i.test(panel.status ?? ""), panel };
      }, 30000);
      if (!blockedAt.done) {
        result.detail = `the tool never reported the blocked frame: "${blockedAt.panel?.status ?? "no tool"}"`;
        return result;
      }
      await evaluate(cdp, page.sessionId, `(() => { window.open = window.__blOpen; return true; })()`);
      await clickBarButton(cdp, page.sessionId, spec.host, scenario === "float" ? "Float" : "Popup");
    }

    const readPanel = () => evaluate(cdp, page.sessionId, READ_PANEL(spec.host)).catch(() => null);

    if (scenario === "modal") {
      const seen = await waitFor(async () => {
        const panel = await readPanel();
        return { done: Boolean(panel) && spec.ok(panel.status ?? ""), panel };
      }, spec.settle);
      result.panel = seen.panel;
      if (!seen.done) {
        result.detail = seen.panel ? `modal never loaded: "${seen.panel.status}"` : "the tool never opened";
        return result;
      }
      if (!String(seen.panel.frame ?? "").startsWith(spec.embed)) {
        result.detail = `the modal frame points at ${seen.panel.frame}`;
        return result;
      }
      result.ok = true;
      result.detail = `modal loaded · "${seen.panel.status || "cleared"}"`;
      return result;
    }

    if (scenario === "float" || scenario === "float-plain") {
      const seen = await waitFor(async () => {
        // A document PiP window is reachable only through the API, and every
        // part of reading it can throw on its own — report which part did.
        const probe = await evaluate(
          cdp,
          page.sessionId,
          `(() => {
            try {
              const win = window.documentPictureInPicture && window.documentPictureInPicture.window;
              if (!win) return { window: false };
              try {
                const frame = win.document.querySelector("iframe");
                return { window: true, frame: frame ? frame.src : null };
              } catch (error) {
                return { window: true, read: String(error.name + ": " + error.message) };
              }
            } catch (error) {
              return { window: false, api: String(error.name + ": " + error.message) };
            }
          })()`,
        ).catch((error) => ({ threw: error.message }));
        const panel = await readPanel();
        // This Chrome build reads a null window even after one opened, so the
        // witnesses are the call the tool made and the answer it got back.
        const calls = await evaluate(cdp, page.sessionId, "window.__pip || []").catch(() => []);
        const opened = Array.isArray(calls) && calls.includes("opened");
        return { done: opened && spec.ok(panel?.status ?? ""), pip: { opened, raw: probe }, panel };
      }, spec.settle);
      result.panel = seen.panel;
      if (!seen.pip?.opened) {
        // Document PiP needs transient activation, and Chrome does not always
        // grant it to a harness-driven press. That is unproven, not broken.
        result.skipped = true;
        result.detail = `skipped: no user activation for requestWindow · ${JSON.stringify(seen.pip?.raw ?? {})}`;
        return result;
      }
      if (!seen.done) {
        result.detail = `the floating frame opened but the editor never answered: "${seen.panel?.status}"`;
        return result;
      }
      result.ok = true;
      result.detail = `floating window loaded · "${seen.panel.status || "cleared"}"`;
      return result;
    }

    // The control: the same popup on a page that does allow the frame. If this
    // fails too, the popup itself is broken; if only the blocked page fails,
    // the popup inherited that page's policy.
    if (scenario === "popup-plain" || scenario === "float-plain") {
      const loaded = await waitFor(async () => {
        const panel = await readPanel();
        return { done: Boolean(panel) && spec.ok(panel.status ?? ""), panel };
      }, spec.settle);
      if (!loaded.done) {
        result.detail = `the modal never loaded, so the other surface was never tried: "${loaded.panel?.status ?? "no tool"}"`;
        return result;
      }
      await clickBarButton(cdp, page.sessionId, spec.host, scenario === "float-plain" ? "Float" : "Popup");
    }

    // popup, popup-plain and auto: all end in a window of their own.
    const seen = await waitFor(async () => {
      const target = created.at(-1);
      if (!target) return { done: false };
      const panel = await readPanel();
      return { done: Boolean(target), target, panel };
    }, spec.settle);
    result.panel = seen.panel;
    if (!seen.target) {
      result.detail = `no popup opened: "${seen.panel?.status ?? "no tool"}"`;
      return result;
    }
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId: seen.target.targetId, flatten: true });
    await cdp.send("Runtime.enable", {}, sessionId).catch(() => {});
    // A popup the tool creates with window.open starts as about:blank, so it
    // may inherit the opener's policy: its own complaint is the only evidence.
    const popupErrors = [];
    const onPopupConsole = (params, session) => {
      if (session !== sessionId) return;
      const text = params.args?.map((arg) => arg.value ?? arg.description ?? "").join(" ");
      if (/Refused to frame|frame-src|Content Security Policy/i.test(text)) popupErrors.push(text.slice(0, 140));
    };
    cdp.on("Runtime.consoleAPICalled", onPopupConsole);
    const popup = await waitFor(
      async () => {
        const state = await evaluate(
          cdp,
          sessionId,
          `(() => {
            const frame = document.querySelector("iframe");
            return { frame: frame ? frame.src : null, title: document.title };
          })()`,
        ).catch(() => null);
        const panel = await readPanel();
        return { done: Boolean(state?.frame) && spec.ok(panel?.status ?? ""), state, panel };
      },
      spec.settle,
    );
    result.panel = popup.panel ?? result.panel;
    if (!popup.state?.frame) {
      result.detail = `the popup has no frame · "${popup.panel?.status ?? "no tool"}"`;
      return result;
    }
    if (!String(popup.state.frame).startsWith(spec.embed)) {
      result.detail = `the popup frame points at ${popup.state.frame}`;
      return result;
    }
    if (!popup.done) {
      result.detail = `the popup opened but the editor never answered: "${popup.panel?.status}"${popupErrors.length ? ` · popup said: ${popupErrors[0]}` : ""}`;
      return result;
    }
    cdp.off("Runtime.consoleAPICalled", onPopupConsole);
    result.ok = true;
    result.detail = `${scenario === "auto" ? "fell back to" : "popup"} loaded · "${popup.panel.status || "cleared"}"`;
    return result;
  } catch (error) {
    result.detail = error.message;
    return result;
  } finally {
    cdp.off("Target.targetCreated", onCreated);
    cdp.off("Runtime.consoleAPICalled", onConsole);
    if (consoleErrors.length) result.detail += ` · page said: ${consoleErrors[0]}`;
    if (!args.includes("--keep")) {
      for (const target of created) await cdp.send("Target.closeTarget", { targetId: target.targetId }).catch(() => {});
      await cdp.send("Target.closeTarget", { targetId: page.targetId }).catch(() => {});
    }
  }
}

/* Fixture page ---------------------------------------------------------- */

async function serve() {
  const fixture = await readFile(path.join(root, "scripts", "fixtures", "demo-page.html"), "utf8");
  if (!/<head[^>]*>/i.test(fixture)) throw new Error("the demo page has no <head> to put a CSP in");
  const blocked = fixture.replace(
    /<head[^>]*>/i,
    (head) => `${head}\n<meta http-equiv="Content-Security-Policy" content="frame-src 'self'; child-src 'self'">`,
  );
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url, "http://127.0.0.1");
    const body = pathname === "/blocked" ? blocked : pathname === "/" ? fixture : null;
    if (!body) {
      response.writeHead(404);
      response.end("not found");
      return;
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    response.end(body);
  });
  await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  return server;
}

/* Main ------------------------------------------------------------------ */

const display = displayArg && (await stat(`/tmp/.X11-unix/X${displayArg.replace(":", "")}`).then(() => true).catch(() => false)) ? displayArg : null;
if (displayArg && !display) console.error(`No X server on ${displayArg}: the floating window cannot be tested here.`);

const tools = TOOLS.filter((tool) => !onlyTool || tool.slug === onlyTool);
const SCENARIOS = display ? ["modal", "float", "float-plain", "popup", "popup-plain", "auto"] : ["modal", "popup", "popup-plain", "auto"];

const server = await serve();
const { child, cdp, log } = launchChrome(display);
await cdp.send("Target.setDiscoverTargets", { discover: true });

const results = [];
try {
  for (const spec of tools) {
    const source = await readFile(path.join(root, spec.source), "utf8");
    const code = source.slice(source.indexOf("*/") + 2).trim();
    spec.file = spec.file ? { ...spec.file, base64: (await spec.file.bytes()).toString("base64") } : null;

    for (const scenario of SCENARIOS.filter((name) => !onlyScenario || name === onlyScenario)) {
      const result = await runScenario(cdp, spec, scenario, code);
      results.push(result);
      const verdict = result.ok ? "PASS" : result.skipped ? "SKIP" : "FAIL";
      console.log(`${spec.slug.padEnd(24)} ${scenario.padEnd(11)} ${verdict}  ${result.detail}`);
    }
  }
} finally {
  await cdp.send("Browser.close").catch(() => {});
  await sleep(300);
  child.kill();
  server.close();
}

const skipped = results.filter((result) => !result.ok && result.skipped);
const failed = results.filter((result) => !result.ok && !result.skipped);
console.log(
  `\n${results.length - failed.length - skipped.length}/${results.length - skipped.length} surfaces worked` +
    `${skipped.length ? `, ${skipped.length} skipped` : ""}${display ? ` on ${display}` : " (headless: no floating window)"}`,
);
if (!display) console.log("the floating window needs a display; it was not tested here.");
if (failed.length) {
  console.error(`\n${failed.length} failed:\n- ${failed.map((result) => `${result.tool} ${result.scenario}: ${result.detail}`).join("\n- ")}`);
  console.error(log.join("").split("\n").filter((line) => /ERROR|error/i.test(line)).slice(-6).join("\n"));
  process.exit(1);
}
