/**
 * @name Clear cookies and cache
 * @category devtools
 * @description Clear local storage, cookies and cache for this site, then reload.
 * @tags cookies, cache, reset, storage
 * @added 2026-10-17
 * @featured false
 */
(async()=>{try{localStorage.clear(),sessionStorage.clear()}catch(e){}try{document.cookie.split(";").forEach(e=>{document.cookie=e.replace(/^ +/,"").replace(/=.*/,`=;expires=${new Date(0).toUTCString()};path=/`)})}catch(e){}try{if(window.caches){let e=await caches.keys();await Promise.all(e.map(e=>caches.delete(e)))}}catch(e){}window.location.reload();})();
