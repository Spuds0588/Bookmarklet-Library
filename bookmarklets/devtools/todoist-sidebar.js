/**
 * @name 📋 Open Todoist on Page
 * @category devtools
 * @description Slides Todoist out from the right edge of the page you are on: framed in a drawer by default, then a floating picture-in-picture window, then a popup, and says plainly when a page will not allow the frame.
 * @tags todoist, task, todo, sidebar, drawer, iframe, picture-in-picture
 * @traits network, web-app
 * @added 2026-11-04
 * @featured false
 */
(() => {
  // Todoist is the one task manager that documents its app running signed in
  // inside a frame on another origin: its help centre adds `todoist.com/app`
  // to a Notion /embed block and signs in there. It also sends no
  // X-Frame-Options and no frame-ancestors, which was measured, so what blocks
  // the frame is the page's own CSP — or nothing at all.
  //
  // The same article names the other limit: a browser that blocks third-party
  // cookies "won't recognize you logging in to Todoist". A frame is a
  // third-party page to Todoist and always will be, which is why the popup
  // opens the app at its own URL instead of framing it: a window we open there
  // is a first-party page, so the session counts.
  const EMBED = "https://app.todoist.com/app/today";
  const ORIGIN = "https://app.todoist.com";
  // A page's `frame-src` refuses a frame silently, so the drawer gives up early
  // enough to leave time for a surface the user can see.
  const FRAME_MS = 12000;
  const POPUP = "popup,width=1020,height=780";

  const SURFACES = ["iframe", "float", "popup"];
  const PIP_OPTIONS = { width: 1000, height: 760 };
  // Long enough to cover the slide in the stylesheet below; a close that waits
  // for `transitionend` gets stuck if the sheet never loads.
  const DRAWER_MS = 260;
  const NOTE = "A frame is a third-party page to Todoist, so it only stays signed in where the browser allows third-party cookies. Popup opens Todoist itself, where it is first-party.";

  // The host owns the whole viewport so the drawer can sit at its edge, but it
  // swallows no clicks: the page underneath stays fully usable, which a scrim
  // would have taken away. This is the difference between a drawer and a modal.
  const HOST_STYLE = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";

  /** Which surfaces are worth trying, given what this browser offers. */
  const fallbackOrder = (caps = {}) => {
    const order = [];
    if (caps.documentPictureInPicture) order.push("float");
    if (caps.open !== false) order.push("popup");
    return order;
  };

  /** A violation only counts when it is a framing directive aimed at Todoist. */
  const blocksFrame = (violation = {}) => {
    const directive = String(violation.violatedDirective ?? "");
    const blocked = String(violation.blockedURI ?? "");
    return /^(frame-src|child-src|default-src)/i.test(directive) && /todoist\.com/i.test(blocked);
  };

  /** What the frame attempt produced: a refusal outranks a load that did arrive. */
  const frameVerdict = ({ loaded = false, violated = false } = {}) => (violated ? "blocked" : loaded ? "ready" : "pending");

  const el = (doc, tag, cls, text) => {
    const node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };

  const CSS = [
    ":host{all:initial}",
    ".drawer{position:absolute;top:0;right:0;bottom:0;display:flex;flex-direction:column;width:min(520px,100vw);border-left:1px solid #111;background:#fbfaf8;color:#111;font:13px/1.4 system-ui,-apple-system,sans-serif;box-shadow:-24px 0 48px rgba(17,17,17,.16);pointer-events:auto;outline:none;transform:translateX(100%);transition:transform 260ms cubic-bezier(.22,.61,.36,1)}",
    '.drawer[data-open="true"]{transform:translateX(0)}',
    "@media (prefers-reduced-motion:reduce){.drawer{transition:none}}",
    ".bar{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid #111}",
    ".name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".actions{display:flex;gap:6px;margin-left:auto}",
    ".status{margin:0;padding:7px 12px;border-bottom:1px solid #111;opacity:.75;font-size:12px}",
    ".status:empty{display:none}",
    "button{border:1px solid #111;background:#fbfaf8;color:#111;font:inherit;padding:5px 9px;cursor:pointer;white-space:nowrap}",
    "button:hover{background:#111;color:#fbfaf8}",
    "button[disabled]{opacity:.45;cursor:default}",
    "button[disabled]:hover{background:#fbfaf8;color:#111}",
    ".stage{flex:1;min-height:0;display:flex}",
    ".stage iframe{flex:1;width:100%;border:0;background:#fff}",
    ".note{margin:0;padding:7px 12px;border-top:1px solid #111;font-size:11px;line-height:1.4;opacity:.7}",
  ].join("\n");

  const EMBED_STYLE = "width:100%;height:100vh;border:0;background:#fff";

  // Todoist checks nothing about its ancestors itself, so the frame keeps the
  // browser's default referrer and security attributes.
  function makeFrame(doc, style) {
    const frame = doc.createElement("iframe");
    frame.src = EMBED;
    frame.title = "Todoist";
    frame.setAttribute("allow", "clipboard-write");
    if (style) frame.style.cssText = style;
    return frame;
  }

  function openSidebar() {
    const host = document.createElement("div");
    host.setAttribute("data-todoist-sidebar", "");
    host.style.cssText = HOST_STYLE;
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;

    const drawer = el(document, "div", "drawer");
    drawer.tabIndex = -1;
    drawer.setAttribute("role", "complementary");
    drawer.setAttribute("aria-label", "Todoist");
    drawer.dataset.open = "false";
    const bar = el(document, "div", "bar");
    const label = el(document, "span", "name", "Todoist");
    const actions = el(document, "div", "actions");
    const floatBtn = el(document, "button", "", "Float");
    const popupBtn = el(document, "button", "", "Popup");
    const closeBtn = el(document, "button", "", "Close");
    for (const button of [floatBtn, popupBtn, closeBtn]) button.type = "button";
    const status = el(document, "p", "status", "Opening Todoist…");
    const stage = el(document, "div", "stage");
    const note = el(document, "p", "note", NOTE);

    actions.append(floatBtn, popupBtn, closeBtn);
    bar.append(label, actions);
    drawer.append(bar, status, stage, note);
    root.append(style, drawer);
    document.documentElement.appendChild(host);

    // The drawer is appended off-screen and opened on the next frame, so the
    // transition has a start position to move from rather than snapping in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        drawer.dataset.open = "true";
        drawer.focus();
      });
    });

    // The page's CSP is what a frame runs into, and it reports itself here
    // rather than through the frame, which we can never inspect.
    const seen = { loaded: false, violated: false };
    let timer = 0;
    let closing = 0;

    const stopWatch = () => {
      clearTimeout(timer);
      document.removeEventListener("securitypolicyviolation", onViolation);
    };

    // Closing slides the drawer out and only then unmounts it, so the host is
    // not torn away mid-animation. A second close while closing is a no-op.
    const closeAll = () => {
      if (closing) return;
      stopWatch();
      drawer.dataset.open = "false";
      closing = setTimeout(() => host.remove(), DRAWER_MS);
    };

    const blocked = async () => {
      stopWatch();
      status.textContent = "This page blocks the frame — use Float or Popup.";
      // A timeout-driven attempt has no user gesture, so Chrome usually refuses
      // both; each one that is refused leaves the buttons as the way through.
      const order = fallbackOrder({
        documentPictureInPicture: Boolean(window.documentPictureInPicture),
        open: typeof window.open === "function",
      });
      for (const surface of order) {
        if (surface === "float" && (await tryFloat())) return;
        if (surface === "popup" && tryPopup()) return;
      }
    };

    function onViolation(event) {
      if (!blocksFrame({ violatedDirective: event.violatedDirective, blockedURI: event.blockedURI })) return;
      seen.violated = true;
      if (frameVerdict(seen) === "blocked") blocked();
    }

    const settle = () => {
      seen.loaded = true;
      if (frameVerdict(seen) === "ready") {
        stopWatch();
        status.textContent = "";
      }
    };

    const tryFloat = async () => {
      const pip = window.documentPictureInPicture;
      if (!pip || typeof pip.requestWindow !== "function") {
        status.textContent = "This browser has no floating window support.";
        return false;
      }
      let win;
      try {
        win = await pip.requestWindow(PIP_OPTIONS);
      } catch {
        status.textContent = "The floating window needs a click on Float.";
        return false;
      }
      win.document.body.style.cssText = "margin:0;height:100vh;background:#fbfaf8";
      const frame = makeFrame(win.document, EMBED_STYLE);
      win.document.body.append(frame);
      win.addEventListener("pagehide", () => {
        status.textContent = "Floating window closed.";
      });
      status.textContent = "Loading in a floating window…";
      const ok = await new Promise((resolve) => {
        const stop = setTimeout(() => resolve(false), FRAME_MS);
        frame.addEventListener("load", () => {
          clearTimeout(stop);
          resolve(true);
        });
      });
      if (ok) {
        status.textContent = "";
        return true;
      }
      status.textContent = "The floating window could not load Todoist.";
      try {
        win.close();
      } catch {
        /* already gone */
      }
      return false;
    };

    const tryPopup = () => {
      // Opened at Todoist's own URL, not an about:blank document holding a
      // frame: that is what makes the session first-party, and it is the only
      // surface here where the signed-in app is guaranteed to be the app.
      const win = window.open(EMBED, "todoist-sidebar", POPUP);
      if (!win) {
        status.textContent = "The browser blocked the window — allow popups here.";
        return false;
      }
      status.textContent = "Opened Todoist in its own window.";
      return true;
    };

    floatBtn.addEventListener("click", () => {
      floatBtn.disabled = true;
      tryFloat().finally(() => {
        floatBtn.disabled = false;
      });
    });
    popupBtn.addEventListener("click", () => {
      popupBtn.disabled = true;
      tryPopup();
      popupBtn.disabled = false;
    });
    closeBtn.addEventListener("click", closeAll);
    drawer.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAll();
    });

    const frame = makeFrame(document);
    frame.addEventListener("load", settle);
    stage.append(frame);
    document.addEventListener("securitypolicyviolation", onViolation);
    timer = setTimeout(() => {
      if (frameVerdict(seen) !== "ready") blocked();
    }, FRAME_MS);

    return { host, drawer, closeAll, status, tryFloat, tryPopup, frame };
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.todoistSidebar = {
      fallbackOrder,
      blocksFrame,
      frameVerdict,
      openSidebar,
      EMBED,
      ORIGIN,
      SURFACES,
      FRAME_MS,
      POPUP,
      NOTE,
      CSS,
      HOST_STYLE,
      DRAWER_MS,
    };
  } else if (document?.body) {
    openSidebar();
  }
})();
