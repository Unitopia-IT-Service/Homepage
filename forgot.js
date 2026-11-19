// „Passwort vergessen?“ für Admin-Login und Mitarbeiter-App. Der Link in der E-Mail führt immer auf die echte Website (admin.html).
(()=>{
const cfg=window.UNITOPIA_CONFIG||{};
window.UNITOPIA_SITE_BASE=()=>{const u=String(cfg.SITE_URL||"").replace(/\/+$/,"");if(u)return u;return /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname)||location.protocol==="file:"?null:location.origin};
window.addEventListener("load",()=>{const form=document.querySelector("#login-form");if(!form||!window.supabase)return;
 const p=document.createElement("p");p.className="form-hint";p.style.margin="10px 0 0";p.innerHTML='<a href="#" id="forgot">Passwort vergessen?</a> <span id="forgot-msg" role="status"></span>';form.appendChild(p);
 const sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY),msg=p.querySelector("#forgot-msg");
 p.querySelector("#forgot").addEventListener("click",async e=>{e.preventDefault();const email=String(form.elements.email.value||"").trim();
  if(!email){msg.textContent="Bitte oben zuerst deine E-Mail-Adresse eintragen.";return}
  const base=window.UNITOPIA_SITE_BASE();if(!base){msg.textContent="SITE_URL in config.js fehlt (sonst führt der Link auf localhost).";return}
  msg.textContent="Wird gesendet …";const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:base+"/admin.html"});
  msg.textContent=error?(/rate|seconds/i.test(error.message)?"Bitte kurz warten und später erneut versuchen.":"Konnte nicht gesendet werden: "+error.message):"Falls ein Zugang zu dieser Adresse existiert, wurde eine E-Mail mit Link gesendet."})})
})();
