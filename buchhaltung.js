(()=>{
const $=(s,r=document)=>r.querySelector(s),cfg=window.UNITOPIA_CONFIG||{};
const sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eur=n=>(+n||0).toLocaleString("de-DE",{style:"currency",currency:"EUR"});
const r2=n=>Math.round((+n+Number.EPSILON)*100)/100;
const today=()=>new Date().toISOString().slice(0,10);
const addDays=(d,n)=>{const x=new Date(d+"T12:00");x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const dde=d=>d?d.split("-").reverse().join("."):"—";
const num=v=>parseFloat(String(v).replace(",","."))||0;
const dlg=$("#dlg");
let R=[],S={},view="dash",per={y:new Date().getFullYear(),p:"Y"},ed=null,flt={inv:"",q:""};
const NAV=[["dash","Dashboard"],["invoice","Rechnungen"],["offer","Angebote"],["customer","Kunden"],["dun","Mahnwesen"],["expense","Eingangsrechnungen"],["books","Buchhaltung"],["cash","Kassenbuch"],["afa","AfA"],["tax","Steuern"],["set","Einstellungen"]];
const CATS=["Einkauf von Computerhardware","Einkauf von Ersatzteilen","Einkauf von Computerzubehör","Softwarelizenzen","Webhosting","Domains","Serverkosten","Internet und Telefon","Büromaterial","Werbung und Marketing","Betriebskosten","Sonstige betriebliche Ausgaben"];
const ACC={ // Kontovorschläge – bitte mit Steuerberater prüfen
 e19:["8400","4400"],e7:["8300","4300"],e0:["8200","4200"],ekl:["8195","4200"],
 c:{"Einkauf von Computerhardware":["3400","5400"],"Einkauf von Ersatzteilen":["3400","5400"],"Einkauf von Computerzubehör":["3400","5400"],"Softwarelizenzen":["4964","6837"],"Webhosting":["4900","6300"],"Domains":["4900","6300"],"Serverkosten":["4900","6300"],"Internet und Telefon":["4920","6805"],"Büromaterial":["4930","6815"],"Werbung und Marketing":["4610","6600"],"Betriebskosten":["4900","6300"],"Sonstige betriebliche Ausgaben":["4980","6300"],"Abschreibung (AfA)":["4830","6220"]}};
const SERV=["Erstellung einer Webseite","Gestaltung einer Webseite","Anpassung einer bestehenden Webseite","Installation eines CMS-Systems","Einrichtung einer Domain","Einrichtung von Webhosting","Wartung einer Webseite","Fehlerbehebung einer Webseite","Computer-Konfiguration","PC-Einrichtung","Laptop-Einrichtung","Fehlerdiagnose bei Computern","Hardwarediagnose","Softwarediagnose","Installation eines Betriebssystems","Installation von Software","Installation und Konfiguration von Treibern","Austausch einer Grafikkarte","Austausch eines Netzteils","Austausch eines Prozessors","Austausch von Arbeitsspeicher","Austausch eines Mainboards","Austausch einer SSD oder Festplatte","Einbau und Konfiguration neuer Hardware","Funktionsprüfung nach Reparatur","Technischer Support","IT-Beratung"];
const HW=["Grafikkarte","Prozessor","Netzteil","Arbeitsspeicher","Mainboard","SSD","Festplatte","Computerzubehör","Kabel","Adapter","Sonstige Computerkomponente"];
const MAIL_INV="Guten Tag {name},\n\nvielen Dank für Ihren Auftrag. Im Anhang finden Sie Ihre Rechnung {nr} über {betrag}.\nBitte überweisen Sie den Betrag bis zum {faellig} auf das in der Rechnung genannte Konto.\n\nBei Fragen melden Sie sich gerne jederzeit.";
const MAIL_OFF="Guten Tag {name},\n\nvielen Dank für Ihr Interesse. Im Anhang finden Sie unser Angebot {nr} über {betrag}.\nDas Angebot ist gültig bis {faellig}.\n\nBei Fragen oder Änderungswünschen melden Sie sich gerne jederzeit.";
const STAGES=["Zahlungserinnerung","1. Mahnung","2. Mahnung","Letzte Mahnung"];

/* ---------- Daten ---------- */
const L=k=>R.filter(r=>r.kind===k);
const byId=id=>R.find(r=>r.id===id);
const cust=id=>byId(id)?.data;
const cname=c=>c?(c.company||[c.first,c.last].filter(Boolean).join(" ")||"—"):"—";
async function load(){const {data,error}=await sb.from("acc_records").select("*").order("created_at").range(0,9999);if(error)throw error;R=data;S=L("settings")[0]?.data||{};}
async function save(kind,data,id,extra={}){
 const q=id?sb.from("acc_records").update({data,...extra}).eq("id",id):sb.from("acc_records").insert({kind,data,...extra});
 const {data:row,error}=await q.select().single();if(error){alert("Fehler: "+error.message);return null}
 const i=R.findIndex(x=>x.id===row.id);i<0?R.push(row):R[i]=row;if(kind==="settings")S=row.data;return row;}
async function del(id){const {error}=await sb.from("acc_records").delete().eq("id",id);if(error){alert(error.message);return false}R=R.filter(r=>r.id!==id);return true}
function nextNo(kind,prefix,yearly=true){const p=yearly?`${prefix}-${new Date().getFullYear()}-`:`${prefix}-`;
 const m=Math.max(0,...L(kind).map(r=>r.data.no).filter(n=>n&&n.startsWith(p)).map(n=>+n.slice(p.length)||0));return p+String(m+1).padStart(4,"0")}

/* ---------- Berechnung ---------- */
function calc(d){const free=S.kleinunt||d.rc,g={};let net=0;
 const ls=(d.lines||[]).map(l=>{const n=r2(num(l.qty)*num(l.price)*(1-num(l.disc)/100));const rt=free?0:num(l.vat);g[rt]=r2((g[rt]||0)+n);net=r2(net+n);return {...l,n,rt}});
 const gr=Object.entries(g).map(([rt,n])=>({rt:+rt,net:n,vat:r2(n*rt/100)})).sort((a,b)=>b.rt-a.rt);
 const vat=r2(gr.reduce((a,x)=>a+x.vat,0));return {ls,gr,net,vat,gross:r2(net+vat)}}
const paid=d=>r2((d.payments||[]).reduce((a,p)=>a+num(p.amount),0));
const isFinal=r=>r.kind==="invoice"&&r.locked;
const openAmt=r=>r2(calc(r.data).gross-paid(r.data));
const overdue=r=>isFinal(r)&&r.data.k2!=="Storno"&&r.data.status==="Offen"&&r.data.due<today()&&openAmt(r)>0.004;
function incomeEvents(){const ev=[];
 L("invoice").filter(isFinal).forEach(r=>{const d=r.data,c=calc(d);if(S.soll){c.gr.forEach(g=>ev.push({date:d.date,net:g.net,vat:g.vat,rt:g.rt,text:`${d.k2} ${d.no} ${cname(cust(d.cust))}`,ref:d.no}))}
  else if(c.gross)(d.payments||[]).forEach(p=>{const f=num(p.amount)/c.gross;c.gr.forEach(g=>ev.push({date:p.date,net:r2(g.net*f),vat:r2(g.vat*f),rt:g.rt,text:`Zahlung ${d.no} ${cname(cust(d.cust))}`,ref:d.no}))})});
 L("booking").filter(r=>r.data.type==="Einnahme").forEach(r=>ev.push({date:r.data.date,net:num(r.data.net),vat:num(r.data.vat),rt:num(r.data.rate),text:r.data.text,ref:"Manuell"}));return ev}
function afaPlan(d){const cost=expNet(d),life=Math.max(1,num(d.life)||1),y0=+d.date.slice(0,4),m0=+d.date.slice(5,7),out=[];let left=cost;
 for(let y=y0;left>0.004&&y<y0+life+2;y++){const months=y===y0?13-m0:12,a=Math.min(left,r2(cost/life*months/12));out.push({y,a,rest:r2(left-a)});left=r2(left-a)}return out}
const assets=()=>L("expense").filter(r=>r.data.asset);
const expNet=d=>S.kleinunt?num(d.gross):num(d.net);
function expenseEvents(){const ev=[];
 L("expense").filter(r=>!r.data.asset).forEach(r=>{const d=r.data;if(d.paid)ev.push({date:d.paidDate||d.date,net:expNet(d),vat:S.kleinunt?0:num(d.vat),cat:d.cat,text:`${d.supplier} ${d.no||""}`,ref:d.no||""})});
  assets().forEach(r=>afaPlan(r.data).forEach(x=>ev.push({date:x.y+"-12-31",net:x.a,vat:0,cat:"Abschreibung (AfA)",text:"AfA "+r.data.supplier+" "+(r.data.no||""),ref:r.data.no||""})));
 L("booking").filter(r=>r.data.type==="Ausgabe").forEach(r=>ev.push({date:r.data.date,net:num(r.data.net),vat:num(r.data.vat),cat:r.data.cat||"Sonstige betriebliche Ausgaben",text:r.data.text,ref:"Manuell"}));return ev}
const inP=d=>{if(!d||+d.slice(0,4)!==per.y)return false;const m=+d.slice(5,7),p=per.p;return p==="Y"||(p[0]==="Q"?Math.ceil(m/3)===+p[1]:m===+p.slice(1))};
const sum=(a,f)=>r2(a.reduce((x,y)=>x+f(y),0));
function taxFigures(){const inc=incomeEvents().filter(e=>inP(e.date));const by={};inc.forEach(e=>{by[e.rt]=by[e.rt]||{net:0,vat:0};by[e.rt].net=r2(by[e.rt].net+e.net);by[e.rt].vat=r2(by[e.rt].vat+e.vat)});
 const vs=S.kleinunt?0:sum(L("expense").filter(r=>inP(r.data.date)),r=>num(r.data.vat));const ust=sum(Object.values(by),x=>x.vat);return {by,ust,vs,zahl:r2(ust-vs)}}

const yearNet=y=>sum(incomeEvents().filter(e=>e.date?.startsWith(y)),e=>e.net);
function limitInfo(){if(!S.kleinunt)return null;const y=new Date().getFullYear(),first=S.start?+S.start.slice(0,4)>=y:!yearNet(y-1),cur=yearNet(y),prev=yearNet(y-1),lim=first?25000:100000,pct=cur/lim*100;
 let lvl=pct>100?"bad":pct>=80?"warn":"ok",msg=!first&&prev>25000?`Vorjahresumsatz ${eur(prev)} über 25.000 € – Kleinunternehmerregelung gilt im laufenden Jahr nicht. Bitte mit Steuerberater/Finanzamt klären.`:pct>100?`Grenze überschritten – ab dem überschreitenden Umsatz gilt Regelbesteuerung. Bitte sofort Steuerberater/Finanzamt kontaktieren.`:pct>=80?`Achtung: ${Math.round(pct)} % der Grenze erreicht.`:"";
 if(!first&&prev>25000)lvl="bad";return {y,first,cur,prev,lim,pct,lvl,msg}}
const limBox=()=>{const l=limitInfo();if(!l)return "";const c={ok:"#2DD4BF",warn:"#facc15",bad:"#f87171"}[l.lvl];
 return `<div class="card" style="margin-bottom:22px;border-color:${c}"><small>Kleinunternehmer-Umsatzgrenze ${l.y} (§ 19 UStG, ${l.first?"Gründungsjahr: 25.000 €":"Vorjahr max. 25.000 €, laufend max. 100.000 €"})</small><b>${eur(l.cur)} <span style="font-size:13px">von ${eur(l.lim)}</span></b><div style="background:#ffffff18;height:10px;margin:8px 0"><div style="width:${Math.min(100,l.pct)}%;height:100%;background:${c}"></div></div><span class="hint">Vorjahresumsatz: ${eur(l.prev)}${l.msg?` · <b style="color:${c}">${l.msg}</b>`:""} · Gesamtumsatz nach vereinnahmten Entgelten (Richtwert, bitte prüfen).</span></div>`};
/* ---------- UI-Helfer ---------- */
const fld=(l,n,v="",a="",cls="")=>`<label class="${cls}">${l}<input name="${n}" value="${esc(v)}" ${a}></label>`;
const sel=(l,n,opts,v,cls="",a="")=>`<label class="${cls}">${l}<select name="${n}" ${a}>${opts.map(o=>{const [k,t]=Array.isArray(o)?o:[o,o];return `<option value="${esc(k)}" ${String(k)===String(v)?"selected":""}>${esc(t)}</option>`}).join("")}</select></label>`;
function modal(html){dlg.innerHTML=`<button class="dialog-close" data-act="close" style="position:absolute;right:12px;top:8px;background:none;border:0;color:#fff;font-size:24px;cursor:pointer">×</button>`+html;if(!dlg.open)dlg.showModal()}
function form(title,fields,onSubmit,extra=""){modal(`<h3>${title}</h3><form id="f"><div class="fg">${fields}</div>${extra}<div class="acc-bar" style="margin-top:16px"><button class="button button-primary" type="submit">Speichern</button><button class="button button-ghost" type="button" data-act="close">Abbrechen</button></div></form>`);
 $("#f").onsubmit=async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));if(await onSubmit(o)!==false){dlg.close();render()}}}
function dl(name,text,type="text/csv"){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+text],{type}));a.download=name;a.click()}
const csv=rows=>rows.map(r=>r.map(c=>`"${String(c??"").replace(/"/g,'""')}"`).join(";")).join("\n");
const table=(h,rows,cls="")=>`<div class="tw"><table class="t ${cls}"><thead><tr>${h.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.join("")||`<tr><td colspan="${h.length}" class="hint">Keine Einträge.</td></tr>`}</tbody></table></div>`;
const pill=(t,c="")=>`<span class="pill ${c}">${esc(t)}</span>`;
function perSel(){const y=new Date().getFullYear();return `<div class="acc-bar"><select id="py">${[y-2,y-1,y,y+1].map(v=>`<option ${v===per.y?"selected":""}>${v}</option>`).join("")}</select><select id="pp">${[["Y","Ganzes Jahr"],["Q1","Quartal 1"],["Q2","Quartal 2"],["Q3","Quartal 3"],["Q4","Quartal 4"],...Array.from({length:12},(_,i)=>["M"+(i+1),new Date(2000,i).toLocaleString("de-DE",{month:"long"})])].map(([k,t])=>`<option value="${k}" ${k===per.p?"selected":""}>${t}</option>`).join("")}</select></div>`}

/* ---------- Ansichten ---------- */
function render(){$("#acc-nav").innerHTML=NAV.map(([k,t])=>`<button data-view="${k}" class="${k===view?"on":""}">${t}</button>`).join("");
 const v=$("#view");({dash:vDash,invoice:vDocs,offer:vDocs,customer:vCust,dun:vDun,expense:vExp,books:vBooks,cash:vCash,afa:vAfa,tax:vTax,set:vSet})[view](v);
 const py=$("#py");if(py){py.onchange=()=>{per.y=+py.value;render()};$("#pp").onchange=e=>{per.p=e.target.value;render()}}}

function vDash(v){const y=new Date().getFullYear(),m=new Date().getMonth()+1,pad=n=>String(n).padStart(2,"0");
 const inc=incomeEvents(),exp=expenseEvents(),ym=(d,yy,mm)=>d&&d.slice(0,7)===`${yy}-${pad(mm)}`;
 const inv=L("invoice").filter(r=>isFinal(r)&&r.data.k2!=="Storno"),opn=inv.filter(r=>r.data.status==="Offen"&&openAmt(r)>0.004);
 const yi=sum(inc.filter(e=>e.date?.startsWith(y)),e=>e.net),ye=sum(exp.filter(e=>e.date?.startsWith(y)),e=>e.net);
 const keepP=per;per={y,p:"Y"};const t=taxFigures();per=keepP;
 const cards=[["Einnahmen "+new Date().toLocaleString("de-DE",{month:"long"}),eur(sum(inc.filter(e=>ym(e.date,y,m)),e=>e.net))],["Ausgaben Monat",eur(sum(exp.filter(e=>ym(e.date,y,m)),e=>e.net))],["Jahresumsatz (netto)",eur(yi)],["Gewinn / Verlust "+y,eur(r2(yi-ye)),yi-ye<0],["Offene Rechnungen",`${opn.length} · ${eur(sum(opn,openAmt))}`],["Bezahlte Rechnungen",inv.filter(r=>r.data.status==="Bezahlt").length],["Überfällige Rechnungen",L("invoice").filter(overdue).length,L("invoice").some(overdue)],["Offene Angebote",L("offer").filter(r=>["Entwurf","Gesendet"].includes(r.data.status)&&!r.data.archived).length],["Kunden",L("customer").length],["Offene Mahnungen",opn.filter(r=>(r.data.reminders||[]).length).length],["Umsatzsteuer "+y,eur(t.ust)],["Vorsteuer "+y,eur(t.vs)],["Voraussichtl. Zahllast",eur(t.zahl)]];
 const mo=Array.from({length:12},(_,i)=>i+1),mx=Math.max(1,...mo.map(i=>sum(inc.filter(e=>ym(e.date,y,i)),e=>e.net)),...mo.map(i=>sum(exp.filter(e=>ym(e.date,y,i)),e=>e.net)));
 const bars=mo.map(i=>{const a=sum(inc.filter(e=>ym(e.date,y,i)),e=>e.net),b=sum(exp.filter(e=>ym(e.date,y,i)),e=>e.net);return `<div style="flex-direction:column;align-items:stretch"><div style="flex:1"><i title="Einnahmen ${eur(a)}" style="height:${a/mx*100}%"></i><i class="x" title="Ausgaben ${eur(b)}" style="height:${b/mx*100}%"></i></div><span>${i}</span></div>`}).join("");
 const pays=[];L("invoice").forEach(r=>(r.data.payments||[]).forEach(p=>pays.push([p.date,r.data.no,cname(cust(r.data.cust)),p.amount])));pays.sort().reverse();
 v.innerHTML=`<div class="acc-h"><h2>Dashboard ${y}</h2></div>${limBox()}<div class="cards">${cards.map(([a,b,bad])=>`<div class="card ${bad?"bad":""}"><small>${a}</small><b>${b}</b></div>`).join("")}</div><h3>Geschäftsentwicklung ${y} <span class="hint">(grün Einnahmen, rot Ausgaben, netto)</span></h3><div class="bars">${bars}</div>
 <h3>Letzte Rechnungen</h3>${table(["Nr.","Kunde","Datum","Brutto","Status"],L("invoice").slice(-6).reverse().map(r=>`<tr class="r" data-open="${r.id}" data-k="invoice"><td>${esc(r.data.no||"Entwurf")}</td><td>${esc(cname(cust(r.data.cust)))}</td><td>${dde(r.data.date)}</td><td class="n">${eur(calc(r.data).gross)}</td><td>${esc(r.data.status)}</td></tr>`))}
 <h3>Letzte Zahlungseingänge</h3>${table(["Datum","Rechnung","Kunde","Betrag"],pays.slice(0,6).map(p=>`<tr><td>${dde(p[0])}</td><td>${esc(p[1])}</td><td>${esc(p[2])}</td><td class="n">${eur(p[3])}</td></tr>`))}`}

function vDocs(v){const k=view,off=k==="offer",q=flt.q.toLowerCase(),f=flt.inv;
 let rows=L(k).slice().reverse().filter(r=>{const d=r.data;if(q&&!(`${d.no} ${cname(cust(d.cust))}`).toLowerCase().includes(q))return false;
  if(f==="arch")return d.archived;if(d.archived)return false;if(!f)return true;
  if(f==="Überfällig")return overdue(r);return d.status===f});
 const opts=off?["Entwurf","Gesendet","Angenommen","Abgelehnt"]:["Entwurf","Offen","Bezahlt","Überfällig","Storniert"];
 v.innerHTML=`<div class="acc-h"><h2>${off?"Angebote":"Rechnungen"}</h2><div class="acc-bar"><input id="q" placeholder="Suchen …" value="${esc(flt.q)}"><select id="fs"><option value="">Alle</option>${opts.map(o=>`<option ${o===f?"selected":""}>${o}</option>`).join("")}<option value="arch" ${f==="arch"?"selected":""}>Archiv</option></select><button class="button button-primary" data-new="${k}">+ Neu</button></div></div>
 ${table(["Nr.","Art","Kunde","Datum",off?"Gültig bis":"Fällig","Brutto",off?"":"Offen","Status"],rows.map(r=>{const d=r.data,c=calc(d);return `<tr class="r" data-open="${r.id}" data-k="${k}"><td>${esc(d.no||"Entwurf")}</td><td>${esc(off?"Angebot":d.k2)}</td><td>${esc(cname(cust(d.cust)))}</td><td>${dde(d.date)}</td><td>${dde(off?d.valid:d.due)}</td><td class="n">${eur(c.gross)}</td><td class="n">${off?"":isFinal(r)?eur(openAmt(r)):"—"}</td><td>${overdue(r)?pill("Überfällig","bad"):pill(d.status,d.status==="Bezahlt"||d.status==="Angenommen"?"ok":d.status==="Entwurf"?"":"warn")}</td></tr>`}))}`;
 $("#q").oninput=e=>{flt.q=e.target.value;vDocs(v);$("#q").focus()};$("#fs").onchange=e=>{flt.inv=e.target.value;vDocs(v)}}

function custForm(id){const r=id?byId(id):null,c=r?.data||{type:"privat",country:"Deutschland"};
 const hist=r?L("invoice").filter(x=>x.data.cust===id):[];const open=sum(hist.filter(x=>isFinal(x)&&x.data.status==="Offen"),openAmt);
 const extra=r?`<h3 style="margin-top:20px">Kundenhistorie</h3><p class="hint">Offene Forderungen: <b>${eur(open)}</b></p>${table(["Dokument","Datum","Brutto","Bezahlt","Status"],[...hist,...L("offer").filter(x=>x.data.cust===id)].map(x=>`<tr><td>${esc((x.kind==="offer"?"Angebot ":"")+(x.data.no||"Entwurf"))}</td><td>${dde(x.data.date)}</td><td class="n">${eur(calc(x.data).gross)}</td><td class="n">${eur(paid(x.data))}</td><td>${esc(x.data.status)}</td></tr>`))}`:"";
 form(id?"Kunde bearbeiten":"Neuer Kunde",sel("Art","type",[["privat","Privatkunde"],["firma","Geschäftskunde"]],c.type)+fld("Firma","company",c.company)+fld("Vorname","first",c.first)+fld("Nachname","last",c.last)+fld("Straße und Hausnummer","street",c.street)+fld("PLZ","zip",c.zip)+fld("Ort","city",c.city)+fld("Land","country",c.country)+fld("E-Mail","email",c.email,'type="email"')+fld("Telefon","phone",c.phone)+fld("Ansprechpartner","contact",c.contact)+fld("Lieferadresse (falls abweichend)","ship",c.ship,"","w")+fld("Steuernummer","taxno",c.taxno)+fld("USt-IdNr.","vatid",c.vatid)+`<label class="w">Interne Notizen<textarea name="notes" rows="3">${esc(c.notes)}</textarea></label>`,
 async o=>{if(!o.company&&!o.last){alert("Bitte Firma oder Nachname angeben.");return false}o.no=c.no||nextNo("customer","KD",false);return !!await save("customer",o,id)},extra)}
function vCust(v){const q=flt.q.toLowerCase();v.innerHTML=`<div class="acc-h"><h2>Kunden</h2><div class="acc-bar"><input id="q" placeholder="Suchen …" value="${esc(flt.q)}"><button class="button button-primary" data-act="newcust">+ Neuer Kunde</button></div></div>${table(["Nr.","Name","Art","Ort","E-Mail","Telefon","Offen"],L("customer").filter(r=>!q||JSON.stringify(r.data).toLowerCase().includes(q)).map(r=>`<tr class="r" data-cust="${r.id}"><td>${esc(r.data.no)}</td><td>${esc(cname(r.data))}</td><td>${r.data.type==="firma"?"Geschäft":"Privat"}</td><td>${esc(r.data.zip+" "+r.data.city)}</td><td>${esc(r.data.email)}</td><td>${esc(r.data.phone)}</td><td class="n">${eur(sum(L("invoice").filter(x=>x.data.cust===r.id&&isFinal(x)&&x.data.status==="Offen"),openAmt))}</td></tr>`))}`;
 $("#q").oninput=e=>{flt.q=e.target.value;vCust(v);$("#q").focus()}}

/* ---------- Rechnung / Angebot Editor ---------- */
const emptyLine=()=>({grp:"Arbeit",name:"",desc:"",qty:1,unit:"Stunde",price:0,disc:0,vat:S.vat??19});
function newDoc(kind,preset={}){const t=num(S.terms)||14,d=today();
 ed={id:null,kind,locked:false,d:{k2:"Rechnung",date:d,terms:t,due:addDays(d,t),valid:addDays(d,30),status:"Entwurf",lines:[emptyLine()],payments:[],svcDate:d,...preset}};docForm()}
function openDoc(id){const r=byId(id);ed={id,kind:r.kind,locked:r.locked,d:structuredClone(r.data)};docForm()}
function docForm(){const {d,kind,locked}=ed,off=kind==="offer",dis=locked?"disabled":"",fin=locked;
 const cat=L("catalog");
 modal(`<h3>${off?"Angebot":d.k2} ${esc(d.no||"(Entwurf)")} ${fin?pill(d.status,d.status==="Bezahlt"?"ok":"warn"):""}</h3><form id="f"><fieldset ${dis} style="border:0;padding:0;margin:0"><div class="fg">
 ${off?"":sel("Art","k2",["Rechnung","Abschlagsrechnung","Schlussrechnung","Korrekturrechnung","Storno"],d.k2)}
 ${sel("Kunde","cust",[["","– wählen –"],...L("customer").map(r=>[r.id,r.data.no+" "+cname(r.data)])],d.cust)}
 ${fld("Datum","date",d.date,'type="date"')}${off?fld("Gültig bis","valid",d.valid,'type="date"'):fld("Leistungsdatum","svcDate",d.svcDate,'type="date"')+fld("Leistungszeitraum bis (optional)","svcTo",d.svcTo,'type="date"')+fld("Zahlungsziel (Tage)","terms",d.terms,'type="number" min="0"')+fld("Fällig am","due",d.due,'type="date"')}
 <label class="w">Zahlungsbedingungen / Hinweis<input name="note" value="${esc(d.note||"")}" placeholder="z. B. Skonto, Garantiehinweis"></label>
 ${S.kleinunt?"":`<label class="w"><span><input type="checkbox" name="rc" ${d.rc?"checked":""} style="width:auto"> Reverse-Charge (§ 13b UStG) – Steuerschuldnerschaft des Leistungsempfängers, 0 % USt</span></label>`}</div>
 <h4>Positionen</h4><datalist id="cat">${cat.map(c=>`<option value="${esc(c.data.name)}">`).join("")}</datalist>
 <div class="tw lines"><table class="t"><thead><tr><th>Art</th><th>Bezeichnung</th><th>Beschreibung</th><th>Menge</th><th>Einheit</th><th>Einzelpreis netto</th><th>Rabatt %</th><th>USt %</th><th>Netto</th><th></th></tr></thead><tbody id="ls"></tbody></table></div>
 <div class="acc-bar">${sel("","pick",[["","+ Aus Katalog …"],...cat.map((c,i)=>[c.id,(c.data.no?c.data.no+" ":"")+c.data.name])],"","","")}<button type="button" class="button button-ghost" data-act="addline">+ Leerzeile</button>${!off&&d.k2==="Schlussrechnung"?`<button type="button" class="button button-ghost" data-act="deduct">Abschlagsrechnungen abziehen</button>`:""}</div></fieldset>
 <div class="tot" id="tot"></div>
 ${fin&&!off?payBlock():""}
 <div class="acc-bar" style="margin-top:14px">${!fin?`<button class="button button-ghost" type="submit">Entwurf speichern</button><button class="button button-primary" type="button" data-act="final">${off?"Nummer vergeben & speichern":"Festschreiben & Nummer vergeben"}</button>`:""}
 <button class="button button-ghost" type="button" data-act="pdf">PDF / Drucken</button><button class="button button-ghost" type="button" data-act="mail">E-Mail</button>
 ${off&&ed.id?`<button class="button button-ghost" type="button" data-st="Angenommen">Angenommen</button><button class="button button-ghost" type="button" data-st="Abgelehnt">Abgelehnt</button><button class="button button-ghost" type="button" data-act="copy">Kopieren</button><button class="button button-ghost" type="button" data-act="toinv">In Rechnung umwandeln</button>`:""}
 ${fin&&!off?`<button class="button button-ghost" type="button" data-act="storno">Stornorechnung</button><button class="button button-ghost" type="button" data-act="korr">Korrekturrechnung</button>`:""}
 ${ed.id?`<button class="button button-ghost" type="button" data-act="arch">${d.archived?"Aus Archiv holen":"Archivieren"}</button>`:""}${ed.id&&!fin?`<button class="button button-ghost" type="button" data-act="deldoc">Löschen</button>`:""}<button class="button button-ghost" type="button" data-act="close">Schließen</button></div></form>`);
 lines();$("#f").onsubmit=e=>{e.preventDefault();persist(false)};
 $("#f").oninput=$("#f").onchange=e=>{const t=e.target;if(t.name==="pick"){if(e.type!=="change")return;const c=byId(t.value)?.data;if(c){collect();ed.d.lines=ed.d.lines.filter(l=>l.name||num(l.price));ed.d.lines.push({grp:c.type||"Arbeit",name:c.name,desc:c.desc||"",qty:1,unit:c.unit||"Stück",price:c.price||0,disc:0,vat:c.vat??19});docForm()}return}
  collect();if(t.name==="date"||t.name==="terms"){ed.d.due=addDays(ed.d.date,num(ed.d.terms));const x=$("#f [name=due]");if(x)x.value=ed.d.due}if(t.name==="rc"){docForm();return}totals()}}
function payBlock(){const d=ed.d,c=calc(d),p=paid(d);return `<h4>Zahlungen</h4>${table(["Datum","Betrag","Notiz"],(d.payments||[]).map(x=>`<tr><td>${dde(x.date)}</td><td class="n">${eur(x.amount)}</td><td>${esc(x.note)}</td></tr>`))}<p class="hint">Bezahlt ${eur(p)} von ${eur(c.gross)} · offen ${eur(r2(c.gross-p))}</p><div class="acc-bar"><input id="pa" type="number" step="0.01" value="${r2(c.gross-p)}" style="width:110px"><input id="pd" type="date" value="${today()}"><input id="pn" placeholder="Notiz" style="width:160px"><button type="button" class="button button-ghost" data-act="pay">Zahlung buchen</button></div>`}
function lines(){$("#ls").innerHTML=ed.d.lines.map((l,i)=>{const free=S.kleinunt||ed.d.rc,f=(k,t="text",a="")=>`<input data-i="${i}" data-f="${k}" type="${t}" value="${esc(l[k])}" ${a}>`,s=(k,o)=>`<select data-i="${i}" data-f="${k}">${o.map(x=>`<option ${String(x)===String(l[k])?"selected":""}>${x}</option>`).join("")}</select>`;
 return `<tr><td>${s("grp",["Arbeit","Material"])}</td><td>${f("name","text",'list="cat"')}</td><td>${f("desc")}</td><td>${f("qty","number",'step="any" style="width:70px"')}</td><td>${s("unit",["Stück","Stunde","Auftrag","Pauschale"])}</td><td>${f("price","number",'step="0.01" style="width:100px"')}</td><td>${f("disc","number",'step="any" style="width:60px"')}</td><td>${free?`<select disabled title="${S.kleinunt?"Kleinunternehmer § 19 UStG":"Reverse-Charge"}"><option>0</option></select>`:s("vat",[19,7,0])}</td><td class="n" id="ln${i}"></td><td>${ed.locked?"":`<button type="button" data-act="rmline" data-i="${i}" class="button button-ghost" style="padding:4px 9px">×</button>`}</td></tr>`}).join("");totals()}
function totals(){const c=calc(ed.d);c.ls.forEach((l,i)=>{const e=$("#ln"+i);if(e)e.textContent=eur(l.n)});$("#tot").innerHTML=`${c.gr.map(g=>`Netto ${g.rt} %: ${eur(g.net)} · USt ${eur(g.vat)}<br>`).join("")}Summe netto ${eur(c.net)} · USt ${eur(c.vat)}<br><b>Brutto ${eur(c.gross)}</b>${S.kleinunt?'<br><span class="hint">Kleinunternehmer § 19 UStG – keine USt</span>':""}`}
function collect(){if(ed.locked)return;const f=$("#f"),o=Object.fromEntries(new FormData(f));["k2","cust","date","svcDate","svcTo","terms","due","valid","note"].forEach(k=>{if(k in o)ed.d[k]=o[k]});ed.d.rc=!!o.rc;
 f.querySelectorAll("[data-i]").forEach(x=>{ed.d.lines[+x.dataset.i][x.dataset.f]=x.value})}
async function persist(final){collect();const d=ed.d;if(!d.cust){alert("Bitte einen Kunden wählen.");return}if(!d.lines.some(l=>l.name)){alert("Bitte mindestens eine Position eintragen.");return}
 const off=ed.kind==="offer";let extra={};
 if(final){if(!off&&!confirm("Rechnung festschreiben? Danach kann sie nicht mehr geändert oder gelöscht werden (nur Storno/Korrektur)."))return;if(!d.no)d.no=nextNo(ed.kind,off?"AN":"RE");if(!off){d.status="Offen";extra.locked=true}}
 const r=await save(ed.kind,d,ed.id,extra);if(r){ed.id=r.id;ed.locked=r.locked;ed.d=structuredClone(r.data);view=ed.kind;render();docForm()}}
async function patch(m){const r=byId(ed.id),d={...r.data,...m};const x=await save(ed.kind,d,ed.id);if(x){ed.d=structuredClone(x.data);render();docForm()}}

/* ---------- PDF / Druck ---------- */
function openPrint(html){const w=window.open("","_blank");if(!w){alert("Bitte Pop-ups erlauben.");return}w.document.write(`<!doctype html><meta charset="utf-8"><title>Dokument</title><style>body{font:13px Arial,sans-serif;color:#111;margin:36px auto;max-width:780px}table{width:100%;border-collapse:collapse}th{text-align:left;border-bottom:2px solid #111;padding:5px;font-size:11px}td{padding:5px;border-bottom:1px solid #ddd;vertical-align:top}.n{text-align:right;white-space:nowrap}.f{margin-top:34px;border-top:1px solid #999;padding-top:8px;font-size:10px;color:#444}@media print{body{margin:0}}</style>${html}<script>onload=()=>setTimeout(print,300)<\/script>`);w.document.close()}
const addr=c=>[cname(c),c.company&&(c.first||c.last)?[c.first,c.last].join(" "):"",c.street,[c.zip,c.city].filter(Boolean).join(" "),c.country&&c.country!=="Deutschland"?c.country:""].filter(Boolean).map(esc).join("<br>");
const sellerLine=()=>esc([S.company,S.owner&&"Inh. "+S.owner,S.street,[S.zip,S.city].filter(Boolean).join(" ")].filter(Boolean).join(" · "));
const footer=()=>`<div class="f">${sellerLine()}<br>${S.taxno?"Steuernr.: "+esc(S.taxno)+" · ":""}${S.vatid?"USt-IdNr.: "+esc(S.vatid)+" · ":""}${esc(S.email||"")} ${esc(S.phone||"")}<br>${S.iban?"Bank: "+esc(S.bank||"")+" · IBAN "+esc(S.iban)+" · BIC "+esc(S.bic||""):""}</div>`;
const logo=()=>`<img src="${new URL("assets/logo-wortmarke.webp",location.href).href}" height="42" style="float:right" alt="">`;
function docHTML(d,kind){const c=calc(d),kl=S.kleinunt,cu=cust(d.cust)||{},off=kind==="offer",title=off?"Angebot":d.k2;
 const body=["Arbeit","Material"].map(g=>{const ls=c.ls.filter(l=>(l.grp||"Arbeit")===g&&(l.name||l.price));return ls.length?`<tr><td colspan="7"><b>${g==="Arbeit"?"Arbeitsleistung":"Material / Hardware"}</b></td></tr>`+ls.map((l,i)=>`<tr><td>${i+1}</td><td>${esc(l.name)}${l.desc?"<br><small>"+esc(l.desc)+"</small>":""}</td><td class="n">${num(l.qty)} ${esc(l.unit)}</td><td class="n">${eur(l.price)}</td><td class="n">${num(l.disc)?num(l.disc)+" %":""}</td><td class="n">${kl?"":l.rt+" %"}</td><td class="n">${eur(l.n)}</td></tr>`).join(""):""}).join("");
 return `${logo()}<p style="font-size:10px;color:#555">${sellerLine()}</p><p>${addr(cu)}${cu.no?`<br><small>Kundennr.: ${esc(cu.no)}</small>`:""}${cu.vatid?`<br><small>USt-IdNr.: ${esc(cu.vatid)}</small>`:""}</p>
 <h2>${esc(title)} ${esc(d.no||"(Entwurf)")}</h2><p>Datum: ${dde(d.date)}${off?`<br>Gültig bis: ${dde(d.valid)}`:`<br>Leistungsdatum: ${dde(d.svcDate)}${d.svcTo?" bis "+dde(d.svcTo):""}${d.ref?`<br>Bezug: ${esc(d.ref)}`:""}`}</p>
 <table><tr><th>Pos.</th><th>Bezeichnung</th><th class="n">Menge</th><th class="n">Einzelpreis netto</th><th class="n">Rabatt</th><th class="n">${kl?"":"USt"}</th><th class="n">Netto</th></tr>${body}</table>
 <p class="n">${kl?"":c.gr.map(g=>`Netto ${g.rt} %: ${eur(g.net)} · USt ${g.rt} %: ${eur(g.vat)}<br>`).join("")+`Summe netto: ${eur(c.net)}<br>Umsatzsteuer: ${eur(c.vat)}<br>`}<b style="font-size:16px">Gesamtbetrag: ${eur(c.gross)}</b></p>
 ${S.kleinunt?"<p>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</p>":""}${d.rc&&!S.kleinunt?"<p>Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG).</p>":""}
 ${off?"<p>Dieses Angebot ist gültig bis "+dde(d.valid)+".</p>":`<p>${d.k2==="Storno"?"Diese Stornorechnung hebt die genannte Rechnung auf.":`Bitte zahlen Sie bis <b>${dde(d.due)}</b> ohne Abzug auf das unten genannte Konto.`}</p>`}${d.note?`<p>${esc(d.note)}</p>`:""}${footer()}`}

const pdfName=(d,k)=>((k==="offer"?"Angebot":d.k2)+"-"+(d.no||"Entwurf")).replace(/[^\w\-äöüÄÖÜß]/g,"_")+".pdf";
function loadLib(){return window.jspdf?Promise.resolve():new Promise((ok,no)=>{const sc=document.createElement("script");sc.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";sc.onload=ok;sc.onerror=()=>no(new Error("PDF-Bibliothek konnte nicht geladen werden."));document.head.appendChild(sc)})}
const logoPng=()=>new Promise(res=>{const im=new Image();im.onload=()=>{try{const c=document.createElement("canvas");c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext("2d").drawImage(im,0,0);res({url:c.toDataURL("image/png"),w:im.naturalWidth,h:im.naturalHeight})}catch(_){res(null)}};im.onerror=()=>res(null);im.src=new URL("assets/logo-wortmarke.webp",location.href).href});
// Echtes Text-PDF (scharf, kopierbar) – ohne Bildschirmfoto-Trick
async function makePdf(d,k){await loadLib();const {jsPDF}=window.jspdf,doc=new jsPDF({unit:"mm",format:"a4"});
 const c=calc(d),cu=cust(d.cust)||{},off=k==="offer",kl=S.kleinunt,title=off?"Angebot":d.k2,X=20,XR=190,W=XR-X,m=n=>eur(n).replace(/\u00a0/g," ");
 const T=(t,x,y,o={},sz=10,b=false,col=[17,17,17])=>{doc.setFont("helvetica",b?"bold":"normal");doc.setFontSize(sz);doc.setTextColor(...col);doc.text(String(t),x,y,o)};
 const wrap=(t,w,sz)=>{doc.setFont("helvetica","normal");doc.setFontSize(sz);return doc.splitTextToSize(String(t||""),w)};
 const seller=[S.company,S.owner&&"Inh. "+S.owner,S.street,[S.zip,S.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
 const lg=await logoPng();if(lg){const w=55;doc.addImage(lg.url,"PNG",XR-w,12,w,w*lg.h/lg.w)}
 T(seller,X,42,{},7,false,[110,110,110]);
 let y=49;[cname(cu),cu.company&&(cu.first||cu.last)?[cu.first,cu.last].join(" "):"",cu.street,[cu.zip,cu.city].filter(Boolean).join(" "),cu.country&&cu.country!=="Deutschland"?cu.country:""].filter(Boolean).forEach(t=>{T(t,X,y,{},10);y+=4.8});
 if(cu.no){T("Kundennr.: "+cu.no,X,y,{},8,false,[90,90,90]);y+=4}if(cu.vatid){T("USt-IdNr.: "+cu.vatid,X,y,{},8,false,[90,90,90]);y+=4}
 y=Math.max(y,78)+8;T(title+" "+(d.no||"(Entwurf)"),X,y,{},15,true);y+=8;
 const info=[["Datum:",dde(d.date)]];if(off)info.push(["Gültig bis:",dde(d.valid)]);else{info.push(["Leistungsdatum:",dde(d.svcDate)+(d.svcTo?" bis "+dde(d.svcTo):"")]);if(d.ref)info.push(["Bezug:",d.ref])}
 info.forEach(([a,b])=>{T(a,X,y,{},9.5,true);T(b,X+32,y,{},9.5);y+=5});y+=5;
 const col={q:118,p:142,r:156,v:168,n:XR},head=()=>{T("Pos.",X,y,{},8.5,true);T("Bezeichnung",X+9,y,{},8.5,true);T("Menge",col.q,y,{align:"right"},8.5,true);T("Einzelpreis netto",col.p,y,{align:"right"},8.5,true);T("Rabatt",col.r,y,{align:"right"},8.5,true);if(!kl)T("USt",col.v,y,{align:"right"},8.5,true);T("Netto",col.n,y,{align:"right"},8.5,true);doc.setDrawColor(17);doc.setLineWidth(.5);doc.line(X,y+2,XR,y+2);y+=7};
 const room=h=>{if(y+h>262){doc.addPage();y=22;head()}};
 head();let pos=0;
 ["Arbeit","Material"].forEach(g=>{const ls=c.ls.filter(l=>(l.grp||"Arbeit")===g&&(l.name||l.price));if(!ls.length)return;room(14);T(g==="Arbeit"?"Arbeitsleistung":"Material / Hardware",X,y,{},9.5,true);y+=5.5;
  ls.forEach(l=>{const nm=wrap(l.name,70,9.5),ds=l.desc?wrap(l.desc,70,8):[],h=nm.length*4.4+ds.length*3.6+3;room(h);pos++;
   T(pos,X,y,{},9.5);T(nm,X+9,y,{},9.5);if(ds.length)T(ds,X+9,y+nm.length*4.4-0.4,{},8,false,[90,90,90]);
   T(num(l.qty)+" "+l.unit,col.q,y,{align:"right"},9.5);T(m(l.price),col.p,y,{align:"right"},9.5);if(num(l.disc))T(num(l.disc)+" %",col.r,y,{align:"right"},9.5);if(!kl)T(l.rt+" %",col.v,y,{align:"right"},9.5);T(m(l.n),col.n,y,{align:"right"},9.5);
   y+=h;doc.setDrawColor(215);doc.setLineWidth(.2);doc.line(X,y-2.6,XR,y-2.6)})});
 room(40);y+=4;
 if(!kl){c.gr.forEach(g=>{T(`Netto ${g.rt} %: ${m(g.net)}   ·   USt ${g.rt} %: ${m(g.vat)}`,XR,y,{align:"right"},9.5);y+=5});T("Summe netto: "+m(c.net),XR,y,{align:"right"},9.5);y+=5;T("Umsatzsteuer: "+m(c.vat),XR,y,{align:"right"},9.5);y+=6}
 T("Gesamtbetrag: "+m(c.gross),XR,y,{align:"right"},12.5,true);y+=11;
 const notes=[];if(kl)notes.push("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.");if(d.rc&&!kl)notes.push("Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG).");
 notes.push(off?"Dieses Angebot ist gültig bis "+dde(d.valid)+".":d.k2==="Storno"?"Diese Stornorechnung hebt die genannte Rechnung auf.":"Bitte zahlen Sie bis "+dde(d.due)+" ohne Abzug auf das unten genannte Konto.");if(d.note)notes.push(d.note);
 notes.forEach(t=>{const ls=wrap(t,W,9.5);room(ls.length*4.6+4);T(ls,X,y,{},9.5);y+=ls.length*4.6+2});
 const f1=seller,f2=[S.taxno&&"Steuernr.: "+S.taxno,S.vatid&&"USt-IdNr.: "+S.vatid,S.email,S.phone].filter(Boolean).join(" · "),f3=S.iban?["Bank: "+(S.bank||""),"IBAN "+S.iban,S.bic&&"BIC "+S.bic].filter(Boolean).join(" · "):"";
 for(let i=1;i<=doc.getNumberOfPages();i++){doc.setPage(i);doc.setDrawColor(150);doc.setLineWidth(.2);doc.line(X,277,XR,277);[f1,f2,f3].filter(Boolean).forEach((t,j)=>T(t,X,281+j*3.6,{},7,false,[90,90,90]));if(doc.getNumberOfPages()>1)T(`Seite ${i} von ${doc.getNumberOfPages()}`,XR,281,{align:"right"},7,false,[90,90,90])}
 return doc.output("datauristring").split(",")[1]}

/* ---------- Aktionen Dokument ---------- */
async function stornoOrKorr(storno){const r=byId(ed.id),d=r.data;const lines=d.lines.map(l=>({...l,qty:storno?-num(l.qty):l.qty}));
 const nd={...d,k2:storno?"Storno":"Korrekturrechnung",no:null,date:today(),due:today(),status:"Entwurf",payments:[],reminders:[],lines,ref:d.no,archived:false,deducted:undefined,invoiced:undefined};
 if(storno){if(!confirm("Stornorechnung zu "+d.no+" erstellen und festschreiben?"))return;nd.no=nextNo("invoice","RE");nd.status="Offen";const s=await save("invoice",nd,null,{locked:true});if(s){await save("invoice",{...d,status:"Storniert"},r.id);ed.id=s.id;view="invoice";render();openDoc(s.id)}}
 else{ed={id:null,kind:"invoice",locked:false,d:nd};docForm()}}
const acts={
 close:()=>dlg.close(),final:()=>persist(true),
 pdf:()=>{collect();openPrint(docHTML(ed.d,ed.kind))},
 mail:()=>{collect();const d=ed.d,c=cust(d.cust)||{},off=ed.kind==="offer";
  if(!ed.id||(!off&&!ed.locked)){alert(off?"Bitte das Angebot zuerst speichern.":"Bitte die Rechnung zuerst festschreiben (Nummer vergeben), dann versenden.");return}
  const name=c.contact||[c.first,c.last].filter(Boolean).join(" ")||c.company||"",g=calc(d).gross;
  const tpl=(off?S.mailOff:S.mailInv)||(off?MAIL_OFF:MAIL_INV),sig=["Mit freundlichen Grüßen",S.owner,S.company,S.phone&&"Tel. "+S.phone,S.email].filter(Boolean).join("\n");
  const body=tpl.replace(/\{name\}/g,name).replace(/\{nr\}/g,d.no||"").replace(/\{betrag\}/g,eur(g)).replace(/\{faellig\}/g,dde(off?d.valid:d.due))+"\n\n"+sig;
  const sub=(off?"Angebot ":d.k2+" ")+d.no+" – "+(S.company||"Unitopia IT-Service");
  modal(`<h3>${off?"Angebot":d.k2} ${esc(d.no)} per E-Mail senden</h3><div class="fg"><label class="w">An<input id="m-to" value="${esc(c.email||"")}"></label><label class="w">Betreff<input id="m-sub" value="${esc(sub)}"></label><label class="w">Text<textarea id="m-body" rows="11">${esc(body)}</textarea></label></div>
  <p class="hint">📎 Angehängt wird automatisch das PDF „${esc(pdfName(d,ed.kind))}“. Eine Kopie geht an ${esc(S.email||"dein Postfach")}.</p>
  <div class="acc-bar"><button class="button button-primary" type="button" data-act="mailsend">Jetzt senden</button><button class="button button-ghost" type="button" data-act="mailprev">PDF-Vorschau</button><button class="button button-ghost" type="button" data-act="mailopen">Im Mail-Programm öffnen</button><button class="button button-ghost" type="button" data-act="mailcopy">Text kopieren</button><button class="button button-ghost" type="button" data-act="back">Zurück</button></div><p id="m-msg" class="hint"></p>`)},
 mailprev:async()=>{const w=window.open("","_blank"),m=$("#m-msg");m.textContent="PDF wird erstellt …";
  try{const b64=await makePdf(ed.d,ed.kind),bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const url=URL.createObjectURL(new Blob([u],{type:"application/pdf"}));m.textContent="Vorschau geöffnet.";w?w.location=url:window.open(url)}
  catch(err){w&&w.close();m.textContent="Fehler: "+(err.message||err)}},
 mailsend:async()=>{const to=$("#m-to").value.trim(),m=$("#m-msg"),btn=$('[data-act="mailsend"]');if(!/^\S+@\S+\.\S+$/.test(to)){m.textContent="Bitte eine gültige E-Mail-Adresse eintragen.";return}
  if(!confirm("E-Mail mit PDF jetzt an "+to+" senden?"))return;btn.disabled=true;m.textContent="PDF wird erstellt …";
  try{const pdf=await makePdf(ed.d,ed.kind);m.textContent="Wird gesendet …";
   const {data,error}=await sb.functions.invoke("send-document",{body:{to,subject:$("#m-sub").value,text:$("#m-body").value,filename:pdfName(ed.d,ed.kind),pdf}});
   if(error||data?.error){let t=data?.error;if(!t&&error?.context?.json){try{t=(await error.context.json()).error}catch(_){}}throw new Error(t||error.message)}
   const x={date:today(),to},d=ed.d;await patch({sent:true,sentLog:[...(d.sentLog||[]),x],...(ed.kind==="offer"&&d.status==="Entwurf"?{status:"Gesendet"}:{})});alert("E-Mail wurde gesendet ✓")}
  catch(err){m.textContent="Fehler: "+(err.message||err);btn.disabled=false}},
 mailopen:()=>{location.href=`mailto:${encodeURIComponent($("#m-to").value)}?subject=${encodeURIComponent($("#m-sub").value)}&body=${encodeURIComponent($("#m-body").value)}`;$("#m-msg").textContent="Falls sich nichts öffnet: kein Mail-Programm eingerichtet – bitte „Text kopieren“ nutzen."},
 mailcopy:async()=>{try{await navigator.clipboard.writeText(`An: ${$("#m-to").value}\nBetreff: ${$("#m-sub").value}\n\n${$("#m-body").value}`);$("#m-msg").textContent="Kopiert ✓"}catch(_){$("#m-msg").textContent="Kopieren nicht möglich – bitte Text markieren und kopieren."}},
 marksent:()=>patch(ed.kind==="offer"?{status:"Gesendet"}:{sent:true}),
 back:()=>docForm(),
 addline:()=>{collect();ed.d.lines.push(emptyLine());docForm()},
 rmline:e=>{collect();ed.d.lines.splice(+e.dataset.i,1);if(!ed.d.lines.length)ed.d.lines.push(emptyLine());docForm()},
 pay:async()=>{const a=num($("#pa").value);if(!a)return;const d=ed.d;await patch({payments:[...(d.payments||[]),{amount:a,date:$("#pd").value||today(),note:$("#pn").value}],status:r2(paid(d)+a)>=calc(d).gross-0.005?"Bezahlt":"Offen"})},
 arch:()=>patch({archived:!ed.d.archived}),
 deldoc:async()=>{if(ed.id&&confirm("Entwurf löschen?")&&await del(ed.id)){dlg.close();render()}},
 storno:()=>stornoOrKorr(true),korr:()=>stornoOrKorr(false),
 copy:()=>{const d={...ed.d,no:null,status:"Entwurf",date:today(),valid:addDays(today(),30),archived:false};ed={id:null,kind:"offer",locked:false,d};docForm()},
 toinv:async()=>{const d=ed.d;if(d.status!=="Angenommen"&&!confirm("Angebot ist noch nicht als angenommen markiert. Trotzdem Rechnung erstellen?"))return;await patch({invoiced:true,status:"Angenommen"});
  const t=num(S.terms)||14;ed={id:null,kind:"invoice",locked:false,d:{k2:"Rechnung",cust:d.cust,date:today(),terms:t,due:addDays(today(),t),svcDate:today(),status:"Entwurf",lines:structuredClone(d.lines),payments:[],ref:d.no,rc:d.rc}};view="invoice";render();docForm()},
 deduct:()=>{collect();const used=new Set(L("invoice").flatMap(r=>r.data.deducted||[]));const ab=L("invoice").filter(r=>isFinal(r)&&r.data.k2==="Abschlagsrechnung"&&r.data.cust===ed.d.cust&&!used.has(r.id));if(!ab.length){alert("Keine offenen Abschlagsrechnungen dieses Kunden.");return}
  ed.d.deducted=[...(ed.d.deducted||[]),...ab.map(r=>r.id)];ab.forEach(r=>calc(r.data).gr.forEach(g=>ed.d.lines.push({grp:"Arbeit",name:`Abzgl. Abschlagsrechnung ${r.data.no} (${g.rt} %)`,desc:"",qty:1,unit:"Pauschale",price:-g.net,disc:0,vat:g.rt})));docForm()},
 newcust:()=>custForm()};

/* ---------- Mahnwesen ---------- */
function vDun(v){const rows=L("invoice").filter(overdue);v.innerHTML=`<div class="acc-h"><h2>Mahnwesen</h2></div><p class="hint">Überfällige, festgeschriebene Rechnungen. Verzugszinsen: Basiszinssatz (Einstellungen) + 9 Prozentpunkte (Geschäftskunden) bzw. + 5 (Privatkunden) nach § 288 BGB.</p>${table(["Rechnung","Kunde","Fällig","Tage","Offen","Zinsen","Stufe","Mahnhistorie",""],rows.map(r=>{const d=r.data,days=Math.floor((Date.parse(today())-Date.parse(d.due))/864e5),rm=d.reminders||[],st=rm.length;return `<tr><td>${esc(d.no)}</td><td>${esc(cname(cust(d.cust)))}</td><td>${dde(d.due)}</td><td>${days}</td><td class="n">${eur(openAmt(r))}</td><td class="n">${eur(interest(r))}</td><td>${st?STAGES[st-1]:"–"}</td><td>${rm.map(x=>dde(x.date)+" "+STAGES[x.stage]).join("<br>")||"–"}</td><td>${st<4?`<button class="button button-ghost" data-dun="${r.id}">${STAGES[st]} ↗</button>`:"Eskalation: Inkasso/Mahnbescheid"}</td></tr>`}))}`}
function interest(r){const d=r.data,days=Math.max(0,Math.floor((Date.parse(today())-Date.parse(d.due))/864e5)),rate=num(S.basis)+((cust(d.cust)||{}).type==="firma"?9:5);return r2(openAmt(r)*rate/100*days/365)}
function dunForm(id){const r=byId(id),d=r.data,st=(d.reminders||[]).length,fee=num((S.fees||"0,5,5,5").split(",")[st]);
 form(STAGES[st]+" für "+esc(d.no),fld("Mahngebühr (€)","fee",fee,'type="number" step="0.01"')+fld("Zahlungsfrist bis","until",addDays(today(),st?7:10),'type="date"')+`<p class="hint w">Offen ${eur(openAmt(r))} · Verzugszinsen bis heute ${eur(interest(r))}. Mahngebühren und die 40-€-Verzugspauschale (§ 288 Abs. 5 BGB, nur B2B) müssen im Einzelfall zulässig sein – bitte prüfen.</p>`,
 async o=>{const fee=num(o.fee),i=interest(r),x={stage:st,date:today(),fee,interest:i,until:o.until};
  openPrint(`${logo()}<p style="font-size:10px">${sellerLine()}</p><p>${addr(cust(d.cust)||{})}</p><h2>${STAGES[st]}</h2><p>Datum: ${dde(today())}</p><p>zu Rechnung ${esc(d.no)} vom ${dde(d.date)}, fällig am ${dde(d.due)}.</p><p>Offener Betrag: ${eur(openAmt(r))}<br>Verzugszinsen: ${eur(i)}<br>Mahngebühr: ${eur(fee)}<br><b>Zu zahlen: ${eur(openAmt(r)+i+fee)}</b></p><p>Bitte überweisen Sie den Betrag bis spätestens <b>${dde(o.until)}</b> auf das unten genannte Konto. Sollte sich diese Mahnung mit Ihrer Zahlung überschnitten haben, betrachten Sie sie bitte als gegenstandslos.</p>${footer()}`);
  return !!await save("invoice",{...d,reminders:[...(d.reminders||[]),x]},id)})}

/* ---------- Eingangsrechnungen ---------- */
function expForm(id){const r=id?byId(id):null,e=r?.data||{date:today(),paid:false,vatrate:19,cat:CATS[0]};
 form(id?"Beleg bearbeiten":"Neue Eingangsrechnung",fld("Lieferant","supplier",e.supplier,"required")+fld("Rechnungsnummer","no",e.no)+fld("Rechnungsdatum","date",e.date,'type="date" required')+fld("Fällig am","due",e.due,'type="date"')+fld("Nettobetrag","net",e.net,'type="number" step="0.01" required')+fld("Umsatzsteuer (€)","vat",e.vat,'type="number" step="0.01" required')+sel("Kategorie","cat",CATS,e.cat)+sel("Behandlung","asset",[["","Sofort als Betriebsausgabe"],["1","Anlagegut – über Nutzungsdauer abschreiben (AfA)"]],e.asset?"1":"")+fld("Nutzungsdauer (Jahre, nur AfA)","life",e.life||1,'type="number" min="1"')+`<p class="hint w">Computer/Hardware: Nutzungsdauer laut BMF meist 1 Jahr. Anschaffungen bis 800 € netto können sofort abgesetzt werden (Behandlung „Sofort“). AfA ab Anschaffungsmonat.</p>`+sel("Bezahlt?","paid",[["0","Offen"],["1","Bezahlt"]],e.paid?"1":"0")+fld("Zahlungsdatum","paidDate",e.paidDate,'type="date"')+`<label>Beleg (PDF/Bild)<input type="file" name="file" accept="application/pdf,image/*"></label>`+fld("Notiz","note",e.note,"","w"),
 async o=>{const f=o.file;delete o.file;o.net=num(o.net);o.vat=num(o.vat);o.gross=r2(o.net+o.vat);o.paid=o.paid==="1";o.asset=o.asset==="1";o.life=num(o.life)||1;o.file=e.file;
  const dup=L("expense").find(x=>x.id!==id&&x.data.supplier===o.supplier&&x.data.no&&x.data.no===o.no);if(dup&&!confirm("Möglicher doppelter Beleg (gleicher Lieferant und Nummer). Trotzdem speichern?"))return false;
  if(f&&f.size){const p=`${new Date().getFullYear()}/${Date.now()}-${f.name.replace(/[^\w.-]/g,"_")}`;const {error}=await sb.storage.from("acc-docs").upload(p,f);if(error){alert("Upload: "+error.message);return false}o.file=p}
  return !!await save("expense",o,id)})}
function vExp(v){const q=flt.q.toLowerCase();v.innerHTML=`<div class="acc-h"><h2>Eingangsrechnungen & Belege</h2><div class="acc-bar"><input id="q" placeholder="Suchen …" value="${esc(flt.q)}"><button class="button button-primary" data-act="newexp">+ Beleg erfassen</button></div></div>${table(["Datum","Lieferant","Nr.","Kategorie","Netto","USt","Brutto","Status","Beleg"],L("expense").slice().reverse().filter(r=>!q||JSON.stringify(r.data).toLowerCase().includes(q)).map(r=>{const e=r.data;return `<tr class="r" data-exp="${r.id}"><td>${dde(e.date)}</td><td>${esc(e.supplier)}</td><td>${esc(e.no)}</td><td>${esc(e.cat)}</td><td class="n">${eur(e.net)}</td><td class="n">${eur(e.vat)}</td><td class="n">${eur(e.gross)}</td><td>${e.paid?pill("Bezahlt","ok"):pill("Offen","warn")}</td><td>${e.file?`<a href="#" data-file="${esc(e.file)}">öffnen</a>`:"–"}</td></tr>`}))}`;
 $("#q").oninput=e=>{flt.q=e.target.value;vExp(v);$("#q").focus()}}

/* ---------- Buchhaltung ---------- */
function journal(){const sk=S.skr==="SKR04"?1:0,rows=[];
 incomeEvents().forEach(e=>rows.push({...e,type:"Einnahme",acct:S.kleinunt?ACC.ekl[sk]:(ACC["e"+e.rt]||ACC.e0)[sk]}));
 expenseEvents().forEach(e=>rows.push({...e,type:"Ausgabe",acct:(ACC.c[e.cat]||ACC.c["Sonstige betriebliche Ausgaben"])[sk]}));
 L("booking").filter(r=>/^Privat/.test(r.data.type)).forEach(r=>rows.push({date:r.data.date,type:r.data.type,net:num(r.data.net),vat:0,text:r.data.text,ref:"Privat",acct:r.data.type==="Privateinlage"?["1890","2180"][sk]:["1800","2100"][sk]}));
 return rows.filter(e=>inP(e.date)).sort((a,b)=>a.date<b.date?-1:1)}
function vBooks(v){const j=journal(),ei=sum(j.filter(x=>x.type==="Einnahme"),x=>x.net),aa=sum(j.filter(x=>x.type==="Ausgabe"),x=>x.net),cats={};j.filter(x=>x.type==="Ausgabe").forEach(x=>cats[x.cat]=r2((cats[x.cat]||0)+x.net));
 v.innerHTML=`<div class="acc-h"><h2>Buchhaltung</h2><div class="acc-bar">${perSel()}<button class="button button-ghost" data-act="newbook">+ Manuelle Buchung</button><button class="button button-ghost" data-act="csvj">CSV-Export</button></div></div><p class="hint">${S.soll?"Soll-Versteuerung":"Ist-Versteuerung"} · Einnahmenüberschussrechnung (EÜR) · ${S.skr||"SKR03"} – Kontovorschläge bitte mit Ihrem Steuerberater abstimmen. Die doppelte Buchführung ist nicht enthalten.</p>
 <div class="cards"><div class="card"><small>Betriebseinnahmen (netto)</small><b>${eur(ei)}</b></div><div class="card"><small>Betriebsausgaben (netto)</small><b>${eur(aa)}</b></div><div class="card ${ei-aa<0?"bad":""}"><small>Gewinn / Verlust (EÜR)</small><b>${eur(r2(ei-aa))}</b></div></div>
 <h3>Ausgaben nach Kategorie</h3>${table(["Kategorie","Netto"],Object.entries(cats).map(([k,n])=>`<tr><td>${esc(k)}</td><td class="n">${eur(n)}</td></tr>`))}
 <h3>Buchungsjournal</h3>${table(["Datum","Text","Art","Konto","Netto","USt/Vorsteuer","Brutto","Beleg"],j.map(x=>`<tr><td>${dde(x.date)}</td><td>${esc(x.text)}</td><td>${x.type}</td><td>${x.acct}</td><td class="n">${eur(x.net)}</td><td class="n">${eur(x.vat)}</td><td class="n">${eur(r2(x.net+x.vat))}</td><td>${esc(x.ref)}</td></tr>`))}`}
function bookForm(el){const t=el?.dataset?.t||"Einnahme",cash=el?.dataset?.cash==="1";
 form("Buchung erfassen",fld("Datum","date",today(),'type="date" required')+sel("Art","type",["Einnahme","Ausgabe","Privateinlage","Privatentnahme"],t)+fld("Buchungstext","text","","required","w")+sel("Kategorie (nur Ausgabe)","cat",CATS,CATS[0])+fld("Betrag netto (bei Privat: Betrag)","net","",'type="number" step="0.01" min="0.01" required')+fld("Umsatzsteuer (€, nur Einnahme/Ausgabe)","vat","0",'type="number" step="0.01" min="0"')+fld("USt-Satz % (nur Einnahme)","rate","19",'type="number"')+sel("Zahlungsart","cash",[["","Bank / unbar"],["1","Bar (Kassenbuch)"]],cash?"1":"")+`<p class="hint w">Privateinlagen und -entnahmen sind steuerlich neutral (nicht in EÜR/Steuer), erscheinen aber im Journal.</p>`,
 async o=>{o.cash=!!o.cash;if(/^Privat/.test(o.type)){o.vat=0;o.rate=0}return !!await save("booking",o,null,{locked:true})})}
async function stornoB(id){const d=byId(id).data;if(!confirm("Gegenbuchung (Storno) erstellen?"))return;const op={Einnahme:"Ausgabe",Ausgabe:"Einnahme",Privateinlage:"Privatentnahme",Privatentnahme:"Privateinlage"}[d.type];if(await save("booking",{...d,type:op,date:today(),text:"Storno: "+d.text,stornoOf:id},null,{locked:true}))render()}
function vCash(v){const sg=t=>/^(Einnahme|Privateinlage)$/.test(t)?1:-1,all=L("booking").filter(r=>r.data.cash).sort((a,b)=>a.data.date<b.data.date?-1:a.data.date>b.data.date?1:a.created_at<b.created_at?-1:1);
 let bal=0,neg=false;const rows=all.map(r=>{const d=r.data,a=r2(num(d.net)+num(d.vat))*sg(d.type);bal=r2(bal+a);if(bal<0)neg=true;return {d,a,bal,id:r.id}}),shown=rows.filter(x=>inP(x.d.date));
 v.innerHTML=`<div class="acc-h"><h2>Kassenbuch</h2><div class="acc-bar">${perSel()}<button class="button button-primary" data-act="newbook" data-t="Einnahme" data-cash="1">+ Bareinnahme</button><button class="button button-ghost" data-act="newbook" data-t="Ausgabe" data-cash="1">+ Barausgabe</button><button class="button button-ghost" data-act="newbook" data-t="Privateinlage" data-cash="1">Privateinlage bar</button><button class="button button-ghost" data-act="newbook" data-t="Privatentnahme" data-cash="1">Privatentnahme bar</button></div></div>
 <div class="cards"><div class="card ${bal<0?"bad":""}"><small>Aktueller Kassenbestand</small><b>${eur(bal)}</b></div></div>${neg?'<p class="hint" style="color:#ffb3b3">⚠ Der Kassenbestand war zeitweise negativ – das ist in einem Kassenbuch nicht zulässig. Bitte Buchungen/Datum prüfen.</p>':""}
 ${table(["Datum","Text","Art","Betrag","Kassenbestand",""],shown.map(x=>`<tr><td>${dde(x.d.date)}</td><td>${esc(x.d.text)}</td><td>${x.d.type}</td><td class="n">${eur(x.a)}</td><td class="n">${eur(x.bal)}</td><td>${x.id&&!x.d.stornoOf&&!all.some(z=>z.data.stornoOf===x.id)?`<a href="#" data-stb="${x.id}">Storno</a>`:""}</td></tr>`))}`}

function vAfa(v){const as=assets();v.innerHTML=`<div class="acc-h"><h2>Abschreibungen (AfA)</h2><div class="acc-bar">${perSel()}</div></div><p class="hint">Anlagegüter entstehen in „Eingangsrechnungen“ mit Behandlung „Anlagegut“. Lineare AfA, monatsgenau ab Anschaffung; Betrag fließt automatisch in EÜR und Journal (31.12.).</p>${table(["Anschaffung","Gut","Kosten","Nutzungsdauer","AfA "+per.y,"Restbuchwert 31.12."],as.map(r=>{const d=r.data,pl=afaPlan(d),x=pl.find(z=>z.y===per.y),before=pl.filter(z=>z.y<per.y).reduce((a,z)=>a+z.a,0);return `<tr><td>${dde(d.date)}</td><td>${esc(d.supplier)} ${esc(d.no||"")}</td><td class="n">${eur(expNet(d))}</td><td>${d.life} J.</td><td class="n">${eur(x?x.a:0)}</td><td class="n">${eur(per.y<+d.date.slice(0,4)?expNet(d):r2(expNet(d)-before-(x?x.a:0)))}</td></tr>`}))}`}
/* ---------- Steuern ---------- */
function vTax(v){const t=taxFigures(),by=t.by,n=r=>by[r]?.net||0;
 v.innerHTML=`<div class="acc-h"><h2>Steuern</h2><div class="acc-bar">${perSel()}<button class="button button-ghost" data-act="csvt">CSV-Export</button></div></div>${S.kleinunt?`<p class="hint">Kleinunternehmerregelung (§ 19 UStG) aktiv: keine Umsatzsteuer, kein Vorsteuerabzug.</p>`+limBox():""}
 <div class="cards"><div class="card"><small>Umsatzsteuer</small><b>${eur(t.ust)}</b></div><div class="card"><small>Vorsteuer</small><b>${eur(t.vs)}</b></div><div class="card"><small>Voraussichtliche Zahllast</small><b>${eur(t.zahl)}</b></div></div>
 ${table(["Steuersatz","Bemessungsgrundlage netto","Umsatzsteuer"],Object.entries(by).map(([r,x])=>`<tr><td>${r==0?"0 % / steuerfrei / § 13b / § 19":r+" %"}</td><td class="n">${eur(x.net)}</td><td class="n">${eur(x.vat)}</td></tr>`))}
 <h3>Vorbereitung Umsatzsteuer-Voranmeldung (ELSTER)</h3><p class="hint">Zum Übertragen in ELSTER – die Übermittlung selbst erfolgt nicht aus dieser Software.</p>${table(["Kennzahl","Inhalt","Betrag"],[["81","Umsätze 19 % (Bemessungsgrundlage)",n(19)],["86","Umsätze 7 % (Bemessungsgrundlage)",n(7)],["66","Abziehbare Vorsteuerbeträge",t.vs],["83","Verbleibende Umsatzsteuer-Vorauszahlung",t.zahl]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td class="n">${eur(r[2])}</td></tr>`))}`}

/* ---------- Einstellungen ---------- */
function vSet(v){const s=S;v.innerHTML=`<div class="acc-h"><h2>Einstellungen & Firmenstammdaten</h2></div><form id="sf"><div class="fg">${fld("Firmenname","company",s.company||"Unitopia IT-Service")+fld("Inhaber","owner",s.owner||"André Kasper")+fld("Straße","street",s.street||"Hosangweg 2")+fld("PLZ","zip",s.zip||"18528")+fld("Ort","city",s.city||"Bergen auf Rügen")+fld("E-Mail","email",s.email||"Unitopia.itservice@gmx.de")+fld("Telefon","phone",s.phone||"0155 67945706")+fld("Steuernummer","taxno",s.taxno)+fld("USt-IdNr.","vatid",s.vatid)+fld("Bank","bank",s.bank)+fld("IBAN","iban",s.iban)+fld("BIC","bic",s.bic)+fld("Geschäftsbeginn (Gründungsjahr)","start",s.start,'type="date"')+fld("Standard-Zahlungsziel (Tage)","terms",s.terms||14,'type="number"')+sel("Standard-USt","vat",[19,7,0],s.vat??19)+sel("Kleinunternehmer § 19 UStG","kleinunt",[["","Nein"],["1","Ja"]],s.kleinunt?"1":"")+sel("Versteuerung","soll",[["","Ist-Versteuerung (nach Zahlung)"],["1","Soll-Versteuerung (nach Rechnung)"]],s.soll?"1":"")+sel("Kontenrahmen","skr",["SKR03","SKR04"],s.skr||"SKR03")+fld("Basiszinssatz % (Bundesbank, aktuell eintragen)","basis",s.basis||0,'type="number" step="0.01"')+fld("Mahngebühren je Stufe (€, kommagetrennt)","fees",s.fees||"0,5,5,5")+`<label class="w">E-Mail-Text Rechnung (Platzhalter: {name} {nr} {betrag} {faellig})<textarea name="mailInv" rows="5">${esc(s.mailInv||MAIL_INV)}</textarea></label><label class="w">E-Mail-Text Angebot<textarea name="mailOff" rows="5">${esc(s.mailOff||MAIL_OFF)}</textarea></label>`}</div><div class="acc-bar" style="margin-top:14px"><button class="button button-primary">Speichern</button></div></form>
 <h3 style="margin-top:28px">Leistungs- & Artikelkatalog</h3><p class="hint">Zeile anklicken zum Bearbeiten (Preis, Einheit, USt, Bezeichnung).</p><div class="acc-bar"><button class="button button-ghost" data-act="newcat">+ Position</button><button class="button button-ghost" data-act="seed">Standardleistungen & Hardware anlegen</button></div>${table(["Nr.","Bezeichnung","Art","Einheit","Preis netto","USt",""],L("catalog").map(r=>`<tr class="r" data-cat="${r.id}"><td>${esc(r.data.no)}</td><td>${esc(r.data.name)}</td><td>${esc(r.data.type)}</td><td>${esc(r.data.unit)}</td><td class="n">${eur(r.data.price)}</td><td>${r.data.vat} %</td><td><a href="#" data-delcat="${r.id}">löschen</a></td></tr>`))}
 <h3>Daten & Protokoll</h3><div class="acc-bar"><button class="button button-ghost" data-act="backup">Datensicherung (JSON)</button><button class="button button-ghost" data-act="log">Änderungsprotokoll</button></div><p class="hint">Supabase erstellt die serverseitigen Backups; die JSON-Sicherung ist ein zusätzlicher Export aller Datensätze.</p>`;
 $("#sf").onsubmit=async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));o.kleinunt=!!o.kleinunt;o.soll=!!o.soll;if(await save("settings",o,L("settings")[0]?.id)){alert("Gespeichert.");render()}}}
const catForm=id=>{const c=id?byId(id).data:{type:"Arbeit",unit:"Pauschale",price:0,vat:S.vat??19};return form(id?"Position bearbeiten":"Katalogposition",fld("Nr.","no",c.no)+fld("Bezeichnung","name",c.name,"required")+sel("Art","type",["Arbeit","Material"],c.type)+sel("Einheit","unit",["Stück","Stunde","Auftrag","Pauschale"],c.unit)+fld("Preis netto (€)","price",c.price,'type="number" step="0.01"')+sel("USt %","vat",[19,7,0],c.vat)+fld("Beschreibung","desc",c.desc,"","w"),async o=>{o.price=num(o.price);o.vat=num(o.vat);return !!await save("catalog",o,id)})};
async function seed(){if(L("catalog").length&&!confirm("Katalog hat bereits Einträge. Standardpositionen trotzdem hinzufügen?"))return;let i=L("catalog").length;
 for(const n of SERV)await save("catalog",{no:"L"+String(++i).padStart(3,"0"),name:n,type:"Arbeit",unit:/Webseite erstellung|Erstellung/.test(n)?"Pauschale":"Stunde",price:0,vat:19});
 for(const n of HW)await save("catalog",{no:"A"+String(++i).padStart(3,"0"),name:n,type:"Material",unit:"Stück",price:0,vat:19});render()}
async function showLog(){const {data}=await sb.from("acc_log").select("*").order("at",{ascending:false}).limit(60);modal(`<h3>Änderungsprotokoll (letzte 60)</h3>${table(["Zeit","Aktion","Art","Datensatz"],(data||[]).map(x=>`<tr><td>${new Date(x.at).toLocaleString("de-DE")}</td><td>${x.action}</td><td>${x.kind}</td><td>${esc((x.new_data||x.old_data||{}).no||(x.new_data||x.old_data||{}).supplier||x.record_id.slice(0,8))}</td></tr>`))}`)}

/* ---------- Events ---------- */
document.addEventListener("click",async e=>{const t=e.target.closest("[data-act],[data-view],[data-new],[data-open],[data-cust],[data-exp],[data-dun],[data-st],[data-file],[data-delcat],[data-cat],[data-stb]");if(!t)return;const D=t.dataset;
 if(D.view){view=D.view;flt.q="";render()}
 else if(D.new)newDoc(D.new);
 else if(D.open)openDoc(D.open);
 else if(D.cust)custForm(D.cust);
 else if(D.exp&&!e.target.closest("a"))expForm(D.exp);
 else if(D.dun)dunForm(D.dun);
 else if(D.cat)catForm(D.cat);
 else if(D.stb){e.preventDefault();stornoB(D.stb)}
 else if(D.st)patch({status:D.st});
 else if(D.file){e.preventDefault();e.stopPropagation();const {data}=await sb.storage.from("acc-docs").createSignedUrl(D.file,120);if(data)window.open(data.signedUrl)}
 else if(D.delcat){e.preventDefault();if(confirm("Position löschen?")&&await del(D.delcat))render()}
 else if(D.act){const a=D.act;({newexp:()=>expForm(),newbook:t=>bookForm(t),newcat:catForm,seed,log:showLog,
  csvj:()=>dl(`journal-${per.y}.csv`,csv([["Datum","Text","Art","Konto","Netto","USt","Brutto","Beleg"],...journal().map(x=>[x.date,x.text,x.type,x.acct,x.net,x.vat,r2(x.net+x.vat),x.ref])])),
  csvt:()=>{const t=taxFigures();dl(`steuer-${per.y}-${per.p}.csv`,csv([["Satz","Netto","USt"],...Object.entries(t.by).map(([r,x])=>[r,x.net,x.vat]),["Vorsteuer","",t.vs],["Zahllast","",t.zahl]]))},
  backup:()=>dl(`unitopia-buchhaltung-${today()}.json`,JSON.stringify(R,null,1),"application/json")}[a]||acts[a])?.(t)}});

(async()=>{const m=$("#acc-msg");
 try{const {data:{session}}=await sb.auth.getSession();if(!session){m.innerHTML='Bitte zuerst im <a href="admin.html">Mitarbeiterbereich anmelden</a>.';return}
  const {data:p}=await sb.from("profiles").select("role").eq("id",session.user.id).single();if(p?.role!=="admin"){m.textContent="Dieser Bereich ist nur für Administratoren.";return}
  await load();m.hidden=true;$("#acc-app").hidden=false;render()}
 catch(err){m.innerHTML="Datenbank nicht bereit: "+esc(err.message||err)+"<br>Bitte <code>supabase/buchhaltung.sql</code> im Supabase SQL-Editor ausführen."}})();
})();
