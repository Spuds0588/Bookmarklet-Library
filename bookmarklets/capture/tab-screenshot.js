/**
 * @name Tab screenshot
 * @category capture
 * @description Capture the visible tab and download it as a PNG named after the page.
 * @tags screenshot, png, tab
 * @added 2026-10-17
 * @featured false
 */
void function(){(async()=>{try{const s=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:"browser"},preferCurrentTab:!0});const t=s.getVideoTracks()[0];const v=document.createElement('video');v.srcObject=s;await new Promise(r=>{v.onloadedmetadata=()=>{v.play().then(r)}});await new Promise(r=>setTimeout(r,150));const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);t.stop();const b=await new Promise(r=>c.toBlob(r,'image/png'));const d=new Date().toISOString().replace(/T/,'_').replace(/:/g,'-').split('.')[0];const l=window.location.hostname.replace(/[^a-zA-Z0-9]/g,'_')||'local';const f=`screenshot_${l}_${d}.png`;if(window.showSaveFilePicker)try{const h=await window.showSaveFilePicker({suggestedName:f,types:[{description:'PNG',accept:{'image/png':['.png']}}]});const w=await h.createWritable();await w.write(b);await w.close()}catch(e){if(e.name!=='AbortError'){const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=f;a.click();setTimeout(()=>URL.revokeObjectURL(u),100)}}else{const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=f;a.click();setTimeout(()=>URL.revokeObjectURL(u),100)}}catch(e){console.error(e);alert('Screenshot failed: '+e.message)}})()}();
