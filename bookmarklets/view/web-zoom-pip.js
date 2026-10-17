/**
 * @name 🔬 Web Zoom in PiP
 * @category view
 * @description Move the Zoom web client into a picture-in-picture window.
 * @tags zoom, pip, meetings
 * @added 2026-10-17
 * @featured false
 */
void function(){(async function(){if(!("documentPictureInPicture"in window))return void alert("Document Picture-in-Picture API is not supported in this browser.");if(window.activePipWindow)return void console.log("PiP window is already active.");const a=document.querySelector("#root, #wc-root, #zmm-root, #zoom-ui-framework, .webclient-core-container")||document.body.firstElementChild;if(!a)return void alert("Could not find the main Zoom application container.");const b=a.parentNode,c=a.nextSibling;try{const d=await window.documentPictureInPicture.requestWindow({width:window.innerWidth||800,height:window.innerHeight||600});window.activePipWindow=d,[...document.styleSheets].forEach(a=>{try{if(a.href){const b=document.createElement("link");b.rel="stylesheet",b.href=a.href,d.document.head.appendChild(b)}else if(a.ownerNode&&a.ownerNode.textContent){const b=document.createElement("style");b.textContent=a.ownerNode.textContent,d.document.head.appendChild(b)}}catch(a){console.warn("Could not copy a stylesheet:",a)}});const e=d.document.createElement("style");e.textContent=`body { margin: 0; padding: 0; overflow: hidden; background: #222; }`,d.document.head.appendChild(e),d.document.body.appendChild(a),d.addEventListener("pagehide",()=>{c?b.insertBefore(a,c):b.appendChild(a),window.dispatchEvent(new Event("resize")),window.activePipWindow=null})}catch(a){console.error("Failed to open PiP window:",a),alert("Failed to open PiP window. Check console for details.")}})()}();
