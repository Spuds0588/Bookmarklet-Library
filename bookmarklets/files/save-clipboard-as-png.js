/**
 * @name Save clipboard as .png
 * @category files
 * @description Download the image on your clipboard as a PNG file.
 * @tags clipboard, image, png, file
 * @added 2026-10-17
 * @featured false
 */
void function(){(async function(){try{const b=await navigator.clipboard.read();let c=null;for(const a of b){const b=a.types.find(a=>a.startsWith("image/"));if(b){c=await a.getType(b);break}}if(!c)return void alert("Clipboard is empty or does not contain image data.");const d=URL.createObjectURL(c),e=document.createElement("a");e.href=d,e.download=`clipboard_${Date.now()}.png`,e.style.display="none",document.body.appendChild(e),e.click(),setTimeout(()=>{document.body.removeChild(e),URL.revokeObjectURL(d)},100)}catch(a){console.error("Failed to read clipboard contents: ",a),alert("Failed to read clipboard. Ensure the page has focus, is an HTTPS site, and you have granted clipboard permissions.")}})()}();
