#!/usr/bin/env node
/**
 * Runs every bookmarklet on scripts/fixtures/demo-page.html in headless Chrome and
 * saves one screenshot per tool to screenshots/<slug>.png, plus a manifest at
 * data/screenshots.json that says whether the page actually changed.
 *
 * No dependencies: Chrome is driven over the DevTools pipe (fd 3 / fd 4).
 *
 *   node scripts/shots.mjs                 capture anything missing
 *   node scripts/shots.mjs --force         recapture everything
 *   node scripts/shots.mjs markup --force  recapture named tools only
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WIDTH = 1200;
const HEIGHT = 750;
const CHROME = process.env.CHROME ?? "google-chrome";
const OUT_DIR = path.join(root, "screenshots");
const MANIFEST = path.join(root, "data", "screenshots.json");
const FIXTURE = path.join(root, "scripts", "fixtures", "demo-page.html");
const DEMO_URL = "http://127.0.0.1:4321/?utm_source=demo&utm_campaign=field-guide&plan=team&debug=1";

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((arg) => !arg.startsWith("--"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* DevTools pipe --------------------------------------------------------- */

class Pipe {
  constructor(child) {
    this.child = child;
    this.write = child.stdio[3];
    this.buffer = "";
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    child.stdio[4].setEncoding("utf8");
    child.stdio[4].on("data", (chunk) => this.receive(chunk));
    child.on("exit", (code) => {
      for (const { reject } of this.pending.values()) reject(new Error(`Chrome exited (${code})`));
      this.pending.clear();
    });
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
        const pending = this.pending.get(message.id);
        if (!pending) continue;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${message.error.message} (${message.error.code})`));
        else pending.resolve(message.result);
      } else {
        for (const listener of this.listeners.get(message.method) ?? []) {
          listener(message.params, message.sessionId);
        }
      }
    }
  }

  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(listener);
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    this.write.write(JSON.stringify(message) + "\0");
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

/* Chrome ---------------------------------------------------------------- */

async function launchChrome() {
  const profile = `/tmp/bl-shots-${process.pid}`;
  const child = spawn(
    CHROME,
    [
      "--headless=new",
      "--remote-debugging-pipe",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-popup-blocking",
      "--hide-scrollbars",
      "--mute-audio",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--force-device-scale-factor=1",
      `--window-size=${WIDTH},${HEIGHT}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] },
  );
  child.on("error", (error) => {
    console.error(`Could not start ${CHROME}: ${error.message}`);
    console.error("Set CHROME=/path/to/chrome if it lives somewhere else.");
    process.exit(1);
  });
  child.stderr.setEncoding("utf8");
  const log = [];
  child.stderr.on("data", (line) => log.push(line));
  return { child, pipe: new Pipe(child), log };
}

/* Page helpers ---------------------------------------------------------- */

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send(
    "Runtime.evaluate",
    { expression, awaitPromise: true, userGesture: true, returnByValue: true },
    sessionId,
  );
  if (result.exceptionDetails) {
    const text = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
    throw new Error(text.split("\n")[0]);
  }
  return result.result?.value;
}

async function waitForLoad(cdp, sessionId) {
  for (let i = 0; i < 60; i++) {
    if ((await evaluate(cdp, sessionId, "document.readyState")) === "complete") return;
    await sleep(100);
  }
  throw new Error("page never finished loading");
}

async function openTool(cdp, url) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  }, sessionId);
  await cdp.send("Page.navigate", { url }, sessionId);
  await waitForLoad(cdp, sessionId);
  // Give the video and audio metadata a moment so the PiP tools have something to hand off.
  await evaluate(
    cdp,
    sessionId,
    `Promise.all([...document.querySelectorAll("video,audio")].map((m) =>
      m.readyState >= 1 ? true : new Promise((done) => {
        m.addEventListener("loadedmetadata", () => done(true), { once: true });
        setTimeout(() => done(false), 3000);
      })))`,
  ).catch(() => {});
  return { targetId, sessionId };
}

const STUBS = `(() => {
  const sample = "# Field notes\\n\\n- Retry the demo route\\n- Email dana@northwind.example\\n";
  let index = 0;
  try {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {},
        readText: async () => sample,
        write: async () => {},
        read: async () => [],
      },
    });
  } catch {}
  window.prompt = () => (++index === 1 ? "demo" : "DEMO");
  window.confirm = () => true;
  window.alert = (message) => { (window.__blAlerts ||= []).push(String(message)); };
  window.print = () => {};
  return true;
})()`;

/* Capture --------------------------------------------------------------- */

async function shoot(cdp, item) {
  const { targetId, sessionId } = await openTool(cdp, DEMO_URL);
  const created = [];
  const onCreated = (params) => {
    if (params.targetInfo.type === "page" && params.targetInfo.openerId === targetId) created.push(params.targetInfo);
  };
  const onDialog = (params, dialogSession) => {
    cdp
      .send("Page.handleJavaScriptDialog", { accept: true, promptText: "demo" }, dialogSession)
      .catch(() => {});
  };
  cdp.on("Target.targetCreated", onCreated);
  cdp.on("Page.javascriptDialogOpening", onDialog);

  try {
    await evaluate(cdp, sessionId, STUBS);
    if (item) {
      try {
        await evaluate(cdp, sessionId, item.code);
      } catch (error) {
        // Tools that rewrite the document can lose their execution context mid-call.
        if (!/context|destroyed|Inspected target/i.test(error.message)) throw error;
      }
      await sleep(900);
    }

    let shotSession = sessionId;
    let shotTarget = targetId;
    const popup = created.at(-1);
    if (popup) {
      const attached = await cdp.send("Target.attachToTarget", { targetId: popup.targetId, flatten: true });
      shotSession = attached.sessionId;
      shotTarget = popup.targetId;
      await cdp.send("Page.enable", {}, shotSession);
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: WIDTH,
        height: HEIGHT,
        deviceScaleFactor: 1,
        mobile: false,
      }, shotSession);
      await sleep(500);
    }

    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, shotSession);
    return { png: Buffer.from(data, "base64"), popup: Boolean(popup) };
  } finally {
    cdp.listeners.set(
      "Target.targetCreated",
      (cdp.listeners.get("Target.targetCreated") ?? []).filter((fn) => fn !== onCreated),
    );
    cdp.listeners.set(
      "Page.javascriptDialogOpening",
      (cdp.listeners.get("Page.javascriptDialogOpening") ?? []).filter((fn) => fn !== onDialog),
    );
    await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
    const popupTarget = created.at(-1);
    if (popupTarget) await cdp.send("Target.closeTarget", { targetId: popupTarget.targetId }).catch(() => {});
  }
}

/* Main ------------------------------------------------------------------ */

const catalog = JSON.parse(await readFile(path.join(root, "data", "catalog.json"), "utf8"));
const items = only.length ? catalog.items.filter((item) => only.includes(item.slug)) : catalog.items;
if (!items.length) throw new Error(`no tools matched: ${only.join(", ")}`);

const previous = await readFile(MANIFEST, "utf8").then(JSON.parse).catch(() => ({ tools: {} }));
const manifest = { width: WIDTH, height: HEIGHT, generated: new Date().toISOString().slice(0, 10), tools: {} };
await mkdir(OUT_DIR, { recursive: true });

const EMBED = `<!doctype html><html><head><meta charset="utf-8"><title>Weekly field report</title>
<style>body{margin:0;padding:18px 22px;font:14px/1.6 Georgia,serif;background:#fff;color:#17181a}
h1{font:400 22px/1.2 Georgia,serif;margin:0 0 10px}table{border-collapse:collapse;font-size:13px;margin-top:10px}
td{padding:5px 18px 5px 0;border-bottom:1px solid #ddd}</style></head>
<body><h1>Weekly field report</h1><table><tr><td>Visits</td><td>42</td></tr><tr><td>Handoffs missed</td><td>3</td></tr><tr><td>Demo sites</td><td>9</td></tr></table></body></html>`;
const MEDIA = new Map([
  ["/demo.mp4", ["demo.mp4", "video/mp4"]],
  ["/demo.mp3", ["demo.mp3", "audio/mpeg"]],
]);

const server = createServer(async (request, response) => {
  try {
    const { pathname } = new URL(request.url, "http://127.0.0.1");
    const media = MEDIA.get(pathname);
    if (media) {
      const body = await readFile(path.join(root, "scripts", "fixtures", media[0]));
      response.writeHead(200, { "content-type": media[1], "content-length": body.length, "cache-control": "no-store" });
      response.end(body);
      return;
    }
    const html = pathname === "/embed" ? EMBED : await readFile(FIXTURE);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    response.end(html);
  } catch (error) {
    response.writeHead(500);
    response.end(String(error));
  }
});
await new Promise((resolve) => server.listen(4321, "127.0.0.1", resolve));

const { child, pipe: cdp, log } = await launchChrome();
await cdp.send("Target.setDiscoverTargets", { discover: true });

let baseline = null;
const failures = [];

try {
  console.log("capturing the demo page without a tool…");
  baseline = (await shoot(cdp, null)).png;

  let done = 0;
  for (const item of items) {
    const file = path.join(OUT_DIR, `${item.slug}.png`);
    const exists = await stat(file).then(() => true).catch(() => false);
    if (exists && !force && previous.tools?.[item.slug]) {
      manifest.tools[item.slug] = previous.tools[item.slug];
      done++;
      continue;
    }

    const label = `${String(done + 1).padStart(2, "0")}/${items.length} ${item.name}`;
    try {
      const source = await readFile(path.join(root, item.source), "utf8");
      const code = source.slice(source.indexOf("*/") + 2).trim();
      const { png, popup } = await shoot(cdp, { code });
      const changed = !png.equals(baseline);
      await writeFile(file, png);
      manifest.tools[item.slug] = {
        file: `screenshots/${item.slug}.png`,
        changed,
        ...(popup ? { popup } : {}),
      };
      console.log(`${label.padEnd(48)} ${String(Math.round(png.length / 1024)).padStart(4)} KB  ${changed ? "changed" : "unchanged"}${popup ? " (new tab)" : ""}`);
    } catch (error) {
      failures.push(`${item.slug}: ${error.message}`);
      console.log(`${label.padEnd(48)} FAILED  ${error.message}`);
    }
    done++;
  }
} finally {
  await cdp.send("Browser.close").catch(() => {});
  await sleep(300);
  child.kill();
  server.close();
}

const ordered = Object.fromEntries(catalog.items.map((item) => [item.slug, manifest.tools[item.slug]]).filter(([, entry]) => entry));
await writeFile(MANIFEST, JSON.stringify({ ...manifest, tools: ordered }, null, 2) + "\n");

const changedCount = Object.values(ordered).filter((entry) => entry.changed).length;
console.log(`\n${Object.keys(ordered).length} screenshots in ${path.relative(root, OUT_DIR)}/, ${changedCount} changed the page.`);
if (failures.length) {
  console.error(`${failures.length} failed:\n- ${failures.join("\n- ")}`);
  console.error(log.join("").split("\n").filter((line) => /ERROR|error/i.test(line)).slice(-8).join("\n"));
  process.exit(1);
}
