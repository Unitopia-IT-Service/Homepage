(()=>{
const $=s=>document.querySelector(s),cfg=window.UNITOPIA_CONFIG||{};
const sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY),dlg=$("#dlg");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dde=d=>d?new Date(d).toLocaleDateString("de-DE"):"—";let rows=[],isAdmin=false;
const TYPES=["Desktop-PC","Laptop","Monitor","Drucker","Smartphone / Tablet","Sonstiges"];
// Protokollarten: Felder [name,Beschriftung,Typ,Pflicht]
const DEFS={
 annahme:{label:"Annahmeprotokoll (Gerät annehmen)",title:"Annahmeprotokoll",sig:"Unterschrift des Kunden",
  fields:[["name","Kundenname","text",1],["phone","Telefon","tel"],["email","E-Mail","email"],["type","Gerät","select"],["model","Marke / Modell"],["serial","Seriennummer"],["problem","Fehlerbeschreibung","area"],["state","Äußerer Zustand (Kratzer, Schäden …)","area"],["acc","Mitgegebenes Zubehör","area"],["job","Gewünschte Leistung","area"],["limit","Kosten ohne Rückfrage bis (€)","number"]],
  checks:["Der Kunde wurde auf die Notwendigkeit einer eigenen Datensicherung hingewiesen.","Der Kunde hat die Angaben geprüft und bestätigt sie mit seiner Unterschrift."],
  text:"Es gelten die gesetzlichen Haftungsbestimmungen. Die Daten werden zur Auftragsabwicklung gespeichert."},
 rueckgabe:{label:"Rückgabeprotokoll (Gerät zurückgeben)",title:"Rückgabeprotokoll",sig:"Unterschrift des Kunden",
  fields:[["name","Kundenname","text",1],["ref","Bezug Annahmeprotokoll (Nr.)"],["model","Gerät (Art, Marke / Modell)"],["serial","Seriennummer"],["work","Durchgeführte Arbeiten","area"],["parts","Ersetzte / eingebaute Teile","area"],["notes","Hinweise an den Kunden","area"]],
  checks:["Das Gerät wurde nach der Arbeit auf Funktion geprüft.","Das gesamte mitgegebene Zubehör wurde zurückgegeben.","Der Kunde bestätigt den Erhalt des Geräts."],text:"Die gesetzlichen Rechte des Kunden bleiben unberührt."},
 abnahme:{label:"Abnahmeprotokoll (Webseite / Leistung)",title:"Abnahmeprotokoll",sig:"Unterschrift des Kunden",
  fields:[["name","Kundenname","text",1],["email","E-Mail","email"],["project","Projekt / Webseiten-Adresse","text",1],["scope","Leistungsumfang","area"],["open","Offene Punkte / bekannte Mängel","area"]],
  checks:["Die vereinbarte Leistung wurde vorgeführt und übergeben.","Zugangsdaten und Zugriffe wurden übergeben.","Der Kunde erklärt die Abnahme der Leistung (offene Punkte siehe oben)."],text:"Die gesetzlichen Rechte des Kunden bleiben unberührt."}};
const defOf=r=>DEFS[r.data.kind||"annahme"]||DEFS.annahme;
async function load(){const {data,error}=await sb.from("device_intakes").select("*").order("created_at",{ascending:false}).limit(500);if(error)throw error;rows=data;draw()}
function draw(){const q=$("#q").value.toLowerCase(),r=rows.filter(x=>!q||JSON.stringify(x.data).toLowerCase().includes(q)||x.no.toLowerCase().includes(q));
 $("#list").innerHTML=`<div class="tw"><table class="t"><thead><tr><th>Nr.</th><th>Art</th><th>Datum</th><th>Kunde</th><th>Betreff</th><th></th></tr></thead><tbody>${r.map(x=>`<tr class="r" data-id="${x.id}"><td>${esc(x.no)}</td><td>${esc(defOf(x).title)}</td><td>${dde(x.created_at)}</td><td>${esc(x.data.name)}</td><td>${esc(x.data.model||x.data.project||"")}</td><td>${isAdmin?`<a href="#" data-del="${x.id}">Löschen</a>`:""}</td></tr>`).join("")||'<tr><td colspan="6" class="hint">Keine Protokolle.</td></tr>'}</tbody></table></div>`}
function field([n,l,t="text",req]){const r=req?"required":"";return t==="area"?`<label class="w">${l}<textarea name="${n}" rows="3"></textarea></label>`:t==="select"?`<label>${l}<select name="${n}">${TYPES.map(x=>`<option>${x}</option>`).join("")}</select></label>`:`<label>${l}<input name="${n}" type="${t==="number"?"number":t}" ${t==="number"?'min="0" step="1"':""} ${r}></label>`}
function form(kind){const D=DEFS[kind];dlg.innerHTML=`<button data-close style="position:absolute;right:12px;top:8px;background:none;border:0;color:#fff;font-size:24px;cursor:pointer">×</button><h3>${D.title}</h3><form id="f"><div class="fg">${D.fields.map(field).join("")}</div>
 <p class="hint">Passwörter oder PINs bitte nicht in das Protokoll schreiben.</p>${D.checks.map((c,i)=>`<label style="display:flex;gap:8px;margin:10px 0"><input type="checkbox" name="c${i}" required style="width:auto"> ${c}</label>`).join("")}
 <p class="hint" style="margin:6px 0">${D.sig} (mit Finger oder Maus):</p><canvas id="sig" width="600" height="180" style="background:#fff;border-radius:8px;max-width:100%;touch-action:none"></canvas>
 <div class="acc-bar" style="margin-top:12px"><button class="button button-primary" type="submit">Speichern & Protokoll drucken</button><button class="button button-ghost" type="button" id="clr">Unterschrift löschen</button><button class="button button-ghost" type="button" data-close>Abbrechen</button></div><p id="err" class="admin-error" role="alert"></p></form>`;
 dlg.showModal();const c=$("#sig"),x=c.getContext("2d");let on=false,drawn=false;x.lineWidth=3;x.lineCap="round";x.strokeStyle="#111";
 const pt=e=>{const r=c.getBoundingClientRect();return [(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
 c.onpointerdown=e=>{on=true;c.setPointerCapture(e.pointerId);const [a,b]=pt(e);x.beginPath();x.moveTo(a,b)};c.onpointermove=e=>{if(!on)return;const [a,b]=pt(e);x.lineTo(a,b);x.stroke();drawn=true};c.onpointerup=()=>on=false;
 $("#clr").onclick=()=>{x.clearRect(0,0,c.width,c.height);drawn=false};
 $("#f").onsubmit=async e=>{e.preventDefault();if(!drawn){$("#err").textContent="Bitte zuerst unterschreiben lassen.";return}
  const o=Object.fromEntries(new FormData(e.target));D.checks.forEach((_,i)=>delete o["c"+i]);o.kind=kind;o.checks=D.checks;
  const {data,error}=await sb.from("device_intakes").insert({data:o,signature:c.toDataURL("image/png")}).select().single();
  if(error){$("#err").textContent="Fehler: "+error.message+" (Wurde annahme.sql in Supabase ausgeführt?)";return}rows.unshift(data);dlg.close();draw();print(data)}}
function print(r){const d=r.data,D=defOf(r),w=window.open("","_blank");if(!w){alert("Bitte Pop-ups erlauben.");return}
 const row=(a,b)=>b?`<tr><td style="width:34%"><b>${esc(a)}</b></td><td>${esc(b).replace(/\n/g,"<br>")}</td></tr>`:"";
 w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(r.no)}</title><style>body{font:13px Arial,sans-serif;color:#111;margin:30px auto;max-width:760px}table{width:100%;border-collapse:collapse;margin:10px 0}td{padding:6px;border-bottom:1px solid #ddd;vertical-align:top}h2{margin:18px 0 4px}.f{margin-top:26px;border-top:1px solid #999;padding-top:8px;font-size:10px;color:#444}@media print{body{margin:0}}</style>
 <img src="${new URL("assets/logo-wortmarke.webp",location.href).href}" height="42" style="float:right" alt=""><p style="font-size:10px;color:#555">Unitopia IT-Service · Inh. André Kasper · Hosangweg 2 · 18528 Bergen auf Rügen</p><h2 style="font-size:20px">${D.title} ${esc(r.no)}</h2><p>Datum: ${new Date(r.created_at).toLocaleString("de-DE")}</p>
 <table>${D.fields.map(([n,l])=>row(l,n==="limit"&&d[n]?d[n]+" €":d[n])).join("")}</table>
 <p>${(d.checks||D.checks).map(c=>"☑ "+esc(c)).join("<br>")}</p><p>${D.text}</p>
 <p style="margin-top:24px">${D.sig}:<br><img src="${r.signature}" height="70" alt="Unterschrift"><br><small>${esc(d.name)} · ${new Date(r.created_at).toLocaleDateString("de-DE")}</small></p>
 <div class="f">Unitopia IT-Service · Inh. André Kasper · Tel. 0155 67945706 · Unitopia.itservice@gmx.de</div><script>onload=()=>setTimeout(print,400)<\/script>`);w.document.close()}
document.addEventListener("click",async e=>{if(e.target.closest("[data-close]")){dlg.close();return}
 const del=e.target.closest("[data-del]");if(del){e.preventDefault();e.stopPropagation();if(!confirm("Protokoll endgültig löschen? Das kann nicht rückgängig gemacht werden."))return;const {error}=await sb.from("device_intakes").delete().eq("id",del.dataset.del);if(error){alert("Löschen nicht möglich: "+error.message+" (annahme.sql erneut ausführen?)");return}rows=rows.filter(x=>x.id!==del.dataset.del);draw();return}
 const tr=e.target.closest("tr[data-id]");if(tr)print(rows.find(x=>x.id===tr.dataset.id))});
$("#kind").innerHTML=Object.entries(DEFS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("");
$("#new").onclick=()=>form($("#kind").value);$("#q").oninput=draw;
(async()=>{const m=$("#acc-msg");try{const {data:{session}}=await sb.auth.getSession();if(!session){m.innerHTML='Bitte zuerst im <a href="app.html">Mitarbeiterbereich anmelden</a>.';return}
 const {data:p}=await sb.from("profiles").select("active,role").eq("id",session.user.id).maybeSingle();if(!p?.active){m.textContent="Kein Zugriff.";return}isAdmin=p.role==="admin";
 await load();m.hidden=true;$("#acc-app").hidden=false}catch(err){m.innerHTML="Datenbank nicht bereit: "+esc(err.message||err)+"<br>Bitte <code>supabase/annahme.sql</code> im Supabase SQL-Editor ausführen."}})();
})();
