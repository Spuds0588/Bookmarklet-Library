import { LIMITS, makeToken, parseDecision } from "./protocol.js";
import {
  MODELS,
  SYSTEM_PROMPT,
  buildPrompt,
  builtInAvailability,
  createBuiltInEngine,
  createWebLLMEngine,
  detectEngines,
  hasWebGpuAdapter,
  modelSetup,
} from "./engine.js";

const $ = (id) => document.getElementById(id);
const ui = {
  badge: $("badge"),
  setup: $("setup"),
  active: $("active"),
  coop: $("coop"),
  installLink: $("install-link"),
  installNote: $("install-note"),
  engineName: $("engine-name"),
  engineNote: $("engine-note"),
  targetTitle: $("target-title"),
  mapCount: $("map-count"),
  map: $("map"),
  mapSummary: $("map-summary"),
  model: $("model"),
  prepare: $("prepare"),
  log: $("log"),
  task: $("task"),
  run: $("run"),
  kill: $("kill"),
  retry: $("retry"),
  steps: $("steps"),
  runState: $("run-state"),
};

let session = null;
let engine = null;
let engineKind = "";
let engineReady = false;
let preparing = false;
let running = false;
let halted = false;
let runToken = 0;
let pending = null;
let handshakeTimer = 0;
let handshakeStarted = 0;
let installerLoaded = false;
let lastProgress = -1;
let lastProgressAt = 0;

function setBadge(state, text) {
  ui.badge.dataset.state = state;
  ui.badge.textContent = text;
}

function log(message, kind = "sys") {
  const entry = document.createElement("div");
  entry.className = `entry ${kind}`;
  const time = new Date().toLocaleTimeString([], { hour12: false });
  entry.textContent = `[${time}] ${message}`;
  ui.log.append(entry);
  while (ui.log.children.length > LIMITS.logEntries) ui.log.firstElementChild?.remove();
  ui.log.scrollTop = ui.log.scrollHeight;
}

function updateRun() {
  const canRun =
    Boolean(session?.origin) &&
    engineReady &&
    !running &&
    ui.task.value.trim().length > 0;
  ui.run.disabled = !canRun;
  ui.run.textContent = running ? "Running…" : "Run";
  ui.kill.disabled = !session;
  ui.prepare.disabled = running || !engineKind;
  ui.steps.disabled = running;
}

function renderMap() {
  const map = session?.domMap ?? [];
  const tools = session?.tools ?? [];
  // Tools speak for the page, so they take the panel when a page has them.
  ui.mapCount.textContent = String(tools.length || map.length);
  ui.mapSummary.textContent = tools.length
    ? `${tools.length} page tools`
    : map.length
      ? `${map.length} controls`
      : "none yet";
  ui.map.textContent = tools.length
    ? JSON.stringify(tools, null, 1)
    : map.length
      ? JSON.stringify(map, null, 1)
      : "No map yet.";
}

function cleanMap(input) {
  if (!Array.isArray(input)) return [];
  const map = [];
  for (const raw of input.slice(0, LIMITS.nodes)) {
    if (!raw || !Number.isInteger(raw.id) || typeof raw.tag !== "string") continue;
    const entry = { id: raw.id, tag: raw.tag.slice(0, 12) };
    if (typeof raw.type === "string") entry.type = raw.type.slice(0, 16);
    if (typeof raw.label === "string") entry.label = raw.label.slice(0, LIMITS.label);
    if (typeof raw.href === "string") entry.href = raw.href.slice(0, 48);
    if (typeof raw.value === "string") entry.value = raw.value.slice(0, 40);
    if (typeof raw.checked === "boolean") entry.checked = raw.checked;
    if (Array.isArray(raw.options)) {
      entry.options = raw.options.slice(0, 6).map((option) => String(option).slice(0, 24));
    }
    map.push(entry);
  }
  return map;
}

function cleanTools(input) {
  if (!Array.isArray(input)) return [];
  const tools = [];
  for (const raw of input.slice(0, LIMITS.tools)) {
    if (!raw || typeof raw.name !== "string" || !raw.name.trim()) continue;
    const entry = { name: raw.name.trim().slice(0, 64) };
    if (typeof raw.description === "string") entry.description = raw.description.slice(0, 140);
    if (typeof raw.schema === "string") entry.schema = raw.schema.slice(0, 400);
    if (raw.readOnly) entry.readOnly = true;
    if (raw.consequential) entry.consequential = true;
    if (raw.untrusted) entry.untrusted = true;
    tools.push(entry);
  }
  return tools;
}

function send(type, data = {}) {
  if (!session?.origin) return false;
  try {
    session.source.postMessage({ ...data, type, token: session.token }, session.origin);
    return true;
  } catch {
    return false;
  }
}

function resolvePending(reply) {
  if (!pending) return;
  const job = pending;
  pending = null;
  clearTimeout(job.timer);
  job.resolve(reply);
}

function showSetup(coop = false) {
  clearInterval(handshakeTimer);
  ui.active.hidden = true;
  ui.setup.hidden = false;
  ui.coop.hidden = !coop;
  setBadge(coop ? "error" : "setup", coop ? "Isolated" : "Setup");
  if (!installerLoaded) void loadInstaller();
}

function showActive() {
  ui.setup.hidden = true;
  ui.active.hidden = false;
}

async function loadInstaller() {
  installerLoaded = true;
  try {
    const response = await fetch("../bookmarklets/devtools/webmcp-bridge.js", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const source = await response.text();
    const body = source.replace(/^\/\*\*[\s\S]*?\*\//, "").trim();
    if (!body) throw new Error("the bookmarklet source is empty");
    ui.installLink.href = "javascript:" + encodeURIComponent(body);
    ui.installNote.textContent = "Drag it now. The page is untouched until you click it.";
  } catch (error) {
    installerLoaded = false;
    ui.installLink.removeAttribute("href");
    ui.installNote.textContent = `The bookmarklet could not be loaded here (${error.message}). Open this page from the deployed library instead.`;
  }
}

function lost(reason) {
  clearInterval(handshakeTimer);
  resolvePending(null);
  running = false;
  halted = false;
  runToken++;
  session = null;
  setBadge("offline", "Disconnected");
  ui.targetTitle.textContent = "None";
  ui.targetTitle.removeAttribute("title");
  ui.retry.hidden = false;
  ui.runState.textContent = "";
  renderMap();
  updateRun();
  log(reason, "error");
}

function beginHandshake(reconnect = false) {
  if (!window.opener) {
    showSetup(window.name === "WebMCP_Hub");
    return;
  }
  if (session?.source?.closed) {
    lost("The target tab closed. Click the bookmarklet on a page to start again.");
    return;
  }
  clearInterval(handshakeTimer);
  resolvePending(null);
  runToken++;
  running = false;
  halted = false;
  const token = makeToken();
  session = {
    token,
    source: window.opener,
    origin: "",
    title: "",
    url: "",
    domMap: [],
    tools: [],
  };
  handshakeStarted = Date.now();
  showActive();
  renderMap();
  setBadge("waiting", reconnect ? "Reconnecting" : "Waiting");
  ui.targetTitle.textContent = reconnect ? "New document…" : "Waiting for the tab…";
  ui.targetTitle.removeAttribute("title");
  ui.retry.hidden = true;
  ui.runState.textContent = "";
  updateRun();
  log(reconnect ? "The target document changed. Reconnecting…" : "Asking the tab that opened this window to connect…");

  const sendHandshake = () => {
    if (!session) return;
    if (session.source.closed) {
      lost("The target tab closed before it connected.");
      return;
    }
    try {
      session.source.postMessage({ type: "INIT_HANDSHAKE", token }, "*");
    } catch {
      lost("The target tab could not be reached. Reload it and click the bookmarklet again.");
      return;
    }
    if (Date.now() - handshakeStarted > LIMITS.handshakeMs) {
      clearInterval(handshakeTimer);
      setBadge("error", "No answer");
      ui.retry.hidden = false;
      log("The tab did not answer. Reload it and click the bookmarklet again, or press Retry.", "error");
    }
  };
  sendHandshake();
  handshakeTimer = setInterval(sendHandshake, 500);
}

function fillModels() {
  if (ui.model.options.length) return;
  for (const model of MODELS) {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.label;
    ui.model.append(option);
  }
}

function progressReporter(report) {
  const percent = Number.isFinite(report?.progress) ? Math.round(report.progress * 100) : null;
  const now = Date.now();
  if (percent !== null && percent === lastProgress) return;
  if (now - lastProgressAt < 900) return;
  lastProgress = percent;
  lastProgressAt = now;
  log(percent === null ? report.text : `${report.text} · ${percent}%`);
}

// A missing Prompt API is a setup step, not a dead end: name the two flags that
// turn Gemini Nano on and link Chrome's own notes. Both views share one source.
function fillModelHelp(found = detectEngines()) {
  const setup = modelSetup(found);
  for (const box of document.querySelectorAll("[data-model-help]")) {
    box.hidden = !setup.needed;
    if (!setup.needed) {
      box.replaceChildren();
      continue;
    }
    const lead = document.createElement("p");
    lead.textContent =
      `Chrome keeps its built-in model behind two flags. Turn both on (the optimization-guide one offers Enabled BypassPerfRequirement for older machines), restart Chrome, then update ${setup.model} → Optimization Guide On Device Model.`;
    const list = document.createElement("p");
    list.className = "help-flags";
    for (const flag of setup.flags) {
      const code = document.createElement("code");
      code.textContent = flag;
      list.append(code);
    }
    const link = document.createElement("a");
    link.href = setup.docs;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = "Chrome's Prompt API setup notes";
    box.replaceChildren(lead, list, link);
  }
}

async function prepareEngine() {
  if (preparing) return;
  preparing = true;
  const current = session;
  try {
    if (engine) {
      engineReady = true;
      ui.engineName.textContent = engine.label;
      ui.engineNote.textContent = "Model loaded locally. The page map stays in these two windows.";
      ui.prepare.hidden = true;
      ui.model.hidden = true;
      engineKind = engine.kind;
      updateRun();
      return;
    }
    const found = detectEngines();
    fillModelHelp(found);
    engineKind = "";
    engineReady = false;
    ui.prepare.hidden = true;
    ui.model.hidden = true;
    ui.engineName.textContent = "Detecting…";
    ui.engineNote.textContent = "Looking for Chrome's built-in model or WebGPU.";
    fillModels();

    if (found.builtIn) {
      const availability = await builtInAvailability();
      if (session !== current) return;
      if (availability === "available") {
        engineKind = "builtin";
        engineReady = true;
        ui.engineName.textContent = "Chrome built-in AI";
        ui.engineNote.textContent = "Gemini Nano is available. Run creates a fresh session for each step.";
        ui.prepare.hidden = true;
        log("Chrome's built-in model is available.", "ok");
        return;
      }
      if (availability === "downloadable" || availability === "downloading") {
        engineKind = "builtin";
        ui.engineName.textContent = "Chrome built-in AI";
        ui.engineNote.textContent = "Gemini Nano needs a one-time download. Press Download model.";
        ui.prepare.hidden = false;
        ui.prepare.textContent = "Download model";
        log("Chrome can download its built-in model for this browser.", "warn");
        return;
      }
      log("Chrome's built-in model is not available on this device.", "warn");
      if (session !== current) return;
    }

    if (found.webgpu) {
      const adapter = await hasWebGpuAdapter();
      if (session !== current) return;
      if (adapter) {
        engineKind = "webllm";
        engineReady = false;
        ui.engineName.textContent = "WebLLM · WebGPU";
        ui.engineNote.textContent = "Choose a small model. Its weights download once, then it runs on this GPU.";
        ui.model.hidden = false;
        ui.prepare.hidden = false;
        ui.prepare.textContent = "Load model";
        log("WebGPU returned an adapter. Choose a WebLLM model, then load it.", "ok");
        return;
      }
      log("WebGPU is exposed but returned no adapter; WebLLM cannot load here.", "warn");
    }

    engineKind = "";
    engineReady = false;
    ui.engineName.textContent = "No local model";
    ui.engineNote.textContent =
      "This browser exposes neither Chrome's built-in model nor a usable WebGPU adapter. The bridge still connects and the map and Kill switch still work. Turn on the flags below, or open the hub in a browser with a working WebGPU adapter.";
    log("No local model is available in this browser.", "warn");
  } finally {
    preparing = false;
    updateRun();
  }
}

async function ensureEngine() {
  if (engine) return engine;
  if (engineKind === "builtin") {
    log("Starting Chrome's built-in model…");
    try {
      engine = await createBuiltInEngine(progressReporter);
    } catch (error) {
      engineReady = false;
      if (await hasWebGpuAdapter()) {
        engineKind = "webllm";
        ui.engineName.textContent = "WebLLM · WebGPU";
        ui.engineNote.textContent = "The built-in model failed. Choose a WebLLM model and load it instead.";
        ui.model.hidden = false;
        ui.prepare.hidden = false;
        ui.prepare.textContent = "Load model";
        log(`Built-in model failed: ${error.message}. WebLLM is available instead.`, "warn");
      }
      throw error;
    }
  } else if (engineKind === "webllm") {
    if (!ui.model.value) throw new Error("Choose a model first.");
    log(`Loading ${MODELS.find((model) => model.id === ui.model.value)?.label || ui.model.value}…`);
    engine = await createWebLLMEngine(ui.model.value, progressReporter);
  } else {
    throw new Error("No local model is available in this browser.");
  }
  engineReady = true;
  ui.engineName.textContent = engine.label;
  ui.engineNote.textContent = "Loaded locally. Nothing from the page is uploaded.";
  ui.prepare.hidden = true;
  ui.model.hidden = true;
  lastProgress = -1;
  lastProgressAt = 0;
  log(`${engine.label} ready.`, "ok");
  updateRun();
  return engine;
}

function describe(decision, map) {
  if (decision.action === "tool") return `Run ${decision.name}`;
  const control = map.find((entry) => entry.id === decision.id);
  const label = control?.label ? `“${control.label}”` : `control ${decision.id}`;
  if (decision.action === "click") return `Click ${label}`;
  if (decision.action === "type") return `Type “${String(decision.value).slice(0, 80)}” into ${label}`;
  return `Choose “${String(decision.value).slice(0, 60)}” in ${label}`;
}

function sendAction(decision) {
  return new Promise((resolve) => {
    resolvePending(null);
    const timer = setTimeout(() => {
      if (pending?.timer === timer) pending = null;
      resolve(null);
    }, LIMITS.actionWaitMs);
    pending = { timer, resolve };
    const sent = send("EXEC_ACTION", {
      action: decision.action,
      targetId: decision.id,
      value: decision.value,
    });
    if (!sent) {
      resolvePending(null);
      resolve(null);
    }
  });
}

function sendTool(decision) {
  return new Promise((resolve) => {
    resolvePending(null);
    const timer = setTimeout(() => {
      if (pending?.timer === timer) pending = null;
      resolve(null);
    }, LIMITS.actionWaitMs);
    pending = { timer, resolve };
    const sent = send("EXEC_TOOL", { name: decision.name, args: decision.args ?? {} });
    if (!sent) {
      resolvePending(null);
      resolve(null);
    }
  });
}

function kill() {
  const connected = Boolean(session);
  halted = true;
  runToken++;
  running = false;
  resolvePending(null);
  if (session) send("HALT");
  log(
    connected
      ? "Kill switch: the target was told to stop and no further actions will run."
      : "Nothing is connected.",
    connected ? "error" : "warn",
  );
  setBadge(connected ? "halted" : "offline", connected ? "Halted" : "Disconnected");
  ui.runState.textContent = "";
  updateRun();
}

async function runTask() {
  if (running || !session?.origin) return;
  const task = ui.task.value.trim();
  if (!task) return;
  if (!engineReady) {
    log("Prepare a local model before running the task.", "error");
    return;
  }
  const id = ++runToken;
  running = true;
  halted = false;
  updateRun();
  setBadge("running", "Running");
  ui.runState.textContent = "Starting…";
  if (!send("ARM")) {
    lost("The target is no longer reachable.");
    return;
  }
  log(`Task: ${task}`, "task");

  try {
    if (!engine) await ensureEngine();
    if (halted || id !== runToken) return;
    const maxSteps = Math.min(LIMITS.maxSteps, Math.max(1, Number(ui.steps.value) || LIMITS.steps));
    let map = session.domMap;
    const history = [];
    let previous = "";
    let repeats = 0;

    for (let step = 1; step <= maxSteps; step++) {
      if (halted || id !== runToken) break;
      ui.runState.textContent = `Step ${step} of ${maxSteps}`;
      let decision = null;
      let correction = "";

      for (let attempt = 0; attempt < 2 && !decision; attempt++) {
        const prompt = `${SYSTEM_PROMPT}\n\n${buildPrompt({
          task,
          title: session.title,
          url: session.url,
          domMap: map,
          step,
          maxSteps,
          history,
          correction,
        })}`;
        const raw = await engine.complete(prompt);
        if (halted || id !== runToken || !session) return;
        const parsed = parseDecision(raw, map.length);
        if (parsed.ok) decision = parsed.decision;
        else {
          correction = parsed.error;
          log(`The model's reply was rejected: ${parsed.error}`, "warn");
        }
      }

      if (!decision) {
        log(`Stopped after an unusable reply: ${correction}`, "error");
        break;
      }
      if (decision.action === "done") {
        log(`Finished: ${decision.summary}`, "ok");
        break;
      }

      const marker =
        decision.action === "tool"
          ? `tool:${decision.name}:${JSON.stringify(decision.args ?? {})}`
          : `${decision.action}:${decision.id}:${decision.value ?? ""}`;
      if (marker === previous) repeats++;
      else {
        previous = marker;
        repeats = 0;
      }
      if (repeats >= 2) {
        log("Stopped: the model tried the same move three times.", "error");
        break;
      }

      if (decision.action === "tool") {
        log(`Step ${step}: call ${decision.name}`, "out");
        const toolReply = await sendTool(decision);
        if (halted || id !== runToken) return;
        if (!toolReply) {
          log("The page did not answer the tool call within six seconds.", "error");
          break;
        }
        session.domMap = cleanMap(toolReply.domMap);
        map = session.domMap;
        if (!toolReply.result?.ok) {
          log(`The page refused it: ${toolReply.result?.error || "unknown error"}`, "error");
          break;
        }
        log(`${decision.name}: ${toolReply.result.text || "(no output)"}`, "in");
        history.push(`tool ${decision.name} -> ok`);
        continue;
      }

      log(`Step ${step}: ${describe(decision, map)}`, "out");
      const reply = await sendAction(decision);
      if (halted || id !== runToken) return;
      if (!reply) {
        log("The target did not answer the action within six seconds.", "error");
        break;
      }
      session.domMap = cleanMap(reply.domMap);
      renderMap();
      if (!reply.result?.ok) {
        log(`The page refused it: ${reply.result?.error || "unknown error"}`, "error");
        break;
      }
      log(`Action applied. ${session.domMap.length} controls now.`, "in");
      history.push(`${decision.action} ${map.find((entry) => entry.id === decision.id)?.label || decision.id} -> ok`);
      map = session.domMap;
    }
  } catch (error) {
    log(`Stopped: ${error?.message || error}`, "error");
  } finally {
    if (id === runToken) {
      running = false;
      setBadge(halted ? "halted" : "live", halted ? "Halted" : "Connected");
      ui.runState.textContent = "";
      updateRun();
    }
  }
}

ui.prepare.addEventListener("click", async () => {
  lastProgress = -1;
  lastProgressAt = 0;
  ui.prepare.disabled = true;
  try {
    await ensureEngine();
  } catch (error) {
    log(`Could not prepare the model: ${error?.message || error}`, "error");
  } finally {
    ui.prepare.disabled = false;
    updateRun();
  }
});

ui.run.addEventListener("click", () => void runTask());
ui.kill.addEventListener("click", kill);
ui.retry.addEventListener("click", () => beginHandshake(true));
ui.task.addEventListener("input", updateRun);
ui.task.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    void runTask();
  }
});

window.addEventListener("message", (event) => {
  if (event.source !== window.opener) return;
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "TARGET_HELLO") {
    if (!session || session.origin) beginHandshake(Boolean(session));
    return;
  }
  if (!session || data.token !== session.token) return;

  if (data.type === "HANDSHAKE_ACK") {
    if (!/^https?:\/\//.test(event.origin)) {
      log("Refused a target with an opaque origin.", "error");
      return;
    }
    clearInterval(handshakeTimer);
    session.origin = event.origin;
    session.title = typeof data.title === "string" ? data.title.slice(0, 160) : event.origin;
    session.url = typeof data.url === "string" ? data.url.slice(0, 500) : "";
    session.domMap = cleanMap(data.domMap);
    session.tools = cleanTools(data.tools);
    ui.targetTitle.textContent = session.title || event.origin;
    ui.targetTitle.title = session.url;
    setBadge("live", "Connected");
    ui.retry.hidden = true;
    renderMap();
    log(`Connected to ${session.title || "the target"} (${event.origin}).`, "ok");
    log(
      session.tools.length
        ? `${session.tools.length} page tools available — these are called by name.`
        : `${session.domMap.length} visible controls indexed.`,
    );
    send("HANDSHAKE_OK");
    void prepareEngine();
    return;
  }

  if (!session.origin || event.origin !== session.origin) return;

  if (data.type === "TOOL_RESULT") {
    session.domMap = cleanMap(data.domMap);
    renderMap();
    resolvePending({ result: data.result, domMap: session.domMap });
    return;
  }
  if (data.type === "ACTION_RESULT") {
    session.domMap = cleanMap(data.domMap);
    renderMap();
    resolvePending({ result: data.result, domMap: session.domMap });
    return;
  }
  if (data.type === "DOM_UPDATE") {
    session.domMap = cleanMap(data.domMap);
    renderMap();
    return;
  }
  if (data.type === "TARGET_DISCONNECTED") {
    lost("The target tab closed or navigated away. Click the bookmarklet again on a page to reconnect.");
  }
});

// A closed popup is the one disconnect that can be checked directly.
setInterval(() => {
  if (session?.source?.closed) lost("The target tab closed. Click the bookmarklet on a page to start again.");
}, 2000);

window.addEventListener("pagehide", () => {
  if (session) send("HALT");
  engine?.destroy?.();
});

// A query-gated hook lets a real browser run drive the bridge without a local
// model installed. It is not part of the normal UI and exposes nothing to the
// target page.
if (new URLSearchParams(location.search).has("webmcp-test")) {
  globalThis.__WEBMCP_TEST__ = {
    session: () =>
      session && {
        token: session.token,
        origin: session.origin,
        title: session.title,
        domMap: session.domMap,
      },
    send,
    setEngine(next) {
      engine = next;
      engineKind = next.kind;
      engineReady = true;
      ui.engineName.textContent = next.label;
      ui.engineNote.textContent = "Test engine. No inference is running.";
      ui.prepare.hidden = true;
      ui.model.hidden = true;
      updateRun();
    },
  };
}

fillModels();
fillModelHelp();
if (!window.opener) showSetup(window.name === "WebMCP_Hub");
else beginHandshake(false);
