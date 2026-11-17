// Unitopia Mitarbeiter-App: Aufträge mit Status, Notizen, Ton und Handy-Benachrichtigung
(() => {
 const $=s=>document.querySelector(s),cfg=window.UNITOPIA_CONFIG||{};
 if(!window.supabase||!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes("DEIN-PROJEKT")){$("#login-error").textContent="Supabase ist noch nicht konfiguriert (config.js).";return;}
 const sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=s=>s?new Date(s).toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short"}):"—";
 const dde=d=>{if(!d)return "—";const [y,m,t]=String(d).split("-");return t+"."+m+"."+y;};
 const statuses=["Neu","Angenommen","In Bearbeitung","Abgeschlossen","Abgelehnt"];
 let requests=[],knownIds=null,unseen=0,live=false,cur=null,me=null;const fresh=new Set(),baseTitle=document.title;
 async function fnError(error,fn){try{const r=error&&error.context;if(r&&typeof r.json==="function"){if(r.status===404)return "Die Funktion „"+fn+"“ ist in Supabase noch nicht bereitgestellt.";const j=await r.json();if(j&&j.error)return j.error;}}catch(_){}return "Verbindung zur Funktion „"+fn+"“ fehlgeschlagen.";}
 function askConfirm(title,text,yes="Ja, löschen"){return new Promise(res=>{const d=$("#confirm-dialog");$("#cf-title").textContent=title;$("#cf-text").textContent=text;$("#cf-yes").textContent=yes;
  const end=v=>{d.onclose=null;d.oncancel=null;d.onclick=null;if(d.open)d.close();res(v);};
  $("#cf-yes").onclick=()=>end(true);$("#cf-no").onclick=()=>end(false);d.oncancel=e=>{e.preventDefault();end(false);};d.onclick=e=>{if(e.target===d)end(false);};
  d.showModal();$("#cf-no").focus();});}

 /* ---------- Anmeldung ---------- */
 async function init(){const {data:{session}}=await sb.auth.getSession();if(session)await enter(session.user);}
 async function enter(user){
  const {data:p}=await sb.from("profiles").select("role,active").eq("id",user.id).maybeSingle();
  if(!p||!p.active||!["admin","employee"].includes(p.role)){await sb.auth.signOut();$("#login-panel").hidden=false;$("#app-main").hidden=true;$("#logout").hidden=true;$("#login-error").textContent="Kein Zugang. Diese App ist nur für aktive Mitarbeiter.";return;}
  me=user;$("#login-panel").hidden=true;$("#app-main").hidden=false;$("#logout").hidden=false;$("#user-label").textContent=user.email;
  await load();startLive();updateNotifyUI();
 }
 $("#login-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {data,error}=await sb.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});
  if(error){$("#login-error").textContent="Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.";return;}$("#login-error").textContent="";await enter(data.user);});
 $("#logout").addEventListener("click",async()=>{await sb.auth.signOut();location.reload();});

 /* ---------- Aufträge ---------- */
 async function load(){
  const {data,error}=await sb.from("inquiries").select("id,full_name,email,phone,customer_type,device_type,device_count,preferred_date,location,services,message,status,created_at").order("created_at",{ascending:false});
  if(error){$("#app-error").textContent="Aufträge konnten nicht geladen werden.";return;}$("#app-error").textContent="";requests=data||[];detectNew();render();
 }
 function detectNew(){const ids=new Set(requests.map(r=>r.id));
  if(knownIds){const nw=requests.filter(r=>!knownIds.has(r.id));if(nw.length){nw.forEach(r=>fresh.add(r.id));unseen+=nw.length;if(window.SPPush&&SPPush.soundOn())SPPush.beep();document.title="("+unseen+") Neuer Auftrag";$("#app-info").textContent="🔔 Neuer Auftrag von "+nw.map(r=>r.full_name).join(", ");}}
  knownIds=ids;}
 function render(){$("#list").innerHTML=requests.length?requests.map(r=>`<button class="app-card${fresh.has(r.id)?" fresh":""}" data-id="${r.id}"><div class="app-card-top"><strong>${esc(r.full_name)}</strong><span class="status status-${esc(r.status.toLowerCase().replaceAll(" ","-"))}">${esc(r.status)}</span></div><p>${esc((r.services||[]).join(", "))}</p><p>${esc(r.customer_type||"")} · ${esc(r.device_type||"")}${r.location?" · "+esc(r.location):""}</p><p class="when">Eingegangen ${fmt(r.created_at)}</p></button>`).join(""):'<p class="app-empty">Noch keine Aufträge.</p>';}
 const cell=(l,v)=>`<div class="detail-cell"><small>${l}</small><p>${esc(v||"—")}</p></div>`;
 async function loadNotes(){const {data,error}=await sb.from("inquiry_notes").select("id,note,created_at,author_email").eq("inquiry_id",cur.id).order("created_at",{ascending:false});$("#d-notes").innerHTML=error?"":(data||[]).map(n=>`<div class="note-item">${esc(n.note)}<small>${esc(n.author_email)} · ${fmt(n.created_at)}</small></div>`).join("");}
 $("#list").addEventListener("click",async ev=>{const c=ev.target.closest(".app-card");if(!c)return;const r=requests.find(x=>x.id===c.dataset.id);if(!r)return;cur=r;
  fresh.delete(r.id);if(!fresh.size){unseen=0;document.title=baseTitle;$("#app-info").textContent="";}render();
  $("#d-name").textContent=r.full_name;
  $("#d-body").innerHTML=[cell("Leistungen",(r.services||[]).join(", ")),cell("Kundenart",r.customer_type),cell("Gerät / Projekt",r.device_type),cell("Anzahl Geräte",r.device_count?String(r.device_count):""),cell("Wunschtermin",r.preferred_date?dde(r.preferred_date):""),cell("Ort / PLZ",r.location),cell("Beschreibung",r.message),cell("Telefon",r.phone),cell("E-Mail",r.email),cell("Eingegangen",fmt(r.created_at))].join("");
  $("#d-actions").innerHTML=`<a class="button button-primary" href="tel:${esc(String(r.phone||"").replace(/[^+\d]/g,""))}">Anrufen</a><a class="button button-ghost" href="mailto:${esc(r.email)}">E-Mail schreiben</a>`;
  $("#d-status").innerHTML=statuses.map(s=>`<option ${s===r.status?"selected":""}>${s}</option>`).join("");$("#d-error").textContent="";$("#d-note").value="";$("#d-notes").innerHTML="";
  $("#detail").showModal();await loadNotes();});
 $("#d-note-save").addEventListener("click",async()=>{const note=$("#d-note").value.trim();if(!note||!cur)return;const {error}=await sb.from("inquiry_notes").insert({inquiry_id:cur.id,note,author_email:me.email});if(error){$("#d-error").textContent="Notiz konnte nicht gespeichert werden.";return;}$("#d-error").textContent="";$("#d-note").value="";await loadNotes();});
 $("#d-save").addEventListener("click",async()=>{if(!cur)return;const b=$("#d-save"),status=$("#d-status").value;b.disabled=true;$("#d-error").textContent="";
  const {data,error}=await sb.functions.invoke("manage-inquiry",{body:{action:"status",inquiry_id:cur.id,status}});b.disabled=false;
  if(error){$("#d-error").textContent=await fnError(error,"manage-inquiry");return;}
  $("#detail").close();await load();
  const ok=$("#app-info"),er=$("#app-error");ok.textContent="";
  if(data&&data.mail==="sent")ok.textContent="✓ Status gespeichert. Bestätigungs-E-Mail an "+data.to+" gesendet.";
  else if(data&&data.mail==="failed")er.textContent="Status gespeichert, aber die E-Mail an "+data.to+" konnte nicht gesendet werden. "+(data.mail_error||"");
  else ok.textContent="✓ Status gespeichert.";});
 $("#d-delete").addEventListener("click",async()=>{if(!cur)return;
  if(!(await askConfirm("Auftrag löschen?","Auftrag von „"+cur.full_name+"“ endgültig löschen? Der Auftrag und alle internen Notizen werden unwiderruflich entfernt.")))return;
  const b=$("#d-delete");b.disabled=true;$("#d-error").textContent="";
  const {error}=await sb.functions.invoke("manage-inquiry",{body:{action:"delete",inquiry_id:cur.id}});b.disabled=false;
  if(error){$("#d-error").textContent=await fnError(error,"manage-inquiry");return;}
  $("#detail").close();cur=null;await load();$("#app-info").textContent="✓ Auftrag gelöscht.";});
 $("#d-close").addEventListener("click",()=>$("#detail").close());$("#detail").addEventListener("click",e=>{if(e.target.id==="detail")$("#detail").close();});
 $("#reload").addEventListener("click",load);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden){if(knownIds)load();if(unseen&&!fresh.size){unseen=0;document.title=baseTitle;}}});
 function startLive(){if(live)return;live=true;
  try{sb.channel("inquiries-app").on("postgres_changes",{event:"*",schema:"public",table:"inquiries"},()=>load()).subscribe();}catch(e){console.error(e);}
  setInterval(()=>{if(!document.hidden)load();},30000);}

 /* ---------- Ton und Handy-Benachrichtigung ---------- */
 async function updateNotifyUI(){const S=window.SPPush;if(!S)return;$("#sound-toggle").textContent="Ton: "+(S.soundOn()?"an":"aus");
  const st=await S.state(),b=$("#push-toggle"),m=$("#notify-msg");$("#push-test").hidden=st!=="on";
  if(st==="unsupported"){b.disabled=true;b.textContent="Benachrichtigung nicht verfügbar";m.textContent="Dieser Browser unterstützt keine Benachrichtigungen. Auf dem iPhone zuerst „Zum Home-Bildschirm“ hinzufügen.";}
  else if(st==="denied"){b.disabled=true;b.textContent="Benachrichtigungen blockiert";m.textContent="Bitte in den Geräte-Einstellungen für diese App Benachrichtigungen erlauben.";}
  else if(st==="on"){b.disabled=false;b.textContent="Benachrichtigung: an";m.textContent="Dieses Gerät meldet sich bei jedem neuen Auftrag. Tippen zum Ausschalten.";}
  else{b.disabled=false;b.textContent="Benachrichtigung aktivieren";m.textContent="";}}
 $("#sound-toggle").addEventListener("click",()=>{SPPush.setSound(!SPPush.soundOn());updateNotifyUI();});
 $("#push-toggle").addEventListener("click",async()=>{const b=$("#push-toggle"),m=$("#notify-msg");b.disabled=true;try{if(await SPPush.state()==="on")await SPPush.disable(sb);else await SPPush.enable(sb);m.textContent="";}catch(e){m.textContent=e.message;}b.disabled=false;await updateNotifyUI();});
 $("#push-test").addEventListener("click",async()=>{const m=$("#notify-msg");m.textContent="Test wird gesendet …";try{const r=await SPPush.test(sb);m.textContent=r.sent?"✓ Test gesendet.":"Der Push-Dienst hat den Test nicht angenommen. Bitte aus- und wieder einschalten.";}catch(e){m.textContent=e.message;}});
 init();
})();
