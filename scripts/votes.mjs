#!/usr/bin/env node
/**
 * One GitHub comment per bookmarklet is the ballot box. This script creates any
 * missing comment, counts 👍 and 👎 reactions on each one, and writes
 * data/votes.json, which the page reads. Runs from .github/workflows/votes.yml,
 * so there is no server and no database beyond that file.
 *
 *   node scripts/votes.mjs            seed comments, tally, write data/votes.json
 *   node scripts/votes.mjs --offline  add missing rows with zero counts, no network
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(path.join(root, "data", "catalog.json"), "utf8"));
const votesPath = path.join(root, "data", "votes.json");

const offline = process.argv.includes("--offline");
const repo = process.env.GITHUB_REPOSITORY || "Spuds0588/Bookmarklet-Library";
const apiBase = process.env.GITHUB_API_URL || "https://api.github.com"; // Actions sets this; a local mock can too.
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const THREAD_TITLE = "Tool votes";

const previous = await readFile(votesPath, "utf8")
  .then((text) => JSON.parse(text))
  .catch(() => null);

const marker = (slug) => `<!-- vote:${slug} -->`;
const slugOf = (body) => body?.match(/<!-- vote:([a-z0-9-]+) -->/)?.[1];

async function api(route, init = {}) {
  const response = await fetch(`${apiBase}/repos/${repo}${route}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "bookmarklet-library-votes",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${route} -> ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function commentBody(item) {
  return `${marker(item.slug)}
**${item.name}** · \`${item.category}\`

React 👍 if you use it, 👎 if it missed. A workflow counts both reactions and republishes \`data/votes.json\`.`;
}

async function thread() {
  if (previous?.issue) {
    const issue = await api(`/issues/${previous.issue}`).catch(() => null);
    if (issue && issue.state === "open") return issue;
  }
  const issues = await api("/issues?state=all&per_page=100&sort=created&direction=asc");
  return (
    issues.find((issue) => issue.title === THREAD_TITLE && !issue.pull_request) ??
    (await api("/issues", {
      method: "POST",
      body: JSON.stringify({
        title: THREAD_TITLE,
        body: "One comment per bookmarklet. React 👍 or 👎 on a tool's comment to vote on it; `scripts/votes.mjs` tallies the reactions into `data/votes.json`.",
      }),
    }))
  );
}

async function comments(issue) {
  const all = [];
  for (let page = 1; ; page += 1) {
    const batch = await api(`/issues/${issue.number}/comments?per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

if (offline) {
  const tools = Object.fromEntries(
    catalog.items.map((item) => {
      const known = previous?.tools?.[item.slug];
      return [item.slug, { up: known?.up ?? 0, down: known?.down ?? 0, url: known?.url ?? "" }];
    }),
  );
  await writeFile(
    votesPath,
    JSON.stringify({ updated: new Date().toISOString(), issue: previous?.issue ?? null, issueUrl: previous?.issueUrl ?? null, tools }, null, 2) + "\n",
  );
  console.log(`wrote ${catalog.items.length} vote rows to data/votes.json (offline, counts unchanged)`);
  process.exit(0);
}

if (!token) {
  console.error("Set GITHUB_TOKEN (a token with issues:write) or run with --offline.");
  process.exit(1);
}

const issue = await thread();
const all = await comments(issue);

let created = 0;
for (const item of catalog.items) {
  if (all.some((comment) => slugOf(comment.body) === item.slug)) continue;
  all.push(await api(`/issues/${issue.number}/comments`, { method: "POST", body: JSON.stringify({ body: commentBody(item) }) }));
  created += 1;
}

const counted = new Map();
for (const comment of all) {
  const slug = slugOf(comment.body);
  if (!slug) continue;
  counted.set(slug, {
    up: comment.reactions?.["+1"] ?? 0,
    down: comment.reactions?.["-1"] ?? 0,
    url: comment.html_url,
  });
}

const tools = {};
for (const item of catalog.items) {
  const vote = counted.get(item.slug) ?? previous?.tools?.[item.slug];
  if (vote) tools[item.slug] = vote;
}

const unchanged =
  previous?.issue === issue.number &&
  JSON.stringify(previous?.tools ?? {}) === JSON.stringify(tools);

if (unchanged) {
  console.log(`votes unchanged: ${Object.keys(tools).length} tools on issue #${issue.number}`);
  process.exit(0);
}

await writeFile(
  votesPath,
  JSON.stringify({ updated: new Date().toISOString(), issue: issue.number, issueUrl: issue.html_url, tools }, null, 2) + "\n",
);
console.log(`tallied ${Object.keys(tools).length} tools on issue #${issue.number}, ${created} comment(s) created`);
