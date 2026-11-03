import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LIMITS, makeToken, parseDecision } from "../webmcp/protocol.js";
import {
  MODELS,
  SYSTEM_PROMPT,
  buildPrompt,
  builtInAvailability,
  detectEngines,
  hasWebGpuAdapter,
  modelSetup,
} from "../webmcp/engine.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("a decision must be one JSON action against a real control id", () => {
  assert.deepEqual(parseDecision('{"action":"click","id":2}', 3), {
    ok: true,
    decision: { action: "click", id: 2 },
  });
  assert.deepEqual(parseDecision('```json\n{"action":"type","id":0,"value":"field notes"}\n```', 1), {
    ok: true,
    decision: { action: "type", id: 0, value: "field notes" },
  });
  assert.equal(parseDecision('{"action":"click","id":3}', 3).ok, false);
  assert.equal(parseDecision('{"action":"eval","id":0}', 3).ok, false);
  assert.equal(parseDecision('{"action":"click"}', 3).ok, false);
  assert.equal(parseDecision("I would click the search box.", 3).ok, false);
  assert.equal(parseDecision('{"action":"type","id":0}', 1).ok, false);
  assert.equal(parseDecision('{"action":"type","id":0,"value":4}', 1).ok, false);
});

test("done is bounded, text values are capped, and ids are zero-based", () => {
  const done = parseDecision('{"action":"done","summary":"  Opened\\n the report  "}', 0);
  assert.deepEqual(done, { ok: true, decision: { action: "done", summary: "Opened the report" } });
  const longDone = parseDecision(JSON.stringify({ action: "done", summary: "x".repeat(400) }), 0);
  assert.equal(longDone.decision.summary.length, LIMITS.summary);

  const longType = parseDecision(JSON.stringify({ action: "type", id: 0, value: "y".repeat(2500) }), 1);
  assert.equal(longType.decision.value.length, LIMITS.text);
  assert.equal(parseDecision('{"action":"click","id":-1}', 3).ok, false);
  assert.equal(parseDecision('{"action":"click","id":"0"}', 1).ok, true);
});

test("session tokens are 32 hex characters", () => {
  const token = makeToken({
    getRandomValues(bytes) {
      bytes.fill(255);
    },
  });
  assert.equal(token, "f".repeat(32));
  assert.match(makeToken(), /^[0-9a-f]{32}$/);
});

test("the prompt carries the task, path, controls and only the recent moves", () => {
  const prompt = buildPrompt({
    task: "  Search\nfor field notes  ",
    title: "Field guide",
    url: "https://app.example.com/guide?token=secret#top",
    domMap: [{ id: 0, tag: "input", type: "search", label: "Search" }],
    step: 2,
    maxSteps: 5,
    history: ["click Search -> ok"],
    correction: "Unknown action",
  });
  assert.match(prompt, /Task: Search for field notes/);
  assert.match(prompt, /Page: Field guide — \/guide/);
  assert.match(prompt, /Step: 2 of 5/);
  assert.match(prompt, /Controls: \[\{"id":0/);
  assert.match(prompt, /Recent moves: click Search -> ok/);
  assert.match(prompt, /rejected: Unknown action/);
  assert.doesNotMatch(prompt, /token=secret/);
  assert.ok(SYSTEM_PROMPT.includes('"action":"click"'));
  assert.ok(!SYSTEM_PROMPT.includes("<html"));
});

test("engine detection finds the Prompt API, the legacy namespace and WebGPU", async () => {
  assert.equal(detectEngines({ LanguageModel: {}, navigator: {} }).builtIn, true);
  assert.equal(detectEngines({ ai: { languageModel: {} }, navigator: {} }).builtIn, true);
  assert.equal(detectEngines({ navigator: { gpu: {} } }).webgpu, true);
  assert.deepEqual(detectEngines({}), { builtIn: false, webgpu: false, models: MODELS });

  assert.equal(await builtInAvailability({}), "unavailable");
  assert.equal(
    await builtInAvailability({ LanguageModel: { availability: async () => "downloadable" } }),
    "downloadable",
  );
  assert.equal(
    await builtInAvailability({
      ai: { languageModel: { capabilities: async () => ({ available: "after-download" }) } },
    }),
    "downloadable",
  );

  assert.equal(await hasWebGpuAdapter({}), false);
  assert.equal(await hasWebGpuAdapter({ navigator: { gpu: {} } }), false);
  assert.equal(
    await hasWebGpuAdapter({ navigator: { gpu: { requestAdapter: async () => null } } }),
    false,
  );
  assert.equal(
    await hasWebGpuAdapter({ navigator: { gpu: { requestAdapter: async () => ({}) } } }),
    true,
  );
});

test("a tool call names a listed tool and takes a bounded JSON object", () => {
  assert.deepEqual(parseDecision('{"action":"tool","name":"addTodo","args":{"text":"milk"}}', 0), {
    ok: true,
    decision: { action: "tool", name: "addTodo", args: { text: "milk" } },
  });
  assert.deepEqual(parseDecision('{"action":"tool","name":"addTodo"}', 0).decision.args, {});
  assert.equal(parseDecision('{"action":"tool","args":{}}', 0).ok, false);
  assert.equal(parseDecision('{"action":"tool","name":"../etc/passwd","args":{}}', 0).ok, false);
  assert.equal(parseDecision('{"action":"tool","name":"addTodo","args":[1]}', 0).ok, false);
  assert.equal(parseDecision(`{"action":"tool","name":"addTodo","args":{"q":"${"y".repeat(700)}"}}`, 0).ok, false);
});

test("a page's own tools replace the control map in the prompt", () => {
  const prompt = buildPrompt({
    task: "Add milk",
    title: "Todos",
    url: "https://todos.example.com/list",
    domMap: [{ id: 0, tag: "button", label: "Add" }],
    tools: [{ name: "addTodo", description: "Add a to-do", schema: '{"type":"object"}' }],
    step: 1,
    maxSteps: 3,
  });
  assert.match(prompt, /Page tools \(call these instead of clicking\)/);
  assert.match(prompt, /addTodo/);
  assert.doesNotMatch(prompt, /Controls: \[/);
  assert.ok(SYSTEM_PROMPT.includes('"action":"tool"'));
});

test("a missing Prompt API names the Chrome flags that turn it on", () => {
  const missing = modelSetup({ builtIn: false, webgpu: false });
  assert.equal(missing.needed, true);
  assert.deepEqual(missing.flags, [
    "chrome://flags/#prompt-api-for-gemini-nano",
    "chrome://flags/#optimization-guide-on-device-model",
  ]);
  assert.match(missing.docs, /^https:\/\/developer\.chrome\.com\/docs\/ai\//);
  assert.equal(missing.model, "chrome://components/");
  assert.equal(modelSetup({ builtIn: true, webgpu: false }).needed, false);
  assert.equal(modelSetup().needed, true);
});

test("the bookmarklet only answers its hub, needs the token, and obeys HALT", async () => {
  const source = await readFile(path.join(root, "bookmarklets/devtools/webmcp-bridge.js"), "utf8");
  const HUB_ORIGIN = "https://spuds0588.github.io";
  const events = [];
  const popup = {
    closed: false,
    messages: [],
    focus() {},
    postMessage(message, origin) {
      this.messages.push({ message, origin });
    },
  };
  const makeNode = (spec = {}) => {
    const attributes = { ...(spec.attrs || {}) };
    const node = {
      tagName: spec.tag || "BUTTON",
      type: spec.type || "",
      innerText: spec.text || "",
      value: spec.value || "",
      checked: Boolean(spec.checked),
      disabled: Boolean(spec.disabled),
      options: spec.options,
      selectedIndex: 0,
      style: spec.style || { visibility: "visible", display: "block", opacity: "1" },
      clicks: 0,
      getAttribute(name) {
        return name in attributes ? attributes[name] : null;
      },
      setAttribute(name, value) {
        attributes[name] = String(value);
      },
      removeAttribute(name) {
        delete attributes[name];
      },
      closest() {
        return null;
      },
      getBoundingClientRect() {
        return spec.box || { width: 120, height: 24 };
      },
      focus() {},
      scrollIntoView() {},
      dispatchEvent(event) {
        events.push(event);
        return true;
      },
      click() {
        node.clicks++;
      },
    };
    return node;
  };

  const button = makeNode({ attrs: { "aria-label": "Open the field guide" } });
  const password = makeNode({ tag: "INPUT", type: "password", value: "secret" });
  const upload = makeNode({ tag: "INPUT", type: "file" });
  const invisible = makeNode({ box: { width: 0, height: 0 } });
  const disabled = makeNode({ disabled: true, text: "Disabled" });
  const link = makeNode({ tag: "A", text: "Docs", attrs: { href: "/docs?token=1#top" } });
  const select = makeNode({
    tag: "SELECT",
    options: [{ text: "One" }, { text: "Two" }],
  });
  const text = makeNode({ tag: "INPUT", type: "text", value: "draft" });
  const nodes = [button, password, upload, invisible, disabled, link, select, text];

  const pageTools = [
    {
      name: "addTodo",
      description: "Add a to-do item",
      inputSchema: { type: "object", properties: { text: { type: "string" } } },
      annotations: { readOnlyHint: true },
      executed: 0,
    },
  ];
  const modelContextFake = {
    async getTools() {
      return pageTools;
    },
    async executeTool(tool, args) {
      tool.executed++;
      return `Added ${args.text}`;
    },
  };
  const documentFake = {
    title: "Field guide",
    modelContext: modelContextFake,
    querySelectorAll(selector) {
      if (selector === "[data-webmcp-id]") return [];
      return nodes;
    },
    querySelector(selector) {
      const match = selector.match(/\[data-webmcp-id="(\d+)"\]/);
      return match ? nodes.find((node) => node.getAttribute("data-webmcp-id") === match[1]) || null : null;
    },
  };
  const windowFake = {
    __WEBMCP_ACTIVE__: false,
    open() {
      return popup;
    },
    addEventListener() {},
    removeEventListener() {},
    alert() {},
  };
  const saved = new Map();
  const names = [
    "window",
    "location",
    "document",
    "getComputedStyle",
    "screen",
    "setInterval",
    "clearInterval",
    "setTimeout",
    "MouseEvent",
    "__BL_TEST__",
  ];
  for (const name of names) saved.set(name, globalThis[name]);
  try {
    globalThis.window = windowFake;
    globalThis.location = { href: "https://app.example.com/guide" };
    globalThis.document = documentFake;
    globalThis.getComputedStyle = (node) => node.style;
    globalThis.screen = { width: 1200, height: 800 };
    globalThis.setInterval = () => 0;
    globalThis.clearInterval = () => {};
    globalThis.setTimeout = (callback) => {
      callback();
      return 0;
    };
    globalThis.MouseEvent = class {
      constructor(type) {
        this.type = type;
      }
    };
    globalThis.__BL_TEST__ = {};
    new Function(source)();
    const core = globalThis.__BL_TEST__.webmcp;
    assert.ok(core, "the bookmarklet did not export its test core");

    const map = core.build();
    assert.deepEqual(map.map((entry) => entry.id), [0, 1, 2, 3]);
    assert.equal(map[0].label, "Open the field guide");
    assert.equal(map[1].href, "/docs");
    assert.equal(map[2].label, "One");
    assert.deepEqual(map[2].options, ["One", "Two"]);
    assert.equal(map[3].value, "draft");
    assert.ok(!map.some((entry) => entry.tag === "input" && entry.type === "password"));
    assert.ok(!map.some((entry) => entry.type === "file"));

    const click = core.act("click", 0, "");
    assert.equal(click.ok, true);
    assert.equal(button.clicks, 1);
    assert.ok(events.some((event) => event.type === "pointerdown"));
    assert.equal(core.act("click", 99, "").ok, false);

    const token = "a".repeat(32);
    const message = (data, origin = HUB_ORIGIN, from = popup) =>
      core.onMessage({ origin, source: from, data });
    message({ type: "INIT_HANDSHAKE", token }, "https://evil.example");
    assert.equal(popup.messages.length, 0);
    message({ type: "INIT_HANDSHAKE", token }, HUB_ORIGIN, {});
    assert.equal(popup.messages.length, 0);

    await message({ type: "INIT_HANDSHAKE", token });
    const ack = popup.messages.at(-1);
    assert.equal(ack.origin, HUB_ORIGIN);
    assert.equal(ack.message.type, "HANDSHAKE_ACK");
    assert.equal(ack.message.token, token);
    assert.equal(ack.message.title, "Field guide");
    assert.equal(ack.message.domMap.length, 4);
    assert.equal(ack.message.tools.length, 1);
    assert.equal(ack.message.tools[0].name, "addTodo");
    assert.equal(ack.message.tools[0].readOnly, true);

    // A page tool is called by name and still validates its own arguments.
    await message({ type: "EXEC_TOOL", token, name: "addTodo", args: { text: "milk" } });
    const toolResult = popup.messages.at(-1).message;
    assert.equal(toolResult.type, "TOOL_RESULT");
    assert.equal(toolResult.result.ok, true);
    assert.match(toolResult.result.text, /Added milk/);
    assert.equal(pageTools[0].executed, 1);

    await message({ type: "EXEC_TOOL", token, name: "missing", args: {} });
    assert.equal(popup.messages.at(-1).message.result.ok, false);

    const before = popup.messages.length;
    message({ type: "EXEC_ACTION", token: "b".repeat(32), action: "click", targetId: 0 });
    assert.equal(popup.messages.length, before);

    message({ type: "EXEC_ACTION", token, action: "click", targetId: 0 });
    const result = popup.messages.at(-1).message;
    assert.equal(result.type, "ACTION_RESULT");
    assert.equal(result.result.ok, true);
    assert.equal(button.clicks, 2);
    assert.equal(result.domMap.length, 4);

    message({ type: "HALT", token });
    message({ type: "EXEC_ACTION", token, action: "click", targetId: 0 });
    const halted = popup.messages.at(-1).message;
    assert.equal(halted.result.ok, false);
    assert.match(halted.result.error, /kill switch/);
    assert.equal(button.clicks, 2);

    await message({ type: "EXEC_TOOL", token, name: "addTodo", args: { text: "late" } });
    assert.match(popup.messages.at(-1).message.result.error, /kill switch/);
    assert.equal(pageTools[0].executed, 1);

    core.cleanup();
    assert.equal(windowFake.__WEBMCP_ACTIVE__, undefined);
  } finally {
    for (const name of names) {
      if (saved.get(name) === undefined) delete globalThis[name];
      else globalThis[name] = saved.get(name);
    }
  }
});
