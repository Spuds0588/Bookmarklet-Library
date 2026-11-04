/**
 * @name 📌 Task bookmarklet builder
 * @category devtools
 * @description Turns a board, repository, project or list URL into a personal bookmarklet that files the current page there, through the service's own prefilled link or its open API with your token.
 * @tags task, todo, builder, generator, trello, github, gitlab, todoist, clickup, asana
 * @traits network, web-app
 * @added 2026-11-04
 * @featured false
 */
(() => {
  // Some services publish a create link that takes query parameters, and those
  // need nothing but an id. The rest publish no link at all but do have an open
  // API — Todoist, ClickUp and Asana — so the only way in is a request carrying
  // a token. A token cannot be kept for them by a shared bookmarklet: storage is
  // per-origin, so the token you save on one site is invisible on the next. The
  // token is baked into a bookmarklet for one person instead, which is what this
  // builder produces.
  const POPUP = "popup,width=1020,height=780";
  const PREAMBLE =
    'const t=document.title.replace(/\\s+/g," ").trim(),u=location.href,n=(window.getSelection()||"").toString().replace(/\\s+/g," ").trim(),d=(n?n+"\\n\\n":"")+u;';

  const SERVICES = {
    trello: { label: "Trello", needsToken: false, place: "board" },
    github: { label: "GitHub", needsToken: false, place: "repository" },
    gitlab: { label: "GitLab", needsToken: false, place: "project" },
    todoist: { label: "Todoist", needsToken: true, place: "project" },
    clickup: { label: "ClickUp", needsToken: true, place: "list" },
    asana: { label: "Asana", needsToken: true, place: "project" },
  };

  const q = (value) => JSON.stringify(String(value));

  /** Reads the id a service needs out of a URL you already have in your address bar. */
  function parseTarget(input) {
    const raw = String(input ?? "").trim();
    if (!raw) return null;
    let url;
    try {
      url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
      return null;
    }
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const parts = url.pathname.split("/").filter(Boolean);
    const found = (service, id) => ({
      service,
      id,
      label: SERVICES[service].label,
      place: SERVICES[service].place,
      needsToken: SERVICES[service].needsToken,
      href: url.href,
    });

    if (host === "trello.com") {
      const match = url.pathname.match(/^\/b\/([^/]+)/);
      return match ? found("trello", match[1]) : null;
    }
    if (host === "github.com") {
      return parts.length >= 2 ? found("github", `${parts[0]}/${parts[1].replace(/\.git$/, "")}`) : null;
    }
    if (host === "gitlab.com") {
      // Subgroups are part of the project path; /-/ marks where the project ends.
      const dash = parts.indexOf("-");
      const path = (dash === -1 ? parts : parts.slice(0, dash)).join("/");
      return path.split("/").length >= 2 ? found("gitlab", path) : null;
    }
    if (host === "app.todoist.com" || host === "todoist.com") {
      const match = url.pathname.match(/\/project\/(?:.*-)?(\d+)\/?$/);
      return match ? found("todoist", match[1]) : null;
    }
    if (host === "app.clickup.com") {
      const match = url.pathname.match(/^\/\d+\/v\/li\/([\w-]+)\/?$/);
      return match ? found("clickup", match[1]) : null;
    }
    if (host === "app.asana.com") {
      const match = url.pathname.match(/^\/0\/(\d+)/);
      return match ? found("asana", match[1]) : null;
    }
    return null;
  }

  const opener = (urlExpr, name) =>
    `(()=>{${PREAMBLE}window.open(${urlExpr},"${name}","${POPUP}")})()`;

  const poster = (target, tokenExpr, urlExpr, bodyExpr) =>
    `(()=>{${PREAMBLE}fetch(${urlExpr},{method:"POST",headers:{Authorization:${tokenExpr},"Content-Type":"application/json"},body:JSON.stringify(${bodyExpr})}).then(r=>r.ok?alert("Added to ${target.label}"):alert("${target.label} said "+r.status)).catch(e=>alert("${target.label}: "+e.message))})()`;

  function bookmarkletFor(target, token = "") {
    if (!target) throw new Error("Paste a board, repository, project or list URL first.");
    const service = SERVICES[target.service];
    const secret = String(token ?? "").trim();
    if (service.needsToken && !secret) throw new Error(`${service.label} needs an API token.`);
    const id = q(target.id);
    let source;

    if (target.service === "trello") {
      source = opener(
        `"https://trello.com/add-card?mode=popup&idBoard="+${id}+"&url="+encodeURIComponent(u)+"&name="+encodeURIComponent(t)+"&desc="+encodeURIComponent(d)`,
        "add-to-trello",
      );
    } else if (target.service === "github") {
      source = opener(
        `"https://github.com/"+${id}+"/issues/new?title="+encodeURIComponent(t)+"&body="+encodeURIComponent(d)`,
        "add-to-github",
      );
    } else if (target.service === "gitlab") {
      source = opener(
        `"https://gitlab.com/"+${id}+"/-/issues/new?issue[title]="+encodeURIComponent(t)+"&issue[description]="+encodeURIComponent(d)`,
        "add-to-gitlab",
      );
    } else if (target.service === "todoist") {
      source = poster(target, `"Bearer "+${q(secret)}`, '"https://api.todoist.com/api/v1/tasks"', `{content:t,description:d,project_id:${id}}`);
    } else if (target.service === "clickup") {
      source = poster(
        target,
        q(secret),
        `"https://api.clickup.com/api/v2/list/"+${id}+"/task"`,
        "{name:t,description:d}",
      );
    } else if (target.service === "asana") {
      source = poster(target, `"Bearer "+${q(secret)}`, '"https://app.asana.com/api/1.0/tasks"', `{data:{name:t,notes:d,projects:[${id}]}}`);
    } else {
      throw new Error("That destination is not supported.");
    }

    return `javascript:${source}`;
  }

  const CSS = [
    ".card{display:flex;flex-direction:column;width:min(620px,100%);max-height:88vh;border:1px solid #111;background:#fbfaf8;color:#111;font:13px/1.45 system-ui,-apple-system,sans-serif;outline:none}",
    ".bar{display:flex;gap:10px;align-items:center;padding:10px 12px;border-bottom:1px solid #111}",
    ".name{font-weight:600}",
    ".status{margin-left:auto;opacity:.75;text-align:right;max-width:50%}",
    ".body{display:flex;flex-direction:column;gap:12px;padding:14px;overflow:auto}",
    ".field{display:flex;flex-direction:column;gap:4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.72}",
    "input{font:13px/1.45 system-ui,-apple-system,sans-serif;color:#111;background:#fff;border:1px solid #111;padding:7px 8px;width:100%;box-sizing:border-box}",
    ".out{display:flex;flex-wrap:wrap;gap:8px;align-items:center;min-height:40px}",
    ".out a{display:inline-block;border:1px dashed #111;padding:9px 12px;text-decoration:none;color:#111;background:#fff;font-weight:600;cursor:grab}",
    ".out a[aria-disabled=true]{opacity:.4;pointer-events:none}",
    "button{border:1px solid #111;background:#fbfaf8;color:#111;font:inherit;cursor:pointer;padding:6px 10px}",
    "button:hover{background:#111;color:#fbfaf8}",
    "button[disabled]{opacity:.45;cursor:default}",
    "button[disabled]:hover{background:#fbfaf8;color:#111}",
    ".hint{margin:0;font-size:11px;opacity:.65}",
    ".warn{margin:0;font-size:11px;border-left:2px solid #111;padding-left:8px;opacity:.8}",
  ].join("\n");

  function openPanel() {
    const host = document.createElement("div");
    host.setAttribute("data-task-builder", "");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = [
      ":host{all:initial}",
      ".scrim{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(17,17,17,.55)}",
      CSS,
    ].join("\n");

    const el = (tag, cls, text) => {
      const node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text) node.textContent = text;
      return node;
    };
    const field = (labelText, node) => {
      const wrap = el("label", "field", labelText);
      wrap.append(node);
      return wrap;
    };

    const card = el("div", "card");
    card.tabIndex = -1;
    const bar = el("div", "bar");
    const status = el("span", "status", "Paste a destination URL");
    const closeBtn = el("button", "", "Close");
    closeBtn.type = "button";
    bar.append(el("span", "name", "Task bookmarklet builder"), status, closeBtn);

    const body = el("div", "body");
    const urlInput = el("input");
    urlInput.type = "text";
    urlInput.placeholder = "https://trello.com/b/… or https://app.todoist.com/app/project/…";
    urlInput.spellcheck = false;
    urlInput.setAttribute("aria-label", "Destination URL");

    const tokenInput = el("input");
    tokenInput.type = "password";
    tokenInput.placeholder = "Paste the API token for this service";
    tokenInput.autocomplete = "off";
    tokenInput.setAttribute("aria-label", "API token");
    const tokenField = field("API token", tokenInput);

    const out = el("div", "out");
    const link = el("a", "", "Drag me to the bookmarks bar");
    link.href = "#";
    link.setAttribute("aria-disabled", "true");
    const copyBtn = el("button", "", "Copy");
    copyBtn.type = "button";
    copyBtn.disabled = true;
    out.append(link, copyBtn);

    const detail = el("p", "hint", "");
    const warn = el("p", "warn", "");

    body.append(
      field("Where it should go", urlInput),
      detail,
      tokenField,
      warn,
      out,
      el("p", "hint", "The bookmarklet carries only this destination; it reads the page title, the URL and the selection at click time."),
    );
    card.append(bar, body);

    let target = null;

    const render = () => {
      target = parseTarget(urlInput.value);
      tokenField.style.display = target?.needsToken ? "" : "none";
      link.href = "#";
      link.setAttribute("aria-disabled", "true");
      copyBtn.disabled = true;
      warn.textContent = "";

      if (!target) {
        detail.textContent = urlInput.value.trim()
          ? "No board, repository, project or list in that address."
          : "Paste the address of the place the page should be filed.";
        return;
      }

      detail.textContent = `${target.label} ${target.place} · ${target.id}`;
      if (target.needsToken) {
        warn.textContent = "This bookmarklet carries your token. Bookmarks sync to your browser account — build it on your own machine.";
      }

      let href;
      try {
        href = bookmarkletFor(target, tokenInput.value);
      } catch (error) {
        status.textContent = error.message;
        return;
      }
      link.href = href;
      link.textContent = target.needsToken ? "Drag me to the bookmarks bar" : `Add to ${target.label}`;
      link.setAttribute("aria-disabled", "false");
      copyBtn.disabled = false;
      status.textContent = "Ready";
    };

    urlInput.addEventListener("input", render);
    tokenInput.addEventListener("input", render);
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(link.getAttribute("href"));
        copyBtn.textContent = "Copied";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
      } catch {
        copyBtn.textContent = "Select it instead";
      }
    });
    closeBtn.addEventListener("click", () => host.remove());
    card.addEventListener("keydown", (event) => {
      if (event.key === "Escape") host.remove();
    });

    const scrim = el("div", "scrim");
    scrim.append(card);
    root.append(style, scrim);
    document.documentElement.appendChild(host);
    card.focus();
    render();
    return { host, urlInput, tokenInput };
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.taskBuilder = { parseTarget, bookmarkletFor, SERVICES, PREAMBLE };
  } else if (document?.body) {
    openPanel();
  }
})();
