import { DECISION_SCHEMA } from "./protocol.js";

export const MODELS = Object.freeze([
  { id: "SmolLM2-360M-Instruct-q4f16_1-MLC", label: "SmolLM2 360M" },
  { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 0.5B" },
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B" },
]);

export const SYSTEM_PROMPT = `You control one browser tab through a numbered list of visible controls.
Answer with exactly one JSON object in one line: no prose, no markdown, no code fences.
Click: {"action":"click","id":3}
Type: {"action":"type","id":0,"value":"search text"}
Choose: {"action":"select","id":2,"value":"option label"}
Finish: {"action":"done","summary":"what changed"}
Rules: one action per turn. Use only ids from Controls. Never invent ids, selectors, URLs or code. Match the control whose label fits the task. If the task is already done, or cannot be done with these controls, use done. Do not repeat a move that already failed.`;

const clean = (value, limit) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);

function pathOf(url) {
  try {
    return new URL(url).pathname.slice(0, 80) || "/";
  } catch {
    return "/";
  }
}

// The prompt is deliberately small: the map is already bounded by the
// injector, and only the last few moves are repeated back to the model.
export function buildPrompt({ task, title, url, domMap, step, maxSteps, history = [], correction = "" }) {
  const controls = Array.isArray(domMap) ? domMap : [];
  const lines = [
    `Task: ${clean(task, 320)}`,
    `Page: ${clean(title, 80)} — ${pathOf(url)}`,
    `Step: ${step} of ${maxSteps}`,
    `Controls: ${JSON.stringify(controls)}`,
  ];
  if (history.length) lines.push(`Recent moves: ${history.slice(-4).join(" | ")}`);
  if (correction) lines.push(`Your last reply was rejected: ${clean(correction, 120)}. Fix it.`);
  lines.push("Reply with one JSON action now.");
  return lines.join("\n");
}

export function detectEngines(scope = globalThis) {
  const builtIn = scope.LanguageModel ?? scope.ai?.languageModel ?? null;
  return {
    builtIn: Boolean(builtIn),
    webgpu: Boolean(scope.navigator?.gpu),
    models: MODELS,
  };
}

function builtInApi(scope = globalThis) {
  return scope.LanguageModel ?? scope.ai?.languageModel ?? null;
}

// navigator.gpu can exist in a browser that has no usable adapter (Electron
// builds and some headless profiles do). Ask for one before offering WebLLM,
// or the first model download ends in a failure.
export async function hasWebGpuAdapter(scope = globalThis) {
  const gpu = scope.navigator?.gpu;
  if (!gpu?.requestAdapter) return false;
  try {
    return Boolean(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

export async function builtInAvailability(scope = globalThis) {
  const api = builtInApi(scope);
  if (!api) return "unavailable";
  try {
    if (typeof api.availability === "function") return await api.availability();
    if (typeof api.capabilities === "function") {
      const capabilities = await api.capabilities();
      if (capabilities?.available === "no") return "unavailable";
      if (capabilities?.available === "after-download") return "downloadable";
    }
    return "available";
  } catch {
    return "unavailable";
  }
}

export async function createBuiltInEngine(onProgress, scope = globalThis) {
  const api = builtInApi(scope);
  if (!api) throw new Error("Chrome's built-in model is not available here.");
  const availability = await builtInAvailability(scope);
  if (availability === "unavailable") throw new Error("Chrome's built-in model is not available on this device.");
  const monitor = (sessionMonitor) => {
    sessionMonitor.addEventListener("downloadprogress", (event) => {
      onProgress?.({ text: "Downloading the built-in model", progress: event.loaded });
    });
  };
  // Preparing a downloadable model has to do the download now; otherwise the
  // button would look finished and the first Run would stall on it.
  if (availability !== "available") {
    const warm = await api.create({ temperature: 0.1, topK: 1, monitor });
    try {
      warm.destroy?.();
    } catch {}
  }
  return {
    kind: "builtin",
    label: "Chrome built-in AI",
    // A fresh session per turn keeps the small context window from filling
    // with the previous prompts; the downloaded weights stay cached.
    async complete(prompt, { signal } = {}) {
      const session = await api.create({
        temperature: 0.1,
        topK: 1,
        monitor,
      });
      try {
        const options = signal ? { signal } : {};
        try {
          return await session.prompt(prompt, { ...options, responseConstraint: DECISION_SCHEMA });
        } catch (error) {
          const message = String(error?.message || error);
          if (/constraint|schema|unsupported|not supported/i.test(message)) {
            return await session.prompt(prompt, options);
          }
          throw error;
        }
      } finally {
        try {
          session.destroy?.();
        } catch {}
      }
    },
    destroy() {},
  };
}

export async function createWebLLMEngine(modelId, onProgress, scope = globalThis) {
  if (!(await hasWebGpuAdapter(scope))) throw new Error("WebGPU is present but did not return an adapter.");
  if (!MODELS.some((model) => model.id === modelId)) throw new Error(`Unknown model: ${modelId}.`);
  const webllm = await import("https://esm.run/@mlc-ai/web-llm");
  const listed = webllm.prebuiltAppConfig?.model_list?.some((model) => model.model_id === modelId);
  if (webllm.prebuiltAppConfig && !listed) throw new Error(`WebLLM does not offer ${modelId}.`);
  const engine = await webllm.CreateMLCEngine(modelId, {
    initProgressCallback: (report) => onProgress?.({ text: report.text || "Loading model", progress: report.progress }),
  });
  return {
    kind: "webllm",
    label: modelId.replace(/-Instruct.*$/, ""),
    async complete(prompt) {
      const reply = await engine.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 140,
      });
      const content = reply?.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new Error("The model returned no text.");
      return content;
    },
    destroy() {
      try {
        engine.unload?.();
      } catch {}
    },
  };
}
