/**
 * @name Generate passphrase
 * @category text
 * @description Generate a four-word passphrase and copy it to the clipboard.
 * @tags passphrase, security, generate
 * @added 2026-10-17
 * @featured false
 */
void function(){(function(){const a=["apple","beach","brain","bread","brush","chair","cloud","dance","desk","earth","field","floor","fruit","glass","grape","green","heart","house","juice","light","lemon","money","month","mount","music","night","ocean","paper","phone","piano","pilot","plant","point","river","round","scene","shirt","shoes","small","smile","snake","space","spoon","storm","table","tiger","toast","touch","train","trees","voice","water","watch","whale","world","write","youth","zebra","stone","flame"],b=()=>a[Math.floor(Math.random()*a.length)],c=(b()+b()+b()+b()).toLowerCase();navigator.clipboard.writeText(c).then(()=>{alert("Copied: "+c)}).catch(a=>{alert("Failed to copy: "+a)})})()}();
