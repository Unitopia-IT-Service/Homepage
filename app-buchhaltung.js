// Reiter „Buchhaltung“ in der Mitarbeiter-App – nur für Admins (Inhaber/Gründer).
(()=>{
const cfg=window.UNITOPIA_CONFIG||{};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eur=n=>(+n||0).toLocaleString("de-DE",{style:"currency",currency:"EUR"});
const num=v=>parseFloat(String(v).replace(",","."))||0,r2=n=>Math.round((n+Number.EPSILON)*100)/100;
const today=()=>new Date().toISOString().slice(0,10);
const CATS=["Einkauf von Computerhardware","Einkauf von Ersatzteilen","Einkauf von Computerzubehör","Softwarelizenzen","Webhosting","Domains","Serverkosten","Internet und Telefon","Büromaterial","Werbung und Marketing","Betriebskosten","Sonstige betriebliche Ausgaben"];
let sb,built=false,kl=false,file=null;
window.addEventListener("load",()=>{if(!window.supabase)return;sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 sb.auth.onAuthStateChange((_e,s)=>{if(s)check(s.user);else teardown()});sb.auth.getSession().then(({data:{session}})=>session&&check(session.user))});
function teardown(){$("#acc-tabs")?.remove();$("#tab-buchhaltung")?.remove();built=false;const a=$("#tab-auftraege");if(a)a.hidden=false}
async function check(user){if(built)return;const {data:p}=await sb.from("profiles").select("role,active").eq("id",user.id).maybeSingle();
 if(!p||!p.active||p.role!=="admin")return;build()}
function build(){if(built||!$("#tab-auftraege"))return;built=true;
 const nav=document.createElement("nav");nav.id="acc-tabs";nav.style.cssText="display:flex;gap:8px;margin:6px 0 14px";
 nav.innerHTML=`<button class="button button-primary" data-t="a" type="button">Aufträge</button><button class="button button-ghost" data-t="b" type="button">Buchhaltung</button>`;
 $("#tab-auftraege").before(nav);
 const sec=document.createElement("div");sec.id="tab-buchhaltung";sec.hidden=true;
 sec.innerHTML=`<div class="section-kicker">NUR FÜR INHABER</div><h1>Buchhaltung<span>.</span></h1>
 <div class="app-tools"><a class="button button-ghost" href="buchhaltung.html">Rechnungen & Auswertung öffnen ↗</a></div>
 <h2 style="font-size:1.3rem;margin:18px 0 8px">Eingangsrechnung erfassen</h2>
 <form id="bx" class="inquiry-form" style="display:grid;gap:12px">
  <div class="app-tools" style="margin:0"><label class="button button-primary" style="cursor:pointer">📷 Foto aufnehmen<input id="bx-cam" type="file" accept="image/*" capture="environment" hidden></label><label class="button button-ghost" style="cursor:pointer">📎 Datei / Galerie<input id="bx-file" type="file" accept="image/*,application/pdf" hidden></label></div>
  <p id="bx-fn" class="form-hint" style="margin:0">Noch kein Beleg ausgewählt.</p><img id="bx-prev" alt="" style="max-width:100%;max-height:220px;border-radius:12px;display:none">
  <label>Lieferant<input name="supplier" required maxlength="120"></label>
  <label>Rechnungsnummer<input name="no" maxlength="60"></label>
  <label>Rechnungsdatum<input name="date" type="date" required value="${today()}"></label>
  <label>Bruttobetrag (€)<input name="gross" type="number" step="0.01" inputmode="decimal" required></label>
  <label>Umsatzsteuersatz<select name="rate"><option value="19">19 %</option><option value="7">7 %</option><option value="0">0 % / keine USt auf dem Beleg</option></select></label>
  <label>Kategorie<select name="cat">${CATS.map(c=>`<option>${c}</option>`).join("")}</select></label>
  <label>Bezahlt?<select name="paid"><option value="1">Ja, bezahlt</option><option value="0">Noch offen</option></select></label>
  <label>Notiz<input name="note" maxlength="200"></label>
  <p id="bx-calc" class="form-hint" style="margin:0"></p><button class="button button-primary" type="submit">Beleg speichern</button><p id="bx-msg" class="admin-error" role="alert"></p></form>
 <h2 style="font-size:1.3rem;margin:22px 0 8px">Zuletzt erfasst</h2><div id="bx-list" class="app-list"></div>`;
 $("#tab-auftraege").after(sec);
 nav.onclick=e=>{const t=e.target.closest("[data-t]")?.dataset.t;if(!t)return;const b=t==="b";$("#tab-auftraege").hidden=b;sec.hidden=!b;nav.children[0].className="button "+(b?"button-ghost":"button-primary");nav.children[1].className="button "+(b?"button-primary":"button-ghost");if(b)list()};
 const pick=e=>{const f=e.target.files[0];if(!f)return;file=f;$("#bx-fn").textContent="Beleg: "+f.name;const p=$("#bx-prev");if(f.type.startsWith("image/")){p.src=URL.createObjectURL(f);p.style.display="block"}else p.style.display="none"};
 $("#bx-cam").onchange=pick;$("#bx-file").onchange=pick;
 const f=$("#bx");f.oninput=()=>{const g=num(f.gross.value),r=num(f.rate.value),n=kl?g:r2(g/(1+r/100));$("#bx-calc").textContent=g?(kl?"Kleinunternehmer: keine Vorsteuer – "+eur(g)+" als Ausgabe":"Netto "+eur(n)+" · USt "+eur(r2(g-n))):""};
 f.onsubmit=submit;
 sb.from("acc_records").select("data").eq("kind","settings").limit(1).then(({data})=>{kl=!!data?.[0]?.data?.kleinunt;f.oninput()})}
async function shrink(f){if(!f.type.startsWith("image/"))return f;try{const bm=await createImageBitmap(f),s=Math.min(1,1800/Math.max(bm.width,bm.height)),c=document.createElement("canvas");c.width=Math.round(bm.width*s);c.height=Math.round(bm.height*s);c.getContext("2d").drawImage(bm,0,0,c.width,c.height);
 const b=await new Promise(r=>c.toBlob(r,"image/jpeg",.82));return new File([b],f.name.replace(/\.\w+$/,"")+".jpg",{type:"image/jpeg"})}catch(_){return f}}
async function submit(e){e.preventDefault();const f=e.target,m=$("#bx-msg"),btn=f.querySelector("[type=submit]");m.textContent="";btn.disabled=true;
 try{const o=Object.fromEntries(new FormData(f)),gross=num(o.gross),rate=kl?0:num(o.rate),net=kl?gross:r2(gross/(1+rate/100));
  const {data:dup}=await sb.from("acc_records").select("id,data").eq("kind","expense");
  if(o.no&&dup?.some(x=>x.data.supplier===o.supplier&&x.data.no===o.no)&&!confirm("Möglicher doppelter Beleg (gleicher Lieferant und Nummer). Trotzdem speichern?")){btn.disabled=false;return}
  let path;if(file){const u=await shrink(file);path=`${new Date().getFullYear()}/${Date.now()}-${u.name.replace(/[^\w.-]/g,"_")}`;const {error}=await sb.storage.from("acc-docs").upload(path,u);if(error)throw error}
  const paid=o.paid==="1",d={supplier:o.supplier,no:o.no,date:o.date,net,vat:r2(gross-net),gross,cat:o.cat,paid,paidDate:paid?today():"",note:o.note,file:path};
  const {error}=await sb.from("acc_records").insert({kind:"expense",data:d});if(error)throw error;
  f.reset();f.date.value=today();file=null;$("#bx-fn").textContent="Gespeichert ✓ – Noch kein Beleg ausgewählt.";$("#bx-prev").style.display="none";$("#bx-calc").textContent="";list()}
 catch(err){m.textContent="Fehler: "+(err.message||err)+" (Wurde buchhaltung.sql in Supabase ausgeführt?)"}btn.disabled=false}
async function list(){const {data}=await sb.from("acc_records").select("data,created_at").eq("kind","expense").order("created_at",{ascending:false}).limit(8);
 $("#bx-list").innerHTML=(data||[]).map(r=>`<div class="app-card"><div class="app-card-top"><strong>${esc(r.data.supplier)}</strong><span>${eur(r.data.gross)}</span></div><p>${esc(r.data.cat)} · ${r.data.date.split("-").reverse().join(".")} · ${r.data.paid?"bezahlt":"offen"}${r.data.file?" · 📎":""}</p></div>`).join("")||'<div class="app-empty">Noch keine Belege.</div>'}
})();
