/**
 * @name Scratchpad
 * @category text
 * @description Open a scratchpad with Markdown preview in a new tab.
 * @tags notes, markdown, scratchpad
 * @added 2026-10-17
 * @featured false
 */
(function(){javascript:(function() {
  const win = window.open('', '_blank');
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>ScratchPad</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    :root {
      --bg: #ffffff; --card-bg: #f3f4f6; --text: #1f2937; --border: #e5e7eb;
      --accent: #3b82f6; --code-bg: #1e1e1e; --code-text: #d4d4d4;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111827; --card-bg: #1f2937; --text: #f9fafb; --border: #374151;
        --accent: #60a5fa;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg); color: var(--text); margin: 0; padding: 20px;
      display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start;
    }
    /* Controls */
    #controls { position: fixed; bottom: 20px; right: 20px; display: flex; gap: 10px; z-index: 100; }
    .btn-fab {
      width: 50px; height: 50px; border-radius: 50%; border: none;
      background: var(--accent); color: white; font-size: 24px; cursor: pointer;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.1s;
      display: flex; align-items: center; justify-content: center;
    }
    .btn-fab:hover { transform: scale(1.1); }
    .btn-fab.secondary { background: var(--card-bg); color: var(--text); border: 1px solid var(--border); }

    /* Cards */
    .card {
      background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px;
      width: 400px; max-width: 100%; max-height: 600px; display: flex; flex-direction: column;
      overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05); position: relative;
    }
    .card-header {
      padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between;
      background: rgba(0,0,0,0.05); font-size: 12px; user-select: none;
    }
    .card-actions button {
      background: none; border: none; cursor: pointer; color: var(--text); opacity: 0.6; padding: 0 4px;
    }
    .card-actions button:hover { opacity: 1; color: var(--accent); }
    
    .card-content { flex: 1; overflow: auto; padding: 12px; position: relative; }
    
    /* Edit Mode inputs */
    textarea.editor {
      width: 100%; height: 200px; background: var(--code-bg); color: var(--code-text);
      border: none; padding: 10px; font-family: monospace; resize: vertical; box-sizing: border-box;
    }

    /* Content Types */
    .md-content img { max-width: 100%; }
    .csv-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .csv-table td, .csv-table th { border: 1px solid var(--border); padding: 4px; }
    
    /* HTML Preview Wrapper */
    .html-preview-wrapper {
      width: 100%; height: 300px; overflow: hidden; border: 1px dashed var(--border); position: relative;
    }
    .html-preview-scale {
      transform-origin: 0 0; transform: scale(0.75); width: 133%; height: 133%; 
    }
    
    .hidden { display: none !important; }
    
    /* Empty State / Drop Zone */
    #drop-zone {
      width: 100%; height: 80vh; display: flex; align-items: center; justify-content: center;
      border: 2px dashed var(--border); color: var(--text); opacity: 0.5;
    }
    body.has-cards #drop-zone { display: none; }
  </style>
</head>
<body>

<div id="card-container"></div>
<div id="drop-zone">Paste (Ctrl+V) content here or click + to start</div>

<div id="controls">
  <button class="btn-fab secondary" onclick="downloadAll()" title="Save Board">💾</button>
  <button class="btn-fab" onclick="addCard('', 'markdown')" title="Add Note">＋</button>
</div>

<script>
  // --- Logic ---
  const container = document.getElementById('card-container');
  const body = document.body;

  // Paste Handler
  document.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    
    let type = 'markdown';
    if (isHTML(text)) type = 'html';
    else if (isCSV(text)) type = 'csv';
    
    addCard(text, type);
  });

  function isHTML(str) {
    const trimmed = str.trim();
    return (trimmed.startsWith('<') && trimmed.endsWith('>'));
  }

  function isCSV(str) {
    const lines = str.trim().split('\\n');
    if (lines.length < 2) return false;
    const commas = (lines[0].match(/,/g) || []).length;
    return commas > 0 && (lines[1].match(/,/g) || []).length === commas;
  }

  function addCard(content, type) {
    body.classList.add('has-cards');
    const id = 'card-' + Date.now();
    
    const card = document.createElement('div');
    card.className = 'card';
    card.id = id;
    
    // Header
    card.innerHTML = \`
      <div class="card-header">
        <span class="badge">\${type.toUpperCase()}</span>
        <div class="card-actions">
          <button onclick="copyCard('\${id}')" title="Copy">📋</button>
          <button onclick="toggleEdit('\${id}')" title="Edit">✏️</button>
          <button onclick="downloadCard('\${id}')" title="Download Snippet">⬇️</button>
          <button onclick="deleteCard('\${id}')" title="Delete">❌</button>
        </div>
      </div>
      <div class="card-content view-mode"></div>
      <textarea class="editor hidden"></textarea>
    \`;

    // Data Storage
    card.dataset.content = content;
    card.dataset.type = type;
    
    // Editor
    const editor = card.querySelector('.editor');
    editor.value = content;
    editor.addEventListener('input', (e) => {
      card.dataset.content = e.target.value;
    });

    // Initial Render
    renderCard(card);
    container.appendChild(card);
  }

  function renderCard(card) {
    const content = card.dataset.content;
    const type = card.dataset.type;
    const view = card.querySelector('.card-content');
    
    view.innerHTML = ''; // Clear previous

    if (type === 'markdown') {
      view.classList.add('md-content');
      view.innerHTML = marked.parse(content);
    } 
    else if (type === 'csv') {
      const rows = content.trim().split('\\n');
      let html = '<table class="csv-table">';
      rows.forEach((r, i) => {
        html += '<tr>';
        r.split(',').forEach(c => html += \`<\${i===0?'th':'td'}>\${c.trim()}</\${i===0?'th':'td'}>\`);
        html += '</tr>';
      });
      html += '</table>';
      view.innerHTML = html;
    }
    else if (type === 'html') {
      const wrapper = document.createElement('div');
      wrapper.className = 'html-preview-wrapper';
      const scaler = document.createElement('div');
      scaler.className = 'html-preview-scale';
      
      // Shadow DOM for isolation
      const shadow = scaler.attachShadow({mode: 'open'});
      shadow.innerHTML = content;
      
      wrapper.appendChild(scaler);
      view.appendChild(wrapper);
    }
  }

  // --- Actions ---

  window.toggleEdit = (id) => {
    const card = document.getElementById(id);
    const view = card.querySelector('.card-content');
    const editor = card.querySelector('.editor');
    
    if (editor.classList.contains('hidden')) {
      // Switch to Edit
      editor.classList.remove('hidden');
      view.classList.add('hidden');
    } else {
      // Switch to View
      editor.classList.add('hidden');
      view.classList.remove('hidden');
      renderCard(card); // Re-render logic
    }
  };

  window.copyCard = (id) => {
    const content = document.getElementById(id).dataset.content;
    navigator.clipboard.writeText(content);
  };

  window.deleteCard = (id) => {
    if(confirm('Remove this card?')) document.getElementById(id).remove();
  };

  window.downloadCard = (id) => {
    const card = document.getElementById(id);
    const blob = new Blob([card.dataset.content], {type: "text/plain"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = \`snippet-\${id}.\${card.dataset.type === 'markdown' ? 'md' : 'txt'}\`;
    a.click();
  };

  window.downloadAll = () => {
    // Clone document to clean up for export
    const clone = document.documentElement.cloneNode(true);
    
    // Remove controls from the clone
    clone.querySelector('#controls').remove();
    
    // Ensure all cards are in view mode
    clone.querySelectorAll('.editor').forEach(e => e.classList.add('hidden'));
    clone.querySelectorAll('.card-content').forEach(e => e.classList.remove('hidden'));
    
    const blob = new Blob([clone.outerHTML], {type: "text/html"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "scratchpad-export.html";
    a.click();
  };
</script>
</body>
</html>
  `;
  win.document.write(htmlContent);
  win.document.close();
})();})();
