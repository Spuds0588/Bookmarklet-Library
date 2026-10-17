/**
 * @name ✍️ Draw on page
 * @category annotate
 * @description Draw freehand on a transparent layer over the page; press Escape to clear.
 * @tags draw, canvas, annotate
 * @added 2026-10-17
 * @featured false
 */
void function(){(()=>{if(document.getElementById("rm-canvas"))return;let a=document.createElement("canvas"),b=a.getContext("2d"),c=0;a.id="rm-canvas",a.style.cssText=`position:fixed;inset:0;z-index:2147483647;cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='red' stroke='black' stroke-width='1'%3E%3Cpath d='M1 23v-4l14-14 4 4-14 14H1zm15-15l4-4'/%3E%3C/svg%3E") 1 23, crosshair;`,document.body.appendChild(a);let d=()=>{a.width=window.innerWidth,a.height=window.innerHeight,b.strokeStyle="red",b.lineWidth=4,b.lineCap="round"};d(),window.addEventListener("resize",d),a.onmousedown=a=>{c=1,b.beginPath(),b.moveTo(a.clientX,a.clientY)},a.onmousemove=a=>{c&&(b.lineTo(a.clientX,a.clientY),b.stroke())},a.onmouseup=a.onmouseout=()=>c=0;let f=c=>{"Escape"===c.key&&(a.remove(),window.removeEventListener("resize",d),document.removeEventListener("keydown",f)),"r"===c.key.toLowerCase()&&b.clearRect(0,0,a.width,a.height)};document.addEventListener("keydown",f)})()}();
