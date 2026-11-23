(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  $("#year").textContent = new Date().getFullYear();
  const menu = $(".menu-toggle"), nav = $(".main-nav");
  menu.addEventListener("click", () => { const open=nav.classList.toggle("open"); menu.setAttribute("aria-expanded", String(open)); });
  $$(".main-nav a").forEach(a => a.addEventListener("click",()=>nav.classList.remove("open")));

  /* ---------- Anfrage-Formular ---------- */
  const form=$("#inquiry-form"), steps=$$(".form-step",form), progress=$(".form-progress i",form);
  let step=1;
  const showStep=n=>{step=n;steps.forEach(el=>el.classList.toggle("active",Number(el.dataset.step)===n));progress.style.width=n===1?"50%":"100%";$(".form-top span:last-child",form).textContent=n===1?"01 — 02":"02 — 02";};
  function showError(msg){const el=$(".form-error",form);el.textContent=msg;el.hidden=false;}
  $$(".inquiry-shortcut").forEach(btn=>btn.addEventListener("click",()=>{$$('[name="services"]',form).forEach(c=>c.checked=c.value===btn.dataset.service);$("#anfrage").scrollIntoView({behavior:"smooth"});}));
  $(".form-next",form).addEventListener("click",()=>{
    let valid=true;
    ["customer_type","device_type","device_other","device_count"].forEach(n=>{const el=form.elements[n];if(!valid||el.disabled)return;
      if(n==="device_other")el.setCustomValidity(el.value.trim()?"":"Bitte angeben, um welches Gerät es sich handelt.");
      if(!el.value.trim()||!el.checkValidity()){el.reportValidity();valid=false;}});
    if(!$$('[name="services"]:checked',form).length){showError("Bitte wähle mindestens eine Leistung aus.");valid=false;}
    if(valid){$(".form-error",form).hidden=true;showStep(2);}
  });
  // Firma und Ansprechpartner nur für Geschäftskunden
  const biz=$$(".biz",form),syncType=()=>{const on=form.elements.customer_type.value==="Geschäftskunde";biz.forEach(l=>{l.hidden=!on;const i=l.querySelector("input");i.disabled=!on;i.required=on;});};
  form.elements.customer_type.addEventListener("change",syncType);syncType();
  // Bei „Sonstiges“ erscheint ein Pflichtfeld: Um welches Gerät handelt es sich?
  const devOther=$(".device-other",form),syncDevice=()=>{const on=form.elements.device_type.value==="Sonstiges",inp=devOther.querySelector("input");devOther.hidden=!on;inp.disabled=!on;inp.required=on;if(!on){inp.value="";inp.setCustomValidity("");}};
  form.elements.device_type.addEventListener("change",syncDevice);form.elements.device_other.addEventListener("input",e=>e.target.setCustomValidity(""));syncDevice();
  form.elements.message.addEventListener("input",e=>e.target.setCustomValidity(""));
  $(".form-back",form).addEventListener("click",()=>showStep(1));
  form.addEventListener("submit",async e=>{
    e.preventDefault();$(".form-error",form).hidden=true;
    if(!form.reportValidity())return;
    if(!String(form.elements.message.value).trim()){form.elements.message.setCustomValidity("Bitte beschreibe dein Anliegen.");form.elements.message.reportValidity();return;}
    const cfg=window.UNITOPIA_CONFIG||{};
    if(!window.supabase||!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes("DEIN-PROJEKT")){showError("Das Anfrage-System ist noch nicht verbunden. Bitte kontaktiere uns direkt per Telefon oder E-Mail.");return;}
    const data=new FormData(form);
    const payload={customer_type:data.get("customer_type"),company:data.get("company")||"",contact_person:data.get("contact_person")||"",first_name:data.get("first_name"),last_name:data.get("last_name"),street:data.get("street"),zip:data.get("zip"),city:data.get("city"),phone:data.get("phone"),email:data.get("email"),device_type:data.get("device_type")==="Sonstiges"?"Sonstiges: "+String(data.get("device_other")||"").trim():data.get("device_type"),preferred_date:data.get("preferred_date")||null,device_count:data.get("device_count")?Number(data.get("device_count")):null,services:data.getAll("services"),message:String(data.get("message")).trim()};
    const submit=$('button[type="submit"]',form);submit.disabled=true;submit.textContent="Wird gesendet …";
    try{
      const client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
      const {error}=await client.functions.invoke("submit-inquiry",{body:payload});
      if(error)throw error;
      steps.forEach(s=>s.classList.remove("active"));$(".form-success",form).hidden=false;progress.style.width="100%";form.reset();syncType();syncDevice();
    }catch(err){console.error(err);showError("Deine Anfrage konnte gerade nicht gesendet werden. Bitte versuche es erneut oder nutze Telefon/E-Mail.");}
    finally{submit.disabled=false;submit.innerHTML='Anfrage senden <span>↗</span>';}
  });


  /* ---------- Über uns: Filter und Team ---------- */
  $$(".adv-filter button").forEach(b=>b.addEventListener("click",()=>{const team=b.dataset.f==="team";$$(".adv-filter button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));$$(".adv").forEach(c=>c.hidden=b.dataset.f!=="all"&&c.dataset.c!==b.dataset.f);const g=$("#adv-grid"),tp=$("#team-panel");if(g)g.hidden=team;if(tp)tp.hidden=!team;}));
  const cT=window.UNITOPIA_CONFIG||{},teamBox=$("#team-list");
  if(teamBox){
    let tSig="",sbT=null;
    const hx=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
    const none=()=>{teamBox.innerHTML='<p class="events-empty">Unser Team stellen wir hier bald vor.</p>';};
    const ready=window.supabase&&cT.SUPABASE_URL&&!cT.SUPABASE_URL.includes("DEIN-PROJEKT");
    const getSb=()=>sbT||(sbT=window.supabase.createClient(cT.SUPABASE_URL,cT.SUPABASE_ANON_KEY));
    const loadTeam=async()=>{
      if(!ready){none();return;}
      try{
        const {data,error}=await getSb().from("team_members").select("name,role,description,photo_path").eq("published",true).order("sort_order",{ascending:true});
        if(error)throw error;
        const sg=JSON.stringify(data||[]);if(sg===tSig)return;tSig=sg;
        if(!data||!data.length){none();return;}
        teamBox.innerHTML=data.map(m=>`<article class="team-row"><figure class="team-photo">${m.photo_path?`<img src="${cT.SUPABASE_URL}/storage/v1/object/public/team/${encodeURIComponent(m.photo_path)}" alt="${hx(m.name)}${m.role?", "+hx(m.role):""}" loading="lazy" decoding="async">`:""}</figure><div class="team-text">${m.role?`<p class="team-role">${hx(m.role)}</p>`:""}<h3>${hx(m.name)}</h3>${m.description?`<p>${hx(m.description).replace(/\n/g,"<br>")}</p>`:""}</div></article>`).join("");
      }catch(e){console.error(e);if(!tSig)none();}
    };
    loadTeam();
    if(ready){
      setInterval(()=>{if(!document.hidden)loadTeam();},30000);
      document.addEventListener("visibilitychange",()=>{if(!document.hidden)loadTeam();});
      try{getSb().channel("unitopia-team-live").on("postgres_changes",{event:"*",schema:"public",table:"team_members"},()=>loadTeam()).subscribe();}catch(e){console.error(e);}
    }
  }

  const dialog=$("#notice-dialog");if(dialog){const c=$(".dialog-close",dialog);if(c)c.addEventListener("click",()=>dialog.close());}
})();
