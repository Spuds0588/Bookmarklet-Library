/**
 * @name 🌓 Toggle light / dark
 * @category view
 * @description Force the page into the opposite color scheme.
 * @tags dark mode, theme, color scheme
 * @added 2026-10-17
 * @featured false
 */
(()=>{const d=document.documentElement,on=d.dataset.forceLight!=='1';d.dataset.forceLight=on?'1':'0';d.style.colorScheme=on?'light':'';const f=rs=>{for(const r of rs){if(r.media&&/prefers-color-scheme/.test(r.media.mediaText))r.media.mediaText=r.media.mediaText.replace(/dark/g,'_x').replace(/light/g,'dark').replace(/_x/g,'light');if(r.cssRules)f(r.cssRules)}};for(const s of document.styleSheets){try{f(s.cssRules)}catch(e){}}})()
