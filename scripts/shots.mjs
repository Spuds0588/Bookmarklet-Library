#!/usr/bin/env node
/**
 * Runs every bookmarklet on scripts/fixtures/demo-page.html in headless Chrome and
 * saves one screenshot per tool to screenshots/<slug>.png, plus a manifest at
 * data/screenshots.json describing what the capture shows.
 *
 * No dependencies: Chrome is driven over the DevTools pipe (fd 3 / fd 4).
 *
 *   node scripts/shots.mjs                 capture anything missing
 *   node scripts/shots.mjs --force         recapture everything
 *   node scripts/shots.mjs markup --force  recapture named tools only
 *   node scripts/shots.mjs --display=:99   run on a real display (see DISPLAY_TOOLS)
 *
 * A floating player is a window of its own, so it only shows up on a real
 * display. Xvfb is enough, and it can run in a container without root:
 *
 *   docker run -d --name bl-xvfb -v /tmp/.X11-unix:/tmp/.X11-unix alpine:3.20 \
 *     sh -c 'apk add --no-cache xvfb && exec Xvfb :99 -screen 0 1200x750x24 -ac -nolisten tcp'
 *
 * Tools whose output never reaches the page — a download, the clipboard, a
 * recording — get no image at all and a reason in the manifest, so the catalog
 * can say what happened instead of showing a page that looks untouched.
 */
import { execFile, spawn } from "node:child_process";
import { readdir, readFile, unlink, writeFile, mkdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WIDTH = 1200;
const HEIGHT = 750;
const CHROME = process.env.CHROME ?? "google-chrome";
const OUT_DIR = path.join(root, "screenshots");
const MANIFEST = path.join(root, "data", "screenshots.json");
const FIXTURE = path.join(root, "scripts", "fixtures", "demo-page.html");
const DEMO_URL = "http://127.0.0.1:4321/?utm_source=demo&utm_campaign=field-guide&plan=team&debug=1";

/* Interactions ----------------------------------------------------------
 * Some tools only make sense once you have used them: a drawing surface is
 * blank until you draw, a picker is idle until you pick, an editor wants the
 * image pasted into it. These steps drive the real UI with real input events
 * before the capture, so the screenshot shows the result, not the invite.
 */
const STEPS = {
  "draw-on-page": [{ drag: [230, 300, 780, 545] }, { wait: 400 }],
  "blur-picker": [{ click: ".ad-slot" }, { wait: 400 }],

  "advanced-find": [{ type: "demo", into: "#searchInput" }, { wait: 400 }],
  markup: [{ paste: true }, { wait: 600 }],
  "record-actions": [{ click: 'a[href="#faq"]' }, { wait: 400 }],
  // The table picker opens a panel only after a real table is clicked.
  "table-to-csv": [{ script: 'document.querySelector("table").scrollIntoView({ block: "center" })' }, { click: "table" }, { wait: 500 }],
  // Put the spotlight on the headline instead of the browser's default centre.
  "presenter-spotlight": [{ script: 'document.dispatchEvent(new MouseEvent("mousemove", { clientX: 600, clientY: 240, bubbles: true }))' }, { wait: 350 }],
  // Fill a real term, apply it, then close the panel so the masked page is visible.
  "pii-masker": [
    { script: 'const r=document.getElementById("bl-pii-host").shadowRoot; r.querySelector("#pii-terms").value="Northwind"; r.querySelector("#pii-apply").click();' },
    { wait: 300 },
    { script: 'document.getElementById("bl-pii-host").shadowRoot.querySelector(".close").click();' },
    { wait: 300 },
  ],
  // The real engine loads its WAD and WASM after the overlay opens, then waits
  // behind its click-to-play gate. Resume it before the capture, or the card
  // would show the gate rather than the game.
  doom: [
    { wait: 7000 },
    { script: 'const f=document.getElementById("bl-doom-host").shadowRoot.querySelector("iframe"); const b=f.contentDocument?.getElementById("play"); if (b) b.click();' },
    // Let the mouse-captured hint fade so it does not sit over the status bar.
    { wait: 3800 },
  ],
  // Let a couple of enemies arrive, then aim right and hold fire so the capture
  // shows the arena in motion rather than an empty opening frame.
  "neon-hell": [
    // The first power-up lands around 3.5 seconds, so leave time for it and the
    // enemy wave to be on screen before the shot is taken.
    { wait: 4700 },
    { script: 'const r=document.getElementById("nh-root").shadowRoot; const c=r.querySelector("canvas"); const b=c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent("pointermove",{bubbles:true,clientX:b.left+720,clientY:b.top+300})); c.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,button:0,clientX:b.left+720,clientY:b.top+300}));' },
    { wait: 1400 },
  ],
  // The picker draws its overlay once the capture is ready, then keeps the
  // redaction toast up for a few seconds: drag a region before it fades.
  "pixelate-section": [{ wait: 2400 }, { drag: [280, 320, 780, 580] }, { wait: 250 }],
  "generate-password": [{ wait: 300 }],
  // Give the QR panel a short, meaningful URL so the capture is not a code for
  // the fixture server itself.
  "qr-code": [
    { script: 'const input=document.getElementById("bl-qr-host").shadowRoot.querySelector("textarea"); input.value="https://example.com/field-guide"; input.dispatchEvent(new Event("input",{bubbles:true}));' },
    { wait: 300 },
  ],
  // A console is only a console once something has been run in it.
  "js-runner": [
    { type: "document.querySelector('h1').textContent = 'JS Runner ran this line';", into: "#js-runner-container textarea" },
    { clickText: "Run Code" },
    { wait: 500 },
  ],
  // Both panels live in an open shadow root, so the sample files are handed to
  // their real pickers rather than drawn on top of the UI.
  "zip-files": [{ zipSample: true }, { wait: 500 }],
  unzip: [{ unzipSample: true }, { wait: 700 }],
  // Both results sit in the demo form, below the first viewport.
  "reveal-passwords": [{ script: 'document.querySelector("form").scrollIntoView({ block: "center" })' }, { wait: 400 }],
  "show-hidden-fields": [{ script: 'document.querySelector("form").scrollIntoView({ block: "center" })' }, { wait: 400 }],
  // A screen capture cannot be granted to a headless run. This tool's prep
  // stubs one from a canvas holding a real QR code, then the drag exercises the
  // same selection UI a person uses.
  "scan-qr": [{ wait: 1200 }, { drag: [430, 205, 770, 545] }, { wait: 900 }],
};

/* Office converters are filled through their real hidden picker, then run so
 * the capture shows the converted batch rather than an empty queue. */
const OFFICE_SAMPLES = {
  "word-to-html": ["/report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "field-report.docx", "site-report.docx"],
  "word-to-txt": ["/report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "field-report.docx", "site-report.docx"],
  "word-to-rtf": ["/report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "field-report.docx", "site-report.docx"],
  "word-to-pdf": ["/report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "field-report.docx", "site-report.docx"],
  "word-to-markdown": ["/report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "field-report.docx", "site-report.docx"],
  "html-to-word": ["/report.html", "text/html", "field-report.html", "site-report.html"],
  "rtf-to-word": ["/report.rtf", "application/rtf", "field-report.rtf", "site-report.rtf"],
  "txt-to-word": ["/report.txt", "text/plain", "field-report.txt", "site-report.txt"],
  "markdown-to-word": ["/report.md", "text/markdown", "field-report.md", "site-report.md"],
  "excel-to-csv": ["/report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "field-report.xlsx"],
  "csv-to-excel": ["/report.csv", "text/csv", "field-report.csv", "site-report.csv"],
  "word-to-odt": ["/report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "field-report.docx", "site-report.docx"],
  "html-to-odt": ["/report.html", "text/html", "field-report.html", "site-report.html"],
  "rtf-to-odt": ["/report.rtf", "application/rtf", "field-report.rtf", "site-report.rtf"],
  "txt-to-odt": ["/report.txt", "text/plain", "field-report.txt", "site-report.txt"],
  "markdown-to-odt": ["/report.md", "text/markdown", "field-report.md", "site-report.md"],
  "csv-to-ods": ["/report.csv", "text/csv", "field-report.csv", "site-report.csv"],
  "excel-to-ods": ["/report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "field-report.xlsx"],
  "odt-to-html": ["/report.odt", "application/vnd.oasis.opendocument.text", "field-report.odt", "site-report.odt"],
  "odt-to-txt": ["/report.odt", "application/vnd.oasis.opendocument.text", "field-report.odt", "site-report.odt"],
  "odt-to-rtf": ["/report.odt", "application/vnd.oasis.opendocument.text", "field-report.odt", "site-report.odt"],
  "odt-to-pdf": ["/report.odt", "application/vnd.oasis.opendocument.text", "field-report.odt", "site-report.odt"],
  "odt-to-markdown": ["/report.odt", "application/vnd.oasis.opendocument.text", "field-report.odt", "site-report.odt"],
  "odt-to-word": ["/report.odt", "application/vnd.oasis.opendocument.text", "field-report.odt", "site-report.odt"],
  "ods-to-csv": ["/report.ods", "application/vnd.oasis.opendocument.spreadsheet", "field-report.ods"],
  "ods-to-excel": ["/report.ods", "application/vnd.oasis.opendocument.spreadsheet", "field-report.ods"],
};
for (const [slug, sample] of Object.entries(OFFICE_SAMPLES)) {
  const [url, type, ...names] = sample;
  STEPS[slug] = [
    { officeSample: { host: `bl-${slug}-host`, url, type, names } },
    { shadowClick: { host: `bl-${slug}-host`, selector: "[data-convert]" } },
    { wait: 1300 },
  ];
}

const ZIP_SAMPLE = [
  ["project/README.md", "# Project notes\n\nEverything for the weekly handoff.\n"],
  ["project/notes/2026-10-20.md", "- Site visit at 9:15\n- Follow-up call at 14:00\n- Send the revised deck\n"],
  ["project/notes/2026-10-21.md", "- Retry the demo route\n- Check the mobile layout\n- Update the field report\n"],
  ["project/assets/visits.csv", "date,site,visits\n2026-10-20,Northwind,12\n2026-10-21,Contoso,9\n"],
];

/* Steps for a window the tool opened. A recorder sits there saying "ready"
 * until someone presses start, so the window is driven before it is shot. */
const AFTER = {
  "record-camera": [{ clickText: "Start Recording" }, { wait: 1800 }],
  // The microphone has to be chosen before the record button even appears.
  "record-audio": [{ click: "#mic-list button" }, { wait: 700 }, { click: "#recBtn" }, { wait: 1800 }],
  // Assert the popup decoded the sample and enabled the web actions before it
  // is photographed. A screenshot of a waiting window would be a misleading
  // capture of a reader that does not read.
  "scan-qr": [
    { wait: 900 },
    { script: '(() => { const value = document.getElementById("value"); if (!value) throw new Error("reader result is missing"); if (value.textContent !== "https://example.com/field-guide") { const states = [...document.querySelectorAll(".state")].filter((node) => !node.hidden).map((node) => node.id + ": " + node.textContent.trim().replace(/\\s+/g, " ")).join(" / "); throw new Error("decoded " + JSON.stringify(value.textContent) + " visible " + states); } if (document.getElementById("open-tab").disabled) throw new Error("web actions are disabled"); return true; })()' },
  ],
};

/* Live media before the tool runs, so a floating player shows a picture rather
 * than a poster: the point is to hand it something already playing. */
const PREP = {
  // The hosted page is deployed with the site. Local captures point the loader
  // at the fixture server so screenshots do not depend on the live site.
  doom: ['globalThis.__BL_DOOM_BASE__ = "http://127.0.0.1:4321/doom/"'],
  "video-pip": ["document.querySelector('video').play()"],
  "audio-pip": ["document.querySelector('audio').play()"],
  // The stamper reads the harvester's saved payload; seed a realistic one so
  // the capture shows the editable rows rather than the paste prompt.
  "form-stamper": [
    `localStorage.setItem("bl:form", JSON.stringify({version:1,title:"Northwind visit form",harvested:"2026-10-28T09:00:00.000Z",fields:[{index:0,label:"Region",type:"text",value:"West",selector:""},{index:1,label:"Contact",type:"text",value:"dana@northwind.example",selector:""},{index:3,label:"Notes",type:"textarea",value:"Follow up on the demo route",selector:""}]}))`,
  ],
  // Screen capture needs a picker and a real screen. The capture is faked from
  // a canvas, but the image on it is a real QR SVG and the selection, crop and
  // decode are the ones the tool runs. The reader page is served locally so
  // the capture does not depend on the live site.
  "scan-qr": [
    `(async () => {
      const image = new Image();
      image.src = '/qr-sample.svg';
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 600;
      const context = canvas.getContext('2d');
      context.fillStyle = '#f4f1ea';
      context.fillRect(0, 0, 900, 600);
      context.fillStyle = '#ffffff';
      context.fillRect(160, 60, 580, 480);
      context.strokeStyle = '#d9d4c8';
      context.strokeRect(160.5, 60.5, 580, 480);
      context.fillStyle = '#17181a';
      context.font = '600 24px system-ui';
      context.fillText('Northwind field report', 200, 115);
      context.fillStyle = '#6d6d6d';
      context.font = '14px system-ui';
      context.fillText('Scan for the current rate sheet', 200, 142);
      context.drawImage(image, 320, 170, 260, 260);
      // Keep the fake screen in the document and change one corner pixel a few
      // times a second: a canvas stream with no new frames can leave the video
      // waiting for metadata forever in a headless run.
      canvas.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;height:600px;';
      document.body.appendChild(canvas);
      const stream = canvas.captureStream(30);
      let tick = 0;
      setInterval(() => {
        context.fillStyle = tick++ % 2 ? '#f4f1ea' : '#f5f2eb';
        context.fillRect(0, 0, 2, 2);
      }, 100);
      const media = navigator.mediaDevices || (navigator.mediaDevices = {});
      media.getDisplayMedia = async () => {
        if (!navigator.userActivation || !navigator.userActivation.isActive) {
          throw new DOMException('The reader lost the click activation.', 'NotAllowedError');
        }
        return stream;
      };
      globalThis.__BL_QR_READER_BASE__ = 'http://127.0.0.1:4321/qr-reader/';
      return true;
    })()`,
  ],
};

/* Tools that leave the page alone. The key becomes copy on the page, so it has
 * to be true: a download really lands in the downloads folder, a clipboard tool
 * really writes the clipboard, and so on. */
const REASONS = {
  "tab-screenshot": "download",
  "website-to-markdown": "download",
  "selection-to-markdown": "download",
  "field-label-audit": "download",
  "save-clipboard-as-css": "download",
  "save-clipboard-as-csv": "download",
  "save-clipboard-as-html": "download",
  "save-clipboard-as-md": "download",
  "save-clipboard-as-png": "download",
  "save-clipboard-as-txt": "download",
  "loom-links-csv": "download",
  "site-map-csv": "download",
  "lock-pdf": "download",
  "unlock-pdf": "download",
  "generate-passphrase": "clipboard",
  "clipboard-to-code-block": "clipboard",
  "read-aloud": "speech",
  "mailto-gmail": "external",
  "mailto-outlook": "external",
  "zoom-web-join": "external",
  "jitsi-instant-call": "external",
  "url-anchored-chat": "external",
  "voice-commander": "dialog",
  "citation-link": "clipboard",
  "enable-api-export": "other-page",
  "clear-site-data": "reload",
  "force-scroll": "no-effect",
  "grab-text": "clipboard",
  "record-tab": "display",
  "extract-emails": "dialog",
  "hex-eyedropper": "dialog",
  "redactor": "no-effect",
  "video-speeder": "no-effect",
  "enable-right-click": "no-effect",
  "image-alt-text": "no-effect",
};

// A floating player is its own window rather than part of the page surface, so
// headless Chrome cannot photograph it and Chrome exposes no target for it
// either. These three are captured on a real display, with --display=:99.
const DISPLAY_TOOLS = new Set(["video-pip", "audio-pip", "web-zoom-pip"]);

// In display mode the shot is only honest if the player really opened: the
// check runs on the live page, and a tool that did not float fails the run
// instead of shipping a capture of the page it did nothing to.
const CHECKS = {
  "video-pip": "document.pictureInPictureElement ? document.pictureInPictureElement.videoWidth : 0",
  "audio-pip": "documentPictureInPicture.window ? documentPictureInPicture.window.innerWidth : 0",
  "web-zoom-pip": "documentPictureInPicture.window ? documentPictureInPicture.window.innerWidth : 0",
};

const args = process.argv.slice(2);
const force = args.includes("--force");
const displayArg = args.find((arg) => arg.startsWith("--display="))?.slice("--display=".length) ?? null;
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

  off(method, listener) {
    this.listeners.set(method, (this.listeners.get(method) ?? []).filter((fn) => fn !== listener));
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

async function launchChrome(display) {
  const flags = [
    "--remote-debugging-pipe",
    `--user-data-dir=/tmp/bl-shots-${process.pid}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-popup-blocking",
    "--hide-scrollbars",
    "--mute-audio",
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
    "--force-device-scale-factor=1",
    `--window-size=${WIDTH},${HEIGHT}`,
  ];
  if (display) {
    // On a display the page is an ordinary Chrome window, pinned to the whole
    // screen so the capture is the page. Ozone is forced to X11 so a Wayland
    // desktop cannot answer instead of the display we were handed.
    flags.push("--ozone-platform=x11", "--window-position=0,0", "--app=" + DEMO_URL);
  } else {
    flags.push("--headless=new", "about:blank");
  }

  const env = { ...process.env };
  if (display) {
    env.DISPLAY = display;
    delete env.WAYLAND_DISPLAY;
  }

  const child = spawn(CHROME, flags, {
    stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"],
    env,
  });
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
  // Pin the page to its light palette: the fixture follows the desktop's
  // colour scheme, and a dark desktop would recapture every tool dark.
  await cdp.send(
    "Emulation.setEmulatedMedia",
    { features: [{ name: "prefers-color-scheme", value: "light" }] },
    sessionId,
  );
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

/* Input events ---------------------------------------------------------- */

const KEYS = {
  Enter: { windowsVirtualKeyCode: 13, key: "Enter", code: "Enter", text: "\r" },
  Escape: { windowsVirtualKeyCode: 27, key: "Escape", code: "Escape" },
  ArrowDown: { windowsVirtualKeyCode: 40, key: "ArrowDown", code: "ArrowDown" },
  ArrowUp: { windowsVirtualKeyCode: 38, key: "ArrowUp", code: "ArrowUp" },
};

async function pointFor(cdp, sessionId, selector) {
  const point = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const box = el.getBoundingClientRect();
      return [Math.round(box.left + box.width / 2), Math.round(box.top + box.height / 2)];
    })()`,
  );
  if (!point) throw new Error(`step selector not found: ${selector}`);
  return point;
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

async function runStep(cdp, sessionId, step, pasteImage) {
  if (step.wait) return sleep(step.wait);

  if (step.script) return evaluate(cdp, sessionId, step.script);

  if (step.click) {
    return clickAt(cdp, sessionId, await pointFor(cdp, sessionId, step.click));
  }

  if (step.clickText) {
    const point = await evaluate(
      cdp,
      sessionId,
      `(() => {
        const node = [...document.querySelectorAll("button, a, [role=button]")].find((candidate) =>
          candidate.textContent.trim() === ${JSON.stringify(step.clickText)} &&
          candidate.getBoundingClientRect().width > 0);
        if (!node) return null;
        const box = node.getBoundingClientRect();
        return [Math.round(box.left + box.width / 2), Math.round(box.top + box.height / 2)];
      })()`,
    );
    if (!point) throw new Error(`step button not found: ${step.clickText}`);
    return clickAt(cdp, sessionId, point);
  }

  if (step.drag) {
    const [x1, y1, x2, y2] = step.drag;
    await mouse(cdp, sessionId, "mouseMoved", x1, y1);
    await mouse(cdp, sessionId, "mousePressed", x1, y1, { button: "left", buttons: 1, clickCount: 1 });
    for (let i = 1; i <= 14; i++) {
      await mouse(cdp, sessionId, "mouseMoved", x1 + ((x2 - x1) * i) / 14, y1 + ((y2 - y1) * i) / 14, {
        button: "left",
        buttons: 1,
      });
      await sleep(16);
    }
    await mouse(cdp, sessionId, "mouseReleased", x2, y2, { button: "left", clickCount: 1 });
    return;
  }

  if (step.type) {
    if (step.into) await evaluate(cdp, sessionId, `document.querySelector(${JSON.stringify(step.into)})?.focus()`);
    await cdp.send("Input.insertText", { text: step.type }, sessionId);
    if (step.enter) {
      await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", ...KEYS.Enter }, sessionId);
      await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...KEYS.Enter }, sessionId);
    }
    return;
  }

  if (step.key) {
    const key = KEYS[step.key];
    if (!key) throw new Error(`unknown key ${step.key}`);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", ...key }, sessionId);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...key }, sessionId);
    return;
  }

  if (step.zipSample) {
    return evaluate(
      cdp,
      sessionId,
      `(() => {
        const root = document.getElementById("bl-zip-host")?.shadowRoot;
        if (!root) throw new Error("zip panel is not in the page");
        const input = root.querySelector("input[webkitdirectory]");
        if (!input) throw new Error("zip folder picker is missing");
        const transfer = new DataTransfer();
        for (const [path, body] of ${JSON.stringify(ZIP_SAMPLE)}) {
          const file = new File([body], path.split("/").at(-1), { type: "text/plain" });
          Object.defineProperty(file, "webkitRelativePath", { value: path });
          transfer.items.add(file);
        }
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`,
    );
  }

  if (step.officeSample) {
    return evaluate(
      cdp,
      sessionId,
      `(async () => {
        const spec = ${JSON.stringify(step.officeSample)};
        const root = document.getElementById(spec.host)?.shadowRoot;
        if (!root) throw new Error("office panel is not in the page");
        const response = await fetch(spec.url, { cache: "no-store" });
        if (!response.ok) throw new Error("office sample did not load");
        const bytes = await response.arrayBuffer();
        const transfer = new DataTransfer();
        for (const name of spec.names) transfer.items.add(new File([bytes], name, { type: spec.type }));
        const input = root.querySelector('input[type="file"]');
        if (!input) throw new Error("office file picker is missing");
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`,
    );
  }

  if (step.shadowClick) {
    return evaluate(
      cdp,
      sessionId,
      `(() => {
        const spec = ${JSON.stringify(step.shadowClick)};
        const root = document.getElementById(spec.host)?.shadowRoot;
        if (!root) throw new Error("office panel is not in the page");
        const button = root.querySelector(spec.selector);
        if (!button) throw new Error("office action button is missing");
        button.click();
        return true;
      })()`,
    );
  }

  if (step.unzipSample) {
    return evaluate(
      cdp,
      sessionId,
      `(async () => {
        const root = document.getElementById("bl-unzip-host")?.shadowRoot;
        if (!root) throw new Error("unzip panel is not in the page");
        const response = await fetch("/sample.zip", { cache: "no-store" });
        if (!response.ok) throw new Error("sample ZIP did not load");
        const input = root.querySelector('input[type="file"]');
        if (!input) throw new Error("unzip file picker is missing");
        const transfer = new DataTransfer();
        transfer.items.add(new File([await response.blob()], "field-notes.zip", { type: "application/zip" }));
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`,
    );
  }

  if (step.paste) {
    // Paste the page's own screenshot, the way a person would annotate a capture.
    await evaluate(
      cdp,
      sessionId,
      `(() => {
        const binary = atob(${JSON.stringify(pasteImage.toString("base64"))});
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const file = new File([bytes], "paste.png", { type: "image/png" });
        const transfer = new DataTransfer();
        transfer.items.add(file);
        const event = new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true });
        (document.activeElement ?? document.body).dispatchEvent(event);
        document.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }));
        return true;
      })()`,
    );
    return;
  }

  throw new Error(`unknown step ${JSON.stringify(step)}`);
}

/* Capture --------------------------------------------------------------- */

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
  // A save picker is a native dialog no headless run can answer. Recorders ask
  // for one before they will start, so hand back a writable that goes nowhere.
  window.showSaveFilePicker = async () => ({
    createWritable: async () => ({ write: async () => {}, close: async () => {} }),
  });
  window.alert = (message) => { (window.__blAlerts ||= []).push(String(message)); };
  window.print = () => {};
  return true;
})()`;

async function shoot(cdp, item, baselinePng) {
  const { targetId, sessionId } = await openTool(cdp, DEMO_URL);
  const created = [];
  const onCreated = (params) => {
    if (params.targetInfo.type === "page" && params.targetInfo.openerId === targetId) created.push(params.targetInfo);
  };
  const onDialog = (params, dialogSession) => {
    cdp.send("Page.handleJavaScriptDialog", { accept: true, promptText: "demo" }, dialogSession).catch(() => {});
  };
  cdp.on("Target.targetCreated", onCreated);
  cdp.on("Page.javascriptDialogOpening", onDialog);

  try {
    await evaluate(cdp, sessionId, STUBS);
    if (item) {
      for (const script of PREP[item.slug] ?? []) await evaluate(cdp, sessionId, script).catch(() => {});
      await sleep(500);
      try {
        await evaluate(cdp, sessionId, item.code);
      } catch (error) {
        // Tools that rewrite the document can lose their execution context mid-call.
        if (!/context|destroyed|Inspected target/i.test(error.message)) throw error;
      }
      await sleep(850);
      for (const step of STEPS[item.slug] ?? []) await runStep(cdp, sessionId, step, baselinePng);
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
      // A tab a tool opened is often an app that has to load before it looks like anything.
      await waitForLoad(cdp, shotSession).catch(() => {});
      await sleep(1500);
      for (const step of AFTER[item.slug] ?? []) await runStep(cdp, shotSession, step, baselinePng);
    }

    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, shotSession);
    return { png: Buffer.from(data, "base64"), popup: Boolean(popup) };
  } finally {
    cdp.off("Target.targetCreated", onCreated);
    cdp.off("Page.javascriptDialogOpening", onDialog);
    await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
    const popupTarget = created.at(-1);
    if (popupTarget) await cdp.send("Target.closeTarget", { targetId: popupTarget.targetId }).catch(() => {});
  }
}

// Screenshot of a whole X display, used for the tools that draw outside the page.
async function grabDisplay(display) {
  const file = `/tmp/bl-display-${process.pid}.png`;
  await execFileAsync("ffmpeg", [
    "-loglevel", "error", "-f", "x11grab", "-video_size", `${WIDTH}x${HEIGHT}`,
    "-i", display, "-frames:v", "1", "-y", file,
  ]);
  const png = await readFile(file);
  await unlink(file).catch(() => {});
  return png;
}

// On a real display the browser window is the page, so the tool runs in that
// window instead of a fresh hidden target, and the capture is the screen.
async function displayWindow(cdp) {
  const { targetInfos } = await cdp.send("Target.getTargets");
  const page = targetInfos.find((target) => target.type === "page" && target.url.startsWith("http://127.0.0.1:4321"));
  if (!page) throw new Error("no browser window on demo page");
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId: page.targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  // Same light palette as the headless captures: on a display the page would
  // otherwise follow the desktop's own colour scheme.
  await cdp.send(
    "Emulation.setEmulatedMedia",
    { features: [{ name: "prefers-color-scheme", value: "light" }] },
    sessionId,
  );
  return { targetId: page.targetId, sessionId };
}

// A document picture-in-picture window opens in the top-left corner, where it
// hides the page it came from. Move it to the corner Chrome uses for the video
// player, so the capture shows the page and the floating window together.
async function settleFloating(cdp, opened) {
  for (const target of opened) {
    const window = await cdp.send("Browser.getWindowForTarget", { targetId: target.targetId }).catch(() => null);
    const bounds = window?.bounds;
    if (!bounds?.width || !bounds?.height) continue;
    await cdp
      .send("Browser.setWindowBounds", {
        windowId: window.windowId,
        bounds: { left: Math.max(0, WIDTH - bounds.width - 15), top: Math.max(0, HEIGHT - bounds.height - 15) },
      })
      .catch(() => {});
  }
}

async function shootOnDisplay(cdp, item) {
  const { sessionId } = await displayWindow(cdp);
  const before = new Set((await cdp.send("Target.getTargets")).targetInfos.map((target) => target.targetId));
  await cdp.send("Page.navigate", { url: DEMO_URL }, sessionId);
  await waitForLoad(cdp, sessionId);
  await sleep(600);
  await evaluate(cdp, sessionId, STUBS);
  for (const script of PREP[item.slug] ?? []) await evaluate(cdp, sessionId, script).catch(() => {});
  await sleep(500);
  try {
    await evaluate(cdp, sessionId, item.code);
  } catch (error) {
    if (!/context|destroyed|Inspected target/i.test(error.message)) throw error;
  }
  await sleep(1200);
  for (const step of STEPS[item.slug] ?? []) await runStep(cdp, sessionId, step, null);

  // A document player is a target of its own, so it can be placed. The video
  // player is not: Chrome puts that one in the corner by itself.
  const opened = (await cdp.send("Target.getTargets")).targetInfos.filter(
    (target) => target.type === "page" && !before.has(target.targetId),
  );
  await settleFloating(cdp, opened);
  if (opened.length) await sleep(700);

  const check = CHECKS[item.slug];
  return { floated: check ? await evaluate(cdp, sessionId, check) : true };
}

/* Main ------------------------------------------------------------------ */

const catalog = JSON.parse(await readFile(path.join(root, "data", "catalog.json"), "utf8"));
const items = only.length ? catalog.items.filter((item) => only.includes(item.slug)) : catalog.items;
if (!items.length) throw new Error(`no tools matched: ${only.join(", ")}`);

const previous = await readFile(MANIFEST, "utf8").then(JSON.parse).catch(() => ({ tools: {} }));
const manifest = { width: WIDTH, height: HEIGHT, generated: new Date().toISOString().slice(0, 10), tools: {} };
// A run for named tools must not orphan everybody else's capture.
if (only.length) {
  for (const [slug, entry] of Object.entries(previous.tools ?? {})) {
    if (!items.some((item) => item.slug === slug)) manifest.tools[slug] = entry;
  }
}
await mkdir(OUT_DIR, { recursive: true });

const EMBED = `<!doctype html><html><head><meta charset="utf-8"><title>Weekly field report</title>
<style>body{margin:0;padding:18px 22px;font:14px/1.6 Georgia,serif;background:#fff;color:#17181a}
h1{font:400 22px/1.2 Georgia,serif;margin:0 0 10px}table{border-collapse:collapse;font-size:13px;margin-top:10px}
td{padding:5px 18px 5px 0;border-bottom:1px solid #ddd}</style></head>
<body><h1>Weekly field report</h1><table><tr><td>Visits</td><td>42</td></tr><tr><td>Handoffs missed</td><td>3</td></tr><tr><td>Demo sites</td><td>9</td></tr></table></body></html>`;
const MEDIA = new Map([
  ["/demo.mp4", ["demo.mp4", "video/mp4"]],
  ["/demo.mp3", ["demo.mp3", "audio/mpeg"]],
  ["/sample.zip", ["sample.zip", "application/zip"]],
  ["/qr-sample.svg", ["qr-sample.svg", "image/svg+xml"]],
  ["/report.docx", ["office/report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]],
  ["/report.xlsx", ["office/report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]],
  ["/report.html", ["office/report.html", "text/html"]],
  ["/report.rtf", ["office/report.rtf", "application/rtf"]],
  ["/report.md", ["office/report.md", "text/markdown"]],
  ["/report.txt", ["office/report.txt", "text/plain"]],
  ["/report.csv", ["office/report.csv", "text/csv"]],
  ["/report.odt", ["office/report.odt", "application/vnd.oasis.opendocument.text"]],
  ["/report.ods", ["office/report.ods", "application/vnd.oasis.opendocument.spreadsheet"]],
]);

const DOOM_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".wad": "application/octet-stream",
  ".data": "application/octet-stream",
  ".cfg": "text/plain; charset=utf-8",
};

const PAGE_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
};

async function serveFixture() {
  const server = createServer(async (request, response) => {
    try {
      const { pathname } = new URL(request.url, "http://127.0.0.1");
      // The QR reader opens from the tool, so the same page and its bundled
      // decoder are served beside the fixture during a capture.
      if (pathname === "/qr-reader") {
        response.writeHead(302, { location: "/qr-reader/" });
        response.end();
        return;
      }
      if (pathname.startsWith("/qr-reader/")) {
        const name = pathname.slice("/qr-reader/".length);
        const readerDir = path.join(root, "qr-reader");
        const file = path.normalize(path.join(readerDir, name || "index.html"));
        if (file !== readerDir && !file.startsWith(readerDir + path.sep)) {
          response.writeHead(404);
          response.end("not found");
          return;
        }
        const body = await readFile(file);
        response.writeHead(200, {
          "content-type": PAGE_TYPES[path.extname(file)] ?? "application/octet-stream",
          "content-length": body.length,
          "cache-control": "no-store",
        });
        response.end(body);
        return;
      }
      // The Doom capture needs its hosted page and the engine assets beside it.
      // Everything else on this test server is the one demo fixture.
      if (pathname.startsWith("/doom/")) {
        const name = pathname.slice("/doom/".length);
        const doomDir = path.join(root, "doom");
        const file = path.normalize(path.join(doomDir, name || "index.html"));
        if (file !== doomDir && !file.startsWith(doomDir + path.sep)) {
          response.writeHead(404);
          response.end("not found");
          return;
        }
        const body = await readFile(file);
        response.writeHead(200, {
          "content-type": DOOM_TYPES[path.extname(file)] ?? "application/octet-stream",
          "content-length": body.length,
          "cache-control": "no-store",
        });
        response.end(body);
        return;
      }
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
  return server;
}

const display = displayArg && (await stat(`/tmp/.X11-unix/X${displayArg.replace(":", "")}`).then(() => true).catch(() => false)) ? displayArg : null;
if (displayArg && !display) {
  console.error(`No X server on ${displayArg}; the display-only tools will keep their note instead.`);
}

/* What actually needs a browser ----------------------------------------- */

const plan = [];
for (const item of items) {
  const needsDisplay = DISPLAY_TOOLS.has(item.slug);
  // Tools whose work leaves the page are declared, not photographed, and a
  // floating player without a display to float on keeps its note. Everything
  // else has to show its result in an image.
  const expectedReason = needsDisplay ? (display ? null : "display") : REASONS[item.slug] ?? null;
  const stepCount = (STEPS[item.slug] ?? []).length + (AFTER[item.slug] ?? []).length;
  const previousEntry = previous.tools?.[item.slug];
  const exists = await stat(path.join(OUT_DIR, `${item.slug}.png`)).then(() => true).catch(() => false);
  // A capture already on disk stays up to date even in a run that could not
  // take it again — a floating player without a display keeps its image, and
  // everything declared by a reason keeps its note.
  const hasImage = Boolean(previousEntry?.file) && exists;
  const upToDate =
    !force &&
    previousEntry &&
    (previousEntry.steps ?? 0) === stepCount &&
    (hasImage || (!previousEntry.file && previousEntry.reason === expectedReason));
  plan.push({ item, needsDisplay, expectedReason, stepCount, upToDate, previousEntry });
}

const work = plan.filter((entry) => !entry.upToDate && !entry.expectedReason);
const failures = [];
const notes = [];
let chromeLog = [];

if (work.length) {
const server = await serveFixture();
const { child, pipe: cdp, log } = await launchChrome(display);
chromeLog = log;
await cdp.send("Target.setDiscoverTargets", { discover: true });

let baseline = null;
let displayBaseline = null;

try {
  // The headless baseline is a second window. On a display it would sit on top
  // of the page, so it is only captured when a headless tool needs comparing.
  if (work.some((entry) => !entry.needsDisplay)) {
    console.log("capturing the demo page without a tool…");
    baseline = (await shoot(cdp, null, null)).png;
  }

  let done = 0;
  for (const { item, needsDisplay, stepCount } of work) {
    const file = path.join(OUT_DIR, `${item.slug}.png`);
    const label = `${String(done + 1).padStart(2, "0")}/${work.length} ${item.name}`;

    try {
      const source = await readFile(path.join(root, item.source), "utf8");
      const code = source.slice(source.indexOf("*/") + 2).trim();

      if (needsDisplay) {
        if (!displayBaseline) {
          await shootOnDisplay(cdp, { code: "void 0", slug: "baseline" });
          displayBaseline = await grabDisplay(display);
        }
        const { floated } = await shootOnDisplay(cdp, { code, slug: item.slug });
        const png = await grabDisplay(display);
        const changed = !png.equals(displayBaseline);
        if (!floated) {
          failures.push(`${item.slug}: the floating player never opened on ${display}`);
          manifest.tools[item.slug] = { changed: false, reason: "display" };
          console.log(`${label.padEnd(46)} FAILED  no floating player`);
          done++;
          continue;
        }
        if (changed) {
          await writeFile(file, png);
          manifest.tools[item.slug] = { file: `screenshots/${item.slug}.png`, changed: true, display: true };
          console.log(`${label.padEnd(46)} ${String(Math.round(png.length / 1024)).padStart(4)} KB  changed (display)`);
        } else {
          failures.push(`${item.slug}: the player opened but the display never changed`);
          manifest.tools[item.slug] = { changed: false, reason: "display" };
          console.log(`${label.padEnd(46)} FAILED  display unchanged`);
        }
        done++;
        continue;
      }

      const { png, popup } = await shoot(cdp, { code, slug: item.slug }, baseline);
      const changed = !png.equals(baseline);
      if (changed || popup) {
        await writeFile(file, png);
        manifest.tools[item.slug] = {
          file: `screenshots/${item.slug}.png`,
          changed: true,
          ...(popup ? { popup: true } : {}),
          ...(stepCount ? { steps: stepCount } : {}),
        };
        console.log(`${label.padEnd(46)} ${String(Math.round(png.length / 1024)).padStart(4)} KB  changed${popup ? " (new tab)" : ""}`);
      } else {
        const reason = REASONS[item.slug] ?? "no-effect";
        manifest.tools[item.slug] = { changed: false, reason, ...(stepCount ? { steps: stepCount } : {}) };
        if (!REASONS[item.slug]) notes.push(`${item.slug}: no visible change and no reason recorded`);
        console.log(`${label.padEnd(46)} no capture (${reason})`);
      }
    } catch (error) {
      failures.push(`${item.slug}: ${error.message}`);
      console.log(`${label.padEnd(46)} FAILED  ${error.message}`);
    }
    done++;
  }
} finally {
  await cdp.send("Browser.close").catch(() => {});
  await sleep(300);
  child.kill();
  server.close();
}
}

// Everything that needed no browser: reuse the last entry, or state the reason.
for (const { item, expectedReason, upToDate, previousEntry } of plan) {
  if (manifest.tools[item.slug]) continue;
  if (upToDate) {
    manifest.tools[item.slug] = previousEntry;
  } else if (previousEntry?.file && expectedReason === "display") {
    // A forced run with no display cannot recapture a floating player, and the
    // capture on disk is still true, so keep it rather than deleting it.
    manifest.tools[item.slug] = previousEntry;
    notes.push(`${item.slug}: kept the capture from the last display run (none handed to this one)`);
  } else {
    manifest.tools[item.slug] = { changed: false, reason: expectedReason };
  }
}
if (!work.length) console.log(`nothing to capture — ${plan.length} tools already up to date`);

// Keep only the images the manifest points at, so a tool that stops producing a
// screenshot does not leave a stale one behind.
const referenced = new Set(
  Object.values(manifest.tools).map((entry) => entry.file).filter(Boolean).map((file) => path.basename(file)),
);
for (const entry of await readdir(OUT_DIR)) {
  if (!entry.endsWith(".png") || referenced.has(entry)) continue;
  await unlink(path.join(OUT_DIR, entry));
  console.log(`removed stale capture screenshots/${entry}`);
}

const ordered = Object.fromEntries(
  catalog.items.map((item) => [item.slug, manifest.tools[item.slug]]).filter(([, entry]) => entry),
);
await writeFile(MANIFEST, JSON.stringify({ ...manifest, tools: ordered }, null, 2) + "\n");

const withImage = Object.values(ordered).filter((entry) => entry.file).length;
console.log(`\n${withImage} screenshots in screenshots/, ${Object.keys(ordered).length - withImage} tools explained without one.`);
if (notes.length) console.log(`notes:\n- ${notes.join("\n- ")}`);
if (failures.length) {
  console.error(`${failures.length} failed:\n- ${failures.join("\n- ")}`);
  console.error(chromeLog.join("").split("\n").filter((line) => /ERROR|error/i.test(line)).slice(-8).join("\n"));
  process.exit(1);
}
