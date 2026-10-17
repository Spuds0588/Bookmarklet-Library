/**
 * @name New Excalidraw room
 * @category files
 * @description Open a fresh collaborative Excalidraw canvas in a new tab.
 * @tags excalidraw, whiteboard, diagram
 * @added 2026-10-17
 * @featured false
 */
(function(){function rH(l){let r="";const c="0123456789abcdef";for(let i=0;i<l;i++)r+=c[Math.floor(Math.random()*16)];return r}function rB(l){let r="";const c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";for(let i=0;i<l;i++)r+=c[Math.floor(Math.random()*64)];return r}window.open("https://excalidraw.com/#room="+rH(20)+","+rB(22),'_blank');})();
