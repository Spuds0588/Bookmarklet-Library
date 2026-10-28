# Master Development Document: Bookmarklet Library & Builder Suite

**Project:** `Bookmarklet-Library`  
**Host Target:** GitHub Pages (`spuds0588.github.io/Bookmarklet-Library/`)  
**Architecture:** Monorepo (Single Static Web Application)  
**Methodology:** YAGNI, Zero-Build / Zero-Backend, Declarative Configuration  

---

## 1. Architectural Strategy

### 1.1 Single-Repo Architecture
Instead of splitting across repositories, the Builder engine and the Library catalog are unified under the existing `Bookmarklet-Library` repository.
* **Why:** Eliminates cross-origin iframe security issues (Chrome/Edge block dragging `javascript:` links out of sandboxed `<iframe>` elements to the native bookmarks bar), eliminates dual-repo synchronization overhead, and shares styles directly.
* **Routing:** Hash-based or query-parameter routing (`/#/builder/:id` or `?builder=:id`) keeps the site completely static and natively compatible with GitHub Pages.

### 1.2 Two-Tier Bookmarklet Taxonomy
The master catalog treats all tools as searchable items with a standard metadata schema, separated into two operational models:
1. **Instant (Static):** Ready out of the box. Provides an immediate "Drag to Bookmarks" button and a "Copy Code" action.
2. **Built-for-You (Configurable):** Requires user parameters (e.g., replacement text, webhooks, domain maps) or form harvesting. Clicking opens the dynamic configuration drawer/modal.

```
┌─────────────────────────────────────────────────────────────┐
│                 Unified Search & Filter Bar                 │
├──────────────────────────────┬──────────────────────────────┤
│  Instant / Static Tools      │  Built-for-You Tools         │
│  [Drag to Bar] [Copy Code]   │  [Customize & Build]         │
└──────────────────────────────┴───────────────┬──────────────┘
                                               │ Opens Builder UI
                                               ▼
                              ┌────────────────────────────────┐
                              │ - Dynamic Input Form           │
                              │ - Live Bookmarklet Generator   │
                              │ - Netscape (.html) Export      │
                              └────────────────────────────────┘
```

### 1.3 CSP & CORS Bypass Policies
* **Webhooks / Data Exfiltration:** High-security enterprise pages enforce strict `connect-src` Content Security Policies that block arbitrary `fetch()` calls. Bookmarklets handling external data dispatch will support a two-stage fallback:
  1. Primary: Direct `fetch()` with `mode: 'cors'`.
  2. Fallback: Copy formatted payload to the clipboard or open a parameterized hosted receiver tab.
* **External Connections (WebRTC / Sockets):** Tools requiring external socket or WebRTC connections (e.g., PeerJS Chat) **must not** inject scripts directly into the active host page. Instead, the bookmarklet launches a popup window hosted under `spuds0588.github.io/Bookmarklet-Library/` passing the context via query parameters, isolating the connection under GitHub Pages' CSP.

---

## 2. Master Catalog Specification

### 2.1 "Built-for-You" (Configurable) Suite

| ID | Name | Target Persona | Configuration Inputs | Core Action |
| :--- | :--- | :--- | :--- | :--- |
| `pii-masker` | **Demo PII & Sensitive Data Masker** | Trainers, Sales Engineers | Custom company names, sensitive terms list, regex rules, blur radius (px). | Traverses DOM text nodes; replaces matching strings with dummy enterprise placeholders and applies CSS `filter: blur(...)` to target elements. |
| `form-stamper` | **The Form Harvester & Stamper** | Knowledge Workers, Ops | Key-value pairs generated manually OR ingested via the Harvester Bookmarklet. | Traverses target form controls (`<input>`, `<textarea>`, `<select>`), matches IDs/names/labels, injects values, and dispatches native `input`/`change` events for React/Vue/Angular compatibility. |
| `webhook-dispatch`| **Context Webhook Dispatcher** | Power Users, Devs | Webhook URL (Zapier, Make, Slack), target payload schema (Page URL, Title, Selected Text, Metadata). | Gathers active page context, attempts a direct POST request, and falls back to clipboard copy if blocked by host page CSP. |
| `env-switcher` | **Environment & Route Switcher** | Developers, QA | Origin mappings (e.g., `prod: app.company.com`, `staging: stg.company.internal`, `local: localhost:3000`). | Preserves `pathname`, `search`, and `hash`; swaps the `window.location.origin` with a one-click redirect to test across environments. |

#### Deep Dive: The Two-Tier Form Harvester Workflow (`form-stamper`)
```
[User on Target Form]
  └─► 1. Clicks static "Form Harvester" bookmarklet
        └─► Scans form fields (IDs, names, types, current values)
        └─► Opens: spuds0588.github.io/Bookmarklet-Library/#/builder/form-stamper?state=<compressed_payload>
              └─► Builder UI auto-populates fields with checkboxes: [x] Retain value
                    └─► User clicks "Generate Stamper" -> Drags custom bookmarklet to bar
```

---

### 2.2 "Instant / Ready-to-Use" (Static) Suite

| ID | Name | Target Persona | Trigger / UX | Core Action |
| :--- | :--- | :--- | :--- | :--- |
| `table-to-csv` | **Universal Table to CSV / Markdown** | Knowledge Workers | Click to activate -> Hover highlights table -> Click table to extract. | Parses the selected `<table>` or CSS grid, strips boilerplate/hidden elements, formats clean CSV or Markdown table, and writes directly to `navigator.clipboard`. |
| `presenter-spotlight`| **Focus Spotlight Presenter** | Trainers, Presenters | Click activates overlay. Move mouse to steer spotlight. Press `Esc` to exit. | Injects a full-viewport SVG/CSS radial mask cut-out following the cursor (`pointer-events: none`). Right-click toggles dimming on/off. |
| `jitsi-instant-call` | **1-Click Video Meeting** | Power Users, Ops | 1 Click. | Generates a cryptographically random room ID (`meet.jit.si/<uuid>`), copies the join link to clipboard, and opens the meeting in a compact pop-up window (`640x480`). |
| `peerjs-url-chat` | **URL-Anchored Secret Chat** | Power Users, Researchers | 1 Click. | Computes SHA-256 hash of `window.location.origin + window.location.pathname` and opens a hosted popup (`chat.html?room=<hash>`), joining an ephemeral P2P chat room with anyone on the exact same URL. |
| `voice-commander` | **Native Voice Macro Commander** | Power Users, Accessibility | 1 Click activates listening badge in bottom-right corner. | Initializes browser `webkitSpeechRecognition`. Maps commands ("scroll down", "submit", "clear", "refresh") to native window/DOM events without external dependencies. |
| `anchor-citation` | **Deep Fragment & Citation Linker** | Researchers, Knowledge Workers | Highlight text on page -> Click bookmarklet. | Formats a Chrome Text Fragment link (`#:~:text=...`) alongside page title and current date into clean Markdown citation, copied to clipboard. |

---

## 3. Core Engine Specifications

### 3.1 Registry Data Model (`assets/js/registry.js`)
All tools will conform to a single schema:

```javascript
export const TOOLS = [
  {
    id: "pii-masker",
    title: "Demo PII & Sensitive Data Masker",
    category: "Trainers & Sales",
    type: "configurable", // "static" | "configurable"
    description: "Replaces client names, metrics, and sensitive data with dummy values for live demos.",
    inputs: [
      { key: "companyNames", label: "Company Names to Replace (comma-separated)", type: "text", default: "Acme Corp, Initech" },
      { key: "blurRadius", label: "Blur Radius for PII Elements (px)", type: "number", default: 5 },
      { key: "maskEmails", label: "Mask Email Addresses", type: "checkbox", default: true }
    ],
    compile: (vars) => `javascript:(function(){/* bookmarklet logic with vars injected */})();`
  },
  {
    id: "table-to-csv",
    title: "Table to CSV / Markdown Extractor",
    category: "Knowledge Workers",
    type: "static",
    description: "Inspects and extracts any HTML table or grid directly to your clipboard.",
    code: `javascript:(function(){/* static self-contained bookmarklet */})();`
  }
];
```

### 3.2 Compilation & Encoding Engine (`assets/js/compiler.js`)
* **Sanitization:** Strip leading/trailing whitespaces, single-line comments (`// ...\n`), and condense whitespace strings to prevent breakages inside bookmark URLs.
* **IIFE Wrapping:** Ensure all scripts are wrapped in `javascript:(function(){ ... })();` to protect global scope execution on host pages.
* **Selective URI Encoding:** Run `encodeURI()` rather than `encodeURIComponent()` on the final string to maintain clean readability while escaping illegal characters (`"`, `<`, `>`, `#`).

### 3.3 The Netscape Bookmark Exporter (`assets/js/exporter.js`)
To support locked-down enterprise machines where browser settings disable dragging links into the bookmark bar:
* Generates a downloadable `.html` blob formatted to the **Netscape-Bookmark-file-1** standard:
  ```html
  <!DOCTYPE NETSCAPE-Bookmark-file-1>
  <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
  <TITLE>Bookmarks</TITLE>
  <H1>Bookmarks</H1>
  <DL><p>
    <DT><A HREF="[COMPILED_JAVASCRIPT_STRING]">[TOOL_NAME]</A>
  </DL><p>
  ```
* Enables native import via Chrome/Edge (`Ctrl+Shift+O` -> `...` -> *Import Bookmarks*).

---

## 4. Development Task List

### Phase 1: Foundation & Registry Refactor
- [ ] **Task 1.1:** Audit existing `spuds0588.github.io/Bookmarklet-Library/` structure and consolidate all tool listings into a single declarative array in `assets/js/registry.js`.
- [ ] **Task 1.2:** Implement live search and filter controls supporting `type: static` and `type: configurable` badges.
- [ ] **Task 1.3:** Build the dynamic modal/drawer UI shell that renders input fields automatically when a user clicks "Customize & Build".

### Phase 2: Compiler & Exporter Core
- [ ] **Task 2.1:** Write `compiler.js` containing the minification, placeholder substitution, and selective URI-encoding pipeline.
- [ ] **Task 2.2:** Build the live bookmark generator component:
  - Generates the updated draggable `<a>` tag.
  - Adds a "Copy Raw Code" button with visual clipboard confirmation.
- [ ] **Task 2.3:** Build `exporter.js` to create the downloadable Netscape Bookmark `.html` Blob.

### Phase 3: Implement Static Tools
- [ ] **Task 3.1: Table-to-CSV / Markdown Extractor**
  - Implement visual hover highlight overlay on `<table>` elements.
  - Implement table DOM parser extracting `<thead>`, `<tbody>`, `<tr>`, `<td>`.
  - Add conversion engines for both CSV and Markdown with clipboard write.
- [ ] **Task 3.2: Focus Presenter Spotlight**
  - Implement radial gradient cutout mask adhering to mouse coordinates.
  - Bind toggle hotkey (`Escape` for destroy, right-click to freeze/unfreeze).
- [ ] **Task 3.3: Jitsi 1-Click Meeting**
  - Implement random room generator and clipboard copy.
  - Implement centered popup trigger (`window.open` with `menubar=no,status=no,width=640,height=480`).
- [ ] **Task 3.4: Deep Fragment & Citation Linker**
  - Capture active selection via `window.getSelection()`.
  - Encode into Chrome Text Fragment format (`#:~:text=...`).
  - Copy clean Markdown link (`[Page Title](URL#:~:text=...)`) to clipboard.

### Phase 4: Implement Configurable Tools & Harvester Engine
- [ ] **Task 4.1: Demo PII & Masker Tool**
  - Create configuration schema (target strings, blur strength, email regex toggle).
  - Write DOM tree-walker targeting text nodes and selective CSS filter application.
- [ ] **Task 4.2: Developer Environment Switcher**
  - Create dynamic key-value configuration interface for environments.
  - Write URL transformer preserving `location.pathname`, search params, and hash.
- [ ] **Task 4.3: Two-Tier Form Harvester & Stamper**
  - Build the static `form-harvester.js` script to parse forms, field names, and values.
  - Implement URL state serialization (`encodeURIComponent(JSON.stringify(payload))`) that directs users to the library builder.
  - Build the dynamic Stamper Form UI in the builder allowing users to cherry-pick harvested fields and compile their personalized one-click stamper.
- [ ] **Task 4.4: Webhook Dispatcher with CSP Fallback**
  - Build builder UI for webhook URL and payload configuration.
  - Implement `fetch()` executor with fallback handling to clipboard if `connect-src` rejects the request.

### Phase 5: Hosted Popups & Testing
- [ ] **Task 5.1: Hosted PeerJS Chat Popup (`chat.html`)**
  - Create lightweight `chat.html` hosted in the root of the GitHub Pages repository.
  - Implement room connection logic using PeerJS WebRTC based on the `?room=` parameter.
  - Write the static bookmarklet that computes the page URL hash and launches `chat.html`.
- [ ] **Task 5.2: Cross-Browser & Framework Compatibility Validation**
  - Validate form fill synthetic events across React, Vue, and vanilla HTML forms.
  - Test drag-and-drop link functionality and Netscape `.html` imports in Chrome, Edge, and Firefox.
- [ ] **Task 5.3: Production Verification on GitHub Pages**
  - Deploy to GitHub Pages and confirm all asset paths, query parameters, and hash routing execute cleanly.