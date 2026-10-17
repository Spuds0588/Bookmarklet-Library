/**
 * @name 📊 Save clipboard as .csv
 * @category files
 * @description Download the clipboard text as a CSV file.
 * @tags clipboard, csv, file
 * @added 2026-10-17
 * @featured false
 */
"use strict";void function(){javascript:(async()=>{try{const b=await navigator.clipboard.readText(),c=new Blob([b],{type:"text/csv"}),d=URL.createObjectURL(c),e=document.createElement("a");e.href=d,e.download="clipboard.csv",document.body.appendChild(e),e.click(),document.body.removeChild(e),URL.revokeObjectURL(d)}catch(a){console.error("Failed to read clipboard contents: ",a),alert("Failed to read clipboard contents. Please make sure you have granted permission to read from the clipboard.")}})()}();
