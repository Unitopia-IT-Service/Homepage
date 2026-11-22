(()=>{
const $=s=>document.querySelector(s),cfg=window.UNITOPIA_CONFIG||{};
const sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY),dlg=$("#dlg");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dde=d=>d?new Date(d).toLocaleDateString("de-DE"):"—";let rows=[];
const TYPES=["Desktop-PC","Laptop","Monitor","Drucker","Smartphone / Tablet","Sonstiges"];
const f=(l,n,a="",c="")=>`<label class="${c}">${l}<input name="${n}" ${a}></label>`;
const ta=(l,n,c="w")=>`<label class="${c}">${l}<textarea name="${n}" rows="3"></textarea></label>`;
async function load(){const {data,error}=await sb.from("device_intakes").select("*").order("created_at",{ascending:false}).limit(500);if(error)throw error;rows=data;draw()}
function draw(){const q=$("#q").value.toLowerCase(),r=rows.filter(x=>!q||JSON.stringify(x.data).toLowerCase().includes(q)||x.no.toLowerCase().includes(q));
 $("#list").innerHTML=`<div class="tw"><table class="t"><thead><tr><th>Nr.</th><th>Datum</th><th>Kunde</th><th>Gerät</th><th>Fehler</th></tr></thead><tbody>${r.map(x=>`<tr class="r" data-id="${x.id}"><td>${esc(x.no)}</td><td>${dde(x.created_at)}</td><td>${esc(x.data.name)}</td><td>${esc(x.data.type+" "+(x.data.model||""))}</td><td>${esc((x.data.problem||"").slice(0,60))}</td></tr>`).join("")||'<tr><td colspan="5" class="hint">Keine Protokolle.</td></tr>'}</tbody></table></div>`}
function form(){dlg.innerHTML=`<button data-close style="position:absolute;right:12px;top:8px;background:none;border:0;color:#fff;font-size:24px;cursor:pointer">×</button><h3>Neues Annahmeprotokoll</h3><form id="f"><div class="fg">
 ${f("Kundenname","name","required")}${f("Telefon","phone",'type="tel"')}${f("E-Mail","email",'type="email"')}
 <label>Gerät<select name="type">${TYPES.map(t=>`<option>${t}</option>`).join("")}</select></label>${f("Marke / Modell","model")}${f("Seriennummer","serial")}
 ${ta("Fehlerbeschreibung (Was ist das Problem?)","problem")}${ta("Äußerer Zustand (Kratzer, Schäden, …)","state")}${ta("Mitgegebenes Zubehör (Netzteil, Tasche, …)","acc")}${ta("Gewünschte Leistung","job")}
 ${f("Kosten ohne Rückfrage bis (€)","limit",'type="number" min="0" step="1"')}</div>
 <p class="hint">Passwörter oder PINs bitte nicht in das Protokoll schreiben.</p>
 <label style="display:flex;gap:8px;margin:12px 0"><input type="checkbox" name="backup" required style="width:auto"> Der Kunde wurde auf die Notwendigkeit einer eigenen Datensicherung hingewiesen.</label>
 <label style="display:flex;gap:8px;margin:12px 0"><input type="checkbox" name="agree" required style="width:auto"> Der Kunde hat die Angaben geprüft und bestätigt sie mit seiner Unterschrift.</label>
 <p class="hint" style="margin:6px 0">Unterschrift des Kunden (mit Finger oder Maus):</p><canvas id="sig" width="600" height="180" style="background:#fff;border-radius:8px;max-width:100%;touch-action:none"></canvas>
 <div class="acc-bar" style="margin-top:12px"><button class="button button-primary" type="submit">Speichern & Protokoll drucken</button><button class="button button-ghost" type="button" id="clr">Unterschrift löschen</button><button class="button button-ghost" type="button" data-close>Abbrechen</button></div><p id="err" class="admin-error" role="alert"></p></form>`;
 dlg.showModal();const c=$("#sig"),x=c.getContext("2d");let on=false,drawn=false;x.lineWidth=3;x.lineCap="round";x.strokeStyle="#111";
 const pt=e=>{const r=c.getBoundingClientRect();return [(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
 c.onpointerdown=e=>{on=true;c.setPointerCapture(e.pointerId);const [a,b]=pt(e);x.beginPath();x.moveTo(a,b)};c.onpointermove=e=>{if(!on)return;const [a,b]=pt(e);x.lineTo(a,b);x.stroke();drawn=true};c.onpointerup=()=>on=false;
 $("#clr").onclick=()=>{x.clearRect(0,0,c.width,c.height);drawn=false};
 $("#f").onsubmit=async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));if(!drawn){$("#err").textContent="Bitte zuerst unterschreiben lassen.";return}
  o.backup=true;o.agree=true;const {data,error}=await sb.from("device_intakes").insert({data:o,signature:c.toDataURL("image/png")}).select().single();
  if(error){$("#err").textContent="Fehler: "+error.message+" (Wurde annahme.sql in Supabase ausgeführt?)";return}rows.unshift(data);dlg.close();draw();print(data)}}
function print(r){const d=r.data,w=window.open("","_blank");if(!w){alert("Bitte Pop-ups erlauben.");return}
 const row=(a,b)=>b?`<tr><td style="width:34%"><b>${a}</b></td><td>${esc(b).replace(/\n/g,"<br>")}</td></tr>`:"";
 w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(r.no)}</title><style>body{font:13px Arial,sans-serif;color:#111;margin:30px auto;max-width:760px}table{width:100%;border-collapse:collapse;margin:10px 0}td{padding:6px;border-bottom:1px solid #ddd;vertical-align:top}h2{margin:18px 0 4px}.f{margin-top:26px;border-top:1px solid #999;padding-top:8px;font-size:10px;color:#444}@media print{body{margin:0}}</style>
 <img src="${new URL("assets/logo-wortmarke.webp",location.href).href}" height="42" style="float:right" alt=""><p style="font-size:10px;color:#555">Unitopia IT-Service · Inh. André Kasper · Hosangweg 2 · 18528 Bergen auf Rügen</p><h2 style="font-size:20px">Annahmeprotokoll ${esc(r.no)}</h2><p>Datum: ${new Date(r.created_at).toLocaleString("de-DE")}</p>
 <h2>Kunde</h2><table>${row("Name",d.name)}${row("Telefon",d.phone)}${row("E-Mail",d.email)}</table>
 <h2>Gerät</h2><table>${row("Art",d.type)}${row("Marke / Modell",d.model)}${row("Seriennummer",d.serial)}${row("Fehlerbeschreibung",d.problem)}${row("Äußerer Zustand",d.state)}${row("Mitgegebenes Zubehör",d.acc)}${row("Gewünschte Leistung",d.job)}${d.limit?row("Kosten ohne Rückfrage bis",d.limit+" €"):""}</table>
 <p>Der Kunde wurde auf die Notwendigkeit einer eigenen Datensicherung vor der Bearbeitung hingewiesen. Es gelten die gesetzlichen Haftungsbestimmungen. Die Daten werden zur Auftragsabwicklung gespeichert.</p>
 <p style="margin-top:24px">Unterschrift Kunde:<br><img src="${r.signature}" height="70" alt="Unterschrift"><br><small>${esc(d.name)} · ${new Date(r.created_at).toLocaleDateString("de-DE")}</small></p>
 <div class="f">Unitopia IT-Service · Inh. André Kasper · Tel. 0155 67945706 · Unitopia.itservice@gmx.de</div><script>onload=()=>setTimeout(print,400)<\/script>`);w.document.close()}
document.addEventListener("click",e=>{if(e.target.closest("[data-close]"))dlg.close();const tr=e.target.closest("tr[data-id]");if(tr)print(rows.find(x=>x.id===tr.dataset.id))});
$("#new").onclick=form;$("#q").oninput=draw;
(async()=>{const m=$("#acc-msg");try{const {data:{session}}=await sb.auth.getSession();if(!session){m.innerHTML='Bitte zuerst im <a href="app.html">Mitarbeiterbereich anmelden</a>.';return}
 const {data:p}=await sb.from("profiles").select("active").eq("id",session.user.id).maybeSingle();if(!p?.active){m.textContent="Kein Zugriff.";return}
 await load();m.hidden=true;$("#acc-app").hidden=false}catch(err){m.innerHTML="Datenbank nicht bereit: "+esc(err.message||err)+"<br>Bitte <code>supabase/annahme.sql</code> im Supabase SQL-Editor ausführen."}})();
})();
