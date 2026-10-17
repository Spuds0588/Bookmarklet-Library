/**
 * @name Audio player in PiP
 * @category view
 * @description Move the page's audio player into a floating picture-in-picture window.
 * @tags audio, pip, player
 * @added 2026-10-17
 * @featured false
 */
void function(){(async()=>{if(!window.documentPictureInPicture)return alert("Document PiP is not supported in this browser.");const a=document.querySelector(".audio-wrapper");if(!a)return alert("Audio player not found.");const b=document.createElement("div");a.replaceWith(b);const c=await documentPictureInPicture.requestWindow({width:a.offsetWidth+20||400,height:a.offsetHeight+20||150});document.querySelectorAll("style, link[rel=\"stylesheet\"]").forEach(a=>c.document.head.append(a.cloneNode(!0))),Object.assign(c.document.body.style,{margin:"0",padding:"10px",background:"#fff"}),c.document.body.append(a),c.addEventListener("pagehide",()=>b.replaceWith(a))})()}();
