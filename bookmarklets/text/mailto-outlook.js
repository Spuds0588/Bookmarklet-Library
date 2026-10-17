/**
 * @name mailto → Outlook
 * @category text
 * @description Make mailto links open an Outlook compose window instead.
 * @tags email, outlook, mailto
 * @added 2026-10-17
 * @featured false
 */
void function(){(function(){window._outlookIntercept||(window._outlookIntercept=!0,document.addEventListener("click",b=>{const c=b.composedPath?b.composedPath():[b.target],d=c.find(a=>"A"===a.tagName&&a.getAttribute&&a.getAttribute("href")?.toLowerCase().startsWith("mailto:"))||b.target.closest&&b.target.closest("a[href^=\"mailto:\"]");if(!d)return;b.preventDefault(),b.stopPropagation();const[a,e]=d.getAttribute("href").substring(7).split("?"),f=new URLSearchParams(e||""),g=new URLSearchParams({to:decodeURIComponent(a)});["subject","body","cc","bcc"].forEach(a=>f.has(a)&&g.set(a,f.get(a)));const h=(screen.width-800)/2,i=(screen.height-600)/2;window.open(`https://outlook.office.com/mail/deeplink/compose?${g}`,"outlookCompose",`width=${800},height=${600},left=${h},top=${i}`)},!0),console.log("Mailto interceptor active: Links will now open in Outlook O365."))})()}();
