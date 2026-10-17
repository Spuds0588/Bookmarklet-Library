/**
 * @name 🗃️ Export local storage
 * @category devtools
 * @description Dump every local storage key for this domain into a readable page.
 * @tags localstorage, export, debug
 * @added 2026-10-17
 * @featured false
 */
void function(){(()=>{const a=a=>(a+"").replace(/[&<>'"]/g,a=>`&#${a.charCodeAt(0)};`),b=Object.keys(localStorage).map(b=>{let c=localStorage.getItem(b),d=c;try{d=JSON.stringify(JSON.parse(c),null,2)}catch(a){}return`<div class="r"><b style="color:#4af;font-size:1.1em">${a(b)}</b><pre>${a(d)}</pre></div>`}).join("")||"<p>Local storage is empty for this domain.</p>",c=window.open();return c?void(c.document.write(`    <title>Storage Dump: ${location.hostname}</title>    <style>      body { font-family: system-ui, sans-serif; background: #121212; color: #eee; padding: 2rem; }      .r { background: #1e1e1e; padding: 1rem; margin-bottom: 1rem; border: 1px solid #333; border-radius: 6px; }      pre { white-space: pre-wrap; color: #a8c7fa; word-break: break-all; margin-top: 0.5rem; }      input { width: 100%; box-sizing: border-box; padding: 0.75rem; margin-bottom: 1.5rem; background: #222; color: #fff; border: 1px solid #444; border-radius: 4px; font-size: 1rem; }    </style>    <input autofocus placeholder="Filter keys and values..." oninput="document.querySelectorAll('.r').forEach(r => r.style.display = r.innerText.toLowerCase().includes(this.value.toLowerCase()) ? '' : 'none')">    ${b}  `),c.document.close()):alert("Popup blocked! Please allow popups to view the storage dump.")})()}();
