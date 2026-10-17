/**
 * @name Loom library to CSV
 * @category files
 * @description Export the title and URL of every Loom video loaded on the page.
 * @tags loom, csv, export, video
 * @added 2026-10-17
 * @featured false
 */
void function(){(()=>{const b=document.querySelectorAll(".video-card_videoCard_vn8"),c=[],d=new Set;if(b.forEach(a=>{const b=a.getAttribute("data-videoid"),e=a.querySelector("a.video-card_videoCardLink_Jvt");if(b&&e&&!d.has(b)){d.add(b);let a=e.getAttribute("aria-label")||"Untitled Video",f=a.replace(/^Open video:\s*/i,"");c.push({title:f,url:e.href})}}),0===c.length)return void alert("No videos found. Make sure you are on the Loom library page and have scrolled down to load the videos into the DOM.");let e="\uFEFFVideo Title,URL\n";c.forEach(a=>{let b=a.title.replace(/"/g,"\"\"");e+=`"${b}","${a.url}"\n`});const f=new Blob([e],{type:"text/csv;charset=utf-8;"}),g=URL.createObjectURL(f),h=document.createElement("a");h.href=g;const a=new Date().toISOString().split("T")[0];h.download=`Loom_Videos_${a}.csv`,document.body.appendChild(h),h.click(),document.body.removeChild(h),URL.revokeObjectURL(g)})()}();
