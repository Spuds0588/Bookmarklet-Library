/**
 * @name ✉️ mailto → Gmail
 * @category text
 * @description Make mailto links open a Gmail compose window instead.
 * @tags email, gmail, mailto
 * @added 2026-10-17
 * @featured false
 */
void function(){(function(){window._gmailIntercept||(window._gmailIntercept=!0,document.addEventListener("click",b=>{const c=b.composedPath?b.composedPath():[b.target],d=c.find(a=>"A"===a.tagName&&a.getAttribute&&a.getAttribute("href")?.toLowerCase().startsWith("mailto:"))||b.target.closest&&b.target.closest("a[href^=\"mailto:\"]");if(!d)return;b.preventDefault(),b.stopPropagation();const[a,e]=d.getAttribute("href").substring(7).split("?"),f=new URLSearchParams(e||""),h=new URLSearchParams({view:"cm",fs:"1",to:decodeURIComponent(a)});["subject","body","cc","bcc"].forEach(a=>f.has(a)&&h.set("subject"===a?"su":a,f.get(a)));const g=(screen.width-800)/2,i=(screen.height-600)/2;window.open(`https://mail.google.com/mail/?${h}`,"gmailCompose",`width=${800},height=${600},left=${g},top=${i}`)},!0),console.log("Mailto interceptor active (v2): Capture phase & Shadow DOM support enabled."))})()}();
