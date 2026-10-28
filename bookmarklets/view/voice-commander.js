/**
 * @name 🎙️ Voice Macro Commander
 * @category view
 * @description Listen for spoken page commands such as scroll, submit, clear and refresh, with a small status badge.
 * @tags voice, speech, commands, accessibility, scroll, submit
 * @added 2026-10-28
 * @featured false
 */
(() => {
  try { window.__blVoiceClose?.(); } catch {}
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    alert("This browser has no speech recognition. Chrome and Edge provide it; Firefox and Safari do not.");
    return;
  }

  const ID = "bl-voice-commander";
  document.getElementById(ID)?.remove();
  const host = document.createElement("div");
  host.id = ID;
  host.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:2147483647";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host{color-scheme:light dark;font:13px/1.4 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
    *{box-sizing:border-box}
    .badge{width:min(330px,calc(100vw - 36px));padding:12px 13px;background:#111;color:#f5f5f5;border:1px solid #f5f5f5;box-shadow:0 12px 36px rgba(0,0,0,.32)}
    @media(prefers-color-scheme:dark){.badge{background:#f5f5f5;color:#111;border-color:#111}}
    .head{display:flex;align-items:center;gap:8px}
    .dot{width:7px;height:7px;flex:none;border-radius:50%;background:#b8860b}
    .dot[data-state=listening]{background:#38d47a}
    .dot[data-state=error]{background:#ff6b6b}
    .title{font:600 11px/1.2 ui-sans-serif,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;flex:1}
    button{border:0;background:transparent;color:inherit;cursor:pointer}
    .close{font-size:18px;line-height:1;padding:0 2px;opacity:.7}.close:hover{opacity:1}
    .status{margin:7px 0 0;font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;opacity:.76}
    .heard{margin:5px 0 0;min-height:16px;font-size:12px;opacity:.9;overflow-wrap:anywhere}
    .commands{margin:7px 0 0;font:9.5px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;opacity:.55;letter-spacing:.02em}
    .toggle{margin-top:8px;padding:5px 8px;border:1px solid currentColor;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;opacity:.85}.toggle:hover{opacity:1}
  </style>
  <div class="badge" role="region" aria-label="Voice commander">
    <div class="head"><span class="dot" data-state="listening"></span><span class="title">Voice commander</span><button class="close" type="button" aria-label="Close">×</button></div>
    <p class="status" aria-live="polite">Starting the microphone…</p>
    <p class="heard" aria-live="polite"></p>
    <p class="commands">scroll down · scroll up · top · bottom · submit · clear · refresh</p>
    <button class="toggle" type="button">Pause</button>
  </div>`;
  const dot = root.querySelector(".dot");
  const status = root.querySelector(".status");
  const heard = root.querySelector(".heard");
  const toggle = root.querySelector(".toggle");
  let recognition = null;
  let listening = false;
  let closed = false;
  let restartTimer = 0;

  const setStatus = (text, state = "listening") => {
    status.textContent = text;
    dot.dataset.state = state;
  };
  const clear = () => {
    const active = document.activeElement;
    const field = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA") ? active : null;
    if (!field) {
      heard.textContent = "Focus a text field first, then say clear.";
      return;
    }
    field.value = "";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    heard.textContent = "Cleared the focused field.";
  };
  const submit = () => {
    const active = document.activeElement;
    const form = active?.form || document.querySelector("form");
    if (!form) {
      heard.textContent = "No form on this page.";
      return;
    }
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.submit();
    heard.textContent = "Submitted the form.";
  };
  const run = (command) => {
    const text = command.toLowerCase().replace(/[.!?,;:]+/g, " ").replace(/\s+/g, " ").trim();
    if (!text) return;
    if (/\b(close|stop|pause)\b/.test(text)) {
      stop();
      heard.textContent = "Listening paused.";
      return;
    }
    if (/\bscroll down\b|\bpage down\b/.test(text)) {
      window.scrollBy({ top: Math.round(window.innerHeight * 0.8), behavior: "smooth" });
    } else if (/\bscroll up\b|\bpage up\b/.test(text)) {
      window.scrollBy({ top: -Math.round(window.innerHeight * 0.8), behavior: "smooth" });
    } else if (/\bscroll to top\b|\bgo to top\b|\btop of page\b|\btop\b/.test(text)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (/\bscroll to bottom\b|\bgo to bottom\b|\bbottom of page\b|\bbottom\b/.test(text)) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    } else if (/\bsubmit\b/.test(text)) {
      submit();
      return;
    } else if (/\bclear\b/.test(text)) {
      clear();
      return;
    } else if (/\b(refresh|reload)\b/.test(text)) {
      location.reload();
      return;
    } else {
      heard.textContent = `Heard “${text}” — no matching command.`;
      return;
    }
    heard.textContent = `Ran “${text}”.`;
  };

  const stop = () => {
    listening = false;
    clearTimeout(restartTimer);
    toggle.textContent = "Start";
    setStatus("Paused. The microphone is off.", "idle");
    try { recognition?.stop(); } catch {}
  };
  const start = () => {
    if (closed || !recognition) return;
    listening = true;
    toggle.textContent = "Pause";
    setStatus("Listening…", "listening");
    try {
      recognition.start();
    } catch (error) {
      // Chrome throws InvalidStateError when start() is called twice.
      if (error?.name !== "InvalidStateError") {
        listening = false;
        setStatus("The microphone could not start.", "error");
      }
    }
  };
  const close = () => {
    closed = true;
    stop();
    try { recognition?.abort(); } catch {}
    root.removeEventListener("keydown", onKey);
    document.removeEventListener("keydown", onKey, true);
    host.remove();
    if (window.__blVoiceClose === close) window.__blVoiceClose = null;
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  try {
    recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.onstart = () => {
      if (listening) setStatus("Listening…", "listening");
    };
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim() ?? "";
        if (!transcript) continue;
        if (result.isFinal) run(transcript);
        else interim += transcript + " ";
      }
      if (interim) heard.textContent = `“${interim.trim()}…”`;
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted") return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        listening = false;
        toggle.textContent = "Start";
        setStatus("Microphone permission was denied. Allow it in the site settings, then press Start.", "error");
        return;
      }
      if (event.error === "no-speech" || event.error === "audio-capture") setStatus("Listening… (no speech yet)", "listening");
      else setStatus(`Speech error: ${event.error}`, "error");
    };
    recognition.onend = () => {
      if (!listening || closed) return;
      restartTimer = setTimeout(() => {
        if (!listening || closed) return;
        try { recognition.start(); } catch {}
      }, 300);
    };
  } catch (error) {
    setStatus(`Speech recognition is unavailable: ${error.message}`, "error");
  }

  root.querySelector(".close").addEventListener("click", close);
  toggle.addEventListener("click", () => (listening ? stop() : start()));
  root.addEventListener("keydown", onKey);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("pagehide", close, { once: true });
  window.__blVoiceClose = close;
  (document.body || document.documentElement).appendChild(host);
  start();
})();
