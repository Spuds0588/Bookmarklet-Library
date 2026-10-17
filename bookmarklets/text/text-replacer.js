/**
 * @name Replace text on page
 * @category text
 * @description Find and replace text inside the page's inputs and textareas.
 * @tags find, replace, forms
 * @added 2026-10-17
 * @featured false
 */
void function(){(()=>{const a=prompt("Enter the exact text to find and replace:");if(!a)return;const b=prompt(`Replace "${a}" with:\n(Leave blank to delete the text)`);if(null===b)return;let c=0;const d=`(?<email>[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})|(?<url>https?:\\/\\/[^\\s]+)|(?<target>${(a=>a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"))(a)})`,e=new RegExp(d,"g"),f=(a,...d)=>{const e=d[d.length-1];return e&&void 0!==e.target?(c++,b):a},g=document.querySelectorAll("input:not([type=\"hidden\"]):not([type=\"submit\"]):not([type=\"button\"]), textarea"),h=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value")?.set,i=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,"value")?.set;g.forEach(a=>{const b=a.value;if(b){const c=b.replace(e,f);c!==b&&("INPUT"===a.tagName&&h?h.call(a,c):"TEXTAREA"===a.tagName&&i?i.call(a,c):a.value=c,a.dispatchEvent(new Event("input",{bubbles:!0})),a.dispatchEvent(new Event("change",{bubbles:!0})))}});const j=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,!1);for(let a;a=j.nextNode();){if(a.parentElement&&["SCRIPT","STYLE","NOSCRIPT"].includes(a.parentElement.tagName))continue;const b=a.nodeValue,c=b.replace(e,f);if(c!==b){a.nodeValue=c;for(let b=a.parentElement;b&&b!==document.body;){if(b.isContentEditable){b.dispatchEvent(new Event("input",{bubbles:!0}));break}b=b.parentElement}}}0<c?alert(`Success! Replaced ${c} instance(s) of "${a}" with "${b}".`):alert(`No exact matches for "${a}" were found.`)})()}();
