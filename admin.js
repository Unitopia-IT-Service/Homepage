(() => {
 const $=s=>document.querySelector(s),cfg=window.UNITOPIA_CONFIG||{};
 if(!window.supabase||!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes("DEIN-PROJEKT")){$("#login-error").textContent="Supabase ist noch nicht konfiguriert.";return;}
 const sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 let currentUser=null,requests=[],selected=null,statusTarget=null,team=[],editingMember=null;
 const statuses=["Neu","In Bearbeitung","Abgeschlossen","Abgelehnt"];
 const JOBS=["Inhaber","Mitarbeiter","Techniker","Webentwickler","Support"];
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=s=>s?new Date(s).toLocaleString("de-DE"):"—";
 const dde=d=>{const [y,m,t]=d.split("-");return t+"."+m+"."+y;};
 async function fnError(error,fn){try{const r=error&&error.context;if(r&&typeof r.json==="function"){if(r.status===404)return "Die Funktion „"+fn+"“ ist in Supabase noch nicht bereitgestellt.";const j=await r.json();if(j&&j.error)return j.error;}}catch(_){}return "Verbindung zur Funktion „"+fn+"“ fehlgeschlagen. Ist sie in Supabase bereitgestellt?";}

 /* ---------- Anmeldung / Passwort ---------- */
 const qs=new URLSearchParams(location.search),inviteToken=qs.get("invite"),inviteType=qs.get("type")==="recovery"?"recovery":"invite";
 async function init(){
  if(/error_code=|error=access_denied/.test(location.hash)){const e=$("#login-error");history.replaceState(null,"",location.pathname);if(e)e.textContent=/otp_expired|expired/.test(decodeURIComponent(location.hash+" "))||true?"Der Link ist abgelaufen oder wurde schon einmal geöffnet (z. B. vom E-Mail-Programm). Bitte unten „Passwort vergessen?“ nutzen oder dich neu einladen lassen.":"";}
  if(inviteToken){$("#login-panel").hidden=true;$("#dashboard").hidden=true;$("#password-panel").hidden=false;return;}
  const invited=/type=(invite|recovery)/.test(location.hash);
  const {data:{session}}=await sb.auth.getSession();
  if(session&&invited){$("#login-panel").hidden=true;$("#password-panel").hidden=false;return;}
  if(session)await enter(session.user);
 }
 async function enter(user){
  currentUser=user;$("#login-panel").hidden=true;$("#dashboard").hidden=false;$("#user-label").textContent=user.email;
  await loadRequests();startLive();updateNotifyUI();loadTeamSite();
  const {data:profile}=await sb.from("profiles").select("role").eq("id",user.id).single();
  if(profile?.role==="admin"){$("#employee-panel").hidden=false;$("#acc-link").hidden=false;await loadTeam();}
 }
 $("#login-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {data,error}=await sb.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});if(error){$("#login-error").textContent="Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.";return;}$("#login-error").textContent="";await enter(data.user);});
 $("#password-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget),a=f.get("password"),b=f.get("password2"),err=$("#password-error");
  if(String(a).length<10){err.textContent="Das Passwort braucht mindestens 10 Zeichen.";return;}
  if(a!==b){err.textContent="Die beiden Passwörter stimmen nicht überein.";return;}
  if(inviteToken){const {error:ve}=await sb.auth.verifyOtp({token_hash:inviteToken,type:inviteType});if(ve){err.textContent="Der Einladungslink ist abgelaufen oder wurde schon benutzt. Bitte lass dir eine neue Einladung schicken.";return;}}
  const {data,error}=await sb.auth.updateUser({password:a});if(error){err.textContent="Passwort konnte nicht gespeichert werden: "+error.message;return;}
  history.replaceState(null,"",location.pathname);$("#password-panel").hidden=true;await enter(data.user);});
 $("#logout").addEventListener("click",async()=>{await sb.auth.signOut();location.href=location.pathname;});

 /* ---------- Anfragen ---------- */
 $("#refresh").addEventListener("click",loadRequests);$("#status-filter").addEventListener("change",render);$("#search").addEventListener("input",render);
 async function loadRequests(){const {data,error}=await sb.from("inquiries").select("*").order("created_at",{ascending:false});if(error){$("#dashboard-error").textContent="Anfragen konnten nicht geladen werden. Prüfe Benutzerrolle und Datenbankrichtlinien.";return;}requests=data||[];$("#dashboard-error").textContent="";detectNew();render();}
 function render(){const q=$("#search").value.toLowerCase(),st=$("#status-filter").value;
  const list=requests.filter(r=>(!st||r.status===st)&&[r.full_name,r.email,r.location,r.device_type,r.customer_type].join(" ").toLowerCase().includes(q));
  $("#request-list").innerHTML=list.length?list.map(r=>`<article class="request-row req-row${fresh.has(r.id)?" fresh":""}" data-id="${r.id}"><div><h3>${esc(r.full_name)}${fresh.has(r.id)?' <span class="new-tag">NEU</span>':""}</h3><p>${esc((r.services||[]).join(", "))} · ${esc(r.device_type||"")}${r.location?" · "+esc(r.location):""}${mailWarn(r)}</p></div><span class="status status-${r.status.toLowerCase().replaceAll(" ","-")}">${esc(r.status)}</span><time>${fmt(r.created_at)}</time><div class="row-actions"><button class="button button-ghost" data-act="status">Status ändern</button><button class="button button-ghost btn-danger" data-act="del">Löschen</button></div></article>`).join(""):'<p class="form-hint">Keine passenden Anfragen gefunden.</p>';}
 $("#request-list").addEventListener("click",ev=>{const row=ev.target.closest(".request-row");if(!row)return;const btn=ev.target.closest("button[data-act]");
  if(!btn)return openRequest(row.dataset.id);
  const r=requests.find(x=>x.id===row.dataset.id);if(!r)return;
  if(btn.dataset.act==="status")openStatus(r);else deleteRequest(r);});
 function detailCell(l,v){return `<div class="detail-cell"><small>${l}</small><p>${esc(v||"—")}</p></div>`;}
 async function openRequest(id){selected=requests.find(r=>r.id===id);if(!selected)return;fresh.delete(id);if(!fresh.size){unseen=0;document.title=baseTitle;}render();$("#detail-name").textContent=selected.company?selected.company+" – "+selected.full_name:selected.full_name;
  $("#detail-body").innerHTML=[detailCell("Status",selected.status),detailCell("Kontakt",selected.email+" · "+selected.phone),detailCell("Kundenart",selected.customer_type),...(selected.company?[detailCell("Firma",selected.company),detailCell("Ansprechpartner",selected.contact_person)]:[]),detailCell("Gerät / Projekt",selected.device_type),detailCell("Anzahl Geräte",selected.device_count?String(selected.device_count):""),detailCell("Wunschtermin",selected.preferred_date?dde(selected.preferred_date):""),detailCell("Anschrift",[selected.street,selected.location].filter(Boolean).join(", ")),detailCell("Leistungen",(selected.services||[]).join(", ")),detailCell("Nachricht",selected.message),detailCell("Eingegangen",fmt(selected.created_at)),detailCell("E-Mail an Team",mailLabel(selected.notify_mail)),detailCell("Bestätigung an Kunde",mailLabel(selected.confirm_mail)+(selected.mail_error?" – "+selected.mail_error:"")),...(selected.status==="Abgelehnt"||selected.reject_reason?[detailCell("Ablehnungsgrund",selected.reject_reason),detailCell("Ablehnungs-E-Mail an Kunde",mailLabel(selected.reject_mail))]:[])].join("");
  $("#internal-note").value="";await loadNotes();$("#request-dialog").showModal();}
 function openStatus(r){statusTarget=r;$("#status-name").textContent=r.full_name;$("#status-current").textContent="Aktueller Status: "+r.status;$("#status-select").innerHTML=statuses.map(s=>`<option ${s===r.status?"selected":""}>${s}</option>`).join("");$("#status-error").textContent="";$("#status-reason").value=r.reject_reason||"";syncReason();$("#status-dialog").showModal();}
 function syncReason(){const on=$("#status-select").value==="Abgelehnt";$("#status-reason-wrap").hidden=!on;$("#status-reason-hint").hidden=!on;}
 $("#status-select").addEventListener("change",syncReason);
 $("#status-save").addEventListener("click",async()=>{if(!statusTarget)return;const btn=$("#status-save"),status=$("#status-select").value;btn.disabled=true;
  const {data,error}=await sb.functions.invoke("manage-inquiry",{body:{action:"status",inquiry_id:statusTarget.id,status,reason:status==="Abgelehnt"?$("#status-reason").value.trim():""}});btn.disabled=false;
  if(error){$("#status-error").textContent=await fnError(error,"manage-inquiry");return;}
  $("#status-dialog").close();statusTarget=null;await loadRequests();flashMail(data);});
 function flashMail(d){const ok=$("#dashboard-info"),er=$("#dashboard-error");ok.textContent="";if(!d)return;
  const a=d.acc,accTxt=a&&a.status==="created"?" Buchhaltung: Kunde "+a.customer_no+(a.customer_new?" neu angelegt":" (war schon vorhanden)")+", Angebot als Entwurf gespeichert.":""+(a&&a.customer_changes&&a.customer_changes.length?" ⚠ Neue Angaben zu "+a.customer_changes.join(", ")+" – bitte in Buchhaltung › Kunden prüfen und bestätigen (alte Daten bleiben bis dahin unverändert).":""),accErr=a&&a.status==="failed"?" Buchhaltung konnte nicht angelegt werden: "+a.error:"";
  const mk=d.mail_kind==="reject"?"Ablehnungs-E-Mail":"Bestätigungs-E-Mail";
  if(d.mail==="sent")ok.textContent="✓ Status gespeichert. Die "+mk+" an "+d.to+" wurde gesendet."+accTxt;
  else if(d.mail==="failed")er.textContent="Status gespeichert, aber die E-Mail an "+d.to+" konnte nicht gesendet werden. "+(d.mail_error||"")+accTxt;
  else ok.textContent="✓ Status gespeichert."+accTxt;
  if(accErr)er.textContent=(er.textContent?er.textContent+" ":"")+accErr.trim();}
 $("#status-cancel").addEventListener("click",()=>$("#status-dialog").close());$("#close-status").addEventListener("click",()=>$("#status-dialog").close());
 async function deleteRequest(r){if(!confirm("Anfrage von „"+r.full_name+"“ endgültig löschen?\nDie Anfrage und alle internen Notizen werden unwiderruflich entfernt."))return;
  const {error}=await sb.functions.invoke("manage-inquiry",{body:{action:"delete",inquiry_id:r.id}});
  if(error){$("#dashboard-error").textContent="Löschen fehlgeschlagen: "+await fnError(error,"manage-inquiry");return;}
  $("#dashboard-error").textContent="";await loadRequests();}
 async function loadNotes(){const {data,error}=await sb.from("inquiry_notes").select("id,note,created_at,author_email").eq("inquiry_id",selected.id).order("created_at",{ascending:false});$("#note-list").innerHTML=error?"":(data||[]).map(n=>`<div class="note-item">${esc(n.note)}<small>${esc(n.author_email)} · ${fmt(n.created_at)}</small></div>`).join("");}
 $("#save-note").addEventListener("click",async()=>{const note=$("#internal-note").value.trim();if(!note||!selected)return;const {error}=await sb.from("inquiry_notes").insert({inquiry_id:selected.id,note,author_email:currentUser.email});if(error){alert("Notiz konnte nicht gespeichert werden.");return;}$("#internal-note").value="";await loadNotes();});
 $("#close-request").addEventListener("click",()=>$("#request-dialog").close());

 /* ---------- Team / Mitarbeiterkartei ---------- */
 function jobField(prefix){const sel=$("#"+prefix+"-job"),wrap=$("#"+prefix+"-job-wrap");sel.innerHTML=JOBS.map(j=>`<option>${j}</option>`).join("")+'<option value="__other">Andere Bezeichnung …</option>';sel.onchange=()=>{wrap.hidden=sel.value!=="__other";};}
 const setJob=(prefix,job)=>{const sel=$("#"+prefix+"-job"),inp=$("#"+prefix+"-job-custom");if(job&&!JOBS.includes(job)){sel.value="__other";inp.value=job;}else{sel.value=job||JOBS[1];inp.value="";}sel.onchange();};
 const getJob=prefix=>{const sel=$("#"+prefix+"-job");return sel.value==="__other"?$("#"+prefix+"-job-custom").value.trim():sel.value;};
 jobField("inv");jobField("mem");
 const nameOf=p=>[p.first_name,p.last_name].filter(Boolean).join(" ")||"Name noch nicht hinterlegt";
 async function loadTeam(){const {data,error}=await sb.from("profiles").select("id,email,role,active,first_name,last_name,phone,job_title").order("created_at",{ascending:true});
  if(error){$("#employee-list").textContent="Teamkonten konnten nicht geladen werden. Wurde supabase/schema.sql ausgeführt?";return;}
  team=data||[];$("#employee-list").innerHTML=team.map(p=>{const me=p.id===currentUser.id;
   return `<article class="member-card ${p.active?"":"inactive"}" data-id="${p.id}"><div class="member-top"><h4>${esc(nameOf(p))}${me?" (du)":""}</h4><span class="tag">${p.role==="admin"?"Administrator":"Mitarbeiter"}${p.active?"":" · deaktiviert"}</span></div><dl><dt>E-Mail</dt><dd><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></dd><dt>Telefon</dt><dd>${p.phone?`<a href="tel:${esc(p.phone.replace(/[^+\d]/g,""))}">${esc(p.phone)}</a>`:"—"}</dd></dl><p class="member-job">${esc(p.job_title||"Position nicht festgelegt")}</p><div class="row-actions"><button class="button button-ghost" data-act="edit">Bearbeiten</button>${me?"":`<button class="button button-ghost" data-act="toggle">${p.active?"Deaktivieren":"Aktivieren"}</button><button class="button button-ghost btn-danger" data-act="remove">Entfernen</button>`}</div></article>`;}).join("")||"Noch keine Mitarbeiterkonten vorhanden.";}
 $("#employee-list").addEventListener("click",async ev=>{const btn=ev.target.closest("button[data-act]");if(!btn)return;const p=team.find(x=>x.id===btn.closest(".member-card").dataset.id);if(!p)return;
  if(btn.dataset.act==="edit"){editingMember=p;const f=$("#member-form").elements;f.first_name.value=p.first_name||"";f.last_name.value=p.last_name||"";f.email.value=p.email||"";f.phone.value=p.phone||"";setJob("mem",p.job_title);$("#member-error").textContent="";$("#member-dialog").showModal();}
  else if(btn.dataset.act==="toggle"){const {error}=await sb.from("profiles").update({active:!p.active}).eq("id",p.id);if(error){alert("Änderung fehlgeschlagen.");return;}await loadTeam();}
  else if(confirm("„"+nameOf(p)+"“ ("+p.email+") wirklich aus dem Teamzugang entfernen?\nDas Konto wird gelöscht und der Zugang ist sofort beendet.")){const {error}=await sb.functions.invoke("manage-team",{body:{action:"remove",user_id:p.id}});if(error){alert(await fnError(error,"manage-team"));return;}await loadTeam();}});
 $("#member-form").addEventListener("submit",async e=>{e.preventDefault();if(!editingMember)return;const f=e.currentTarget.elements,err=$("#member-error"),btn=$("#member-save");err.textContent="";btn.disabled=true;
  const {error}=await sb.functions.invoke("manage-team",{body:{action:"update",user_id:editingMember.id,first_name:f.first_name.value,last_name:f.last_name.value,email:f.email.value,phone:f.phone.value,job_title:getJob("mem")}});btn.disabled=false;
  if(error){err.textContent=await fnError(error,"manage-team");return;}$("#member-dialog").close();await loadTeam();});
 $("#member-cancel").addEventListener("click",()=>$("#member-dialog").close());
 $("#invite-form").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget,f=form.elements,msg=$("#invite-message"),btn=$("#invite-send");msg.className="";msg.textContent="Einladung wird gesendet …";btn.disabled=true;
  const siteBase=window.UNITOPIA_SITE_BASE();if(!siteBase){msg.className="admin-error";msg.textContent="Bitte in config.js bei SITE_URL die echte Website-Adresse eintragen (oder admin.html über die echte Domain öffnen), sonst führt der Link auf localhost.";btn.disabled=false;return;}
  const body={action:"invite",first_name:f.first_name.value,last_name:f.last_name.value,email:f.email.value,phone:f.phone.value,job_title:getJob("inv"),redirect_to:siteBase+"/admin.html"};
  const {error}=await sb.functions.invoke("manage-team",{body});btn.disabled=false;
  if(error){msg.className="admin-error";msg.textContent=await fnError(error,"manage-team");return;}
  msg.className="admin-ok";msg.textContent="✓ Einladung an "+body.email+" wurde gesendet. Über den Link in der E-Mail legt die Person ihr Passwort fest.";form.reset();$("#inv-job").onchange();await loadTeam();});
 const pubUrl=p=>cfg.SUPABASE_URL+"/storage/v1/object/public/team/"+encodeURIComponent(p);
 async function toImage(file,max=1600){const bmp=await createImageBitmap(file),sc=Math.min(1,max/Math.max(bmp.width,bmp.height)),c=document.createElement("canvas");c.width=Math.round(bmp.width*sc);c.height=Math.round(bmp.height*sc);c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
  const w=await new Promise(r=>c.toBlob(r,"image/webp",.82));if(w&&w.type==="image/webp")return {blob:w,ext:"webp"};return {blob:await new Promise(r=>c.toBlob(r,"image/jpeg",.85)),ext:"jpg"};}
 /* ---------- Website: Über uns / Unser Team ---------- */
 let tsList=[],tsEditing=null;
 async function loadTeamSite(){const {data,error}=await sb.from("team_members").select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:true});if(error){$("#ts-error").textContent="Team-Einträge konnten nicht geladen werden. Wurde supabase/schema.sql ausgeführt?";return;}tsList=data||[];renderTeamSite();}
 function renderTeamSite(){$("#ts-list").innerHTML=tsList.length?tsList.map((m,i)=>`<article class="request-row ts-row" data-id="${m.id}">${m.photo_path?`<img class="ts-thumb" src="${esc(pubUrl(m.photo_path))}" alt="">`:'<span class="ts-thumb"></span>'}<div><h3>${esc(m.name)}</h3><p>${esc(m.role||"ohne Position")} · Foto ${i%2===0?"links":"rechts"}</p></div><span class="status status-big ${m.published?"status-online":"status-draft"}"><i class="dot"></i>${m.published?"Online":"Ausgeblendet"}</span><div class="row-actions"><button class="button button-ghost" data-act="up" ${i===0?"disabled":""} aria-label="Nach oben">↑</button><button class="button button-ghost" data-act="down" ${i===tsList.length-1?"disabled":""} aria-label="Nach unten">↓</button><button class="button button-ghost" data-act="edit">Bearbeiten</button><button class="button button-ghost btn-danger" data-act="del">Löschen</button></div></article>`).join(""):'<p class="form-hint">Noch niemand eingetragen. Unter „Über uns“ erscheint dann ein Hinweis, dass das Team bald vorgestellt wird.</p>';}
 function resetTs(){tsEditing=null;$("#ts-form").reset();$("#ts-form").elements.published.checked=true;$("#ts-save").textContent="Person speichern";$("#ts-cancel").hidden=true;$("#ts-current").hidden=true;}
 $("#ts-cancel").addEventListener("click",resetTs);
 $("#ts-list").addEventListener("click",async ev=>{const btn=ev.target.closest("button[data-act]");if(!btn)return;const id=btn.closest(".ts-row").dataset.id,i=tsList.findIndex(x=>x.id===id),m=tsList[i],err=$("#ts-error");if(!m)return;err.textContent="";
  if(btn.dataset.act==="edit"){const f=$("#ts-form").elements;tsEditing=m;f.name.value=m.name;f.role.value=m.role||"";f.description.value=m.description||"";f.published.checked=m.published;f.photo.value="";$("#ts-save").textContent="Änderungen speichern";$("#ts-cancel").hidden=false;const cur=$("#ts-current");cur.hidden=!m.photo_path;cur.innerHTML=m.photo_path?`<img src="${esc(pubUrl(m.photo_path))}" alt="" class="ts-thumb"> <span>Aktuelles Foto. Nur ein neues Foto auswählen, wenn es ausgetauscht werden soll.</span>`:"";$("#ts-form").scrollIntoView({behavior:"smooth",block:"center"});}
  else if(btn.dataset.act==="del"){if(!confirm("„"+m.name+"“ von der Website entfernen?"))return;const {error}=await sb.from("team_members").delete().eq("id",id);if(error){err.textContent="Löschen fehlgeschlagen.";return;}if(m.photo_path)await sb.storage.from("team").remove([m.photo_path]);if(tsEditing?.id===id)resetTs();await loadTeamSite();}
  else{const j=btn.dataset.act==="up"?i-1:i+1,o=tsList[j];if(!o)return;const [r1,r2]=await Promise.all([sb.from("team_members").update({sort_order:o.sort_order}).eq("id",m.id),sb.from("team_members").update({sort_order:m.sort_order}).eq("id",o.id)]);if(r1.error||r2.error){err.textContent="Reihenfolge konnte nicht geändert werden.";return;}await loadTeamSite();}});
 $("#ts-form").addEventListener("submit",async ev=>{ev.preventDefault();const f=ev.currentTarget.elements,err=$("#ts-error"),btn=$("#ts-save"),file=f.photo.files[0];err.textContent="";
  if(!tsEditing&&!file){err.textContent="Bitte ein Foto auswählen.";return;}
  if(file&&(!file.type.startsWith("image/")||file.size>25*1024*1024)){err.textContent="Bitte ein Bild (JPG, PNG oder WebP) bis 25 MB wählen.";return;}
  btn.disabled=true;let newPath=null;
  try{if(file){const {blob,ext}=await toImage(file,1200);newPath=`team-${Date.now()}.${ext}`;const up=await sb.storage.from("team").upload(newPath,blob,{contentType:blob.type,cacheControl:"31536000"});if(up.error)throw up.error;}
   const row={name:f.name.value.trim(),role:f.role.value.trim()||null,description:f.description.value.trim()||null,published:f.published.checked};if(newPath)row.photo_path=newPath;
   const next=tsList.length?Math.max(...tsList.map(x=>x.sort_order))+1:0;
   const {error}=tsEditing?await sb.from("team_members").update(row).eq("id",tsEditing.id):await sb.from("team_members").insert({...row,sort_order:next});
   if(error)throw error;if(newPath&&tsEditing?.photo_path)await sb.storage.from("team").remove([tsEditing.photo_path]);
   resetTs();await loadTeamSite();
  }catch(e){console.error(e);err.textContent="Speichern fehlgeschlagen. Wurde supabase/schema.sql ausgeführt?";}
  btn.disabled=false;});
 /* ---------- Neue Anfragen: Live, Ton, Handy-Push, Mailtest ---------- */
 const fresh=new Set(),baseTitle=document.title;let knownIds=null,unseen=0,liveOn=false;
 const mailWarn=r=>(r.confirm_mail==="failed"||r.notify_mail==="failed")?' · <span class="mail-warn">⚠ Mail nicht gesendet</span>':"";
 const mailLabel=v=>v==="sent"?"gesendet":v==="failed"?"fehlgeschlagen":"—";
 function detectNew(){const ids=new Set(requests.map(r=>r.id));
  if(knownIds){const nw=requests.filter(r=>!knownIds.has(r.id));if(nw.length){nw.forEach(r=>fresh.add(r.id));unseen+=nw.length;if(window.SPPush&&SPPush.soundOn())SPPush.beep();document.title="("+unseen+") Neue Anfrage – "+baseTitle;$("#dashboard-info").textContent="🔔 Neue Anfrage von "+nw.map(r=>r.full_name).join(", ");}}
  knownIds=ids;}
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&unseen&&!fresh.size){unseen=0;document.title=baseTitle;}});
 function startLive(){if(liveOn)return;liveOn=true;
  try{sb.channel("inquiries-live").on("postgres_changes",{event:"*",schema:"public",table:"inquiries"},()=>loadRequests()).subscribe();}catch(e){console.error(e);}
  setInterval(()=>{if(!document.hidden)loadRequests();},30000);}
 function updateNotifyUI(){const S=window.SPPush;if(!S)return;$("#sound-toggle").textContent="Ton: "+(S.soundOn()?"an":"aus");const h=$("#app-hint");if(h){h.hidden=false;h.innerHTML='Für das Handy gibt es die <a href="'+esc(cfg.ANDROID_APP_URL||"Unitopia.apk")+'" download="Unitopia.apk">Mitarbeiter-App</a> (Aufträge mit Benachrichtigung). Zum Installieren die Datei „Unitopia.apk“ herunterladen und öffnen.';}}
 $("#sound-toggle").addEventListener("click",()=>{SPPush.setSound(!SPPush.soundOn());updateNotifyUI();});
 init();
})();
