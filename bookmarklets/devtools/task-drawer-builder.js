/**
 * @name 📋 Build a task drawer on Page
 * @category devtools
 * @description Builds a personal bookmarklet that slides your own tasks in from the right edge — Todoist, Trello, Linear, GitHub, ClickUp, Notion or Asana — using an API token you paste in.
 * @tags task, todo, drawer, builder, generator, byok, todoist, trello, linear, github, clickup, notion, asana
 * @traits network, web-app
 * @added 2026-11-04
 * @featured false
 */
(() => {
  const DRAWER_MS = 260;

  // Every service below answers a cross-origin read from any page, which was
  // measured rather than assumed: Trello and GitHub send `*`, and Asana, Linear,
  // ClickUp, Notion and Todoist's v1 API echo the caller's origin. The ones that
  // do not are not offered at all — Vikunja sends no CORS header, Taskade refuses
  // the preflight, and TickTick, Google Tasks and Microsoft To Do only speak
  // OAuth, so a pasted key cannot read them.
  const PROVIDERS = {
    todoist: {
      label: "Todoist",
      fields: ["token"],
      hint: "Todoist → Settings → Integrations → Developer → API token. The drawer asks for today and overdue.",
      endpoint: "https://api.todoist.com/api/v1/tasks",
    },
    trello: {
      label: "Trello",
      fields: ["key", "token"],
      hint: "Both from https://trello.com/power-ups/admin → your API key → token.",
      endpoint: "https://api.trello.com/1/members/me/cards",
    },
    linear: {
      label: "Linear",
      fields: ["token"],
      hint: "Linear → Settings → Security & access → Personal API keys.",
      endpoint: "https://api.linear.app/graphql",
    },
    github: {
      label: "GitHub",
      fields: ["token"],
      hint: "A personal access token with `repo`, or `public_repo` for public work only.",
      endpoint: "https://api.github.com/issues",
    },
    clickup: {
      label: "ClickUp",
      fields: ["token", "target"],
      target: "List id or list URL",
      hint: "ClickUp → Settings → Apps → API token. The list id is the last part of a `/v/li/…` URL.",
      endpoint: "https://api.clickup.com/api/v2/list/",
    },
    notion: {
      label: "Notion",
      fields: ["token", "target"],
      target: "Database id or database URL",
      hint: "An internal integration token, with the database shared to that integration.",
      endpoint: "https://api.notion.com/v1/databases/",
    },
    asana: {
      label: "Asana",
      fields: ["token"],
      hint: "Asana → My settings → Apps → Personal access token. The drawer reads your first workspace.",
      endpoint: "https://app.asana.com/api/1.0/",
    },
  };

  /** The id a service needs, read out of a URL the user already has or taken as-is. */
  function parseTarget(id, input) {
    const raw = String(input ?? "").trim();
    if (!raw) return null;
    if (id === "clickup") {
      const match = raw.match(/\/v\/li\/([\w-]+)/);
      if (match) return match[1];
      return /^[A-Za-z0-9_-]{5,}$/.test(raw) ? raw : null;
    }
    if (id === "notion") {
      const plain = raw.match(/([0-9a-f]{32})/i);
      if (plain) return plain[1].toLowerCase();
      const dashed = raw.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      return dashed ? raw.toLowerCase() : null;
    }
    return raw;
  }

  /** What the bookmarklet carries. A token is required for every service here. */
  function configFor(id, values = {}) {
    const provider = PROVIDERS[id];
    if (!provider) throw new Error("Pick a service first.");
    const token = String(values.token ?? "").trim();
    if (!token) throw new Error(`${provider.label} needs an API token.`);
    const cfg = { p: id, t: token };
    if (provider.fields.includes("key")) {
      const key = String(values.key ?? "").trim();
      if (!key) throw new Error("Trello needs both the API key and the token.");
      cfg.k = key;
    }
    if (provider.fields.includes("target")) {
      const target = parseTarget(id, values.target);
      if (!target) throw new Error(`Paste the ${provider.target.toLowerCase()} for ${provider.label}.`);
      cfg.d = target;
    }
    return cfg;
  }

  // The whole drawer is one function and the bookmarklet runs its source, so the
  // generated payload and the code tested here cannot drift apart. Nothing in it
  // may reach outside itself: what a bookmarklet carries is all it has.
  const sourceFor = (cfg) => `(() => {\nconst C = ${JSON.stringify(cfg)};\n(${RUNTIME.toString()})(C);\n})();`;
  const bookmarkletFor = (id, values) => `javascript:${sourceFor(configFor(id, values))}`;

  function RUNTIME(C) {
    const d = document;
    const LABELS = {
      todoist: "Todoist",
      trello: "Trello",
      linear: "Linear",
      github: "GitHub",
      clickup: "ClickUp",
      notion: "Notion",
      asana: "Asana",
    };
    const label = LABELS[C.p] || "Tasks";

    const CSS = [
      ":host{all:initial}",
      ".drawer{position:absolute;top:0;right:0;bottom:0;display:flex;flex-direction:column;width:min(420px,100vw);border-left:1px solid #111;background:#fbfaf8;color:#111;font:13px/1.45 system-ui,-apple-system,sans-serif;box-shadow:-24px 0 48px rgba(17,17,17,.16);pointer-events:auto;outline:none;transform:translateX(100%);transition:transform 260ms cubic-bezier(.22,.61,.36,1)}",
      '.drawer[data-open="true"]{transform:translateX(0)}',
      "@media (prefers-reduced-motion:reduce){.drawer{transition:none}}",
      ".bar{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid #111}",
      ".name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".actions{display:flex;gap:6px;margin-left:auto}",
      "button{border:1px solid #111;background:#fbfaf8;color:#111;font:inherit;padding:5px 9px;cursor:pointer}",
      "button:hover{background:#111;color:#fbfaf8}",
      "button[disabled]{opacity:.45;cursor:default}",
      "button[disabled]:hover{background:#fbfaf8;color:#111}",
      ".status{margin:0;padding:7px 12px;border-bottom:1px solid #111;font-size:12px;opacity:.75}",
      ".status:empty{display:none}",
      ".status[data-error=true]{opacity:1;font-weight:600}",
      ".list{flex:1;min-height:0;overflow:auto;margin:0;padding:0;list-style:none}",
      ".row{display:flex;gap:10px;align-items:baseline;padding:9px 12px;border-bottom:1px solid #e6e3de}",
      ".row a{flex:1;min-width:0;color:#111;text-decoration:none;border-bottom:1px solid #111;overflow-wrap:anywhere}",
      ".row a:hover{background:#111;color:#fbfaf8}",
      ".due{font-size:11px;white-space:nowrap;opacity:.7}",
      ".note{max-width:38%;font-size:11px;opacity:.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".empty{margin:0;padding:14px 12px;opacity:.7}",
      ".foot{margin:0;padding:7px 12px;border-top:1px solid #111;font-size:11px;line-height:1.4;opacity:.7}",
    ].join("\n");

    const el = (tag, cls, text) => {
      const node = d.createElement(tag);
      if (cls) node.className = cls;
      if (text) node.textContent = text;
      return node;
    };

    const host = d.createElement("div");
    host.setAttribute("data-task-drawer", C.p);
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
    const root = host.attachShadow({ mode: "open" });
    const style = d.createElement("style");
    style.textContent = CSS;

    const drawer = el("div", "drawer");
    drawer.tabIndex = -1;
    drawer.setAttribute("role", "complementary");
    drawer.setAttribute("aria-label", `${label} tasks`);
    drawer.dataset.open = "false";
    const bar = el("div", "bar");
    const name = el("span", "name", label);
    const actions = el("div", "actions");
    const refreshBtn = el("button", "", "Refresh");
    const closeBtn = el("button", "", "Close");
    refreshBtn.type = "button";
    closeBtn.type = "button";
    const status = el("p", "status", "Loading…");
    const list = el("ul", "list");
    const foot = el(
      "p",
      "foot",
      `Read straight from ${label} with the token inside this bookmarklet. Nothing goes through another server.`,
    );

    actions.append(refreshBtn, closeBtn);
    bar.append(name, actions);
    drawer.append(bar, status, list, foot);
    root.append(style, drawer);
    d.documentElement.appendChild(host);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        drawer.dataset.open = "true";
        drawer.focus();
      });
    });

    let closing = 0;
    const closeAll = () => {
      if (closing) return;
      drawer.dataset.open = "false";
      closing = setTimeout(() => host.remove(), 260);
    };
    closeBtn.addEventListener("click", closeAll);
    drawer.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAll();
    });

    const API = {
      todoist: "https://api.todoist.com/api/v1/tasks?filter=today%20%7C%20overdue",
      trello: "https://api.trello.com/1/members/me/cards",
      linear: "https://api.linear.app/graphql",
      github: "https://api.github.com/issues?filter=assigned&state=open&per_page=100",
      clickup: "https://api.clickup.com/api/v2/list/",
      notion: "https://api.notion.com/v1/databases/",
      asana: "https://app.asana.com/api/1.0/",
    };

    const bearer = { Authorization: `Bearer ${C.t}`, Accept: "application/json" };

    /** A failed request has to say what the service said, not just that it failed. */
    const call = (url, init) =>
      fetch(url, init).then((res) =>
        res.text().then((text) => {
          let body = null;
          try {
            body = text ? JSON.parse(text) : null;
          } catch {
            body = null;
          }
          if (!res.ok) {
            const said =
              body && (body.message || body.error || (body.errors && body.errors[0] && body.errors[0].message));
            throw new Error(`${res.status}${said ? ` · ${said}` : ""}`);
          }
          return body;
        }),
      );

    const shortDate = (value) => {
      if (!value) return "";
      const stamp = String(value);
      if (!/^\d{4}-\d{2}-\d{2}/.test(stamp)) return stamp;
      const day = stamp.slice(0, 10);
      const time = stamp.length > 10 ? ` ${stamp.slice(11, 16)}` : "";
      const date = new Date(`${day}T12:00:00`);
      if (isNaN(date.getTime())) return stamp;
      const now = new Date();
      if (date.toDateString() === now.toDateString()) return `Today${time}`;
      return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}${time}`;
    };

    const tasks = {
      todoist: () =>
        call(API.todoist, { headers: bearer }).then((body) => {
          const rows = (body && body.results) || (Array.isArray(body) ? body : []);
          return rows.map((t) => ({
            title: t.content,
            due: t.due ? t.due.string || t.due.date || t.due.datetime || "" : "",
            // Todoist's display string is human ("Tomorrow"), so it cannot be
            // the sort key; the ISO date beside it can.
            sort: t.due ? t.due.date || t.due.datetime || "" : "",
            note: t.priority > 1 ? `P${5 - t.priority}` : "",
            url: `https://app.todoist.com/app/task/${t.id}`,
          }));
        }),
      trello: () =>
        call(
          `${API.trello}?key=${encodeURIComponent(C.k || "")}&token=${encodeURIComponent(C.t)}&fields=name,due,shortUrl,closed`,
          { headers: { Accept: "application/json" } },
        ).then((rows) =>
          (Array.isArray(rows) ? rows : [])
            .filter((card) => !card.closed)
            .map((card) => ({ title: card.name, due: card.due || "", note: "", url: card.shortUrl })),
        ),
      linear: () => {
        const query =
          "query{viewer{assignedIssues(first:100){nodes{identifier title url dueDate state{name type}}}}}";
        return call(API.linear, {
          method: "POST",
          headers: { Authorization: C.t, "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        }).then((body) => {
          if (body && body.errors && body.errors.length) throw new Error(body.errors[0].message);
          const nodes =
            (body &&
              body.data &&
              body.data.viewer &&
              body.data.viewer.assignedIssues &&
              body.data.viewer.assignedIssues.nodes) ||
            [];
          return nodes
            .filter((node) => !node.state || (node.state.type !== "completed" && node.state.type !== "canceled"))
            .map((node) => ({
              title: `${node.identifier} ${node.title}`,
              due: node.dueDate || "",
              note: node.state ? node.state.name : "",
              url: node.url,
            }));
        });
      },
      github: () =>
        call(API.github, { headers: bearer }).then((rows) =>
          (Array.isArray(rows) ? rows : [])
            .filter((issue) => !issue.pull_request)
            .map((issue) => ({
              title: issue.title,
              due: "",
              note: String(issue.repository_url || "").replace("https://api.github.com/repos/", ""),
              url: issue.html_url,
            })),
        ),
      clickup: () =>
        call(`${API.clickup}${encodeURIComponent(C.d || "")}/task?subtasks=true`, {
          headers: { Authorization: C.t, Accept: "application/json" },
        }).then((body) =>
          ((body && body.tasks) || []).map((task) => ({
            title: task.name,
            due: task.due_date ? new Date(Number(task.due_date)).toISOString() : "",
            note: task.status ? task.status.status : "",
            url: task.url,
          })),
        ),
      notion: () =>
        call(`${API.notion}${encodeURIComponent(C.d || "")}/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${C.t}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ page_size: 100 }),
        }).then((body) =>
          ((body && body.results) || []).map((page) => {
            const props = page.properties || {};
            let title = "";
            let due = "";
            let note = "";
            for (const key of Object.keys(props)) {
              const prop = props[key];
              if (!prop) continue;
              if (prop.type === "title" && !title) {
                title = (prop.title || []).map((run) => run.plain_text || "").join("");
              }
              if (prop.type === "date" && !due && prop.date) due = prop.date.start || "";
              if ((prop.type === "status" || prop.type === "select") && !note && prop[prop.type]) {
                note = prop[prop.type].name || "";
              }
            }
            return { title: title || "Untitled", due, note, url: page.url };
          }),
        ),
      asana: () =>
        call(`${API.asana}workspaces`, { headers: bearer }).then((body) => {
          const space = body && body.data && body.data[0];
          if (!space) throw new Error("That token has no Asana workspace.");
          const url = `${API.asana}tasks?assignee=me&limit=100&opt_fields=name,due_on,permalink_url,completed&workspace=${encodeURIComponent(space.gid)}`;
          return call(url, { headers: bearer }).then((tasksBody) =>
            ((tasksBody && tasksBody.data) || [])
              .filter((task) => !task.completed)
              .map((task) => ({ title: task.name, due: task.due_on || "", note: "", url: task.permalink_url })),
          );
        }),
    };

    const clear = () => {
      while (list.firstChild) list.removeChild(list.firstChild);
    };

    const draw = (rows) => {
      clear();
      if (!rows.length) {
        list.append(el("li", "empty", "Nothing open. Enjoy it."));
        return;
      }
      for (const task of rows) {
        const row = el("li", "row");
        const anchor = el("a", "", task.title);
        anchor.href = task.url;
        anchor.target = "_blank";
        anchor.rel = "noreferrer";
        row.append(anchor);
        if (task.due) row.append(el("span", "due", shortDate(task.due)));
        if (task.note) row.append(el("span", "note", task.note));
        list.append(row);
      }
    };

    // Dated work first, in date order, undated last. A display string like
    // "Tomorrow" is never a key; only an ISO date is.
    const when = (row) => row.sort || (/^\d{4}-\d{2}-\d{2}/.test(String(row.due || "")) ? row.due : "");

    const load = () => {
      status.dataset.error = "false";
      status.textContent = "Loading…";
      refreshBtn.disabled = true;
      const run = tasks[C.p];
      if (!run) {
        status.dataset.error = "true";
        status.textContent = "This bookmarklet does not know that service.";
        refreshBtn.disabled = false;
        return;
      }
      run()
        .then((rows) => {
          const clean = rows
            .filter((row) => row && row.title)
            .sort((a, b) => {
              const left = when(a);
              const right = when(b);
              if (!left && !right) return 0;
              if (!left) return 1;
              if (!right) return -1;
              return left < right ? -1 : left > right ? 1 : 0;
            });
          status.textContent = `${clean.length} ${clean.length === 1 ? "task" : "tasks"}`;
          draw(clean);
        })
        .catch((error) => {
          clear();
          status.dataset.error = "true";
          const said = String(error && error.message ? error.message : error);
          status.textContent = /^\d{3}/.test(said)
            ? `${label} refused that token (${said}). Build a new bookmarklet with a fresh one.`
            : `${label} did not answer: ${said}. A page can also block the request with its CSP.`;
        })
        .then(() => {
          refreshBtn.disabled = false;
        });
    };

    refreshBtn.addEventListener("click", load);
    load();
  }

  const CSS = [
    ":host{all:initial}",
    ".drawer{position:absolute;top:0;right:0;bottom:0;display:flex;flex-direction:column;width:min(440px,100vw);border-left:1px solid #111;background:#fbfaf8;color:#111;font:13px/1.45 system-ui,-apple-system,sans-serif;box-shadow:-24px 0 48px rgba(17,17,17,.16);pointer-events:auto;outline:none;transform:translateX(100%);transition:transform 260ms cubic-bezier(.22,.61,.36,1)}",
    '.drawer[data-open="true"]{transform:translateX(0)}',
    "@media (prefers-reduced-motion:reduce){.drawer{transition:none}}",
    ".bar{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid #111}",
    ".name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".actions{display:flex;gap:6px;margin-left:auto}",
    ".body{display:flex;flex-direction:column;gap:12px;padding:14px;overflow:auto}",
    ".field{display:flex;flex-direction:column;gap:4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.72}",
    "input,select{font:13px/1.45 system-ui,-apple-system,sans-serif;color:#111;background:#fff;border:1px solid #111;padding:7px 8px;width:100%;box-sizing:border-box}",
    ".out{display:flex;flex-wrap:wrap;gap:8px;align-items:center;min-height:40px}",
    ".out a{display:inline-block;border:1px dashed #111;padding:9px 12px;color:#111;background:#fff;font-weight:600;text-decoration:none;cursor:grab}",
    ".out a[aria-disabled=true]{opacity:.4;pointer-events:none}",
    "button{border:1px solid #111;background:#fbfaf8;color:#111;font:inherit;cursor:pointer;padding:5px 9px}",
    "button:hover{background:#111;color:#fbfaf8}",
    "button[disabled]{opacity:.45;cursor:default}",
    "button[disabled]:hover{background:#fbfaf8;color:#111}",
    ".hint{margin:0;font-size:11px;opacity:.65}",
    ".warn{margin:0;font-size:11px;border-left:2px solid #111;padding-left:8px;opacity:.8}",
    ".status{margin:0;padding:7px 12px;border-bottom:1px solid #111;font-size:12px;opacity:.75}",
    ".status[data-error=true]{opacity:1;font-weight:600}",
    ".foot{margin:0;padding:7px 12px;border-top:1px solid #111;font-size:11px;line-height:1.4;opacity:.7}",
  ].join("\n");

  function openPanel() {
    const host = document.createElement("div");
    host.setAttribute("data-task-drawer-builder", "");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;

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

    const drawer = el("div", "drawer");
    drawer.tabIndex = -1;
    drawer.setAttribute("role", "complementary");
    drawer.setAttribute("aria-label", "Task drawer builder");
    drawer.dataset.open = "false";

    const bar = el("div", "bar");
    const name = el("span", "name", "Task drawer builder");
    const actions = el("div", "actions");
    const closeBtn = el("button", "", "Close");
    closeBtn.type = "button";
    const status = el("p", "status", "Pick a service and paste a token.");
    const body = el("div", "body");

    const select = el("select");
    select.setAttribute("aria-label", "Service");
    for (const [id, provider] of Object.entries(PROVIDERS)) {
      const option = el("option", "", provider.label);
      option.value = id;
      select.append(option);
    }

    const tokenInput = el("input");
    tokenInput.type = "password";
    tokenInput.autocomplete = "off";
    tokenInput.spellcheck = false;
    tokenInput.placeholder = "Paste the API token";
    tokenInput.setAttribute("aria-label", "API token");

    const keyInput = el("input");
    keyInput.type = "password";
    keyInput.autocomplete = "off";
    keyInput.spellcheck = false;
    keyInput.placeholder = "Paste the API key";
    keyInput.setAttribute("aria-label", "API key");
    const keyField = field("Trello API key", keyInput);

    const targetInput = el("input");
    targetInput.type = "text";
    targetInput.spellcheck = false;
    targetInput.placeholder = "Paste the id or the URL it is in";
    targetInput.setAttribute("aria-label", "List or database");
    const targetField = field("List or database", targetInput);
    const targetLabel = targetField.firstChild;

    const out = el("div", "out");
    const link = el("a", "", "Drag me to the bookmarks bar");
    link.href = "#";
    link.setAttribute("aria-disabled", "true");
    const copyBtn = el("button", "", "Copy");
    copyBtn.type = "button";
    copyBtn.disabled = true;
    out.append(link, copyBtn);

    const hint = el("p", "hint", "");
    const warn = el("p", "warn", "");

    actions.append(closeBtn);
    bar.append(name, actions);
    body.append(
      field("Service", select),
      field("API token", tokenInput),
      keyField,
      targetField,
      hint,
      warn,
      out,
      el(
        "p",
        "hint",
        "The bookmarklet fetches your tasks itself and carries the token, so build it on your own machine: bookmarks sync to your browser account.",
      ),
    );
    drawer.append(bar, status, body);
    root.append(style, drawer);
    document.documentElement.appendChild(host);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        drawer.dataset.open = "true";
        tokenInput.focus();
      });
    });

    let closing = 0;
    const closeAll = () => {
      if (closing) return;
      drawer.dataset.open = "false";
      closing = setTimeout(() => host.remove(), DRAWER_MS);
    };
    closeBtn.addEventListener("click", closeAll);
    drawer.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAll();
    });

    const render = () => {
      const id = select.value;
      const provider = PROVIDERS[id];
      const needsKey = provider.fields.includes("key");
      const needsTarget = provider.fields.includes("target");
      keyField.style.display = needsKey ? "" : "none";
      targetField.style.display = needsTarget ? "" : "none";
      if (needsTarget) targetLabel.textContent = provider.target;
      hint.textContent = provider.hint;
      warn.textContent = "";
      link.href = "#";
      link.setAttribute("aria-disabled", "true");
      copyBtn.disabled = true;

      let href;
      try {
        href = bookmarkletFor(id, { token: tokenInput.value, key: keyInput.value, target: targetInput.value });
      } catch (error) {
        status.textContent = error.message;
        status.dataset.error = "false";
        return;
      }
      link.href = href;
      copyBtn.disabled = false;
      link.setAttribute("aria-disabled", "false");
      status.textContent = `Ready · ${provider.label}`;
      warn.textContent = "This bookmarklet carries your token. Anyone who has the bookmark has the token.";
    };

    select.addEventListener("change", render);
    for (const input of [tokenInput, keyInput, targetInput]) input.addEventListener("input", render);
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(link.getAttribute("href"));
        copyBtn.textContent = "Copied";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
      } catch {
        copyBtn.textContent = "Select it instead";
      }
    });

    render();
    return { host, select, tokenInput, keyInput, targetInput, link };
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.taskDrawerBuilder = {
      PROVIDERS,
      parseTarget,
      configFor,
      sourceFor,
      bookmarkletFor,
      RUNTIME,
    };
  } else if (document?.body) {
    openPanel();
  }
})();
