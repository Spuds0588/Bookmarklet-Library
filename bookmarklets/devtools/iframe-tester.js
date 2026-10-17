/**
 * @name 🪟 iFrame tester
 * @category devtools
 * @description Load any URL in an iframe overlay to test embedding.
 * @tags iframe, embed, test
 * @added 2026-10-17
 * @featured false
 */
(function(){javascript:(function(){
  /* 1. Clean up existing modal */
  var old = document.getElementById('iframe-tester-modal');
  if(old) old.remove();

  /* 2. Ask for URL */
  var url = prompt("Enter URL to embed:", "https://");
  if(!url) return;

  /* 3. Create elements using pure DOM methods (Avoids HTML string injection) */
  var overlay = document.createElement('div');
  overlay.id = 'iframe-tester-modal';
  
  /* Apply styles directly */
  Object.assign(overlay.style, {
    position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
    background: 'rgba(0,0,0,0.85)', zIndex: '2147483647',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif'
  });

  var box = document.createElement('div');
  Object.assign(box.style, {
    width: '90%', height: '90%', background: '#fff', display: 'flex',
    flexDirection: 'column', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 10px 25px #000'
  });

  var header = document.createElement('div');
  Object.assign(header.style, {
    padding: '12px', background: '#eee', borderBottom: '1px solid #ccc',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  });

  var title = document.createElement('span');
  title.innerText = 'Testing: ' + url;
  title.style.fontWeight = 'bold';

  var closeBtn = document.createElement('button');
  closeBtn.innerText = 'Close X';
  Object.assign(closeBtn.style, {
    padding: '6px 12px', background: '#d00', color: '#fff', border: 'none',
    borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
  });
  
  /* Attach event listener safely */
  closeBtn.addEventListener('click', function(){ overlay.remove(); });

  var iframe = document.createElement('iframe');
  iframe.src = url;
  Object.assign(iframe.style, {
    flexGrow: '1', border: 'none', width: '100%', background: '#fff'
  });

  /* 4. Assemble */
  header.appendChild(title);
  header.appendChild(closeBtn);
  box.appendChild(header);
  box.appendChild(iframe);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
})();})();
