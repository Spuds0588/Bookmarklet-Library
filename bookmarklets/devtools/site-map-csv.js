/**
 * @name 🗺️ Site map to CSV
 * @category devtools
 * @description Export every internal link on the page to a CSV.
 * @tags links, csv, crawl, seo
 * @added 2026-10-17
 * @featured false
 */
void function(){javascript:(function(){const b=window.location.hostname,c=Array.from(document.querySelectorAll("a[href]")).filter(a=>a.hostname===b),d=["Text,URL"];c.forEach(a=>{d.push(`"${a.innerText.trim().replace(/"/g,"\"\"")}","${a.href}"`)});const e=new Blob([d.join("\n")],{type:"text/csv"}),f=window.URL.createObjectURL(e),g=document.createElement("a");g.href=f,g.download=`${b}_internal_links.csv`,g.click()})()}();
