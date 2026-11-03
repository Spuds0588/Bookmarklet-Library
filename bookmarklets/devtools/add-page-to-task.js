/**
 * @name 📝 Add page to a task
 * @category devtools
 * @description Files the page you are on as a new card, issue or task in Trello, Linear, GitHub, GitLab or Things, with the title, the URL and any selection already filled in.
 * @tags task, todo, issue, trello, linear, github, gitlab, things, capture
 * @traits network, web-app
 * @added 2026-11-03
 * @featured false
 */
(() => {
  // Every one of these services refuses to be framed — Trello answers
  // X-Frame-Options: DENY, GitHub deny, Linear, GitLab, Asana and Notion
  // SAMEORIGIN, ClickUp a frame-ancestors list — so a modal cannot show their
  // form. The modal is our own, and the service is opened in a window we own,
  // where its cookies and its session are first-party and it works.
  const POPUP = "popup,width=1020,height=780";
  const TITLE_MAX = 240;

  const clip = (text, limit = TITLE_MAX) => {
    const value = String(text ?? "")
      .replace(/\s+/g, " ")
      .trim();
    return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
  };

  const enc = encodeURIComponent;

  /** The repository the page is already in, for the two trackers that live in one. */
  const repoFrom = (href) => {
    let url;
    try {
      url = new URL(href);
    } catch {
      return null;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.hostname === "github.com" && parts.length >= 2) return { host: "github", path: `${parts[0]}/${parts[1]}` };
    if (url.hostname === "gitlab.com" && parts.length >= 2) {
      // Subgroups are part of the project path: everything before /-/ is it.
      const dash = parts.indexOf("-");
      const path = (dash === -1 ? parts : parts.slice(0, dash)).join("/");
      return path.split("/").length >= 2 ? { host: "gitlab", path } : null;
    }
    return null;
  };

  /** The URL goes into the body because only Trello and Things have a field for it. */
  const bodyFor = (values) => [String(values.note ?? "").trim(), String(values.url ?? "").trim()].filter(Boolean).join("\n\n");

  const DESTINATIONS = [
    { id: "trello", label: "Trello", hint: "add-card window" },
    { id: "linear", label: "Linear", hint: "new issue" },
    { id: "github", label: "GitHub", hint: "issue in this repo" },
    { id: "gitlab", label: "GitLab", hint: "issue in this project" },
    { id: "things", label: "Things", hint: "opens the app" },
  ];

  function taskUrl(destination, values, repo = null) {
    const title = clip(values.title);
    const body = bodyFor(values);
    switch (destination) {
      case "trello":
        return `https://trello.com/add-card?mode=popup&url=${enc(values.url)}&name=${enc(title)}&desc=${enc(body)}`;
      case "linear":
        return `https://linear.new?title=${enc(title)}&description=${enc(body)}`;
      case "github":
        return repo && repo.host === "github"
          ? `https://github.com/${repo.path}/issues/new?title=${enc(title)}&body=${enc(body)}`
          : null;
      case "gitlab":
        return repo && repo.host === "gitlab"
          ? `https://gitlab.com/${repo.path}/-/issues/new?issue[title]=${enc(title)}&issue[description]=${enc(body)}`
          : null;
      case "things":
        return `things:///add?title=${enc(title)}&notes=${enc(body)}`;
      default:
        return null;
    }
  }

  /** A custom scheme has to be handed to the operating system, not opened as a page. */
  const isAppScheme = (url) => /^[a-z][a-z0-9+.-]*:/i.test(url) && !/^https?:/i.test(url);

  function handOver(url, name) {
    if (isAppScheme(url)) {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.style.display = "none";
      (document.body || document.documentElement).appendChild(anchor);
      anchor.click();
      anchor.remove();
      return "app";
    }
    return window.open(url, name, POPUP) ? "popup" : "blocked";
  }

  const CSS = [
    ".card{display:flex;flex-direction:column;width:min(560px,100%);max-height:86vh;border:1px solid #111;background:#fbfaf8;color:#111;font:13px/1.45 system-ui,-apple-system,sans-serif;outline:none}",
    ".bar{display:flex;gap:10px;align-items:center;padding:10px 12px;border-bottom:1px solid #111}",
    ".name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46%}",
    ".status{margin-left:auto;opacity:.75;text-align:right;max-width:44%}",
    ".body{display:flex;flex-direction:column;gap:12px;padding:14px;overflow:auto}",
    ".field{display:flex;flex-direction:column;gap:4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.72}",
    "input,textarea{font:13px/1.45 system-ui,-apple-system,sans-serif;color:#111;background:#fff;border:1px solid #111;padding:7px 8px;width:100%;box-sizing:border-box}",
    "textarea{min-height:76px;resize:vertical}",
    ".targets{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:8px}",
    ".targets button{text-align:left;padding:8px 10px}",
    ".targets small{display:block;font-size:11px;opacity:.65}",
    "button{border:1px solid #111;background:#fbfaf8;color:#111;font:inherit;cursor:pointer;padding:6px 10px}",
    "button:hover{background:#111;color:#fbfaf8}",
    "button[disabled]{opacity:.45;cursor:default}",
    "button[disabled]:hover{background:#fbfaf8;color:#111}",
    ".hint{margin:0;font-size:11px;opacity:.65}",
  ].join("\n");

  /**
   * One builder for both documents: the modal renders it in a shadow root, the
   * floating window in a plain document, so the two cannot drift apart.
   */
  function buildForm(doc, values, handlers) {
    const el = (tag, cls, text) => {
      const node = doc.createElement(tag);
      if (cls) node.className = cls;
      if (text) node.textContent = text;
      return node;
    };

    const card = el("div", "card");
    card.tabIndex = -1;
    const bar = el("div", "bar");
    const name = el("span", "name", "Add page to a task");
    const status = el("span", "status", "Pick a destination");
    const floatBtn = handlers.onFloat ? el("button", "", "Float") : null;
    const closeBtn = el("button", "", "Close");
    for (const button of [floatBtn, closeBtn].filter(Boolean)) button.type = "button";
    bar.append(name, status, ...[floatBtn, closeBtn].filter(Boolean));

    const body = el("div", "body");
    const field = (labelText, node) => {
      const wrap = el("label", "field", labelText);
      wrap.append(node);
      return wrap;
    };

    const titleInput = doc.createElement("input");
    titleInput.type = "text";
    titleInput.value = values.title;
    titleInput.setAttribute("aria-label", "Task title");

    const urlInput = doc.createElement("input");
    urlInput.type = "text";
    urlInput.value = values.url;
    urlInput.readOnly = true;
    urlInput.setAttribute("aria-label", "Page URL");

    const noteInput = doc.createElement("textarea");
    noteInput.value = values.note;
    noteInput.setAttribute("aria-label", "Note");

    const targets = el("div", "targets");
    const repo = repoFrom(values.url);
    for (const destination of DESTINATIONS) {
      // GitHub and GitLab only make sense from inside a repo, so they are not
      // offered where the URL gives no project to file against.
      if ((destination.id === "github" || destination.id === "gitlab") && repo?.host !== destination.id) continue;
      const button = el("button", "");
      button.type = "button";
      button.dataset.target = destination.id;
      button.append(el("span", "", destination.label), el("small", "", destination.hint));
      button.addEventListener("click", () => handlers.onSend(destination, { title: titleInput.value, url: urlInput.value, note: noteInput.value }));
      targets.append(button);
    }

    body.append(
      field("Title", titleInput),
      field("Page", urlInput),
      field("Note", noteInput),
      targets,
      el("p", "hint", "The service opens in its own window: every one of them refuses to be framed, and there its own session counts."),
    );
    card.append(bar, body);

    card.addEventListener("keydown", (event) => {
      if (event.key === "Escape") handlers.onClose();
    });
    closeBtn.addEventListener("click", handlers.onClose);
    if (floatBtn) {
      floatBtn.addEventListener("click", () => {
        floatBtn.disabled = true;
        Promise.resolve(handlers.onFloat())
          .catch(() => {})
          .finally(() => {
            floatBtn.disabled = false;
          });
      });
    }

    return { card, status, titleInput, noteInput };
  }

  function openPanel() {
    const values = {
      title: clip(document.title) || location.hostname,
      url: location.href,
      note: clip(String(window.getSelection?.() ?? ""), 1200),
    };

    const host = document.createElement("div");
    host.setAttribute("data-add-page-to-task", "");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = [
      ":host{all:initial}",
      ".scrim{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(17,17,17,.55)}",
      CSS,
    ].join("\n");

    const scrim = document.createElement("div");
    scrim.className = "scrim";

    const close = () => host.remove();

    const send = (destination, current) => {
      const url = taskUrl(destination.id, current, repoFrom(current.url));
      if (!url) {
        form.status.textContent = `${destination.label} needs a repository page.`;
        return;
      }
      form.status.textContent = `Opening ${destination.label}…`;
      const how = handOver(url, `add-page-to-task-${destination.id}`);
      if (how === "blocked") form.status.textContent = "The browser blocked the window — allow popups here.";
      else if (how === "app") form.status.textContent = `Handed the task to ${destination.label}.`;
      else form.status.textContent = `Opened ${destination.label} — confirm the task there.`;
    };

    const float = async () => {
      const pip = window.documentPictureInPicture;
      if (!pip || typeof pip.requestWindow !== "function") {
        form.status.textContent = "This browser has no floating window support.";
        return;
      }
      let win;
      try {
        win = await pip.requestWindow({ width: 460, height: 560 });
      } catch {
        // Document PiP needs a live user gesture; a fallback has none, the button does.
        form.status.textContent = "The floating window was refused.";
        return;
      }
      win.document.title = "Add page to a task";
      const pipStyle = win.document.createElement("style");
      pipStyle.textContent = `body{margin:0;background:#fbfaf8;color:#111}${CSS}`;
      win.document.head.append(pipStyle);
      const floating = buildForm(win.document, {
        title: form.titleInput.value,
        url: values.url,
        note: form.noteInput.value,
      }, {
        onClose: () => {
          try {
            win.close();
          } catch {
            /* already gone */
          }
        },
        onSend: (destination, current) => {
          const url = taskUrl(destination.id, current, repoFrom(current.url));
          if (!url) return;
          floating.status.textContent = `Opening ${destination.label}…`;
          handOver(url, `add-page-to-task-${destination.id}`);
          floating.status.textContent = `Opened ${destination.label}.`;
        },
      });
      win.document.body.append(floating.card);
      win.addEventListener("pagehide", () => {
        form.status.textContent = "Floating form closed.";
      });
      form.status.textContent = "Form is floating.";
    };

    const form = buildForm(document, values, { onClose: close, onFloat: float, onSend: send });
    scrim.append(form.card);
    root.append(style, scrim);
    document.documentElement.appendChild(host);
    form.card.focus();

    return { host, close, form };
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.addPageToTask = {
      taskUrl,
      repoFrom,
      bodyFor,
      clip,
      isAppScheme,
      DESTINATIONS,
      TITLE_MAX,
    };
  } else if (document?.body) {
    openPanel();
  }
})();
