/**
 * @name Replace ads with placeholders
 * @category view
 * @description Swap ad slots for neutral gray blocks so screenshots look clean.
 * @tags ads, screenshot, clean
 * @added 2026-10-17
 * @featured false
 */
void function(){(function(){function a(){const a=document.querySelectorAll(b.join(", "));a.forEach(a=>{var b=Math.round;if(a.dataset.adReplaced)return;const d=a.getBoundingClientRect(),e=b(d.width),f=b(d.height);if(50<e&&50<f){const b=document.createElement("div");b.style.width=e+"px",b.style.height=f+"px",b.style.backgroundColor="rgba(128, 128, 128, 0.15)",b.style.borderRadius="4px",b.style.margin="auto",a.dataset.adReplaced="true","iframe"===a.tagName.toLowerCase()?a.parentNode&&(a.parentNode.replaceChild(b,a),c++):(a.innerHTML="",a.appendChild(b),c++)}})}const b=["iframe[src*=\"doubleclick.net\"]","iframe[src*=\"amazon-adsystem\"]","iframe[src*=\"googleads\"]","ins.adsbygoogle","[id^=\"div-gpt-ad\"]","[id*=\"taboola\"]","[id*=\"outbrain\"]","[aria-label=\"Advertisement\"]",".ad-container",".ad-slot",".ad-wrapper",".advertisement"];let c=0;a(),console.log(`Ghost Ad Blocker: Initially removed ${c} ads.`);let d;const e=new MutationObserver(()=>{clearTimeout(d),d=setTimeout(()=>{a()},500)});e.observe(document.body,{childList:!0,subtree:!0}),console.log("Ghost Ad Blocker: Observer active. Watching for new ads...")})()}();
