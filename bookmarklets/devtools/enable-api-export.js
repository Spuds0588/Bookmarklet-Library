/**
 * @name Enable API doc export
 * @category devtools
 * @description Unlock the export button in Stoplight API docs.
 * @tags api, docs, export
 * @added 2026-10-17
 * @featured false
 */
void function(){javascript:(function(){const a=document.querySelector("elements-api");a?(a.removeAttribute("hideexport"),a.hideExport=!1,alert("Export feature unlocked! Look near the top right of the API documentation for the Export button.")):alert("API component not found. Make sure the modal is open.")})()}();
