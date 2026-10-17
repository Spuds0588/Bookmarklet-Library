/**
 * @name ↗️ iFrame to new tab
 * @category devtools
 * @description Open the page's iframe source in a new tab.
 * @tags iframe, tab, open
 * @added 2026-10-17
 * @featured false
 */
void function(){(function(){const a=document.querySelectorAll("iframe");let b=null;for(let c=0;c<a.length;c++)if(a[c].src&&a[c].src.toLowerCase().includes("tableau")){b=a[c].src;break}!b&&0<a.length&&(b=a[0].src),b?window.open(b,"_blank"):alert("No iframes found on this page.")})()}();
