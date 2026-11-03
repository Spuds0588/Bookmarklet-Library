// The hub and its tests share these limits. The injector has its own small
// copy of the map limit because it is shipped as a bookmarklet.
export const LIMITS = Object.freeze({
  nodes: 30,
  label: 48,
  text: 2000,
  summary: 240,
  steps: 5,
  maxSteps: 12,
  tools: 12,
  toolArgs: 600,
  actionWaitMs: 6000,
  handshakeMs: 15000,
  logEntries: 200,
});

export const ACTIONS = Object.freeze(["click", "type", "select", "tool", "done"]);

export const DECISION_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    action: { type: "string", enum: ACTIONS },
    id: { type: "integer", minimum: 0 },
    value: { type: "string" },
    name: { type: "string" },
    args: { type: "object" },
    summary: { type: "string" },
  },
  required: ["action"],
  additionalProperties: false,
});

export function makeToken(crypto = globalThis.crypto) {
  if (!crypto?.getRandomValues) throw new Error("This browser cannot generate a session token.");
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Models wrap JSON in prose and fences. Take the one object they meant, then
// validate every field instead of trusting it.
export function parseDecision(raw, mapLength) {
  if (typeof raw !== "string") return { ok: false, error: "The model returned no text." };
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { ok: false, error: "No JSON object in the reply." };
  let data;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { ok: false, error: "The reply was not valid JSON." };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "The reply was not a JSON object." };
  }
  const action = String(data.action ?? "").toLowerCase();
  if (!ACTIONS.includes(action)) return { ok: false, error: `Unknown action: ${action || "(none)"}.` };
  if (action === "done") {
    const summary = String(data.summary ?? "").trim().replace(/\s+/g, " ").slice(0, LIMITS.summary);
    return { ok: true, decision: { action, summary: summary || "Task finished." } };
  }
  // A page that publishes WebMCP tools gets called by name instead of by id, so
  // this branch runs before any control id is checked against the map.
  if (action === "tool") {
    const name = String(data.name ?? "").trim();
    if (!/^[A-Za-z0-9_.-]{1,64}$/.test(name)) {
      return { ok: false, error: "tool needs the exact name of a listed tool." };
    }
    if (data.args !== undefined && (typeof data.args !== "object" || data.args === null || Array.isArray(data.args))) {
      return { ok: false, error: "tool args must be a JSON object." };
    }
    const args = data.args ?? {};
    if (JSON.stringify(args).length > LIMITS.toolArgs) {
      return { ok: false, error: `tool args are longer than ${LIMITS.toolArgs} characters.` };
    }
    return { ok: true, decision: { action, name, args } };
  }
  const id = Number(data.id);
  if (!Number.isInteger(id) || id < 0 || id >= mapLength) {
    return { ok: false, error: `Control id must be one of 0–${Math.max(0, mapLength - 1)}.` };
  }
  if (action === "click") return { ok: true, decision: { action, id } };
  if (typeof data.value !== "string") return { ok: false, error: `${action} needs a text value.` };
  return { ok: true, decision: { action, id, value: data.value.slice(0, LIMITS.text) } };
}
