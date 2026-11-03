/**
 * @name 🤖 Drive this page
 * @category devtools
 * @description Run a local AI model that clicks, types and selects on this page for you.
 * @tags ai, agent, automation, webmcp, mcp, local, dom
 * @traits network, web-app, third-party, no-cors
 * @added 2026-11-02
 * @featured false
 */
(() => {
  const HUB = globalThis.__WEBMCP_HUB_URL__ || "https://spuds0588.github.io/Bookmarklet-Library/webmcp/";
  const ORIGIN = new URL(HUB).origin;
  let token = null;
  let halted = false;
  let map = [];
  let tools = new Map();
  let knock = 0;
  let timer = 0;
  let knocks = 0;
  let popup = null;

  // A page that publishes WebMCP tools knows its own jobs better than a list of
  // its buttons does, and it validates its own arguments. Read those first.
  function context() {
    return document.modelContext ?? globalThis.navigator?.modelContext ?? null;
  }

  async function readTools() {
    const api = context();
    tools = new Map();
    if (!api || typeof api.getTools !== "function") return [];
    try {
      const listed = await api.getTools();
      for (const tool of Array.isArray(listed) ? listed : []) {
        if (tools.size >= 12) break;
        const name = String(tool?.name || "").trim().slice(0, 48);
        if (!name || tools.has(name)) continue;
        tools.set(name, tool);
      }
    } catch {
      tools = new Map();
      return [];
    }
    return [...tools].map(([name, tool]) => {
      const entry = { name, description: String(tool.description || "").replace(/\s+/g, " ").slice(0, 140) };
      try {
        entry.schema = JSON.stringify(tool.inputSchema ?? {}).slice(0, 400);
      } catch {}
      const hints = tool.annotations || {};
      if (hints.readOnlyHint) entry.readOnly = true;
      if (hints.consequentialHint) entry.consequential = true;
      if (hints.untrustedContentHint) entry.untrusted = true;
      return entry;
    });
  }

  async function runTool(name, args) {
    const api = context();
    const tool = tools.get(String(name));
    if (!tool) return { ok: false, error: `This page has no tool named ${String(name).slice(0, 48)}.` };
    if (!api || typeof api.executeTool !== "function") {
      return { ok: false, error: "This page cannot run its own tools." };
    }
    try {
      const input = args && typeof args === "object" && !Array.isArray(args) ? args : {};
      const output = await api.executeTool(tool, input);
      const text = typeof output === "string" ? output : JSON.stringify(output ?? "");
      return { ok: true, text: text.replace(/\s+/g, " ").slice(0, 600) };
    } catch (error) {
      return { ok: false, error: String(error?.message || error).slice(0, 200) };
    }
  }

  function build() {
    document.querySelectorAll("[data-webmcp-id]").forEach((el) => el.removeAttribute("data-webmcp-id"));
    map = [];
    const nodes = document.querySelectorAll(
      'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])',
    );
    for (const el of nodes) {
      if (map.length >= 30) break;
      const tag = el.tagName.toLowerCase();
      const field = (el.type || "").toLowerCase();
      // Credentials and uploads are not controls a local model gets to touch.
      if (field === "password" || field === "file") continue;
      if (el.disabled || el.getAttribute("aria-disabled") === "true" || el.closest("[inert]")) continue;
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (!box.width || !box.height || style.visibility === "hidden" || style.display === "none" || style.opacity === "0") {
        continue;
      }
      let label = "";
      if (tag === "select") {
        label = el.getAttribute("aria-label") || el.name || el.options?.[el.selectedIndex]?.text || "";
      } else {
        label = el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || el.value || el.title || el.alt || "";
      }
      label = label.trim().replace(/\s+/g, " ").slice(0, 48);
      const entry = { id: map.length, tag };
      if (field) entry.type = field;
      if (label) entry.label = label;
      if (tag === "a") {
        const href = (el.getAttribute("href") || "").split(/[?#]/)[0].slice(0, 48);
        if (href) entry.href = href;
      }
      if (tag === "select" && el.options) {
        entry.options = Array.from(el.options)
          .slice(0, 6)
          .map((option) => option.text.trim().slice(0, 24))
          .filter(Boolean);
      }
      if (field === "checkbox" || field === "radio") entry.checked = Boolean(el.checked);
      else if ((tag === "input" || tag === "textarea") && el.value) entry.value = String(el.value).slice(0, 40);
      map.push(entry);
      el.setAttribute("data-webmcp-id", String(entry.id));
    }
    return map;
  }

  function tell(type, data) {
    if (token) popup.postMessage({ type, token, ...data }, ORIGIN);
  }

  function act(action, targetId, value) {
    const id = Number(targetId);
    const el = Number.isInteger(id) ? document.querySelector(`[data-webmcp-id="${id}"]`) : null;
    if (!el) return { ok: false, error: `Control ${targetId} is no longer on the page.` };
    if (el.disabled) return { ok: false, error: "That control is disabled." };
    try {
      el.scrollIntoView({ block: "center" });
      if (action === "click") {
        try {
          el.focus({ preventScroll: true });
        } catch {}
        for (const type of ["pointerdown", "mousedown", "mouseup"]) {
          el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        }
        if (typeof el.click === "function") el.click();
        else el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        return { ok: true };
      }
      if (action === "type") {
        if (el.tagName === "SELECT") return { ok: false, error: "Use select for a dropdown." };
        el.focus({ preventScroll: true });
        const prototype = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setValue = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        if (setValue) setValue.call(el, String(value ?? ""));
        else el.value = String(value ?? "");
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return { ok: true };
      }
      if (action === "select") {
        if (el.tagName !== "SELECT") return { ok: false, error: "That control is not a dropdown." };
        el.focus({ preventScroll: true });
        const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
        if (setValue) setValue.call(el, String(value ?? ""));
        else el.value = String(value ?? "");
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return { ok: true };
      }
      return { ok: false, error: `Unsupported action: ${action}` };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
  }

  function onMessage(event) {
    if (event.origin !== ORIGIN || event.source !== popup) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "INIT_HANDSHAKE") {
      if (typeof data.token !== "string" || data.token.length < 16) return;
      token = data.token;
      halted = false;
      clearInterval(knock);
      knock = 0;
      // Reading the page's tools is async, so the map goes out with the answer.
      return readTools().then((pageTools) => {
        tell("HANDSHAKE_ACK", { title: document.title, url: location.href, domMap: build(), tools: pageTools });
      });
    }
    if (!token || data.token !== token) return;
    if (data.type === "HANDSHAKE_OK") {
      console.info("[WebMCP] Hub connected.");
      return;
    }
    if (data.type === "HALT") {
      halted = true;
      return;
    }
    if (data.type === "ARM") {
      halted = false;
      return;
    }
    if (data.type === "EXEC_TOOL") {
      const name = data.name;
      if (halted) {
        tell("TOOL_RESULT", { name, result: { ok: false, error: "The hub's kill switch is on." } });
        return;
      }
      return runTool(name, data.args).then((result) => tell("TOOL_RESULT", { name, result, domMap: build() }));
    }
    if (data.type === "EXEC_ACTION") {
      if (halted) {
        tell("ACTION_RESULT", {
          result: { ok: false, error: "The hub's kill switch is on." },
          domMap: map,
        });
        return;
      }
      const result = act(data.action, data.targetId, data.value);
      setTimeout(() => tell("ACTION_RESULT", { result, domMap: build() }), 450);
      return;
    }
    if (data.type === "REQUEST_DOM") tell("DOM_UPDATE", { domMap: build() });
  }

  function cleanup() {
    // An old pagehide or timer must not tear down a newer session's map.
    if (window.__WEBMCP_POPUP__ && window.__WEBMCP_POPUP__ !== popup) return;
    clearInterval(knock);
    clearInterval(timer);
    window.removeEventListener?.("message", onMessage);
    document.querySelectorAll("[data-webmcp-id]").forEach((el) => el.removeAttribute("data-webmcp-id"));
    delete window.__WEBMCP_ACTIVE__;
    delete window.__WEBMCP_POPUP__;
    delete window.__WEBMCP_STOP__;
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.webmcp = { build, act, onMessage, cleanup, readTools, runTool };
  }

  if (window.__WEBMCP_ACTIVE__) {
    const open = window.__WEBMCP_POPUP__;
    if (open && !open.closed) {
      open.focus();
      return;
    }
    // The hub window was closed while this tab was in the background, so its
    // own timer never ran. Reclaim the state and open a fresh hub rather than
    // dead-ending on a closed window.
    window.__WEBMCP_STOP__?.();
  }

  const left = Math.max(0, Math.round((screen.width - 580) / 2));
  const top = Math.max(0, Math.round((screen.height - 780) / 2));
  popup = window.open(HUB, "WebMCP_Hub", `popup=yes,width=580,height=780,left=${left},top=${top}`);
  if (!popup) {
    window.alert("[WebMCP] Allow pop-ups for this site, then click the bookmarklet again.");
    return;
  }
  window.__WEBMCP_ACTIVE__ = true;
  window.__WEBMCP_POPUP__ = popup;
  window.__WEBMCP_STOP__ = cleanup;

  window.addEventListener("message", onMessage);
  window.addEventListener("pagehide", () => {
    tell("TARGET_DISCONNECTED", {});
    cleanup();
  });
  // A named hub window can outlive the tab that opened it. Knocking lets the
  // rebuilt page reclaim that window without the user opening a second one.
  knock = setInterval(() => {
    if (popup.closed) return cleanup();
    if (!token && ++knocks <= 60) popup.postMessage({ type: "TARGET_HELLO" }, ORIGIN);
    else if (token || knocks > 60) clearInterval(knock);
  }, 700);
  timer = setInterval(() => {
    if (popup.closed) return cleanup();
  }, 2000);
})();
